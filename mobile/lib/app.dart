import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'core/theme/tenvora_theme.dart';
import 'state/app_controller.dart';
import 'ui/auth/auth_screen.dart';
import 'ui/auth/onboarding_screen.dart';
import 'ui/shell/app_shell.dart';
import 'ui/widgets/common.dart';

class TenvoraApp extends StatelessWidget {
  const TenvoraApp({super.key, required this.controller});
  final AppController controller;

  @override
  Widget build(BuildContext context) => AppScope(
    controller: controller,
    child: ListenableBuilder(
      listenable: controller,
      builder:
          (context, _) => MaterialApp(
            debugShowCheckedModeBanner: false,
            title: 'Tenvora',
            theme: tenvoraTheme(Brightness.light),
            darkTheme: tenvoraTheme(Brightness.dark),
            themeMode: controller.themeMode,
            builder:
                (context, child) => AnnotatedRegion<SystemUiOverlayStyle>(
                  value: tenvoraSystemUiStyle(Theme.of(context).brightness),
                  child: child ?? const SizedBox.shrink(),
                ),
            home:
                controller.initializing
                    ? const _StartupScreen()
                    : !controller.isAuthenticated && controller.startupFailed
                    ? _RecoveryScreen(controller: controller)
                    : !controller.isAuthenticated
                    ? const AuthScreen()
                    : !(controller.user?.onboardingCompleted ?? false)
                    ? const OnboardingScreen()
                    : const AppShell(),
          ),
    ),
  );
}

class _RecoveryScreen extends StatelessWidget {
  const _RecoveryScreen({required this.controller});
  final AppController controller;

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const TenvoraMark(size: 58),
              const SizedBox(height: 24),
              Text(
                controller.isVietnamese
                    ? 'Không thể kết nối Tenvora. Thử lại khi có mạng.'
                    : 'Could not open Tenvora. Check your connection and try again.',
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: controller.initialize,
                child: Text(controller.isVietnamese ? 'Thử lại' : 'Try again'),
              ),
              TextButton(
                onPressed: controller.logout,
                child: Text(
                  controller.isVietnamese
                      ? 'Đăng nhập tài khoản khác'
                      : 'Sign in with another account',
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

class _StartupScreen extends StatelessWidget {
  const _StartupScreen();
  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const TenvoraMark(size: 58),
          const SizedBox(height: 18),
          Text('Tenvora', style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 24),
          const SizedBox(
            width: 28,
            height: 28,
            child: CircularProgressIndicator(strokeWidth: 2.5),
          ),
        ],
      ),
    ),
  );
}
