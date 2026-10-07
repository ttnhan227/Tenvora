import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:shared_preferences/shared_preferences.dart';

class BusinessApi extends ApiClient {
  BusinessApi() : super(SessionStore());
  bool fails = false;
  @override
  Future<dynamic> post(
    String path, {
    Object? data,
    Map<String, dynamic>? headers,
  }) async {
    if (fails) throw const ApiFailure('offline');
    if (path.contains('/confirm')) return {'status': 'Executed'};
    return {'id': 'record', 'name': 'Customer'};
  }
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  setUp(() => SharedPreferences.setMockInitialValues({}));
  test(
    'successful manual and AI writes refresh retained workspace data',
    () async {
      final api = BusinessApi();
      final repository = TenvoraRepository(api);
      await repository.createCustomer({'name': 'Customer'});
      expect(repository.changes.value, 1);
      await repository.recordCustomerPayment('customer', {'amount': 10});
      expect(repository.changes.value, 2);
      await repository.confirmAction('proposal', true);
      expect(repository.changes.value, 3);
      api.fails = true;
      await expectLater(
        repository.createCustomer({'name': 'Customer'}),
        throwsA(isA<ApiFailure>()),
      );
      expect(repository.changes.value, 3);
    },
  );
}
