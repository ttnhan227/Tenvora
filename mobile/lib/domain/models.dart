typedef Json = Map<String, dynamic>;

double jsonDouble(dynamic value) =>
    value is num ? value.toDouble() : double.tryParse('$value') ?? 0;
int jsonInt(dynamic value) =>
    value is num ? value.toInt() : int.tryParse('$value') ?? 0;
bool jsonBool(dynamic value, [bool fallback = false]) =>
    value is bool ? value : fallback;
String? jsonString(dynamic value) => value?.toString();
List<Json> jsonList(dynamic value) =>
    value is List
        ? value.whereType<Map>().map((item) => Json.from(item)).toList()
        : <Json>[];

class UserProfile {
  const UserProfile({
    required this.id,
    required this.tenantId,
    required this.email,
    required this.role,
    required this.preferredCurrency,
    required this.companyName,
    this.isActive = true,
    this.googleLinked = false,
    this.hasPassword = true,
    this.businessType,
    this.onboardingCompleted = false,
    this.fullName,
    this.phoneNumber,
  });

  factory UserProfile.fromJson(Json json) => UserProfile(
    id: '${json['id'] ?? json['userId'] ?? ''}',
    tenantId: '${json['tenantId'] ?? ''}',
    email: '${json['email'] ?? ''}',
    role: '${json['role'] ?? 'ReadOnly'}',
    preferredCurrency: '${json['preferredCurrency'] ?? 'VND'}',
    companyName: '${json['companyName'] ?? 'Tenvora'}',
    isActive: jsonBool(json['isActive'], true),
    googleLinked: jsonBool(json['googleLinked']),
    hasPassword: jsonBool(json['hasPassword'], true),
    businessType: jsonString(json['businessType']),
    onboardingCompleted: jsonBool(json['onboardingCompleted']),
    fullName: jsonString(json['fullName']),
    phoneNumber: jsonString(json['phoneNumber']),
  );

  final String id;
  final String tenantId;
  final String email;
  final String role;
  final String preferredCurrency;
  final String companyName;
  final bool isActive;
  final bool googleLinked;
  final bool hasPassword;
  final String? businessType;
  final bool onboardingCompleted;
  final String? fullName;
  final String? phoneNumber;

  bool get canManage => role == 'TenantAdmin' || role == 'OperationsManager';
  bool get isAdmin => role == 'TenantAdmin';
  String get displayName =>
      (fullName?.trim().isNotEmpty ?? false)
          ? fullName!.trim()
          : email.split('@').first;
}

class AuthSession {
  AuthSession.fromJson(Json json)
    : accessToken = '${json['accessToken'] ?? ''}',
      refreshToken = '${json['refreshToken'] ?? ''}',
      user = UserProfile.fromJson(json);

  final String accessToken;
  final String refreshToken;
  final UserProfile user;
}

class PagedResult<T> {
  const PagedResult({
    required this.items,
    required this.totalCount,
    required this.page,
    required this.totalPages,
  });

  final List<T> items;
  final int totalCount;
  final int page;
  final int totalPages;
}

class Customer {
  const Customer({
    required this.id,
    required this.name,
    required this.status,
    required this.currency,
    required this.totalSales,
    required this.totalPaid,
    required this.outstandingBalance,
    required this.salesCount,
    this.phone,
    this.email,
    this.address,
    this.notes,
  });

  factory Customer.fromJson(Json json) => Customer(
    id: '${json['id'] ?? ''}',
    name: '${json['name'] ?? ''}',
    phone: jsonString(json['phone']),
    email: jsonString(json['email']),
    address: jsonString(json['address']),
    notes: jsonString(json['notes']),
    status: '${json['status'] ?? 'Active'}',
    currency: '${json['currency'] ?? 'VND'}',
    totalSales: jsonDouble(json['totalSales']),
    totalPaid: jsonDouble(json['totalPaid']),
    outstandingBalance: jsonDouble(json['outstandingBalance']),
    salesCount: jsonInt(json['salesCount']),
  );

  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final String? notes;
  final String status;
  final String currency;
  final double totalSales;
  final double totalPaid;
  final double outstandingBalance;
  final int salesCount;

