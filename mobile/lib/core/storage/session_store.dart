import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class SessionStore {
  static const _accessKey = 'tenvora_access_token';
  static const _refreshKey = 'tenvora_refresh_token';

  final FlutterSecureStorage _storage = const FlutterSecureStorage(
    aOptions: AndroidOptions(),
    iOptions: IOSOptions(),
  );

  String? accessToken;
  String? refreshToken;

  Future<void> initialize() async {
    accessToken = await _storage.read(key: _accessKey);
    refreshToken = await _storage.read(key: _refreshKey);
  }

  Future<void> save({required String access, required String refresh}) async {
    accessToken = access;
    refreshToken = refresh;
    await Future.wait([
      _storage.write(key: _accessKey, value: access),
      _storage.write(key: _refreshKey, value: refresh),
    ]);
  }

  Future<void> clear() async {
    accessToken = null;
    refreshToken = null;
    await Future.wait([
      _storage.delete(key: _accessKey),
      _storage.delete(key: _refreshKey),
    ]);
  }
}
