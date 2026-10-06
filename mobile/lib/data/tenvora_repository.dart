import 'package:uuid/uuid.dart';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../core/network/api_client.dart';
import '../domain/models.dart';

class TenvoraRepository {
  TenvoraRepository(this._api);

  final ApiClient _api;
  static const _uuid = Uuid();

  final Map<String, String> _pendingWrites = {};
  Future<SharedPreferences>? _pendingStore;
  Future<SharedPreferences> _loadPending() => _pendingStore ??= _readPending();
  Future<SharedPreferences> _readPending() async {
    final prefs = await SharedPreferences.getInstance();
    final stored = prefs.getString('tenvora_pending_writes');
    if (stored != null) {
      final entries = jsonDecode(stored) as Map<String, dynamic>;
      _pendingWrites.addAll(
        entries.map((key, value) => MapEntry(key, value as String)),
      );
    }
    return prefs;
  }

  Object? _canonical(Object? value) {
    if (value is Map) {
      final keys = value.keys.cast<String>().toList()..sort();
      return {for (final key in keys) key: _canonical(value[key])};
    }
    if (value is List) return value.map(_canonical).toList();
    return value;
  }

  Future<dynamic> _financialPost(String path, {required Object? data}) async {
    final scope = _api.sessionScope;
    final fingerprint =
        '$scope:${sha256.convert(utf8.encode('$path:${jsonEncode(_canonical(data))}'))}';
    final prefs = await _loadPending();
    final key = _pendingWrites.putIfAbsent(fingerprint, _uuid.v4);
    if (!await prefs.setString(
      'tenvora_pending_writes',
      jsonEncode(_pendingWrites),
    )) {
      throw const ApiFailure(
        'Could not save a safe retry ID. Please try again.',
      );
    }
    if (_api.sessionScope != scope) {
      throw const ApiFailure('Your account changed. Open the form again.');
    }
    try {
      final result = await _api.post(
        path,
        data: data,
        headers: {'Idempotency-Key': key},
      );
      _pendingWrites.remove(fingerprint);
      try {
        await prefs.setString(
          'tenvora_pending_writes',
          jsonEncode(_pendingWrites),
        );
      } catch (_) {
        // A confirmed server success must not be presented as an uncertain write.
        // A stale persisted retry ID remains safe through server idempotency.
      }
      return result;
    } on ApiFailure catch (failure) {
      final status = failure.statusCode;
      if (status != null &&
          status >= 400 &&
          status < 500 &&
          status != 408 &&
          status != 429) {
        _pendingWrites.remove(fingerprint);
        await prefs.setString(
          'tenvora_pending_writes',
          jsonEncode(_pendingWrites),
        );
        rethrow;
      }
      throw ApiFailure(
        'Could not confirm whether this was saved. Check your records; retrying the same details uses the original request ID.',
        statusCode: status,
      );
    }
  }

  List<Json> _items(Json body, [String key = 'value']) {
    final raw = body[key];
    return raw is List
        ? raw.whereType<Map>().map((item) => Json.from(item)).toList()
        : <Json>[];
  }

  Future<AuthSession> login(String email, String password) async =>
      AuthSession.fromJson(
        await _api.post(
          '/auth/login',
          data: {'email': email.trim(), 'password': password},
        ),
      );

  Future<AuthSession> register(
    String company,
    String email,
    String password,
    String currency,
  ) async => AuthSession.fromJson(
    await _api.post(
      '/auth/register',
      data: {
        'companyName': company.trim(),
        'email': email.trim(),
        'password': password,
        'baseCurrency': currency,
      },
    ),
  );

  Future<AuthSession> googleLogin(String idToken) async => AuthSession.fromJson(
    await _api.post('/auth/google', data: {'credential': idToken}),
  );

  Future<UserProfile> profile() async =>
      UserProfile.fromJson(await _api.get('/auth/me'));

  Future<void> deleteAccount(String email) async {
    await _api.post(
      '/account/delete',
      data: {'confirmationEmail': email.trim()},
    );
  }

  Future<void> logout(String? refreshToken) async {
    if (refreshToken != null) {
      await _api.post('/auth/logout', data: {'refreshToken': refreshToken});
    }
  }

  Future<UserProfile> completeOnboarding(Json input) async =>
      UserProfile.fromJson(await _api.post('/auth/onboarding', data: input));

  Future<UserProfile> updateSettings(Json input) async =>
      UserProfile.fromJson(await _api.put('/auth/settings', data: input));

