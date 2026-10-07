import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:tenvora_mobile/domain/models.dart';
import 'package:tenvora_mobile/state/app_controller.dart';
import 'package:tenvora_mobile/ui/business/products_screen.dart';
import 'package:tenvora_mobile/ui/business/suppliers_screen.dart';

class FormRepository extends TenvoraRepository {
  FormRepository(SessionStore store) : super(ApiClient(store));
  final supplier = Supplier.fromJson({
    'id': 'supplier',
    'name': 'Fixture supplier',
    'address': 'Keep address',
    'notes': 'Keep supplier notes',
    'status': 'Archived',
  });
  final product = Product.fromJson({
    'id': 'product',
    'name': 'Fixture product',
    'unit': 'item',
    'notes': 'Keep product notes',
    'isActive': false,
  });
  int writes = 0;
  Json? submitted;
  final supplierResult = Completer<Supplier>();
  final productResult = Completer<Product>();
  @override
  Future<PagedResult<Supplier>> suppliers({
    String search = '',
    int page = 1,
    String? status = 'Active',
  }) async =>
      PagedResult(items: [supplier], totalCount: 1, page: 1, totalPages: 1);
  @override
  Future<PagedResult<Product>> products({
    String search = '',
    int page = 1,
    bool? active = true,
  }) async =>
      PagedResult(items: [product], totalCount: 1, page: 1, totalPages: 1);
  @override
  Future<Supplier> updateSupplier(String id, Json input) {
    writes++;
    submitted = input;
    return supplierResult.future;
  }

  @override
  Future<Product> updateProduct(String id, Json input) {
    writes++;
    submitted = input;
    return productResult.future;
  }
}

void main() {
  for (final isSupplier in [true, false]) {
    testWidgets(
      '${isSupplier ? 'supplier' : 'product'} edit preserves web fields and blocks duplicate saves',
      (tester) async {
        tester.view.physicalSize = const Size(430, 900);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        final store = SessionStore();
        final repository = FormRepository(store);
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
              home:
                  isSupplier ? const SuppliersScreen() : const ProductsScreen(),
            ),
          ),
        );
        await tester.pumpAndSettle();
        await tester.tap(
          find.text(isSupplier ? 'Fixture supplier' : 'Fixture product'),
        );
        await tester.pumpAndSettle();
        final save = find.text(isSupplier ? 'Save supplier' : 'Save product');
        await tester.ensureVisible(save);
        await tester.tap(save);
        await tester.tap(save);
        await tester.pump();
        expect(repository.writes, 1);
        expect(
          repository.submitted!['notes'],
          isSupplier ? 'Keep supplier notes' : 'Keep product notes',
        );
        if (isSupplier) {
          expect(repository.submitted!['address'], 'Keep address');
          expect(repository.submitted!['status'], 'Archived');
          repository.supplierResult.complete(repository.supplier);
        } else {
          expect(repository.submitted!['isActive'], false);
          repository.productResult.complete(repository.product);
        }
        await tester.pumpAndSettle();
        expect(
          find.text(isSupplier ? 'Edit supplier' : 'Edit product'),
          findsNothing,
        );
        expect(tester.takeException(), isNull);
      },
    );
  }
}
