import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:tenvora_mobile/domain/models.dart';
import 'package:tenvora_mobile/state/app_controller.dart';
import 'package:tenvora_mobile/ui/business/customers_screen.dart';
import 'package:tenvora_mobile/ui/business/suppliers_screen.dart';
import 'package:tenvora_mobile/ui/business/sales_screen.dart';
import 'package:tenvora_mobile/ui/business/purchases_screen.dart';

class SetupRepository extends TenvoraRepository {
  SetupRepository(SessionStore store) : super(ApiClient(store));
  bool fails = true;
  bool created = false;
  @override
  Future<List<Customer>> allCustomers() async {
    if (fails) throw const ApiFailure('offline');
    return created
        ? [
          Customer.fromJson({'id': 'fixture', 'name': 'Returned customer'}),
        ]
        : [];
  }

  @override
  Future<List<Supplier>> allSuppliers() async {
    if (fails) throw const ApiFailure('offline');
    return created
        ? [
          Supplier.fromJson({'id': 'fixture', 'name': 'Returned supplier'}),
        ]
        : [];
  }

  @override
  Future<List<Product>> allProducts() async => [];
  @override
  Future<PagedResult<Customer>> customers({
    String search = '',
    int page = 1,
    String? status = 'Active',
  }) async =>
      const PagedResult(items: [], totalCount: 0, page: 1, totalPages: 0);
  @override
  Future<PagedResult<Supplier>> suppliers({
    String search = '',
    int page = 1,
    String? status = 'Active',
  }) async =>
      const PagedResult(items: [], totalCount: 0, page: 1, totalPages: 0);
}

void main() {
  for (final sale in [true, false]) {
    testWidgets(
      '${sale ? 'sale' : 'purchase'} retries failed selectors and returns from setup to the transaction',
      (tester) async {
        final store = SessionStore();
        final repository = SetupRepository(store);
        final app =
            AppController(repository: repository, sessionStore: store)
              ..initializing = false
              ..user = UserProfile.fromJson({
                'id': 'owner',
                'email': 'fixture@example.invalid',
                'role': 'TenantAdmin',
              });
        await tester.pumpWidget(
          AppScope(
            controller: app,
            child: MaterialApp(
              home: sale ? const SaleFormScreen() : const PurchaseFormScreen(),
            ),
          ),
        );
        await tester.pumpAndSettle();
        expect(find.text('Could not load data'), findsOneWidget);
        repository.fails = false;
        await tester.tap(find.text('Try again'));
        await tester.pumpAndSettle();
        final setup = find.widgetWithText(
          FilledButton,
          sale ? 'Customers' : 'Suppliers',
        );
        await tester.ensureVisible(setup);
        await tester.tap(setup);
        await tester.pumpAndSettle();
        expect(
          sale ? find.byType(CustomersScreen) : find.byType(SuppliersScreen),
          findsOneWidget,
        );
        repository.created = true;
        await tester.pageBack();
        await tester.pumpAndSettle();
        expect(
          find.text(sale ? 'Returned customer' : 'Returned supplier'),
          findsWidgets,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
}