  Json toInput() => {
    'name': name,
    'phone': phone,
    'email': email,
    'address': address,
    'notes': notes,
    'status': status,
  };
}

class Product {
  const Product({
    required this.id,
    required this.name,
    required this.unit,
    required this.defaultPrice,
    required this.costPrice,
    required this.stockQuantity,
    required this.currency,
    required this.isActive,
    required this.trackInventory,
    this.sku,
    this.minStockLevel,
    this.notes,
    this.imageDataUrl,
  });

  factory Product.fromJson(Json json) => Product(
    id: '${json['id'] ?? ''}',
    name: '${json['name'] ?? ''}',
    sku: jsonString(json['sku']),
    unit: '${json['unit'] ?? 'item'}',
    defaultPrice: jsonDouble(json['defaultPrice']),
    costPrice: jsonDouble(json['costPrice']),
    stockQuantity: jsonDouble(json['stockQuantity']),
    minStockLevel:
        json['minStockLevel'] == null
            ? null
            : jsonDouble(json['minStockLevel']),
    currency: '${json['currency'] ?? 'VND'}',
    isActive: jsonBool(json['isActive'], true),
    trackInventory: jsonBool(json['trackInventory']),
    notes: jsonString(json['notes']),
    imageDataUrl: jsonString(json['imageDataUrl']),
  );

  final String id;
  final String name;
  final String? sku;
  final String unit;
  final double defaultPrice;
  final double costPrice;
  final double stockQuantity;
  final double? minStockLevel;
  final String currency;
  final bool isActive;
  final bool trackInventory;
  final String? notes;
  final String? imageDataUrl;

  bool get lowStock =>
      trackInventory &&
      minStockLevel != null &&
      stockQuantity <= minStockLevel!;
}

class Payment {
  const Payment({
    required this.id,
    required this.amount,
    required this.currency,
    required this.method,
    required this.paidAt,
    this.reference,
    this.notes,
    this.isReversed = false,
    this.reversalReason,
  });

  factory Payment.fromJson(Json json) => Payment(
    id: '${json['id'] ?? ''}',
    amount: jsonDouble(json['amount']),
    currency: '${json['currency'] ?? 'VND'}',
    method: '${json['method'] ?? 'Other'}',
    paidAt: DateTime.tryParse('${json['paidAt'] ?? ''}') ?? DateTime.now(),
    reference: jsonString(json['reference']),
    notes: jsonString(json['notes']),
    isReversed: jsonBool(json['isReversed']),
    reversalReason: jsonString(json['reversalReason']),
  );

  final String id;
  final double amount;
  final String currency;
  final String method;
  final DateTime paidAt;
  final String? reference;
  final String? notes;
  final bool isReversed;
  final String? reversalReason;
}

class SaleLine {
  const SaleLine({
    required this.productId,
    required this.productName,
    required this.unit,
    required this.quantity,
    required this.unitPrice,
    required this.lineTotal,
  });

  factory SaleLine.fromJson(Json json) => SaleLine(
    productId: '${json['productId'] ?? ''}',
    productName: '${json['productName'] ?? ''}',
    unit: '${json['unit'] ?? ''}',
    quantity: jsonDouble(json['quantity']),
    unitPrice: jsonDouble(json['unitPrice']),
    lineTotal: jsonDouble(json['lineTotal']),
  );

  final String productId;
  final String productName;
  final String unit;
  final double quantity;
  final double unitPrice;
  final double lineTotal;
}

class Sale {
  const Sale({
    required this.id,
    required this.saleNumber,
    required this.customerId,
    required this.customerName,
    required this.currency,
    required this.totalAmount,
    required this.paidAmount,
    required this.outstandingBalance,
    required this.paymentStatus,
    required this.status,
    required this.soldAt,
    required this.items,
    required this.payments,
    this.notes,
  });

