import 'dart:async';
import 'dart:io';
import 'dart:convert';

import 'package:dio/dio.dart';

import '../storage/session_store.dart';

class ApiFailure implements Exception {
  const ApiFailure(this.message, {this.code, this.statusCode});

  final String message;
  final String? code;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient(this._store, {Dio? dio, Dio? refreshDio})
    : _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: _baseUrl,
              connectTimeout: const Duration(seconds: 12),
              receiveTimeout: const Duration(seconds: 35),
              sendTimeout: const Duration(seconds: 35),
              contentType: Headers.jsonContentType,
            ),
          ),
      _refreshDio =
          refreshDio ??
          Dio(
            BaseOptions(
              baseUrl: _baseUrl,
              connectTimeout: const Duration(seconds: 12),
              receiveTimeout: const Duration(seconds: 20),
              contentType: Headers.jsonContentType,
            ),
          ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) {
          final token = _store.accessToken;
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: _handleError,
      ),
    );
  }

  static String get _baseUrl {
    const configured = String.fromEnvironment('API_BASE_URL');
    if (configured.isNotEmpty) return configured.replaceAll(RegExp(r'/+$'), '');
    return Platform.isAndroid
        ? 'http://10.0.2.2:5000/api'
        : 'http://127.0.0.1:5000/api';
  }

  final SessionStore _store;
  final Dio _dio;
  final Dio _refreshDio;
  Future<String?>? _refreshing;

  String get sessionScope {
    try {
      final payload = jsonDecode(
        utf8.decode(
          base64Url.decode(
            base64Url.normalize(_store.accessToken!.split('.')[1]),
          ),
        ),
      );
      return '${payload['nameid'] ?? payload['sub'] ?? payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier']}';
    } catch (_) {
      return 'local-session';
    }
  }

  bool _isPublicAuth(String path) => const [
    '/auth/login',
    '/auth/register',
    '/auth/google',
    '/auth/refresh-token',
  ].any(path.contains);

  Future<void> _handleError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final request = error.requestOptions;
    final shouldRefresh =
        error.response?.statusCode == 401 &&
        request.extra['retried'] != true &&
        !_isPublicAuth(request.path) &&
        _store.refreshToken != null;
    if (!shouldRefresh) {
      handler.next(error);
      return;
    }

    try {
      final token = await _refreshAccessToken();
      if (token == null) {
        handler.next(error);
        return;
      }
      request.extra['retried'] = true;
      request.headers['Authorization'] = 'Bearer $token';
      final response = await _dio.fetch<dynamic>(request);
      handler.resolve(response);
    } on DioException catch (failure) {
      if (request.extra['retried'] == true &&
          failure.response?.statusCode == 401 &&
          request.headers['Authorization'] == 'Bearer ${_store.accessToken}') {
        await _store.clear();
      }
      handler.next(failure);
    } catch (failure) {
      handler.next(DioException(requestOptions: request, error: failure));
    }
  }

  Future<String?> _refreshAccessToken() async {
    final active = _refreshing;
    if (active != null) return active;
    final future = _performRefresh();
    _refreshing = future;
    try {
      return await future;
    } finally {
      if (identical(_refreshing, future)) _refreshing = null;
    }
  }

  Future<String?> _performRefresh() async {
    final refresh = _store.refreshToken;
    if (refresh == null) return null;
    final Response<dynamic> response;
    try {
      response = await _refreshDio.post<dynamic>(
        '/auth/refresh-token',
        data: {'refreshToken': refresh},
      );
    } on DioException catch (failure) {
      if ((failure.response?.statusCode == 401 ||
              failure.response?.statusCode == 403) &&
          _store.refreshToken == refresh) {
        await _store.clear();
      }
      rethrow;
    }
    final body = _unwrap(response.data);
    final access = body['accessToken']?.toString();
    final rotated = body['refreshToken']?.toString();
    if (access == null || rotated == null) {
      throw const ApiFailure(
        'Tenvora returned an incomplete session. Try again.',
      );
    }
    // A late response must not restore credentials after local sign-out.
    if (_store.refreshToken != refresh) return null;
    await _store.save(access: access, refresh: rotated);
    return access;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query}) async {
    try {
      return _unwrap(
        (await _dio.get<dynamic>(path, queryParameters: query)).data,
      );
    } on DioException catch (error) {
      throw _failure(error);
    }
  }

  Future<dynamic> post(
    String path, {
    Object? data,
    Map<String, dynamic>? headers,
  }) async {
    try {
      return _unwrap(
        (await _dio.post<dynamic>(
          path,
          data: data,
          options: Options(headers: headers),
        )).data,
      );
    } on DioException catch (error) {
      throw _failure(error);
    }
  }

  Future<dynamic> put(String path, {Object? data}) async {
    try {
      return _unwrap((await _dio.put<dynamic>(path, data: data)).data);
    } on DioException catch (error) {
      throw _failure(error);
    }
  }

  Future<dynamic> patch(String path, {Object? data}) async {
    try {
      return _unwrap((await _dio.patch<dynamic>(path, data: data)).data);
    } on DioException catch (error) {
      throw _failure(error);
    }
  }

  Future<dynamic> delete(String path) async {
    try {
      return _unwrap((await _dio.delete<dynamic>(path)).data);
    } on DioException catch (error) {
      throw _failure(error);
    }
  }

  static Map<String, dynamic> _unwrap(dynamic value) {
    if (value is! Map) return {'value': value};
    final body = Map<String, dynamic>.from(value);
    if (body['success'] == false) {
      throw ApiFailure(
        body['message']?.toString() ?? 'Request failed.',
        code: body['code']?.toString(),
      );
    }
    final data = body.containsKey('data') ? body['data'] : body;
    if (data is Map) return Map<String, dynamic>.from(data);
    return {'value': data};
  }

  static ApiFailure _failure(DioException error) {
    final raw = error.response?.data;
    if (raw is Map) {
      final body = Map<String, dynamic>.from(raw);
      final errors = body['errors'];
      final message =
          body['message']?.toString() ??
          (errors is List && errors.isNotEmpty
              ? errors.first.toString()
              : null);
      if (message != null && message.isNotEmpty) {
        return ApiFailure(
          message,
          code: body['code']?.toString(),
          statusCode: error.response?.statusCode,
        );
      }
    }
    return ApiFailure(
      error.type == DioExceptionType.connectionError || error.response == null
          ? 'Could not reach Tenvora. Check your connection and try again.'
          : 'Tenvora could not complete this request.',
      statusCode: error.response?.statusCode,
    );
  }
}
