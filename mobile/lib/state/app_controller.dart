import 'package:flutter/material.dart';
import 'package:google_sign_in/google_sign_in.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/storage/session_store.dart';
import '../data/tenvora_repository.dart';
import '../domain/models.dart';

class AppController extends ChangeNotifier {
  AppController({required this.repository, required this.sessionStore});

  final TenvoraRepository repository;
  final SessionStore sessionStore;

  UserProfile? user;
  bool initializing = true;
  bool busy = false;
  bool isVietnamese = false;
  ThemeMode themeMode = ThemeMode.system;
  String? lastError;
  bool _googleInitialized = false;

  bool get isAuthenticated => user != null;

  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    isVietnamese = prefs.getString('tenvora_lang') == 'vi';
    themeMode = switch (prefs.getString('tenvora_theme')) {
      'light' => ThemeMode.light,
      'dark' => ThemeMode.dark,
      _ => ThemeMode.system,
    };
    await sessionStore.initialize();
    if (sessionStore.accessToken != null) {
      try {
        user = await repository.profile();
      } catch (_) {
        await sessionStore.clear();
      }
    }
    initializing = false;
    notifyListeners();
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
    user = null;
    notifyListeners();
    try {
      await repository.logout(refresh);
    } catch (_) {
      // Local sign-out must still complete while offline.
    }
    await sessionStore.clear();
  }

  Future<void> toggleLanguage() async {
    isVietnamese = !isVietnamese;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('tenvora_lang', isVietnamese ? 'vi' : 'en');
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