  factory Sale.fromJson(Json json) => Sale(
    id: '${json['id'] ?? ''}',
    saleNumber: '${json['saleNumber'] ?? ''}',
    customerId: '${json['customerId'] ?? ''}',
    customerName: '${json['customerName'] ?? 'Customer'}',
    currency: '${json['currency'] ?? 'VND'}',
    totalAmount: jsonDouble(json['totalAmount']),
    paidAmount: jsonDouble(json['paidAmount']),
    outstandingBalance: jsonDouble(json['outstandingBalance']),
    paymentStatus: '${json['paymentStatus'] ?? 'Unpaid'}',
    status: '${json['status'] ?? 'Posted'}',
    notes: jsonString(json['notes']),
    soldAt: DateTime.tryParse('${json['soldAt'] ?? ''}') ?? DateTime.now(),
    items: jsonList(json['items']).map(SaleLine.fromJson).toList(),
    payments: jsonList(json['payments']).map(Payment.fromJson).toList(),
  );

  final String id;
  final String saleNumber;
  final String customerId;
  final String customerName;
  final String currency;
  final double totalAmount;
  final double paidAmount;
  final double outstandingBalance;
  final String paymentStatus;
  final String status;
  final String? notes;
  final DateTime soldAt;
  final List<SaleLine> items;
  final List<Payment> payments;
}

class Supplier {
  const Supplier({
    required this.id,
    required this.name,
    required this.status,
    required this.currency,
    required this.totalPurchases,
    required this.totalPaid,
    required this.outstandingBalance,
    required this.purchaseCount,
    this.phone,
    this.email,
    this.address,
    this.notes,
  });

  factory Supplier.fromJson(Json json) => Supplier(
    id: '${json['id'] ?? ''}',
    name: '${json['name'] ?? ''}',
    phone: jsonString(json['phone']),
    email: jsonString(json['email']),
    address: jsonString(json['address']),
    notes: jsonString(json['notes']),
    status: '${json['status'] ?? 'Active'}',
    currency: '${json['currency'] ?? 'VND'}',
    totalPurchases: jsonDouble(json['totalPurchases']),
    totalPaid: jsonDouble(json['totalPaid']),
    outstandingBalance: jsonDouble(json['outstandingBalance']),
    purchaseCount: jsonInt(json['purchaseCount']),
  );

  final String id;
  final String name;
  final String? phone;
  final String? email;
  final String? address;
  final String? notes;
  final String status;
  final String currency;
  final double totalPurchases;
  final double totalPaid;
  final double outstandingBalance;
  final int purchaseCount;
}

class PurchaseLine {
  const PurchaseLine({
    this.productId,
    required this.description,
    required this.unit,
    required this.quantity,
    required this.unitCost,
    required this.lineTotal,
  });

  factory PurchaseLine.fromJson(Json json) => PurchaseLine(
    productId: jsonString(json['productId']),
    description: '${json['description'] ?? ''}',
    unit: '${json['unit'] ?? ''}',
    quantity: jsonDouble(json['quantity']),
    unitCost: jsonDouble(json['unitCost']),
    lineTotal: jsonDouble(json['lineTotal']),
  );

  final String? productId;
  final String description;
  final String unit;
  final double quantity;
  final double unitCost;
  final double lineTotal;
}

class Purchase {
  const Purchase({
    required this.id,
    required this.purchaseNumber,
    required this.supplierId,
    required this.supplierName,
    required this.currency,
    required this.totalAmount,
    required this.paidAmount,
    required this.outstandingBalance,
    required this.paymentStatus,
    required this.status,
    required this.purchasedAt,
    required this.items,
    required this.payments,
    this.notes,
    this.invoiceImageDataUrl,
  });

