import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';
import '../../domain/models.dart';
import '../../state/app_controller.dart';
import '../widgets/common.dart';

class SalesScreen extends StatefulWidget {
  const SalesScreen({super.key, this.embedded = false});
  final bool embedded;
  @override
  State<SalesScreen> createState() => _SalesScreenState();
}

class _SalesScreenState extends State<SalesScreen> {
  final _search = TextEditingController();
  late Future<PagedResult<Sale>> _future;
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
      ).repository.sales(search: _search.text, page: _page);
  void _reload() => setState(_load);
  Future<void> _create() async {
    if (await Navigator.push<bool>(
          context,
          MaterialPageRoute(builder: (_) => const SaleFormScreen()),
        ) ==
        true) {
      _reload();
    }
  }

  Future<void> _detail(Sale sale) async {
    await Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => SaleDetailScreen(saleId: sale.id)),
    );
    _reload();
  }

  @override
  Widget build(BuildContext context) {
    final content = PagePadding(
      child: Column(
        children: [
          if (widget.embedded)
            PageIntro(
              title: tr(context, 'Sales ledger', 'Sổ bán hàng'),
              subtitle: tr(
                context,
                'Invoices, payments and balances',
                'Hóa đơn, thanh toán và công nợ',
              ),
            ),
          if (widget.embedded) const SizedBox(height: 14),
          TextField(
            controller: _search,
            onSubmitted: (_) {
              _page = 1;
              _reload();
            },
            decoration: InputDecoration(
              hintText: tr(
                context,
                'Search sale or customer',
                'Tìm giao dịch hoặc khách',
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
            child: FutureBuilder<PagedResult<Sale>>(
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
                    icon: Icons.receipt_long_outlined,
                    title: tr(context, 'No sales yet', 'Chưa có giao dịch'),
                    message: tr(
                      context,
                      'Create a sale to start your ledger.',
                      'Tạo giao dịch để bắt đầu sổ bán hàng.',
                    ),
                    action: FilledButton.icon(
                      onPressed: _create,
                      icon: const Icon(Icons.add),
                      label: Text(tr(context, 'New sale', 'Tạo đơn')),
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
                      final s = items[i];
                      return PaperCard(
                        onTap: () => _detail(s),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    s.customerName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w800,
                                    ),
                                  ),
                                ),
                                StatusPill(s.status),
                              ],
                            ),
                            const SizedBox(height: 5),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    '${s.saleNumber} · ${compactDate(s.soldAt)}',
                                    style:
                                        Theme.of(context).textTheme.bodySmall,
                                  ),
                                ),
                                Text(
                                  money(s.totalAmount, s.currency),
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
                                  s.paymentStatus,
                                  positive: s.paymentStatus == 'Paid',
                                ),
                                const Spacer(),
                                Text(
                                  s.outstandingBalance > 0
                                      ? '${tr(context, 'Due', 'Còn nợ')}: ${money(s.outstandingBalance, s.currency)}'
                                      : tr(context, 'Settled', 'Đã thanh toán'),
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
    );
    if (widget.embedded) {
      return Stack(
        children: [
          content,
          if (AppScope.of(context).user!.canManage)
            Positioned(
              right: 16,
              bottom: 16,
              child: FloatingActionButton.extended(
                heroTag: 'saleFab',
                onPressed: _create,
                icon: const Icon(Icons.add),
                label: Text(tr(context, 'New sale', 'Tạo đơn')),
              ),
            ),
        ],
      );
    }
    return Scaffold(
      appBar: AppBar(title: Text(tr(context, 'Sales', 'Bán hàng'))),
      floatingActionButton:
          AppScope.of(context).user!.canManage
              ? FloatingActionButton.extended(
                onPressed: _create,
                icon: const Icon(Icons.add),
                label: Text(tr(context, 'New sale', 'Tạo đơn')),
              )
              : null,
      body: content,
    );
  }
}

class _DraftLine {
  _DraftLine(this.product, {this.quantity = 1});
  final Product product;
  double quantity;
  double get total => product.defaultPrice * quantity;
}

class SaleFormScreen extends StatefulWidget {
  const SaleFormScreen({super.key});
  @override
  State<SaleFormScreen> createState() => _SaleFormScreenState();
}

class _SaleFormScreenState extends State<SaleFormScreen> {
  Customer? _customer;
  List<Customer> _customers = [];
  List<Product> _products = [];
  final List<_DraftLine> _lines = [];
  final _payment = TextEditingController(text: '0');
  final _notes = TextEditingController();
  String _method = 'Cash';
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
        repo.allCustomers(),
        repo.allProducts(),
      ]);
      if (mounted) {
        setState(() {
          _customers = values[0] as List<Customer>;
          _products = values[1] as List<Product>;
          _customer = _customers.isEmpty ? null : _customers.first;
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

  Future<void> _addLine() async {
    Product? selected = _products.isEmpty ? null : _products.first;
    final qty = TextEditingController(text: '1');
    final ok = await showDialog<bool>(
      context: context,
      builder:
          (c) => StatefulBuilder(
            builder:
                (c, setLocal) => AlertDialog(
                  title: Text(tr(context, 'Add product', 'Thêm sản phẩm')),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      DropdownButtonFormField<Product>(
                        initialValue: selected,
                        isExpanded: true,
                        decoration: InputDecoration(
                          labelText: tr(context, 'Product', 'Sản phẩm'),
                        ),
                        items:
                            _products
                                .map(
                                  (p) => DropdownMenuItem(
                                    value: p,
                                    child: Text(
                                      p.name,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                )
                                .toList(),
                        onChanged: (v) => setLocal(() => selected = v),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: qty,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: tr(context, 'Quantity', 'Số lượng'),
                        ),
                      ),
                    ],
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(c, false),
                      child: Text(tr(context, 'Cancel', 'Hủy')),
                    ),
                    FilledButton(
                      onPressed:
                          selected == null
                              ? null
                              : () => Navigator.pop(c, true),
                      child: Text(tr(context, 'Add', 'Thêm')),
                    ),
                  ],
                ),
          ),
    );
    if (ok == true && selected != null) {
      setState(
        () => _lines.add(
          _DraftLine(
            selected!,
            quantity: numberOf(qty.text).clamp(.01, double.infinity).toDouble(),
          ),
        ),
      );
    }
  }

  Future<void> _submit() async {
    if (_customer == null || _lines.isEmpty) {
      showMessage(
        context,
        tr(
          context,
          'Choose a customer and at least one product.',
          'Chọn khách hàng và ít nhất một sản phẩm.',
        ),
        error: true,
      );
      return;
    }
    setState(() => _busy = true);
    try {
      await AppScope.of(context).repository.createSale({
        'customerId': _customer!.id,
        'items':
            _lines
                .map(
                  (l) => {
                    'productId': l.product.id,
                    'quantity': l.quantity,
                    'unitPrice': l.product.defaultPrice,
                  },
                )
                .toList(),
        'paymentAmount': numberOf(_payment.text).clamp(0, total),
        'paymentMethod': _method,
        'notes': _notes.text.trim(),
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
    appBar: AppBar(title: Text(tr(context, 'New sale', 'Tạo đơn bán'))),
    body:
        _loading
            ? const Center(child: CircularProgressIndicator())
            : PagePadding(
              child: ListView(
                children: [
                  PageIntro(
                    title: tr(context, 'Build the sale', 'Tạo đơn hàng'),
                    subtitle: tr(
                      context,
                      'Select a customer, products and payment.',
                      'Chọn khách, sản phẩm và thanh toán.',
                    ),
                  ),
                  const SizedBox(height: 18),
                  DropdownButtonFormField<Customer>(
                    initialValue: _customer,
                    isExpanded: true,
                    decoration: InputDecoration(
                      labelText: tr(context, 'Customer', 'Khách hàng'),
                      prefixIcon: const Icon(Icons.person_outline),
                    ),
                    items:
                        _customers
                            .map(
                              (c) => DropdownMenuItem(
                                value: c,
                                child: Text(c.name),
                              ),
                            )
                            .toList(),
                    onChanged: (v) => setState(() => _customer = v),
                  ),
                  const SizedBox(height: 18),
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          tr(context, 'Line items', 'Sản phẩm'),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ),
                      OutlinedButton.icon(
                        onPressed: _products.isEmpty ? null : _addLine,
                        icon: const Icon(Icons.add),
                        label: Text(tr(context, 'Add', 'Thêm')),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (_lines.isEmpty)
                    PaperCard(
                      child: Text(
                        tr(
                          context,
                          'No products added.',
                          'Chưa thêm sản phẩm.',
                        ),
                        textAlign: TextAlign.center,
                      ),
                    )
                  else
                    ..._lines.asMap().entries.map((entry) {
                      final l = entry.value;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: PaperCard(
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      l.product.name,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      '${l.quantity} × ${money(l.product.defaultPrice, l.product.currency)}',
                                      style:
                                          Theme.of(context).textTheme.bodySmall,
                                    ),
                                  ],
                                ),
                              ),
                              Text(
                                money(l.total, l.product.currency),
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
                      );
                    }),
                  const SizedBox(height: 10),
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
                  const SizedBox(height: 16),
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
                                      child: Text(
                                        v,
                                        overflow: TextOverflow.ellipsis,
                                      ),
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
                  const SizedBox(height: 20),
                  FilledButton.icon(
                    onPressed: _busy ? null : _submit,
                    icon: const Icon(Icons.check),
                    label: Text(tr(context, 'Post sale', 'Ghi nhận bán hàng')),
                  ),
                ],
              ),
            ),
  );
}

