import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';

class SessionStore {
  SessionStore({FlutterSecureStorage? storage})
    : _storage =
          storage ??
          const FlutterSecureStorage(
            aOptions: AndroidOptions(),
            iOptions: IOSOptions(),
          );
  static const _sessionKey = 'tenvora_session';
  static const _accessKey = 'tenvora_access_token';
  static const _refreshKey = 'tenvora_refresh_token';

  final FlutterSecureStorage _storage;

  String? accessToken;
  String? refreshToken;
  int _generation = 0;
  Future<void> _writes = Future.value();
  Future<void> _persist(Future<void> Function() action) {
    final operation = _writes.then((_) => action());
    _writes = operation.then<void>(
      (_) {},
      onError: (Object _, StackTrace _) {},
    );
    return operation;
  }

  Future<void> initialize() async {
    final saved = await _storage.read(key: _sessionKey);
    if (saved != null) {
      try {
        final pair = jsonDecode(saved) as Map<String, dynamic>;
        if (pair['access'] is! String ||
            pair['refresh'] is! String ||
            (pair['access'] as String).isEmpty ||
            (pair['refresh'] as String).isEmpty) {
          throw const FormatException('Invalid session');
        }
        accessToken = pair['access'] as String;
        refreshToken = pair['refresh'] as String;
        return;
      } on FormatException {
        await clear();
        return;
      } on TypeError {
        await clear();
        return;
      }
    }
    accessToken = await _storage.read(key: _accessKey);
    refreshToken = await _storage.read(key: _refreshKey);
    if (accessToken != null && refreshToken != null) {
      await save(access: accessToken!, refresh: refreshToken!);
    } else if (accessToken != null || refreshToken != null) {
      await clear();
    }
  }

  Future<void> save({required String access, required String refresh}) async {
    final generation = _generation;
    await _persist(() async {
      if (generation != _generation) return;
      // A single encrypted value prevents a crash from persisting a mixed token pair.
      await _storage.write(
        key: _sessionKey,
        value: jsonEncode({'access': access, 'refresh': refresh}),
      );
      if (generation != _generation) return;
      accessToken = access;
      refreshToken = refresh;
      try {
        await Future.wait([
          _storage.delete(key: _accessKey),
          _storage.delete(key: _refreshKey),
        ]);
      } catch (_) {
        // The committed pair remains authoritative if old-key cleanup is interrupted.
      }
    });
  }

  Future<void> clear() async {
    _generation++;
    accessToken = null;
    refreshToken = null;
    await _persist(() async {
      await Future.wait([
        _storage.delete(key: _sessionKey),
        _storage.delete(key: _accessKey),
        _storage.delete(key: _refreshKey),
      ]);
    });
  }
}
