import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';

class PaymentApi extends ApiClient {
  PaymentApi() : super(SessionStore());
  bool loseReply = true;
  String scope = 'owner';
  final List<String> keys = [];
  @override
  String get sessionScope => scope;
  @override
  Future<dynamic> post(
    String path, {
    Object? data,
    Map<String, dynamic>? headers,
  }) async {
    keys.add(headers!['Idempotency-Key'] as String);
    if (loseReply) {
      loseReply = false;
      throw const ApiFailure('Reply lost');
    }
    return <String, dynamic>{'id': 'payment'};
  }
}

void main() {
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test(
    'ambiguous payment retry uses original ID; confirmed new payment gets a new ID',
    () async {
      final api = PaymentApi();
      final repository = TenvoraRepository(api);
      await expectLater(
        repository.recordCustomerPayment('customer', {
          'amount': 10,
          'method': 'Cash',
        }),
        throwsA(isA<ApiFailure>()),
      );
      await repository.recordCustomerPayment('customer', {
        'method': 'Cash',
        'amount': 10,
      });
      expect(api.keys[0], api.keys[1]);
      await repository.recordCustomerPayment('customer', {
        'amount': 10,
        'method': 'Cash',
      });
      expect(api.keys[2], isNot(api.keys[0]));
    },
  );
  test(
    'retry ID survives repository restart without storing financial content',
    () async {
      final api = PaymentApi();
      await expectLater(
        TenvoraRepository(api).recordCustomerPayment('private-customer', {
          'amount': 123456,
          'method': 'Cash',
        }),
        throwsA(isA<ApiFailure>()),
      );
      final prefs = await SharedPreferences.getInstance();
      expect(
        prefs.getString('tenvora_pending_writes'),
        isNot(contains('private-customer')),
      );
      expect(
        prefs.getString('tenvora_pending_writes'),
        isNot(contains('123456')),
      );
      await TenvoraRepository(api).recordCustomerPayment('private-customer', {
        'amount': 123456,
        'method': 'Cash',
      });
      expect(api.keys[0], api.keys[1]);
    },
  );
  test(
    'changed details and another account cannot reuse a prior retry ID',
    () async {
      final api = PaymentApi();
      final repository = TenvoraRepository(api);
      await expectLater(
        repository.recordCustomerPayment('customer', {'amount': 10}),
        throwsA(isA<ApiFailure>()),
      );
      await repository.recordCustomerPayment('customer', {'amount': 11});
      api.scope = 'other-owner';
      await repository.recordCustomerPayment('customer', {'amount': 10});
      expect(api.keys.toSet().length, 3);
    },
  );
}