  factory Purchase.fromJson(Json json) => Purchase(
    id: '${json['id'] ?? ''}',
    purchaseNumber: '${json['purchaseNumber'] ?? ''}',
    supplierId: '${json['supplierId'] ?? ''}',
    supplierName: '${json['supplierName'] ?? 'Supplier'}',
    currency: '${json['currency'] ?? 'VND'}',
    totalAmount: jsonDouble(json['totalAmount']),
    paidAmount: jsonDouble(json['paidAmount']),
    outstandingBalance: jsonDouble(json['outstandingBalance']),
    paymentStatus: '${json['paymentStatus'] ?? 'Unpaid'}',
    status: '${json['status'] ?? 'Posted'}',
    notes: jsonString(json['notes']),
    invoiceImageDataUrl: jsonString(json['invoiceImageDataUrl']),
    purchasedAt:
        DateTime.tryParse('${json['purchasedAt'] ?? ''}') ?? DateTime.now(),
    items: jsonList(json['items']).map(PurchaseLine.fromJson).toList(),
    payments: jsonList(json['payments']).map(Payment.fromJson).toList(),
  );

  final String id;
  final String purchaseNumber;
  final String supplierId;
  final String supplierName;
  final String currency;
  final double totalAmount;
  final double paidAmount;
  final double outstandingBalance;
  final String paymentStatus;
  final String status;
  final String? notes;
  final String? invoiceImageDataUrl;
  final DateTime purchasedAt;
  final List<PurchaseLine> items;
  final List<Payment> payments;
}

class Expense {
  const Expense({
    required this.id,
    required this.category,
    required this.amount,
    required this.currency,
    required this.expenseDate,
    this.description,
    this.receiptImageDataUrl,
  });

  factory Expense.fromJson(Json json) => Expense(
    id: '${json['id'] ?? ''}',
    category: '${json['category'] ?? 'Other'}',
    amount: jsonDouble(json['amount']),
    currency: '${json['currency'] ?? 'VND'}',
    description: jsonString(json['description']),
    receiptImageDataUrl: jsonString(json['receiptImageDataUrl']),
    expenseDate:
        DateTime.tryParse('${json['expenseDate'] ?? ''}') ?? DateTime.now(),
  );

  final String id;
  final String category;
  final double amount;
  final String currency;
  final String? description;
  final String? receiptImageDataUrl;
  final DateTime expenseDate;
}

class Activity {
  const Activity({
    required this.type,
    required this.id,
    required this.title,
    required this.detail,
    required this.amount,
    required this.occurredAt,
  });

  factory Activity.fromJson(Json json) => Activity(
    type: '${json['type'] ?? ''}',
    id: '${json['id'] ?? ''}',
    title: '${json['title'] ?? ''}',
    detail: '${json['detail'] ?? ''}',
    amount: jsonDouble(json['amount']),
    occurredAt:
        DateTime.tryParse('${json['occurredAt'] ?? ''}') ?? DateTime.now(),
  );

  final String type;
  final String id;
  final String title;
  final String detail;
  final double amount;
  final DateTime occurredAt;
}

class Dashboard {
  const Dashboard({
    required this.currency,
    required this.period,
    required this.periodSales,
    required this.periodCogs,
    required this.periodPayments,
    required this.periodPurchases,
    required this.periodSupplierPayments,
    required this.periodExpenses,
    required this.periodNetProfit,
    required this.outstandingCustomers,
    required this.outstandingSuppliers,
    required this.unpaidCustomers,
    required this.unpaidSuppliers,
    required this.recentActivity,
  });

  factory Dashboard.fromJson(Json json) => Dashboard(
    currency: '${json['currency'] ?? 'VND'}',
    period: '${json['period'] ?? 'today'}',
    periodSales: jsonDouble(json['periodSales'] ?? json['todaySales']),
    periodCogs: jsonDouble(json['periodCogs']),
    periodPayments: jsonDouble(json['periodPayments'] ?? json['todayPayments']),
    periodPurchases: jsonDouble(
      json['periodPurchases'] ?? json['todayPurchases'],
    ),
    periodSupplierPayments: jsonDouble(
      json['periodSupplierPayments'] ?? json['todaySupplierPayments'],
    ),
    periodExpenses: jsonDouble(json['periodExpenses'] ?? json['todayExpenses']),
    periodNetProfit: jsonDouble(json['periodNetProfit']),
    outstandingCustomers: jsonDouble(json['outstandingCustomers']),
    outstandingSuppliers: jsonDouble(json['outstandingSuppliers']),
    unpaidCustomers:
        jsonList(json['unpaidCustomers']).map(Customer.fromJson).toList(),
    unpaidSuppliers:
        jsonList(json['unpaidSuppliers']).map(Supplier.fromJson).toList(),
    recentActivity:
        jsonList(json['recentActivity']).map(Activity.fromJson).toList(),
  );

