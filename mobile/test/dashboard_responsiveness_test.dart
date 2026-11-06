import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/core/theme/tenvora_theme.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:tenvora_mobile/domain/models.dart';
import 'package:tenvora_mobile/state/app_controller.dart';
import 'package:tenvora_mobile/ui/dashboard/dashboard_screen.dart';
import 'package:tenvora_mobile/ui/shell/app_shell.dart';
import 'package:tenvora_mobile/ui/widgets/common.dart';

class DashboardTestRepository extends TenvoraRepository {
  DashboardTestRepository(SessionStore store) : super(ApiClient(store));

  @override
  Future<Dashboard> dashboard([String period = 'today']) async =>
      const Dashboard(
        currency: 'USD',
        period: 'today',
        periodSales: 123456,
        periodCogs: 0,
        periodPayments: 0,
        periodPurchases: 0,
        periodSupplierPayments: 0,
        periodExpenses: 0,
        periodNetProfit: 123456,
        outstandingCustomers: 123456,
        outstandingSuppliers: 123456,
        unpaidCustomers: [],
        unpaidSuppliers: [],
        recentActivity: [],
      );

  @override
  Future<PagedResult<Sale>> sales({String search = '', int page = 1}) async =>
      const PagedResult(items: [], totalCount: 0, page: 1, totalPages: 0);
}

void main() {
  testWidgets('dashboard metric cards fit a narrow phone viewport', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 800);
    tester.view.devicePixelRatio = 1;
    addTearDown(() {
      tester.view.resetPhysicalSize();
      tester.view.resetDevicePixelRatio();
    });

    final store = SessionStore();
    final app =
        AppController(
            repository: DashboardTestRepository(store),
            sessionStore: store,
          )
          ..initializing = false
          ..user = UserProfile.fromJson({
            'id': 'owner',
            'email': 'owner@example.invalid',
            'role': 'TenantAdmin',
            'companyName': 'Sample business',
          });
    addTearDown(app.dispose);

    await tester.pumpWidget(
      AppScope(
        controller: app,
        child: MaterialApp(
          theme: tenvoraTheme(Brightness.light),
          home: MediaQuery(
            data: const MediaQueryData(textScaler: TextScaler.linear(1.5)),
            child: const Scaffold(body: DashboardScreen()),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(MetricCard), findsNWidgets(4));
    expect(tester.takeException(), isNull);
  });

  for (final width in [390.0, 599.0, 600.0, 839.0, 840.0, 900.0]) {
    testWidgets(
      'workspace navigation adapts at ${width.toInt()} logical pixels',
      (tester) async {
        tester.view.physicalSize = Size(width, 800);
        tester.view.devicePixelRatio = 1;
        addTearDown(() {
          tester.view.resetPhysicalSize();
          tester.view.resetDevicePixelRatio();
        });

        final store = SessionStore();
        final app =
            AppController(
                repository: DashboardTestRepository(store),
                sessionStore: store,
              )
              ..initializing = false
              ..user = UserProfile.fromJson({
                'id': 'owner',
                'email': 'owner@example.invalid',
                'role': 'TenantAdmin',
                'companyName': 'Sample business',
              });
        addTearDown(app.dispose);

        await tester.pumpWidget(
          AppScope(
            controller: app,
            child: MaterialApp(
              theme: tenvoraTheme(Brightness.light),
              home: const AppShell(),
            ),
          ),
        );
        await tester.pumpAndSettle();

        if (width < 600) {
          expect(find.byType(NavigationBar), findsOneWidget);
          expect(find.byType(NavigationRail), findsNothing);
        } else {
          expect(find.byType(NavigationRail), findsOneWidget);
          expect(find.byType(NavigationBar), findsNothing);
          final rail = tester.widget<NavigationRail>(
            find.byType(NavigationRail),
          );
          expect(
            rail.labelType,
            width < 840
                ? NavigationRailLabelType.selected
                : NavigationRailLabelType.all,
          );
        }
        expect(tester.takeException(), isNull);
      },
    );
  }
}