  Future<void> setPassword({
    String? currentPassword,
    required String newPassword,
  }) async {
    await _api.post(
      '/auth/set-password',
      data: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
  }

  Future<Dashboard> dashboard([String period = 'today']) async =>
      Dashboard.fromJson(
        await _api.get('/business-dashboard', query: {'period': period}),
      );

  Future<PagedResult<Customer>> customers({
    String search = '',
    int page = 1,
    String? status = 'Active',
  }) async {
    final body = await _api.get(
      '/customers',
      query: {
        'search': search.isEmpty ? null : search,
        'status': status,
        'page': page,
        'pageSize': 20,
      },
    );
    return PagedResult(
      items: _items(body, 'items').map(Customer.fromJson).toList(),
      totalCount: jsonInt(body['totalCount']),
      page: jsonInt(body['page']),
      totalPages: jsonInt(body['totalPages']),
    );
  }

  Future<List<Customer>> allCustomers() async =>
      _items(
        await _api.get('/customers', query: {'status': 'Active'}),
      ).map(Customer.fromJson).toList();

  Future<Json> customerDetail(String id) async =>
      await _api.get('/customers/$id/history');

  Future<Customer> createCustomer(Json input) async =>
      Customer.fromJson(await _api.post('/customers', data: input));
  Future<Customer> updateCustomer(String id, Json input) async =>
      Customer.fromJson(await _api.put('/customers/$id', data: input));
  Future<void> deleteCustomer(String id) async {
    await _api.delete('/customers/$id');
  }

  Future<Json> customerStatement(
    String id, {
    DateTime? from,
    DateTime? to,
  }) async => await _api.get(
    '/customers/$id/statement',
    query: {'from': from?.toIso8601String(), 'to': to?.toIso8601String()},
  );

  Future<Json> recordCustomerPayment(String id, Json input) async =>
      await _financialPost('/customers/$id/payments', data: input);

  Future<PagedResult<Product>> products({
    String search = '',
    int page = 1,
    bool? active = true,
  }) async {
    final body = await _api.get(
      '/products',
      query: {
        'search': search.isEmpty ? null : search,
        'active': active,
        'page': page,
        'pageSize': 20,
      },
    );
    return PagedResult(
      items: _items(body, 'items').map(Product.fromJson).toList(),
      totalCount: jsonInt(body['totalCount']),
      page: jsonInt(body['page']),
      totalPages: jsonInt(body['totalPages']),
    );
  }

  Future<List<Product>> allProducts() async =>
      _items(
        await _api.get('/products', query: {'active': true}),
      ).map(Product.fromJson).toList();
  Future<Product> createProduct(Json input) async =>
      Product.fromJson(await _api.post('/products', data: input));
  Future<Product> updateProduct(String id, Json input) async =>
      Product.fromJson(await _api.put('/products/$id', data: input));
  Future<void> deleteProduct(String id) async {
    await _api.delete('/products/$id');
  }

  Future<Json> adjustStock(Json input) async =>
      await _api.post('/products/adjustments', data: input);
  Future<List<Json>> stockAdjustments([String? productId]) async => _items(
    await _api.get('/products/adjustments', query: {'productId': productId}),
  );

  Future<PagedResult<Sale>> sales({String search = '', int page = 1}) async {
    final body = await _api.get(
      '/sales',
      query: {
        'search': search.isEmpty ? null : search,
        'page': page,
        'pageSize': 20,
      },
    );
    return PagedResult(
      items: _items(body, 'items').map(Sale.fromJson).toList(),
      totalCount: jsonInt(body['totalCount']),
      page: jsonInt(body['page']),
      totalPages: jsonInt(body['totalPages']),
    );
  }

  Future<List<Sale>> allSales({String? from, String? to}) async =>
      _items(
        await _api.get('/sales', query: {'from': from, 'to': to}),
      ).map(Sale.fromJson).toList();
  Future<Sale> sale(String id) async =>
      Sale.fromJson(await _api.get('/sales/$id'));
  Future<Sale> createSale(Json input) async =>
      Sale.fromJson(await _financialPost('/sales', data: input));
  Future<Sale> recordSalePayment(String id, Json input) async =>
      Sale.fromJson(await _financialPost('/sales/$id/payments', data: input));
  Future<Sale> reverseSalePayment(
    String saleId,
    String paymentId,
    String reason,
  ) async => Sale.fromJson(
    await _financialPost(
      '/sales/$saleId/payments/$paymentId/reverse',
      data: {'reason': reason},
    ),
  );
  Future<Sale> voidSale(
    String id, {
    required bool reversePayments,
    String? reason,
  }) async => Sale.fromJson(
    await _financialPost(
      '/sales/$id/void',
      data: {'reversePayments': reversePayments, 'reason': reason},
    ),
  );

  Future<PagedResult<Supplier>> suppliers({
    String search = '',
    int page = 1,
    String? status = 'Active',
  }) async {
    final body = await _api.get(
      '/suppliers',
      query: {
        'search': search.isEmpty ? null : search,
        'status': status,
        'page': page,
        'pageSize': 20,
      },
    );
    return PagedResult(
      items: _items(body, 'items').map(Supplier.fromJson).toList(),
      totalCount: jsonInt(body['totalCount']),
      page: jsonInt(body['page']),
      totalPages: jsonInt(body['totalPages']),
    );
  }

  Future<List<Supplier>> allSuppliers() async =>
      _items(
        await _api.get('/suppliers', query: {'status': 'Active'}),
      ).map(Supplier.fromJson).toList();
  Future<Json> supplierDetail(String id) async =>
      await _api.get('/suppliers/$id/history');
  Future<Supplier> createSupplier(Json input) async =>
      Supplier.fromJson(await _api.post('/suppliers', data: input));
  Future<Supplier> updateSupplier(String id, Json input) async =>
      Supplier.fromJson(await _api.put('/suppliers/$id', data: input));
  Future<void> deleteSupplier(String id) async {
    await _api.delete('/suppliers/$id');
  }

  Future<PagedResult<Purchase>> purchases({
    String search = '',
    int page = 1,
  }) async {
    final body = await _api.get(
      '/purchases',
      query: {
        'search': search.isEmpty ? null : search,
        'page': page,
        'pageSize': 20,
      },
    );
    return PagedResult(
      items: _items(body, 'items').map(Purchase.fromJson).toList(),
      totalCount: jsonInt(body['totalCount']),
      page: jsonInt(body['page']),
      totalPages: jsonInt(body['totalPages']),
    );
  }

  Future<List<Purchase>> allPurchases({String? from, String? to}) async =>
      _items(
        await _api.get('/purchases', query: {'from': from, 'to': to}),
      ).map(Purchase.fromJson).toList();
  Future<Purchase> purchase(String id) async =>
      Purchase.fromJson(await _api.get('/purchases/$id'));
  Future<Purchase> createPurchase(Json input) async =>
      Purchase.fromJson(await _financialPost('/purchases', data: input));
  Future<Purchase> recordPurchasePayment(String id, Json input) async =>
      Purchase.fromJson(
        await _financialPost('/purchases/$id/payments', data: input),
      );
  Future<Purchase> reversePurchasePayment(
    String purchaseId,
    String paymentId,
    String reason,
  ) async => Purchase.fromJson(
    await _financialPost(
      '/purchases/$purchaseId/payments/$paymentId/reverse',
      data: {'reason': reason},
    ),
  );
  Future<Purchase> voidPurchase(
    String id, {
    required bool reversePayments,
    String? reason,
  }) async => Purchase.fromJson(
    await _financialPost(
      '/purchases/$id/void',
      data: {'reversePayments': reversePayments, 'reason': reason},
    ),
  );

  Future<PagedResult<Expense>> expenses({
    String search = '',
    int page = 1,
  }) async {
    final body = await _api.get(
      '/business-expenses',
      query: {
        'search': search.isEmpty ? null : search,
        'page': page,
        'pageSize': 20,
      },
    );
    return PagedResult(
      items: _items(body, 'items').map(Expense.fromJson).toList(),
      totalCount: jsonInt(body['totalCount']),
      page: jsonInt(body['page']),
      totalPages: jsonInt(body['totalPages']),
    );
  }

  Future<List<Expense>> allExpenses({String? from, String? to}) async =>
      _items(
        await _api.get('/business-expenses', query: {'from': from, 'to': to}),
      ).map(Expense.fromJson).toList();
  Future<Expense> createExpense(Json input) async =>
      Expense.fromJson(await _financialPost('/business-expenses', data: input));
  Future<Expense> updateExpense(String id, Json input) async =>
      Expense.fromJson(await _api.put('/business-expenses/$id', data: input));
  Future<void> deleteExpense(String id) async {
    await _api.delete('/business-expenses/$id');
  }

  Future<Json> agentChat(String message, {String? conversationId}) async =>
      await _api.post(
        '/ai/assistant/agent-chat',
        data: {'message': message, 'conversationId': conversationId},
      );
  Future<void> reportAiMessage(String id, String reason) async {
    await _api.post(
      '/ai-feedback/messages/$id/report',
      data: {'reason': reason},
    );
  }

  Future<List<Json>> conversations() async =>
      _items(await _api.get('/ai/assistant/conversations'));
  Future<Json> conversation(String id) async =>
      await _api.get('/ai/assistant/conversations/$id');
  Future<Json> confirmAction(String id, bool confirmed) async =>
      await _api.post(
        '/ai/assistant/actions/$id/confirm',
        data: {'confirmed': confirmed},
      );
  Future<void> deleteConversation(String id) async {
    await _api.delete('/ai/assistant/conversations/$id');
  }

  Future<List<AdminUser>> users() async =>
      _items(await _api.get('/admin/users')).map(AdminUser.fromJson).toList();
  Future<AdminUser> createUser(Json input) async =>
      AdminUser.fromJson(await _api.post('/admin/users', data: input));
  Future<void> toggleUser(String id) async {
    await _api.patch('/admin/users/$id/toggle-active');
  }

  Future<List<AuditEntry>> audit({
    String? entityType,
    String? entityId,
  }) async =>
      _items(
        await _api.get(
          '/audit',
          query: {'entityType': entityType, 'entityId': entityId, 'limit': 100},
        ),
      ).map(AuditEntry.fromJson).toList();
}