  final String currency;
  final String period;
  final double periodSales;
  final double periodCogs;
  final double periodPayments;
  final double periodPurchases;
  final double periodSupplierPayments;
  final double periodExpenses;
  final double periodNetProfit;
  final double outstandingCustomers;
  final double outstandingSuppliers;
  final List<Customer> unpaidCustomers;
  final List<Supplier> unpaidSuppliers;
  final List<Activity> recentActivity;
}

class AgentMessage {
  const AgentMessage({
    required this.id,
    required this.role,
    required this.content,
    required this.createdAt,
    this.proposal,
  });

  factory AgentMessage.fromJson(Json json) => AgentMessage(
    id: '${json['id'] ?? json['messageId'] ?? json['actionId'] ?? ''}',
    role: '${json['role'] ?? 'assistant'}',
    content: '${json['content'] ?? json['reply'] ?? json['message'] ?? ''}',
    createdAt:
        DateTime.tryParse('${json['createdAt'] ?? ''}') ?? DateTime.now(),
    proposal:
        json['proposal'] is Map
            ? AgentProposal.fromJson(Json.from(json['proposal'] as Map))
            : null,
  );

  final String id;
  final String role;
  final String content;
  final DateTime createdAt;
  final AgentProposal? proposal;
}

class AgentProposal {
  const AgentProposal({
    required this.actionId,
    required this.intent,
    required this.status,
    required this.summary,
    required this.details,
    required this.requiresConfirmation,
  });

  factory AgentProposal.fromJson(Json json) => AgentProposal(
    actionId: jsonString(json['actionId']),
    intent: '${json['intent'] ?? ''}',
    status: '${json['status'] ?? ''}',
    summary: '${json['summary'] ?? ''}',
    details:
        json['details'] is Map
            ? Json.from(json['details'] as Map)
            : <String, dynamic>{},
    requiresConfirmation: jsonBool(json['requiresConfirmation'], true),
  );

  final String? actionId;
  final String intent;
  final String status;
  final String summary;
  final Json details;
  final bool requiresConfirmation;
}

class AdminUser {
  const AdminUser({
    required this.id,
    required this.email,
    required this.role,
    required this.isActive,
    required this.preferredCurrency,
  });

  factory AdminUser.fromJson(Json json) => AdminUser(
    id: '${json['id'] ?? ''}',
    email: '${json['email'] ?? ''}',
    role: '${json['role'] ?? ''}',
    isActive: jsonBool(json['isActive'], true),
    preferredCurrency: '${json['preferredCurrency'] ?? 'VND'}',
  );

  final String id;
  final String email;
  final String role;
  final bool isActive;
  final String preferredCurrency;
}

class AuditEntry {
  const AuditEntry({
    required this.id,
    required this.action,
    required this.entityType,
    required this.entityId,
    required this.performedBy,
    required this.timestamp,
    required this.origin,
    this.notes,
  });

  factory AuditEntry.fromJson(Json json) => AuditEntry(
    id: '${json['id'] ?? ''}',
    action: '${json['action'] ?? ''}',
    entityType: '${json['entityType'] ?? ''}',
    entityId: '${json['entityId'] ?? ''}',
    performedBy: '${json['performedBy'] ?? ''}',
    timestamp:
        DateTime.tryParse('${json['timestamp'] ?? ''}') ?? DateTime.now(),
    origin: '${json['origin'] ?? 'Manual'}',
    notes: jsonString(json['notes']),
  );

  final String id;
  final String action;
  final String entityType;
  final String entityId;
  final String performedBy;
  final DateTime timestamp;
  final String origin;
  final String? notes;
}
