import 'package:uuid/uuid.dart';

import '../core/network/api_client.dart';
import '../domain/models.dart';

class TenvoraRepository {
  TenvoraRepository(this._api);

  final ApiClient _api;
  static const _uuid = Uuid();

  Map<String, dynamic> get _mutationHeaders => {'Idempotency-Key': _uuid.v4()};

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

  Future<Json> recordCustomerPayment(String id, Json input) async => await _api
      .post('/customers/$id/payments', data: input, headers: _mutationHeaders);

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
  Future<Sale> createSale(Json input) async => Sale.fromJson(
    await _api.post('/sales', data: input, headers: _mutationHeaders),
  );
  Future<Sale> recordSalePayment(String id, Json input) async => Sale.fromJson(
    await _api.post(
      '/sales/$id/payments',
      data: input,
      headers: _mutationHeaders,
    ),
  );
  Future<Sale> reverseSalePayment(
    String saleId,
    String paymentId,
    String reason,
  ) async => Sale.fromJson(
    await _api.post(
      '/sales/$saleId/payments/$paymentId/reverse',
      data: {'reason': reason},
      headers: _mutationHeaders,
    ),
  );
  Future<Sale> voidSale(
    String id, {
    required bool reversePayments,
    String? reason,
  }) async => Sale.fromJson(
    await _api.post(
      '/sales/$id/void',
      data: {'reversePayments': reversePayments, 'reason': reason},
      headers: _mutationHeaders,
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
  Future<Purchase> createPurchase(Json input) async => Purchase.fromJson(
    await _api.post('/purchases', data: input, headers: _mutationHeaders),
  );
  Future<Purchase> recordPurchasePayment(String id, Json input) async =>
      Purchase.fromJson(
        await _api.post(
          '/purchases/$id/payments',
          data: input,
          headers: _mutationHeaders,
        ),
      );
  Future<Purchase> reversePurchasePayment(
    String purchaseId,
    String paymentId,
    String reason,
  ) async => Purchase.fromJson(
    await _api.post(
      '/purchases/$purchaseId/payments/$paymentId/reverse',
      data: {'reason': reason},
      headers: _mutationHeaders,
    ),
  );
  Future<Purchase> voidPurchase(
    String id, {
    required bool reversePayments,
    String? reason,
  }) async => Purchase.fromJson(
    await _api.post(
      '/purchases/$id/void',
      data: {'reversePayments': reversePayments, 'reason': reason},
      headers: _mutationHeaders,
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
  Future<Expense> createExpense(Json input) async => Expense.fromJson(
    await _api.post(
      '/business-expenses',
      data: input,
      headers: _mutationHeaders,
    ),
  );
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
