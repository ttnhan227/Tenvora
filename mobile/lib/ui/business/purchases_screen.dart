import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';
import '../../domain/models.dart';
import '../../state/app_controller.dart';
import '../widgets/common.dart';
import '../widgets/receipt_photo.dart';

class PurchasesScreen extends StatefulWidget {
  const PurchasesScreen({super.key});
  @override
  State<PurchasesScreen> createState() => _PurchasesScreenState();
}

class _PurchasesScreenState extends State<PurchasesScreen> {
  final _search = TextEditingController();
  late Future<PagedResult<Purchase>> _future;
  bool _ready = false;
  int _page = 1;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_ready) {
      _ready = true;
      _load();
    }
  }

  void _load() =>
      _future = AppScope.of(
        context,
      ).repository.purchases(search: _search.text, page: _page);
  void _reload() => setState(_load);
  Future<void> _create() async {
    if (await Navigator.push<bool>(
          context,
          MaterialPageRoute(builder: (_) => const PurchaseFormScreen()),
        ) ==
        true) {
      _reload();
    }
  }

  Future<void> _detail(Purchase value) async {
    await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PurchaseDetailScreen(purchaseId: value.id),
      ),
    );
    _reload();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Purchases', 'Nhập hàng'))),
    floatingActionButton:
        AppScope.of(context).user!.canManage
            ? FloatingActionButton.extended(
              onPressed: _create,
              icon: const Icon(Icons.add),
              label: Text(tr(context, 'Purchase', 'Phiếu nhập')),
            )
            : null,
    body: PagePadding(
      child: Column(
        children: [
          TextField(
            controller: _search,
            onSubmitted: (_) {
              _page = 1;
              _reload();
            },
            decoration: InputDecoration(
              hintText: tr(
                context,
                'Search purchase or supplier',
                'Tìm phiếu hoặc nhà cung cấp',
              ),
              prefixIcon: const Icon(Icons.search),
              suffixIcon: IconButton(
                onPressed: () {
                  _page = 1;
                  _reload();
                },
                icon: const Icon(Icons.arrow_forward),
              ),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: FutureBuilder<PagedResult<Purchase>>(
              future: _future,
              builder: (context, snapshot) {
                if (snapshot.connectionState != ConnectionState.done) {
                  return const Center(child: CircularProgressIndicator());
                }
                if (snapshot.hasError) {
                  return ErrorState(error: snapshot.error!, onRetry: _reload);
                }
                final result = snapshot.data!;
                final items = result.items;
                if (items.isEmpty) {
                  return EmptyState(
                    icon: Icons.local_shipping_outlined,
                    title: tr(
                      context,
                      'No purchases yet',
                      'Chưa có phiếu nhập',
                    ),
                    message: tr(
                      context,
                      'Record stock and supplier costs here.',
                      'Ghi nhận tồn kho và chi phí nhà cung cấp tại đây.',
                    ),
                  );
                }
                return RefreshIndicator(
                  onRefresh: () async {
                    _reload();
                    await _future;
                  },
                  child: ListView.separated(
                    itemCount: items.length + (result.totalPages > 1 ? 1 : 0),
                    separatorBuilder: (_, _) => const SizedBox(height: 8),
                    itemBuilder: (_, i) {
                      if (i == items.length) {
                        return CompactPager(
                          page: result.page,
                          totalPages: result.totalPages,
                          onChanged: (value) {
                            _page = value;
                            _reload();
                          },
                        );
                      }
                      final p = items[i];
                      return PaperCard(
                        onTap: () => _detail(p),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    p.supplierName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                StatusPill(p.status),
                              ],
                            ),
                            const SizedBox(height: 5),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '${p.purchaseNumber} · ${compactDate(p.purchasedAt)}',
                                    style:
                                        Theme.of(context).textTheme.bodySmall,
                                  ),
                                ),
                                Text(
                                  money(p.totalAmount, p.currency),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                StatusPill(
                                  p.paymentStatus,
                                  positive: p.paymentStatus == 'Paid',
                                ),
                                const Spacer(),
                                Text(
                                  '${tr(context, 'Due', 'Còn nợ')}: ${money(p.outstandingBalance, p.currency)}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                );
              },
            ),
          ),
        ],
      ),
    ),
  );
}

class _PurchaseLineDraft {
  _PurchaseLineDraft({
    required this.description,
    required this.unit,
    required this.quantity,
    required this.cost,
    this.productId,
  });
  String description;
  String unit;
  double quantity;
  double cost;
  String? productId;
  double get total => quantity * cost;
}

class PurchaseFormScreen extends StatefulWidget {
  const PurchaseFormScreen({super.key});
  @override
  State<PurchaseFormScreen> createState() => _PurchaseFormScreenState();
}

class _PurchaseFormScreenState extends State<PurchaseFormScreen> {
  Supplier? _supplier;
  List<Supplier> _suppliers = [];
  List<Product> _products = [];
  final List<_PurchaseLineDraft> _lines = [];
  final _payment = TextEditingController(text: '0');
  final _notes = TextEditingController();
  String _method = 'Cash';
  String? _invoiceImage;
  bool _loading = true;
  bool _busy = false;
  double get total => _lines.fold(0, (sum, line) => sum + line.total);
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_loading) _bootstrap();
  }

  Future<void> _bootstrap() async {
    try {
      final repo = AppScope.of(context).repository;
      final values = await Future.wait([
        repo.allSuppliers(),
        repo.allProducts(),
      ]);
      if (mounted) {
        setState(() {
          _suppliers = values[0] as List<Supplier>;
          _products = values[1] as List<Product>;
          _supplier = _suppliers.isEmpty ? null : _suppliers.first;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        showMessage(context, readableError(e), error: true);
      }
    }
  }

  Future<void> _add() async {
    Product? product;
    final description = TextEditingController();
    final unit = TextEditingController(text: 'item');
    final quantity = TextEditingController(text: '1');
    final cost = TextEditingController();
    final ok = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder:
          (c) => StatefulBuilder(
            builder:
                (c, setLocal) => Padding(
                  padding: EdgeInsets.fromLTRB(
                    20,
                    16,
                    20,
                    MediaQuery.viewInsetsOf(c).bottom + 24,
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                tr(
                                  context,
                                  'Add purchase item',
                                  'Thêm mặt hàng',
                                ),
                                style:
                                    Theme.of(context).textTheme.headlineSmall,
                              ),
                            ),
                            IconButton(
                              onPressed: () => Navigator.pop(c, false),
                              icon: const Icon(Icons.close),
                            ),
                          ],
                        ),
                        DropdownButtonFormField<Product?>(
                          initialValue: product,
                          isExpanded: true,
                          decoration: InputDecoration(
                            labelText: tr(
                              context,
                              'Link product (optional)',
                              'Liên kết sản phẩm (tùy chọn)',
                            ),
                          ),
                          items: [
                            DropdownMenuItem<Product?>(
                              value: null,
                              child: Text(
                                tr(
                                  context,
                                  'Unlinked item',
                                  'Mặt hàng không liên kết',
                                ),
                              ),
                            ),
                            ..._products.map(
                              (p) => DropdownMenuItem<Product?>(
                                value: p,
                                child: Text(p.name),
                              ),
                            ),
                          ],
                          onChanged:
                              (v) => setLocal(() {
                                product = v;
                                if (v != null) {
                                  description.text = v.name;
                                  unit.text = v.unit;
                                  cost.text = v.costPrice.toString();
                                }
                              }),
                        ),
                        const SizedBox(height: 10),
                        TextField(
                          controller: description,
                          decoration: InputDecoration(
                            labelText: tr(context, 'Description', 'Mô tả'),
                          ),
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: unit,
                                decoration: InputDecoration(
                                  labelText: tr(context, 'Unit', 'Đơn vị'),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: quantity,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  labelText: tr(
                                    context,
                                    'Quantity',
                                    'Số lượng',
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: TextField(
                                controller: cost,
                                keyboardType: TextInputType.number,
                                decoration: InputDecoration(
                                  labelText: tr(
                                    context,
                                    'Unit cost',
                                    'Giá nhập',
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        FilledButton(
                          onPressed: () => Navigator.pop(c, true),
                          child: Text(tr(context, 'Add item', 'Thêm mặt hàng')),
                        ),
                      ],
                    ),
                  ),
                ),
          ),
    );
    if (ok == true &&
        description.text.trim().isNotEmpty &&
        numberOf(quantity.text) > 0) {
      setState(
        () => _lines.add(
          _PurchaseLineDraft(
            description: description.text.trim(),
            unit: unit.text.trim(),
            quantity: numberOf(quantity.text),
            cost: numberOf(cost.text),
            productId: product?.id,
          ),
        ),
      );
    }
  }

  Future<void> _submit() async {
    if (_supplier == null || _lines.isEmpty) {
      showMessage(
        context,
        tr(
          context,
          'Choose a supplier and add an item.',
          'Chọn nhà cung cấp và thêm mặt hàng.',
        ),
        error: true,
      );
      return;
    }
    setState(() => _busy = true);
    try {
      await AppScope.of(context).repository.createPurchase({
        'supplierId': _supplier!.id,
        'items':
            _lines
                .map(
                  (l) => {
                    'description': l.description,
                    'unit': l.unit,
                    'quantity': l.quantity,
                    'unitCost': l.cost,
                    'productId': l.productId,
                  },
                )
                .toList(),
        'paymentAmount': numberOf(_payment.text).clamp(0, total),
        'paymentMethod': _method,
        'notes': _notes.text.trim(),
        if (_invoiceImage != null) 'invoiceImageDataUrl': _invoiceImage,
      });
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'New purchase', 'Phiếu nhập mới'))),
    body:
        _loading
            ? const Center(child: CircularProgressIndicator())
            : PagePadding(
              child: ListView(
                children: [
                  DropdownButtonFormField<Supplier>(
                    initialValue: _supplier,
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: tr(context, 'Supplier', 'Nhà cung cấp'),
                    ),
                    items:
                        _suppliers
                            .map(
                              (s) => DropdownMenuItem(
                                value: s,
                                child: Text(s.name),
                              ),
                            )
                            .toList(),
                    onChanged: (v) => setState(() => _supplier = v),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          tr(context, 'Items', 'Mặt hàng'),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                      OutlinedButton.icon(
                        onPressed: _add,
                        icon: const Icon(Icons.add),
                        label: Text(tr(context, 'Add', 'Thêm')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ..._lines.asMap().entries.map(
                    (entry) => Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: PaperCard(
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    entry.value.description,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    '${entry.value.quantity} ${entry.value.unit} × ${money(entry.value.cost, AppScope.of(context).user!.preferredCurrency)}',
                                    style:
                                        Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              money(
                                entry.value.total,
                                AppScope.of(context).user!.preferredCurrency,
                              ),
                              style: const TextStyle(
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                            IconButton(
                              onPressed:
                                  () => setState(
                                    () => _lines.removeAt(entry.key),
                                  ),
                              icon: const Icon(Icons.close),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  PaperCard(
                    child: Row(
                      children: [
                        Text(
                          tr(context, 'Total', 'Tổng cộng'),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const Spacer(),
                        Text(
                          money(
                            total,
                            AppScope.of(context).user!.preferredCurrency,
                          ),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _payment,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: tr(
                              context,
                              'Paid now',
                              'Thanh toán ngay',
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: DropdownButtonFormField<String>(
                          initialValue: _method,
                          decoration: InputDecoration(
                            labelText: tr(context, 'Method', 'Phương thức'),
                          ),
                          items:
                              const ['Cash', 'Bank transfer', 'Card', 'Other']
                                  .map(
                                    (v) => DropdownMenuItem(
                                      value: v,
                                      child: Text(tr(context, v, v)),
                                    ),
                                  )
                                  .toList(),
                          onChanged: (v) => _method = v!,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: _notes,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: tr(context, 'Notes', 'Ghi chú'),
                    ),
                  ),
                  const SizedBox(height: 12),
                  ReceiptPhoto(
                    value: _invoiceImage,
                    languageCode: AppScope.of(context).languageCode,
                    enabled: !_busy,
                    onChanged: (value) => setState(() => _invoiceImage = value),
                  ),
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: _busy ? null : _submit,
                    icon: const Icon(Icons.check),
                    label: Text(
                      tr(context, 'Post purchase', 'Ghi nhận nhập hàng'),
                    ),
                  ),
                ],
              ),
            ),
  );
}

class PurchaseDetailScreen extends StatefulWidget {
  const PurchaseDetailScreen({super.key, required this.purchaseId});
  final String purchaseId;
  @override
  State<PurchaseDetailScreen> createState() => _PurchaseDetailScreenState();
}

class _PurchaseDetailScreenState extends State<PurchaseDetailScreen> {
  late Future<Purchase> _future;
  bool _ready = false;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_ready) {
      _ready = true;
      _future = AppScope.of(context).repository.purchase(widget.purchaseId);
    }
  }

  void _reload() => setState(
    () => _future = AppScope.of(context).repository.purchase(widget.purchaseId),
  );
  Future<void> _pay(Purchase purchase) async {
    final amount = TextEditingController(
      text: purchase.outstandingBalance.toString(),
    );
    String method = 'Cash';
    final ok = await showDialog<bool>(
      context: context,
      builder:
          (c) => StatefulBuilder(
            builder:
                (c, setLocal) => AlertDialog(
                  title: Text(
                    tr(context, 'Supplier payment', 'Thanh toán nhà cung cấp'),
                  ),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextField(
                        controller: amount,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: tr(context, 'Amount', 'Số tiền'),
                        ),
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: method,
                        items:
                            const ['Cash', 'Bank transfer', 'Card', 'Other']
                                .map(
                                  (v) => DropdownMenuItem(
                                    value: v,
                                    child: Text(tr(context, v, v)),
                                  ),
                                )
                                .toList(),
                        onChanged: (v) => setLocal(() => method = v!),
                      ),
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(c, false),
                      child: Text(tr(context, 'Cancel', 'Hủy')),
                    ),
                    FilledButton(
                      onPressed: () => Navigator.pop(c, true),
                      child: Text(tr(context, 'Record', 'Ghi nhận')),
                    ),
                  ],
                ),
          ),
    );
    if (!mounted) return;
    if (ok == true) {
      try {
        await AppScope.of(context).repository.recordPurchasePayment(
          purchase.id,
          {'amount': numberOf(amount.text), 'method': method},
        );
        _reload();
      } catch (e) {
        if (mounted) showMessage(context, readableError(e), error: true);
      }
    }
  }

  Future<void> _reverse(Purchase purchase, Payment payment) async {
    final reason = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder:
          (c) => AlertDialog(
            title: Text(
              tr(context, 'Reverse payment?', 'Hoàn tác thanh toán?'),
            ),
            content: TextField(
              controller: reason,
              decoration: InputDecoration(
                labelText: tr(context, 'Reason', 'Lý do'),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(c, false),
                child: Text(tr(context, 'Cancel', 'Hủy')),
              ),
              FilledButton(
                onPressed: () => Navigator.pop(c, true),
                child: Text(tr(context, 'Reverse', 'Hoàn tác')),
              ),
            ],
          ),
    );
    if (!mounted) return;
    if (ok == true) {
      try {
        await AppScope.of(context).repository.reversePurchasePayment(
          purchase.id,
          payment.id,
          reason.text.trim(),
        );
        _reload();
      } catch (e) {
        if (mounted) showMessage(context, readableError(e), error: true);
      }
    }
  }

  Future<void> _void() async {
    if (!await confirm(
      context,
      title: tr(context, 'Void purchase?', 'Hủy phiếu nhập?'),
      message: tr(
        context,
        'Inventory and payments will be reversed.',
        'Tồn kho và thanh toán sẽ được hoàn tác.',
      ),
      destructive: true,
    )) {
      return;
    }
    if (!mounted) return;
    try {
      await AppScope.of(context).repository.voidPurchase(
        widget.purchaseId,
        reversePayments: true,
        reason: 'Voided from mobile',
      );
      _reload();
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(tr(context, 'Purchase detail', 'Chi tiết phiếu nhập')),
    ),
    body: PagePadding(
      child: FutureBuilder<Purchase>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(error: snapshot.error!, onRetry: _reload);
          }
          final p = snapshot.data!;
          return ListView(
            children: [
              PageIntro(
                title: p.purchaseNumber,
                subtitle: '${p.supplierName} · ${shortDate(p.purchasedAt)}',
                action: StatusPill(p.status),
              ),
              const SizedBox(height: 14),
              if (p.invoiceImageDataUrl != null)
                ReceiptPhoto(
                  value: p.invoiceImageDataUrl,
                  languageCode: AppScope.of(context).languageCode,
                ),
              if (p.invoiceImageDataUrl != null) const SizedBox(height: 12),
              PaperCard(
                child: Column(
                  children: [
                    ...p.items.map(
                      (line) => Padding(
                        padding: const EdgeInsets.symmetric(vertical: 7),
                        child: Row(
                          children: [
                            Expanded(child: Text(line.description)),
                            Text(
                              '${line.quantity} × ${money(line.unitCost, p.currency)}',
                            ),
                            const SizedBox(width: 8),
                            Text(
                              money(line.lineTotal, p.currency),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const Divider(),
                    Row(
                      children: [
                        Text(
                          tr(context, 'Total', 'Tổng cộng'),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                        const Spacer(),
                        Text(
                          money(p.totalAmount, p.currency),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              ...p.payments.map(
                (payment) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: PaperCard(
                    child: Row(
                      children: [
                        Icon(
                          payment.isReversed
                              ? Icons.undo
                              : Icons.payments_outlined,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                money(payment.amount, payment.currency),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                '${tr(context, payment.method, payment.method)} · ${compactDate(payment.paidAt)}',
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ),
                        if (!payment.isReversed &&
                            p.status != 'Voided' &&
                            AppScope.of(context).user!.canManage)
                          IconButton(
                            onPressed: () => _reverse(p, payment),
                            icon: const Icon(Icons.undo),
                          ),
                      ],
                    ),
                  ),
                ),
              ),
              if (p.status != 'Voided' &&
                  p.outstandingBalance > 0 &&
                  AppScope.of(context).user!.canManage)
                FilledButton.icon(
                  onPressed: () => _pay(p),
                  icon: const Icon(Icons.payments_outlined),
                  label: Text(
                    tr(context, 'Record payment', 'Ghi nhận thanh toán'),
                  ),
                ),
              if (p.status != 'Voided' && AppScope.of(context).user!.canManage)
                TextButton(
                  onPressed: _void,
                  style: TextButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                  ),
                  child: Text(tr(context, 'Void purchase', 'Hủy phiếu nhập')),
                ),
            ],
          );
        },
      ),
    ),
  );
}
