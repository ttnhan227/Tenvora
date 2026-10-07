import 'dart:ui' show PlatformDispatcher;

import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

import '../core/localization/languages.dart';

import '../core/storage/session_store.dart';
import '../core/network/api_client.dart';
import '../data/tenvora_repository.dart';
import '../domain/models.dart';

class AppController extends ChangeNotifier {
  AppController({required this.repository, required this.sessionStore});

  final TenvoraRepository repository;
  final SessionStore sessionStore;

  UserProfile? user;
  bool initializing = true;
  bool startupFailed = false;
  bool busy = false;
  String languageCode = 'en';
  String languagePreference = 'system';

  ThemeMode themeMode = ThemeMode.system;
  String? lastError;
  bool _googleInitialized = false;

  bool get isAuthenticated => user != null;

  Future<void> initialize() async {
    initializing = true;
    startupFailed = false;
    lastError = null;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      _applyLanguage(prefs.getString('tenvora_lang') ?? 'system');
      themeMode = switch (prefs.getString('tenvora_theme')) {
        'light' => ThemeMode.light,
        'dark' => ThemeMode.dark,
        _ => ThemeMode.system,
      };
      await sessionStore.initialize();
      if (sessionStore.accessToken != null) {
        try {
          user = await repository.profile();
        } on ApiFailure catch (error) {
          if (error.statusCode == 401 || error.statusCode == 403) {
            await sessionStore.clear();
          } else {
            lastError = error.message;
            startupFailed = true;
          }
        }
      }
    } catch (_) {
      lastError = 'Could not open your session. Please try again.';
      startupFailed = true;
    } finally {
      initializing = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    busy = true;
    lastError = null;
    notifyListeners();
    try {
      final session = await repository.login(email, password);
      await sessionStore.save(
        access: session.accessToken,
        refresh: session.refreshToken,
      );
      user = session.user;
      return true;
    } catch (error) {
      lastError = error.toString();
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<bool> register(
    String company,
    String email,
    String password,
    String currency,
  ) async {
    busy = true;
    lastError = null;
    notifyListeners();
    try {
      final session = await repository.register(
        company,
        email,
        password,
        currency,
      );
      await sessionStore.save(
        access: session.accessToken,
        refresh: session.refreshToken,
      );
      user = session.user;
      return true;
    } catch (error) {
      lastError = error.toString();
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<bool> loginWithGoogle() async {
    busy = true;
    lastError = null;
    notifyListeners();
    try {
      const serverClientId = String.fromEnvironment('GOOGLE_SERVER_CLIENT_ID');
      if (serverClientId.isEmpty) {
        throw Exception(
          'Google sign-in is not configured for this app build. '
          'Install the latest Tenvora build and try again.',
        );
      }
      final google = GoogleSignIn.instance;
      if (!_googleInitialized) {
        await google.initialize(serverClientId: serverClientId);
        _googleInitialized = true;
      }
      final account = await google.authenticate();
      final idToken = account.authentication.idToken;
      if (idToken == null || idToken.isEmpty) {
        throw Exception('Google did not return an identity token.');
      }
      final session = await repository.googleLogin(idToken);
      await sessionStore.save(
        access: session.accessToken,
        refresh: session.refreshToken,
      );
      user = session.user;
      return true;
    } catch (error) {
      lastError = error.toString();
      return false;
    } finally {
      busy = false;
      notifyListeners();
    }
  }

  Future<void> refreshProfile() async {
    user = await repository.profile();
    notifyListeners();
  }

  Future<void> updateProfile(UserProfile profile) async {
    user = profile;
    notifyListeners();
  }

  Future<void> logout() async {
    final refresh = sessionStore.refreshToken;
    await sessionStore.clear();
    startupFailed = false;
    lastError = null;
    user = null;
    notifyListeners();
    try {
      await repository.logout(refresh);
    } catch (_) {
      // Local sign-out must still complete while offline.
    }
  }

  Future<void> deleteAccount(String email) async {
    await repository.deleteAccount(email);
    try {
      await sessionStore.clear();
    } finally {
      // The server has erased the account even if the device vault is unavailable.
      user = null;
      startupFailed = false;
      lastError = null;
      notifyListeners();
    }
  }

  void refreshDeviceLanguage() {
    if (languagePreference != 'system') return;
    _applyLanguage('system');
    notifyListeners();
  }

  void _applyLanguage(String preference) {
    languagePreference =
        appLanguages.any((language) => language.code == preference)
            ? preference
            : 'system';
    languageCode = resolveLanguage(
      languagePreference,
      PlatformDispatcher.instance.locales,
    );
    Intl.defaultLocale = languageFor(languageCode).locale.toString();
  }

  Future<void> setLanguage(String code) async {
    if (code != 'system' &&
        !appLanguages.any((language) => language.code == code)) {
      throw ArgumentError.value(code, 'code', 'Unsupported language');
    }
    _applyLanguage(code);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('tenvora_lang', languagePreference);
    notifyListeners();
  }

  Future<void> setTheme(ThemeMode mode) async {
    themeMode = mode;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('tenvora_theme', mode.name);
    notifyListeners();
  }
}

class AppScope extends InheritedNotifier<AppController> {
  const AppScope({
    super.key,
    required AppController controller,
    required super.child,
  }) : super(notifier: controller);

  static AppController of(BuildContext context) {
    final scope = context.dependOnInheritedWidgetOfExactType<AppScope>();
    assert(scope != null, 'AppScope is missing above this context.');
    return scope!.notifier!;
  }
}
