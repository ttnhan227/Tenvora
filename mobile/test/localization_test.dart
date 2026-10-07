import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tenvora_mobile/core/localization/catalog.g.dart';
import 'package:tenvora_mobile/core/localization/languages.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/core/theme/tenvora_theme.dart';
import 'package:tenvora_mobile/core/utils/formatters.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:tenvora_mobile/state/app_controller.dart';
import 'package:tenvora_mobile/ui/auth/auth_screen.dart';
import 'package:tenvora_mobile/ui/widgets/language_picker.dart';

void main() {
  setUp(() {
    Intl.defaultLocale = 'en';
    SharedPreferences.setMockInitialValues({});
  });
  tearDown(() => Intl.defaultLocale = 'en');

  AppController controller() {
    final store = SessionStore();
    return AppController(
      repository: TenvoraRepository(ApiClient(store)),
      sessionStore: store,
    )..initializing = false;
  }

  test(
    'all offered languages cover every UI key and preserve placeholders',
    () {
      final english = languageCatalogs['en']!;
      for (final language in appLanguages) {
        final catalog = languageCatalogs[language.code]!;
        expect(catalog.keys.toSet(), english.keys.toSet());
        for (final entry in catalog.entries) {
          expect(entry.value.trim(), isNotEmpty);
          expect(
            RegExp(
              r'\{\w+\}',
            ).allMatches(entry.value).map((m) => m[0]).toList(),
            RegExp(r'\{\w+\}').allMatches(entry.key).map((m) => m[0]).toList(),
          );
        }
      }
    },
  );

  test('device matching and saved preference have a safe English fallback', () {
    expect(resolveLanguage('vi', [const Locale('de')]), 'vi');
    expect(resolveLanguage('system', [const Locale('pt', 'PT')]), 'pt-BR');
    expect(
      resolveLanguage('system', [const Locale('ja'), const Locale('fr')]),
      'fr',
    );
    expect(resolveLanguage('invalid', [const Locale('ja')]), 'en');
    expect(translate('unknown', 'Save customer'), 'Save customer');
  });

  test(
    'language selection persists without changing financial values',
    () async {
      final app = controller();
      await app.setLanguage('de');
      expect(app.languageCode, 'de');
      expect(
        (await SharedPreferences.getInstance()).getString('tenvora_lang'),
        'de',
      );
      expect(numberOf('12,50'), 12.5);
      expect(numberOf('1.234,50'), 1234.5);
      expect(numberOf('12.50'), 12.5); // existing editor values remain valid
      expect(numberOf('1,234.50', locale: 'en'), 1234.5); // CSV contract
      expect(numberOf('Infinity'), 0);
      await app.setLanguage('fr');
      expect(numberOf('1\u202f234,50'), 1234.5);
      expect(money(10, 'JPY'), contains('10'));
      expect(NumberFormat.currency(name: 'JPY').decimalDigits, 0);
      await expectLater(app.setLanguage('unknown'), throwsArgumentError);
      expect(app.languageCode, 'fr');
      app.dispose();
    },
  );

  for (final language in appLanguages) {
    testWidgets(
      '${language.code}: narrow large-text sign-in and language picker',
      (tester) async {
        await initializeDateFormatting();
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final app = controller();
        await app.setLanguage(language.code);
        await tester.pumpWidget(
          AppScope(
            controller: app,
            child: MaterialApp(
              locale: language.locale,
              supportedLocales: appLanguages.map((language) => language.locale),
              localizationsDelegates: GlobalMaterialLocalizations.delegates,
              theme: tenvoraTheme(Brightness.light),
              builder:
                  (context, child) => MediaQuery(
                    data: MediaQuery.of(
                      context,
                    ).copyWith(textScaler: const TextScaler.linear(1.5)),
                    child: child!,
                  ),
              home: const AuthScreen(),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(tester.takeException(), null);
        expect(
          find.text(translate(language.code, 'Welcome back')),
          findsOneWidget,
        );
        await tester.tap(find.byType(LanguageButton));
        await tester.pumpAndSettle();
        expect(tester.takeException(), null);
        expect(find.text('English'), findsOneWidget);
        await tester.tap(find.text('English'));
        await tester.pumpAndSettle();
        expect(app.languageCode, 'en');
        await tester.pumpWidget(const SizedBox());
        app.dispose();
      },
    );
  }
}
