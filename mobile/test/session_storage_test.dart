import 'dart:async';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';

class Vault extends Fake implements FlutterSecureStorage {
  final Map<String, String> values = {};
  bool failWrite = false;
  Completer<void>? gate;
  Completer<void>? started;
  Future<void> _write(String key, String value) async {
    started?.complete();
    await gate?.future;
    if (failWrite) throw StateError('Storage unavailable');
    values[key] = value;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) {
    final key = invocation.namedArguments[#key] as String?;
    if (invocation.memberName == #read) {
      return Future<String?>.value(values[key]);
    }
    if (invocation.memberName == #write) {
      return _write(key!, invocation.namedArguments[#value] as String);
    }
    if (invocation.memberName == #delete) {
      values.remove(key);
      return Future<void>.value();
    }
    return super.noSuchMethod(invocation);
  }
}

void main() {
  test('legacy session migrates to one encrypted token pair', () async {
    final vault =
        Vault()
          ..values['tenvora_access_token'] = 'access'
          ..values['tenvora_refresh_token'] = 'refresh';
    final store = SessionStore(storage: vault);
    await store.initialize();
    expect(store.accessToken, 'access');
    expect(store.refreshToken, 'refresh');
    expect(vault.values.keys, ['tenvora_session']);
    final restarted = SessionStore(storage: vault);
    await restarted.initialize();
    expect(restarted.refreshToken, 'refresh');
  });
  test('failed token rotation keeps the previous committed pair', () async {
    final vault = Vault();
    final store = SessionStore(storage: vault);
    await store.save(access: 'old', refresh: 'old-refresh');
    vault.failWrite = true;
    await expectLater(
      store.save(access: 'new', refresh: 'new-refresh'),
      throwsStateError,
    );
    expect(store.accessToken, 'old');
    expect(store.refreshToken, 'old-refresh');
    final restarted = SessionStore(storage: vault);
    await restarted.initialize();
    expect(restarted.accessToken, 'old');
    expect(restarted.refreshToken, 'old-refresh');
  });
  test('logout wins over a token save already in flight', () async {
    final vault =
        Vault()
          ..gate = Completer<void>()
          ..started = Completer<void>();
    final store = SessionStore(storage: vault);
    final save = store.save(access: 'late', refresh: 'late-refresh');
    await vault.started!.future;
    final logout = store.clear();
    vault.gate!.complete();
    await Future.wait([save, logout]);
    expect(store.accessToken, null);
    expect(store.refreshToken, null);
    expect(vault.values, isEmpty);
  });
  test(
    'corrupt saved session returns to sign-in without a startup loop',
    () async {
      final vault = Vault()..values['tenvora_session'] = '{corrupt';
      final store = SessionStore(storage: vault);
      await store.initialize();
      expect(store.accessToken, null);
      expect(vault.values, isEmpty);
    },
  );
}
