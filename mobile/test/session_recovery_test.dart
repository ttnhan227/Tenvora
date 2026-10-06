import 'dart:async';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:tenvora_mobile/domain/models.dart';
import 'package:tenvora_mobile/state/app_controller.dart';

class MemoryStore extends SessionStore {
  MemoryStore() {
    accessToken = 'old';
    refreshToken = 'refresh';
  }
  @override
  Future<void> initialize() async {}
  @override
  Future<void> save({required String access, required String refresh}) async {
    accessToken = access;
    refreshToken = refresh;
  }

  @override
  Future<void> clear() async {
    accessToken = null;
    refreshToken = null;
  }
}

class Adapter implements HttpClientAdapter {
  Adapter(this.respond);
  final Future<ResponseBody> Function(RequestOptions) respond;
  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? stream,
    Future<void>? cancel,
  ) => respond(options);
  @override
  void close({bool force = false}) {}
}

Dio client(Future<ResponseBody> Function(RequestOptions) callback) =>
    Dio(BaseOptions(baseUrl: 'https://test.invalid/api'))
      ..httpClientAdapter = Adapter(callback);
ResponseBody json(String text, int status) => ResponseBody.fromString(
  text,
  status,
  headers: {
    Headers.contentTypeHeader: [Headers.jsonContentType],
  },
);

class ProfileRepository extends TenvoraRepository {
  ProfileRepository(this.store) : super(ApiClient(store));
  final MemoryStore store;
  bool offline = true;
  @override
  Future<UserProfile> profile() async {
    if (offline) throw const ApiFailure('Offline');
    return UserProfile.fromJson({'id': 'u', 'email': 'u@test.invalid'});
  }
}

void main() {
  test(
    'temporary startup outage preserves session and retry signs in',
    () async {
      SharedPreferences.setMockInitialValues({});
      final store = MemoryStore();
      final repo = ProfileRepository(store);
      final app = AppController(repository: repo, sessionStore: store);
      await app.initialize();
      expect(app.startupFailed, true);
      expect(store.refreshToken, 'refresh');
      repo.offline = false;
      await app.initialize();
      expect(app.startupFailed, false);
      expect(app.isAuthenticated, true);
      app.dispose();
    },
  );
  test(
    'refresh network failure keeps credentials and returns a network error',
    () async {
      final store = MemoryStore();
      final api = ApiClient(
        store,
        dio: client((_) async => json('{}', 401)),
        refreshDio: client(
          (r) async =>
              throw DioException(
                requestOptions: r,
                type: DioExceptionType.connectionError,
              ),
        ),
      );
      await expectLater(
        api.get('/auth/me'),
        throwsA(isA<ApiFailure>().having((e) => e.statusCode, 'status', null)),
      );
      expect(store.refreshToken, 'refresh');
    },
  );
  test('invalid refresh revokes local credentials', () async {
    final store = MemoryStore();
    final api = ApiClient(
      store,
      dio: client((_) async => json('{}', 401)),
      refreshDio: client((_) async => json('{}', 401)),
    );
    await expectLater(api.get('/auth/me'), throwsA(isA<ApiFailure>()));
    expect(store.refreshToken, null);
  });
  test(
    'server failure after refresh does not discard rotated credentials',
    () async {
      final store = MemoryStore();
      final api = ApiClient(
        store,
        dio: client(
          (r) async => json(
            '{}',
            r.headers['Authorization'] == 'Bearer old' ? 401 : 503,
          ),
        ),
        refreshDio: client(
          (_) async => json(
            '{"data":{"accessToken":"new","refreshToken":"rotated"}}',
            200,
          ),
        ),
      );
      await expectLater(api.get('/auth/me'), throwsA(isA<ApiFailure>()));
      expect(store.refreshToken, 'rotated');
    },
  );
  test('parallel expired requests share one refresh', () async {
    final store = MemoryStore();
    int calls = 0;
    final gate = Completer<void>();
    final api = ApiClient(
      store,
      dio: client(
        (r) async =>
            json('{}', r.headers['Authorization'] == 'Bearer old' ? 401 : 200),
      ),
      refreshDio: client((_) async {
        calls++;
        await gate.future;
        return json(
          '{"data":{"accessToken":"new","refreshToken":"rotated"}}',
          200,
        );
      }),
    );
    final requests = Future.wait([api.get('/one'), api.get('/two')]);
    await Future<void>.delayed(const Duration(milliseconds: 20));
    gate.complete();
    await requests;
    expect(calls, 1);
  });
  test('late refresh cannot sign back in after logout', () async {
    final store = MemoryStore();
    final gate = Completer<void>();
    final started = Completer<void>();
    final api = ApiClient(
      store,
      dio: client((_) async => json('{}', 401)),
      refreshDio: client((_) async {
        started.complete();
        await gate.future;
        return json(
          '{"data":{"accessToken":"new","refreshToken":"rotated"}}',
          200,
        );
      }),
    );
    final request = expectLater(api.get('/one'), throwsA(isA<ApiFailure>()));
    await started.future;
    await store.clear();
    gate.complete();
    await request;
    expect(store.accessToken, null);
    expect(store.refreshToken, null);
  });
}
