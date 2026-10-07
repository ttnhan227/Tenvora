import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tenvora_mobile/app.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/core/theme/tenvora_theme.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:tenvora_mobile/state/app_controller.dart';
import 'package:tenvora_mobile/ui/auth/auth_screen.dart';

void main() {
  AppController controller() {
    final store = SessionStore();
    return AppController(
      repository: TenvoraRepository(ApiClient(store)),
      sessionStore: store,
    )..initializing = false;
  }

  for (final vietnamese in [false, true]) {
    testWidgets('narrow sign-in header tolerates large text ($vietnamese)', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(320, 640);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
      final app = controller()..isVietnamese = vietnamese;
      await tester.pumpWidget(
        AppScope(
          controller: app,
          child: MaterialApp(
            theme: tenvoraTheme(Brightness.light),
            home: MediaQuery(
              data: const MediaQueryData(textScaler: TextScaler.linear(1.5)),
              child: const AuthScreen(),
            ),
          ),
        ),
      );
      expect(tester.takeException(), null);
      expect(find.text('Tenvora'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      app.dispose();
    });
  }

  testWidgets(
    'status and navigation icons follow appearance without an app bar',
    (tester) async {
      final app = controller()..themeMode = ThemeMode.light;
      await tester.pumpWidget(TenvoraApp(controller: app));
      SystemUiOverlayStyle overlay() =>
          tester
              .widget<AnnotatedRegion<SystemUiOverlayStyle>>(
                find.byType(AnnotatedRegion<SystemUiOverlayStyle>).first,
              )
              .value;
      expect(overlay().statusBarIconBrightness, Brightness.dark);
      expect(overlay().systemNavigationBarIconBrightness, Brightness.dark);
      SharedPreferences.setMockInitialValues({});
      await app.setTheme(ThemeMode.dark);
      await tester.pumpAndSettle();
      expect(overlay().statusBarIconBrightness, Brightness.light);
      expect(overlay().systemNavigationBarIconBrightness, Brightness.light);
      await tester.pumpWidget(const SizedBox());
      app.dispose();
    },
  );
}
