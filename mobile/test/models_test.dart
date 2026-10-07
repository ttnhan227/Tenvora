import 'package:tenvora_mobile/core/utils/formatters.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/domain/models.dart';

void main() {
  test('inventory display preserves fractional units', () {
    expect(stockQuantity(1.25), '1.25');
    expect(stockQuantity(0.001), '0.001');
    expect(stockQuantity(22), '22');
  });
  test('dashboard tolerates legacy today fields', () {
    final dashboard = Dashboard.fromJson({
      'currency': 'VND',
      'todaySales': 125000,
      'todayPayments': 100000,
      'todayPurchases': 50000,
      'todaySupplierPayments': 25000,
      'todayExpenses': 10000,
      'unpaidCustomers': <dynamic>[],
      'unpaidSuppliers': <dynamic>[],
      'recentActivity': <dynamic>[],
    });
    expect(dashboard.periodSales, 125000);
    expect(dashboard.periodPayments, 100000);
  });

  test('product low-stock state follows inventory settings', () {
    final product = Product.fromJson({
      'id': 'p1',
      'name': 'Coffee',
      'unit': 'bag',
      'defaultPrice': 10,
      'costPrice': 7,
      'stockQuantity': 2,
      'minStockLevel': 3,
      'currency': 'USD',
      'isActive': true,
      'trackInventory': true,
    });
    expect(product.lowStock, isTrue);
  });

  test('sale parses lines and payments', () {
    final sale = Sale.fromJson({
      'id': 's1',
      'saleNumber': 'S-1',
      'customerId': 'c1',
      'customerName': 'Ada',
      'currency': 'USD',
      'totalAmount': 20,
      'paidAmount': 10,
      'outstandingBalance': 10,
      'paymentStatus': 'Partially paid',
      'status': 'Posted',
      'soldAt': '2026-09-30T00:00:00Z',
      'items': [
        {
          'productId': 'p1',
          'productName': 'Coffee',
          'unit': 'bag',
          'quantity': 2,
          'unitPrice': 10,
          'lineTotal': 20,
        },
      ],
      'payments': <dynamic>[],
    });
    expect(sale.items.single.productName, 'Coffee');
    expect(sale.outstandingBalance, 10);
  });

  test('agent messages map chat and confirmed-action response fields', () {
    final chat = AgentMessage.fromJson({
      'messageId': 'm1',
      'reply': 'Here is the result.',
      'proposal': {
        'actionId': 'a1',
        'intent': 'expense',
        'status': 'PendingConfirmation',
        'summary': 'Record an expense',
        'details': <String, dynamic>{'amount': '10000'},
        'requiresConfirmation': true,
      },
    });
    final confirmation = AgentMessage.fromJson({
      'actionId': 'a1',
      'status': 'Executed',
      'message': 'Expense recorded.',
    });

    expect(chat.id, 'm1');
    expect(chat.content, 'Here is the result.');
    expect(chat.proposal?.actionId, 'a1');
    expect(confirmation.id, 'a1');
    expect(confirmation.content, 'Expense recorded.');
  });
}