class SaleDetailScreen extends StatefulWidget {
  const SaleDetailScreen({super.key, required this.saleId});
  final String saleId;
  @override
  State<SaleDetailScreen> createState() => _SaleDetailScreenState();
}

class _SaleDetailScreenState extends State<SaleDetailScreen> {
  late Future<Sale> _future;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future = AppScope.of(context).repository.sale(widget.saleId);
  }

  void _reload() => setState(
    () => _future = AppScope.of(context).repository.sale(widget.saleId),
  );
  Future<void> _pay(Sale sale) async {
    final amount = TextEditingController(
      text: sale.outstandingBalance.toString(),
    );
    String method = 'Cash';
    final ok = await showDialog<bool>(
      context: context,
      builder:
          (c) => StatefulBuilder(
            builder:
                (c, setLocal) => AlertDialog(
                  title: Text(
                    tr(context, 'Record payment', 'Ghi nhận thanh toán'),
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
        await AppScope.of(context).repository.recordSalePayment(sale.id, {
          'amount': numberOf(amount.text),
          'method': method,
        });
        _reload();
      } catch (e) {
        if (mounted) showMessage(context, readableError(e), error: true);
      }
    }
  }

  Future<void> _void() async {
    if (!await confirm(
      context,
      title: tr(context, 'Void this sale?', 'Hủy giao dịch?'),
      message: tr(
        context,
        'Stock will be restored. Existing payments can also be reversed.',
        'Tồn kho sẽ được khôi phục. Thanh toán có thể được hoàn tác.',
      ),
      destructive: true,
    )) {
      return;
    }
    if (!mounted) return;
    try {
      await AppScope.of(context).repository.voidSale(
        widget.saleId,
        reversePayments: true,
        reason: 'Voided from mobile',
      );
      _reload();
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    }
  }

  Future<void> _reverse(Sale sale, Payment payment) async {
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
        await AppScope.of(context).repository.reverseSalePayment(
          sale.id,
          payment.id,
          reason.text.trim(),
        );
        _reload();
      } catch (e) {
        if (mounted) showMessage(context, readableError(e), error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(tr(context, 'Sale detail', 'Chi tiết giao dịch')),
    ),
    body: PagePadding(
      child: FutureBuilder<Sale>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(error: snapshot.error!, onRetry: _reload);
          }
          final s = snapshot.data!;
          return ListView(
            children: [
              PageIntro(
                title: s.saleNumber,
                subtitle: '${s.customerName} · ${shortDate(s.soldAt)}',
                action: StatusPill(s.status),
              ),
              const SizedBox(height: 16),
              PaperCard(
                child: Column(
                  children: [
                    for (final line in s.items)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 7),
                        child: Row(
                          children: [
                            Expanded(child: Text(line.productName)),
                            Text(
                              '${line.quantity} × ${money(line.unitPrice, s.currency)}',
                            ),
                            const SizedBox(width: 10),
                            Text(
                              money(line.lineTotal, s.currency),
                              style: const TextStyle(
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ],
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
                          money(s.totalAmount, s.currency),
                          style: Theme.of(context).textTheme.titleLarge,
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              PaperCard(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(tr(context, 'Paid', 'Đã thanh toán')),
                        ),
                        Text(money(s.paidAmount, s.currency)),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            tr(context, 'Outstanding', 'Còn nợ'),
                            style: const TextStyle(fontWeight: FontWeight.w700),
                          ),
                        ),
                        Text(
                          money(s.outstandingBalance, s.currency),
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (s.payments.isNotEmpty) ...[
                const SizedBox(height: 16),
                Text(
                  tr(context, 'Payment history', 'Lịch sử thanh toán'),
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                ...s.payments.map(
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
                              s.status != 'Voided' &&
                              AppScope.of(context).user!.canManage)
                            IconButton(
                              onPressed: () => _reverse(s, payment),
                              icon: const Icon(Icons.undo),
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
              if (s.status != 'Voided' &&
                  s.outstandingBalance > 0 &&
                  AppScope.of(context).user!.canManage) ...[
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: () => _pay(s),
                  icon: const Icon(Icons.payments_outlined),
                  label: Text(
                    tr(context, 'Record payment', 'Ghi nhận thanh toán'),
                  ),
                ),
              ],
              if (s.status != 'Voided' && AppScope.of(context).user!.canManage)
                TextButton(
                  onPressed: _void,
                  style: TextButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                  ),
                  child: Text(tr(context, 'Void sale', 'Hủy giao dịch')),
                ),
            ],
          );
        },
      ),
    ),
  );
}
