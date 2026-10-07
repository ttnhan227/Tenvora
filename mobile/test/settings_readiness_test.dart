import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tenvora_mobile/core/localization/languages.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:tenvora_mobile/domain/models.dart';
import 'package:tenvora_mobile/state/app_controller.dart';
import 'package:tenvora_mobile/ui/management/management_screens.dart';

class Store extends SessionStore {
  @override
  Future<void> clear() async {
    accessToken = null;
    refreshToken = null;
  }
}

class Repository extends TenvoraRepository {
  Repository(Store store) : super(ApiClient(store));
  int deletions = 0;
  @override
  Future<void> deleteAccount(String email) async {
    deletions++;
  }
}

void main() {
  Future<(AppController, Repository)> mount(
    WidgetTester tester, {
    String role = 'TenantAdmin',
    String language = 'en',
  }) async {
    final store = Store();
    final repository = Repository(store);
    final app = AppController(repository: repository, sessionStore: store)
      ..initializing = false;
    SharedPreferences.setMockInitialValues({});
    await app.setLanguage(language);
    app.user = UserProfile.fromJson({
      'id': 'u',
      'email': 'owner@test.invalid',
      'role': role,
      'companyName': 'Fixture',
      'preferredCurrency': 'CHF',
      'businessType': 'Custom category',
    });
    await tester.pumpWidget(
      AppScope(
        controller: app,
        child: MaterialApp(
          home: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(1.5)),
            child: const SettingsScreen(),
          ),
        ),
      ),
    );
    return (app, repository);
  }

  for (final language in appLanguages) {
    testWidgets(
      '${language.code}: small screen and large text tolerate saved custom settings',
      (tester) async {
        tester.view.physicalSize = const Size(320, 640);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final (app, _) = await mount(tester, language: language.code);
        expect(tester.takeException(), null);
        await tester.scrollUntilVisible(
          find.text(translate(language.code, 'Delete account')),
          200,
          scrollable:
              find
                  .descendant(
                    of: find.byType(ListView),
                    matching: find.byType(Scrollable),
                  )
                  .first,
        );
        expect(tester.takeException(), null);
        await tester.pumpWidget(const SizedBox());
        app.dispose();
      },
    );
  }
  testWidgets(
    'read-only member has account controls without workspace edit actions',
    (tester) async {
      final (app, _) = await mount(tester, role: 'ReadOnly');
      expect(find.text('Save changes'), findsNothing);
      expect(find.text('Change password'), findsOneWidget);
      await tester.pumpWidget(const SizedBox());
      app.dispose();
    },
  );
  testWidgets(
    'deletion is disabled until exact confirmation and cancel keeps account',
    (tester) async {
      final (app, repository) = await mount(tester);
      await tester.scrollUntilVisible(
        find.text('Delete account'),
        200,
        scrollable:
            find
                .descendant(
                  of: find.byType(ListView),
                  matching: find.byType(Scrollable),
                )
                .first,
      );
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete account'));
      await tester.pumpAndSettle();
      final button = tester.widget<FilledButton>(
        find.widgetWithText(FilledButton, 'Delete permanently'),
      );
      expect(button.onPressed, null);
      await tester.tap(find.text('Cancel'));
      await tester.pumpAndSettle();
      expect(repository.deletions, 0);
      expect(app.user, isNotNull);
      await tester.pumpWidget(const SizedBox());
      app.dispose();
    },
  );
}
