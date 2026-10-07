import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';
import '../../domain/models.dart';
import '../../state/app_controller.dart';
import '../widgets/common.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});
  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  final _search = TextEditingController();
  late Future<PagedResult<Customer>> _future;
  bool _ready = false;
  String _status = 'Active';
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
      _future = AppScope.of(context).repository.customers(
        search: _search.text,
        status: _status,
        page: _page,
      );
  void _reload() => setState(_load);

  Future<void> _edit([Customer? customer]) async {
    final changed = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => _CustomerForm(customer: customer),
    );
    if (changed == true) _reload();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Customers', 'Khách hàng'))),
    floatingActionButton:
        AppScope.of(context).user!.canManage
            ? FloatingActionButton.extended(
              onPressed: () => _edit(),
              icon: const Icon(Icons.add),
              label: Text(tr(context, 'Customer', 'Khách hàng')),
            )
            : null,
    body: PagePadding(
      child: Column(
        children: [
          TextField(
            controller: _search,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) {
              _page = 1;
              _reload();
            },
            decoration: InputDecoration(
              hintText: tr(context, 'Search customers', 'Tìm khách hàng'),
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
          const SizedBox(height: 10),
          SegmentedButton<String>(
            segments: [
              ButtonSegment(
                value: 'Active',
                label: Text(tr(context, 'Active', 'Đang hoạt động')),
              ),
              ButtonSegment(
                value: 'Archived',
                label: Text(tr(context, 'Archived', 'Đã lưu trữ')),
              ),
            ],
            selected: {_status},
            onSelectionChanged: (v) {
              _status = v.first;
              _page = 1;
              _reload();
            },
          ),
          const SizedBox(height: 12),
          Expanded(
            child: FutureBuilder<PagedResult<Customer>>(
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
                    icon: Icons.people_outline,
                    title: tr(
                      context,
                      'No customers found',
                      'Không tìm thấy khách hàng',
                    ),
                    message: tr(
                      context,
                      'Add a customer to start recording sales.',
                      'Thêm khách hàng để bắt đầu ghi nhận bán hàng.',
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
                    itemBuilder: (context, index) {
                      if (index == items.length) {
                        return CompactPager(
                          page: result.page,
                          totalPages: result.totalPages,
                          onChanged: (value) {
                            _page = value;
                            _reload();
                          },
                        );
                      }
                      final c = items[index];
                      return PaperCard(
                        onTap:
                            AppScope.of(context).user!.canManage
                                ? () => _edit(c)
                                : () => Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder:
                                        (_) => CustomerStatementScreen(
                                          customer: c,
                                        ),
                                  ),
                                ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              child: Text(
                                c.name.isEmpty
                                    ? '?'
                                    : c.name.characters.first.toUpperCase(),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    c.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  if (c.phone?.isNotEmpty ?? false)
                                    Text(
                                      c.phone!,
                                      style:
                                          Theme.of(context).textTheme.bodySmall,
                                    ),
                                  Text(
                                    '${c.salesCount} ${tr(context, 'sales', 'giao dịch')}',
                                    style:
                                        Theme.of(context).textTheme.bodySmall,
                                  ),
                                ],
                              ),
                            ),
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  money(c.outstandingBalance, c.currency),
                                  style: TextStyle(
                                    fontWeight: FontWeight.w800,
                                    color:
                                        c.outstandingBalance > 0
                                            ? Theme.of(
                                              context,
                                            ).colorScheme.error
                                            : null,
                                  ),
                                ),
                                Text(
                                  tr(context, 'outstanding', 'còn nợ'),
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

class _CustomerForm extends StatefulWidget {
  const _CustomerForm({this.customer});
  final Customer? customer;
  @override
  State<_CustomerForm> createState() => _CustomerFormState();
}

class _CustomerFormState extends State<_CustomerForm> {
  final _form = GlobalKey<FormState>();
  late final TextEditingController _name = TextEditingController(
    text: widget.customer?.name,
  );
  late final TextEditingController _phone = TextEditingController(
    text: widget.customer?.phone,
  );
  late final TextEditingController _email = TextEditingController(
    text: widget.customer?.email,
  );
  late final TextEditingController _address = TextEditingController(
    text: widget.customer?.address,
  );
  late final TextEditingController _notes = TextEditingController(
    text: widget.customer?.notes,
  );
  late String _status = widget.customer?.status ?? 'Active';
  bool _busy = false;

  Future<void> _save() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      final input = {
        'name': _name.text.trim(),
        'phone': _phone.text.trim(),
        'email': _email.text.trim(),
        'address': _address.text.trim(),
        'notes': _notes.text.trim(),
        'status': _status,
      };
      final repo = AppScope.of(context).repository;
      if (widget.customer == null) {
        await repo.createCustomer(input);
      } else {
        await repo.updateCustomer(widget.customer!.id, input);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove() async {
    if (!await confirm(
      context,
      title: tr(context, 'Remove customer?', 'Xóa khách hàng?'),
      message: tr(
        context,
        'Records with transactions are archived for safety.',
        'Hồ sơ có giao dịch sẽ được lưu trữ an toàn.',
      ),
      destructive: true,
    )) {
      return;
    }
    if (!mounted) return;
    try {
      await AppScope.of(context).repository.deleteCustomer(widget.customer!.id);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    }
  }

  Future<void> _payAccount() async {
    final amount = TextEditingController(
      text: widget.customer!.outstandingBalance.toString(),
    );
    String method = 'Cash';
    final ok = await showDialog<bool>(
      context: context,
      builder:
          (c) => StatefulBuilder(
            builder:
                (c, setLocal) => AlertDialog(
                  title: Text(
                    tr(context, 'Customer payment', 'Thanh toán khách hàng'),
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
        await AppScope.of(context).repository.recordCustomerPayment(
          widget.customer!.id,
          {'amount': numberOf(amount.text), 'method': method},
        );
        if (mounted) Navigator.pop(context, true);
      } catch (e) {
        if (mounted) showMessage(context, readableError(e), error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.fromLTRB(
      20,
      16,
      20,
      MediaQuery.viewInsetsOf(context).bottom + 24,
    ),
    child: SingleChildScrollView(
      child: Form(
        key: _form,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    widget.customer == null
                        ? tr(context, 'New customer', 'Khách hàng mới')
                        : tr(context, 'Edit customer', 'Sửa khách hàng'),
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                ),
                IconButton(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _name,
              decoration: InputDecoration(
                labelText: tr(context, 'Name', 'Tên'),
              ),
              validator:
                  (v) =>
                      (v?.trim().isEmpty ?? true)
                          ? tr(context, 'Required', 'Bắt buộc')
                          : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _phone,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: tr(context, 'Phone', 'Số điện thoại'),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: tr(context, 'Email', 'Email'),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _address,
              decoration: InputDecoration(
                labelText: tr(context, 'Address', 'Địa chỉ'),
              ),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _notes,
              maxLines: 3,
              decoration: InputDecoration(
                labelText: tr(context, 'Notes', 'Ghi chú'),
              ),
            ),
            if (widget.customer != null) ...[
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: _status,
                decoration: InputDecoration(
                  labelText: tr(context, 'Status', 'Trạng thái'),
                ),
                items:
                    const ['Active', 'Archived']
                        .map(
                          (v) => DropdownMenuItem(
                            value: v,
                            child: Text(tr(context, v, v)),
                          ),
                        )
                        .toList(),
                onChanged: (v) => _status = v!,
              ),
            ],
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(tr(context, 'Save customer', 'Lưu khách hàng')),
            ),
            if (widget.customer != null)
              OutlinedButton.icon(
                onPressed:
                    _busy
                        ? null
                        : () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder:
                                (_) => CustomerStatementScreen(
                                  customer: widget.customer!,
                                ),
                          ),
                        ),
                icon: const Icon(Icons.description_outlined),
                label: Text(tr(context, 'View statement', 'Xem sao kê')),
              ),
            if (widget.customer != null &&
                widget.customer!.outstandingBalance > 0)
              OutlinedButton.icon(
                onPressed: _busy ? null : _payAccount,
                icon: const Icon(Icons.payments_outlined),
                label: Text(
                  tr(
                    context,
                    'Record account payment',
                    'Ghi nhận thanh toán công nợ',
                  ),
                ),
              ),
            if (widget.customer != null)
              TextButton(
                onPressed: _busy ? null : _remove,
                style: TextButton.styleFrom(
                  foregroundColor: Theme.of(context).colorScheme.error,
                ),
                child: Text(tr(context, 'Remove customer', 'Xóa khách hàng')),
              ),
          ],
        ),
      ),
    ),
  );
}

class CustomerStatementScreen extends StatefulWidget {
  const CustomerStatementScreen({super.key, required this.customer});
  final Customer customer;
  @override
  State<CustomerStatementScreen> createState() =>
      _CustomerStatementScreenState();
}

class _CustomerStatementScreenState extends State<CustomerStatementScreen> {
  late Future<Json> _future;
  DateTime? _from;
  DateTime? _to;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _load();
  }

  void _load() =>
      _future = AppScope.of(
        context,
      ).repository.customerStatement(widget.customer.id, from: _from, to: _to);
  Future<void> _date(bool from) async {
    final value = await showDatePicker(
      context: context,
      initialDate:
          from
              ? (_from ?? DateTime.now().subtract(const Duration(days: 30)))
              : (_to ?? DateTime.now()),
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (value != null) {
      setState(() {
        if (from) {
          _from = value;
        } else {
          _to = value;
        }
        _load();
      });
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(tr(context, 'Customer statement', 'Sao kê khách hàng')),
    ),
    body: PagePadding(
      child: FutureBuilder<Json>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(
              error: snapshot.error!,
              onRetry: () => setState(_load),
            );
          }
          final body = snapshot.data!;
          final entries = jsonList(body['entries']);
          final currency = widget.customer.currency;
          return ListView(
            children: [
              PageIntro(
                title: widget.customer.name,
                subtitle: tr(
                  context,
                  'Account activity and running balance',
                  'Giao dịch và số dư công nợ',
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _date(true),
                      icon: const Icon(Icons.calendar_today, size: 17),
                      label: Text(
                        _from == null
                            ? tr(context, 'From', 'Từ ngày')
                            : compactDate(_from!),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _date(false),
                      icon: const Icon(Icons.event, size: 17),
                      label: Text(
                        _to == null
                            ? tr(context, 'To', 'Đến ngày')
                            : compactDate(_to!),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              GridView.count(
                crossAxisCount: 3,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 8,
                childAspectRatio: .95,
                children: [
                  MetricCard(
                    label: tr(context, 'Debits', 'Phát sinh nợ'),
                    value: money(jsonDouble(body['totalDebits']), currency),
                    icon: Icons.north_east,
                  ),
                  MetricCard(
                    label: tr(context, 'Credits', 'Thanh toán'),
                    value: money(jsonDouble(body['totalCredits']), currency),
                    icon: Icons.south_west,
                  ),
                  MetricCard(
                    label: tr(context, 'Closing', 'Số dư cuối'),
                    value: money(jsonDouble(body['closingBalance']), currency),
                    icon: Icons.account_balance_wallet_outlined,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              if (entries.isEmpty)
                EmptyState(
                  icon: Icons.description_outlined,
                  title: tr(
                    context,
                    'No statement entries',
                    'Không có dòng sao kê',
                  ),
                  message: tr(
                    context,
                    'Try a different date range.',
                    'Thử khoảng thời gian khác.',
                  ),
                )
              else
                ...entries.map(
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
                                  '${entry['description'] ?? entry['type'] ?? ''}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Text(
                                  '${entry['reference'] ?? ''} · ${entry['date'] == null ? '' : compactDate(DateTime.tryParse('${entry['date']}') ?? DateTime.now())}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                jsonDouble(entry['debit']) > 0
                                    ? money(
                                      jsonDouble(entry['debit']),
                                      currency,
                                    )
                                    : '-${money(jsonDouble(entry['credit']), currency)}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              Text(
                                money(
                                  jsonDouble(entry['runningBalance']),
                                  currency,
                                ),
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    ),
  );
}
