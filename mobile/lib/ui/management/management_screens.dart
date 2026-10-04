import 'dart:convert';

import 'package:csv/csv.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../core/theme/tenvora_theme.dart';
import '../../core/utils/formatters.dart';
import '../../domain/models.dart';
import '../../state/app_controller.dart';
import '../widgets/common.dart';

class ReportsScreen extends StatefulWidget {
  const ReportsScreen({super.key});
  @override
  State<ReportsScreen> createState() => _ReportsScreenState();
}

class _ReportsScreenState extends State<ReportsScreen> {
  late Future<Dashboard> _future;
  String _period = 'month';
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future = AppScope.of(context).repository.dashboard(_period);
  }

  void _reload() => setState(
    () => _future = AppScope.of(context).repository.dashboard(_period),
  );
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Reports', 'Báo cáo'))),
    body: PagePadding(
      child: FutureBuilder<Dashboard>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(error: snapshot.error!, onRetry: _reload);
          }
          final d = snapshot.data!;
          final max = [
            d.periodSales,
            d.periodPurchases,
            d.periodExpenses,
            d.periodNetProfit.abs(),
          ].reduce((a, b) => a > b ? a : b);
          return ListView(
            children: [
              Row(
                children: [
                  Expanded(
                    child: PageIntro(
                      title: tr(
                        context,
                        'Business report',
                        'Báo cáo kinh doanh',
                      ),
                      subtitle: tr(
                        context,
                        'A compact financial pulse',
                        'Tổng quan tài chính nhanh',
                      ),
                    ),
                  ),
                  DropdownButton<String>(
                    value: _period,
                    items: [
                      DropdownMenuItem(
                        value: 'week',
                        child: Text(tr(context, 'Week', 'Tuần')),
                      ),
                      DropdownMenuItem(
                        value: 'month',
                        child: Text(tr(context, 'Month', 'Tháng')),
                      ),
                      DropdownMenuItem(
                        value: 'year',
                        child: Text(tr(context, 'Year', 'Năm')),
                      ),
                    ],
                    onChanged: (v) {
                      _period = v!;
                      _reload();
                    },
                  ),
                ],
              ),
              const SizedBox(height: 18),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.3,
                children: [
                  MetricCard(
                    label: tr(context, 'Revenue', 'Doanh thu'),
                    value: money(d.periodSales, d.currency),
                    icon: Icons.trending_up,
                  ),
                  MetricCard(
                    label: tr(context, 'Gross profit', 'Lợi nhuận gộp'),
                    value: money(d.periodSales - d.periodCogs, d.currency),
                    icon: Icons.show_chart,
                  ),
                  MetricCard(
                    label: tr(
                      context,
                      'Operating expense',
                      'Chi phí hoạt động',
                    ),
                    value: money(d.periodExpenses, d.currency),
                    icon: Icons.payments_outlined,
                    accent: TenvoraColors.amber,
                  ),
                  MetricCard(
                    label: tr(context, 'Net profit', 'Lợi nhuận ròng'),
                    value: money(d.periodNetProfit, d.currency),
                    icon: Icons.insights,
                    accent: d.periodNetProfit < 0 ? TenvoraColors.danger : null,
                  ),
                ],
              ),
              const SizedBox(height: 22),
              Text(
                tr(context, 'Performance', 'Hiệu quả'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 10),
              PaperCard(
                child: Column(
                  children: [
                    _Bar(
                      tr(context, 'Sales', 'Doanh thu'),
                      d.periodSales,
                      max,
                      Theme.of(context).colorScheme.primary,
                      d.currency,
                    ),
                    _Bar(
                      tr(context, 'Cost of goods', 'Giá vốn'),
                      d.periodCogs,
                      max,
                      TenvoraColors.amber,
                      d.currency,
                    ),
                    _Bar(
                      tr(context, 'Expenses', 'Chi phí'),
                      d.periodExpenses,
                      max,
                      TenvoraColors.danger,
                      d.currency,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              PaperCard(
                child: Column(
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            tr(
                              context,
                              'Customer receivables',
                              'Phải thu khách hàng',
                            ),
                          ),
                        ),
                        Text(
                          money(d.outstandingCustomers, d.currency),
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                    const Divider(),
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            tr(
                              context,
                              'Supplier payables',
                              'Phải trả nhà cung cấp',
                            ),
                          ),
                        ),
                        Text(
                          money(d.outstandingSuppliers, d.currency),
                          style: const TextStyle(fontWeight: FontWeight.w800),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    ),
  );
}

class _Bar extends StatelessWidget {
  const _Bar(this.label, this.value, this.max, this.color, this.currency);
  final String label;
  final double value;
  final double max;
  final Color color;
  final String currency;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 8),
    child: Column(
      children: [
        Row(
          children: [
            Expanded(child: Text(label)),
            Text(
              money(value, currency),
              style: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ],
        ),
        const SizedBox(height: 7),
        LinearProgressIndicator(
          value: max <= 0 ? 0 : (value.abs() / max).clamp(0.0, 1.0).toDouble(),
          minHeight: 9,
          borderRadius: BorderRadius.circular(99),
          color: color,
          backgroundColor: color.withValues(alpha: .12),
        ),
      ],
    ),
  );
}

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  late final _company = TextEditingController(
    text: AppScope.of(context).user!.companyName,
  );
  late final _name = TextEditingController(
    text: AppScope.of(context).user!.fullName,
  );
  late final _phone = TextEditingController(
    text: AppScope.of(context).user!.phoneNumber,
  );
  late String _currency = AppScope.of(context).user!.preferredCurrency;
  late String _type = AppScope.of(context).user!.businessType ?? 'Retail';
  bool _busy = false;
  Future<void> _save() async {
    setState(() => _busy = true);
    try {
      final app = AppScope.of(context);
      final profile = await app.repository.updateSettings({
        'companyName': _company.text.trim(),
        'preferredCurrency': _currency,
        'businessType': _type,
        'fullName': _name.text.trim(),
        'phoneNumber': _phone.text.trim(),
      });
      await app.updateProfile(profile);
      if (mounted) {
        showMessage(context, tr(context, 'Settings saved', 'Đã lưu cài đặt'));
      }
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _password() async {
    final current = TextEditingController();
    final next = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder:
          (c) => AlertDialog(
            title: Text(tr(context, 'Change password', 'Đổi mật khẩu')),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: current,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: tr(
                      context,
                      'Current password',
                      'Mật khẩu hiện tại',
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: next,
                  obscureText: true,
                  decoration: InputDecoration(
                    labelText: tr(context, 'New password', 'Mật khẩu mới'),
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
                onPressed: () => Navigator.pop(c, true),
                child: Text(tr(context, 'Update', 'Cập nhật')),
              ),
            ],
          ),
    );
    if (!mounted) return;
    if (ok == true) {
      final value = next.text;
      final strong =
          value.length >= 12 &&
          value.contains(RegExp('[A-Z]')) &&
          value.contains(RegExp('[a-z]')) &&
          value.contains(RegExp('[0-9]'));
      if (!strong) {
        showMessage(
          context,
          tr(
            context,
            'Use 12+ characters with upper/lowercase and a number.',
            'Dùng ít nhất 12 ký tự, gồm chữ hoa, chữ thường và số.',
          ),
          error: true,
        );
        return;
      }
      try {
        await AppScope.of(context).repository.setPassword(
          currentPassword: current.text,
          newPassword: next.text,
        );
        if (mounted) {
          showMessage(
            context,
            tr(context, 'Password updated', 'Đã cập nhật mật khẩu'),
          );
        }
      } catch (e) {
        if (mounted) showMessage(context, readableError(e), error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return Scaffold(
      appBar: AppBar(title: Text(tr(context, 'Settings', 'Cài đặt'))),
      body: PagePadding(
        child: ListView(
          children: [
            PageIntro(
              title: tr(context, 'Workspace details', 'Thông tin doanh nghiệp'),
              subtitle: app.user!.email,
            ),
            const SizedBox(height: 18),
            TextField(
              controller: _company,
              decoration: InputDecoration(
                labelText: tr(context, 'Company name', 'Tên doanh nghiệp'),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _name,
              decoration: InputDecoration(
                labelText: tr(context, 'Your name', 'Tên của bạn'),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phone,
              decoration: InputDecoration(
                labelText: tr(context, 'Phone', 'Số điện thoại'),
              ),
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _type,
              decoration: InputDecoration(
                labelText: tr(context, 'Business type', 'Loại hình'),
              ),
              items:
                  [
                        'Retail',
                        'Wholesale',
                        'Services',
                        'Food & Beverage',
                        'Other',
                      ]
                      .map((v) => DropdownMenuItem(value: v, child: Text(v)))
                      .toList(),
              onChanged: (v) => _type = v!,
            ),
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              initialValue: _currency,
              decoration: InputDecoration(
                labelText: tr(context, 'Base currency', 'Tiền tệ cơ sở'),
              ),
              items:
                  const ['VND', 'USD', 'EUR', 'GBP', 'SGD']
                      .map((v) => DropdownMenuItem(value: v, child: Text(v)))
                      .toList(),
              onChanged: (v) => _currency = v!,
            ),
            const SizedBox(height: 18),
            FilledButton(
              onPressed: _busy ? null : _save,
              child: Text(tr(context, 'Save changes', 'Lưu thay đổi')),
            ),
            const SizedBox(height: 22),
            Text(
              tr(context, 'Appearance', 'Giao diện'),
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            SegmentedButton<ThemeMode>(
              segments: [
                ButtonSegment(
                  value: ThemeMode.system,
                  label: Text(tr(context, 'System', 'Hệ thống')),
                  icon: const Icon(Icons.phone_android),
                ),
                ButtonSegment(
                  value: ThemeMode.light,
                  label: Text(tr(context, 'Light', 'Sáng')),
                  icon: const Icon(Icons.light_mode_outlined),
                ),
                ButtonSegment(
                  value: ThemeMode.dark,
                  label: Text(tr(context, 'Dark', 'Tối')),
                  icon: const Icon(Icons.dark_mode_outlined),
                ),
              ],
              selected: {app.themeMode},
              onSelectionChanged: (v) => app.setTheme(v.first),
            ),
            const SizedBox(height: 22),
            OutlinedButton.icon(
              onPressed: _password,
              icon: const Icon(Icons.lock_outline),
              label: Text(tr(context, 'Change password', 'Đổi mật khẩu')),
            ),
          ],
        ),
      ),
    );
  }
}

class TeamScreen extends StatefulWidget {
  const TeamScreen({super.key});
  @override
  State<TeamScreen> createState() => _TeamScreenState();
}

class _TeamScreenState extends State<TeamScreen> {
  late Future<List<AdminUser>> _future;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future = AppScope.of(context).repository.users();
  }

  void _reload() =>
      setState(() => _future = AppScope.of(context).repository.users());
  Future<void> _add() async {
    final email = TextEditingController();
    final password = TextEditingController();
    String role = 'ReadOnly';
    final ok = await showDialog<bool>(
      context: context,
      builder:
          (c) => StatefulBuilder(
            builder:
                (c, setLocal) => AlertDialog(
                  title: Text(
                    tr(context, 'Add team member', 'Thêm thành viên'),
                  ),
                  content: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      TextField(
                        controller: email,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(labelText: 'Email'),
                      ),
                      const SizedBox(height: 10),
                      TextField(
                        controller: password,
                        obscureText: true,
                        decoration: InputDecoration(
                          labelText: tr(
                            context,
                            'Temporary password',
                            'Mật khẩu tạm thời',
                          ),
                          helperText: tr(
                            context,
                            '12+ characters, upper/lowercase and a number',
                            'Ít nhất 12 ký tự, chữ hoa, chữ thường và số',
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      DropdownButtonFormField<String>(
                        initialValue: role,
                        decoration: InputDecoration(
                          labelText: tr(context, 'Role', 'Vai trò'),
                        ),
                        items:
                            const ['OperationsManager', 'ReadOnly']
                                .map(
                                  (v) => DropdownMenuItem(
                                    value: v,
                                    child: Text(v),
                                  ),
                                )
                                .toList(),
                        onChanged: (v) => setLocal(() => role = v!),
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
                      child: Text(tr(context, 'Add', 'Thêm')),
                    ),
                  ],
                ),
          ),
    );
    if (!mounted) return;
    if (ok == true) {
      final value = password.text;
      final strong =
          value.length >= 12 &&
          value.contains(RegExp('[A-Z]')) &&
          value.contains(RegExp('[a-z]')) &&
          value.contains(RegExp('[0-9]'));
      if (!email.text.contains('@') || !strong) {
        showMessage(
          context,
          tr(
            context,
            'Enter a valid email and a strong temporary password.',
            'Nhập email hợp lệ và mật khẩu tạm thời đủ mạnh.',
          ),
          error: true,
        );
        return;
      }
      try {
        await AppScope.of(context).repository.createUser({
          'email': email.text.trim(),
          'password': password.text,
          'role': role,
          'preferredCurrency': AppScope.of(context).user!.preferredCurrency,
        });
        _reload();
      } catch (e) {
        if (mounted) showMessage(context, readableError(e), error: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Team', 'Nhóm'))),
    floatingActionButton: FloatingActionButton.extended(
      onPressed: _add,
      icon: const Icon(Icons.person_add_alt),
      label: Text(tr(context, 'Member', 'Thành viên')),
    ),
    body: PagePadding(
      child: FutureBuilder<List<AdminUser>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(error: snapshot.error!, onRetry: _reload);
          }
          return ListView.separated(
            itemCount: snapshot.data!.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final u = snapshot.data![i];
              return PaperCard(
                child: Row(
                  children: [
                    CircleAvatar(
                      child: Text(u.email.characters.first.toUpperCase()),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            u.email,
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          Text(
                            u.role,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    Switch(
                      value: u.isActive,
                      onChanged: (_) async {
                        try {
                          await AppScope.of(
                            context,
                          ).repository.toggleUser(u.id);
                          _reload();
                        } catch (e) {
                          if (context.mounted) {
                            showMessage(context, readableError(e), error: true);
                          }
                        }
                      },
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    ),
  );
}

class AuditScreen extends StatefulWidget {
  const AuditScreen({super.key});
  @override
  State<AuditScreen> createState() => _AuditScreenState();
}

class _AuditScreenState extends State<AuditScreen> {
  late Future<List<AuditEntry>> _future;
  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _future = AppScope.of(context).repository.audit();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Audit log', 'Nhật ký kiểm toán'))),
    body: PagePadding(
      child: FutureBuilder<List<AuditEntry>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ErrorState(
              error: snapshot.error!,
              onRetry:
                  () => setState(
                    () => _future = AppScope.of(context).repository.audit(),
                  ),
            );
          }
          final items = snapshot.data!;
          if (items.isEmpty) {
            return EmptyState(
              icon: Icons.history,
              title: tr(context, 'No audit events', 'Chưa có sự kiện'),
              message: tr(
                context,
                'Business changes will appear here.',
                'Thay đổi dữ liệu sẽ hiện tại đây.',
              ),
            );
          }
          return ListView.separated(
            itemCount: items.length,
            separatorBuilder: (_, _) => const SizedBox(height: 8),
            itemBuilder: (_, i) {
              final a = items[i];
              return PaperCard(
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    CircleAvatar(
                      radius: 18,
                      child: const Icon(Icons.history, size: 18),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${a.action} ${a.entityType}',
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          Text(
                            '${a.origin} · ${a.performedBy}',
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                          if (a.notes?.isNotEmpty == true) Text(a.notes!),
                        ],
                      ),
                    ),
                    Text(
                      compactDate(a.timestamp),
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              );
            },
          );
        },
      ),
    ),
  );
}

class ImportScreen extends StatefulWidget {
  const ImportScreen({super.key});
  @override
  State<ImportScreen> createState() => _ImportScreenState();
}

class _ImportScreenState extends State<ImportScreen> {
  List<List<dynamic>> _rows = [];
  String _kind = 'Customers';
  String? _name;
  bool _busy = false;
  int _done = 0;
  Future<void> _pick() async {
    final result = await FilePicker.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['csv'],
    );
    if (result.isEmpty) return;
    final file = result.single;
    final bytes = await file.readAsBytes();
    try {
      final csv = Csv(dynamicTyping: false).decode(utf8.decode(bytes));
      setState(() {
        _rows = csv;
        _name = file.name;
        _done = 0;
      });
    } catch (e) {
      if (mounted) {
        showMessage(
          context,
          tr(context, 'Could not read that CSV.', 'Không thể đọc tệp CSV.'),
          error: true,
        );
      }
    }
  }

  Future<void> _import() async {
    if (_rows.length < 2) return;
    setState(() {
      _busy = true;
      _done = 0;
    });
    final headers =
        _rows.first.map((e) => e.toString().trim().toLowerCase()).toList();
    String cell(List<dynamic> row, String key) {
      final i = headers.indexOf(key);
      return i >= 0 && i < row.length ? row[i].toString().trim() : '';
    }

    try {
      final repo = AppScope.of(context).repository;
      final customers =
          _kind == 'Sales' ? await repo.allCustomers() : <Customer>[];
      final suppliers =
          _kind == 'Purchases' ? await repo.allSuppliers() : <Supplier>[];
      final products =
          (_kind == 'Sales' || _kind == 'Purchases')
              ? await repo.allProducts()
              : <Product>[];
      final rows =
          _rows
              .skip(1)
              .where((row) => row.any((value) => '$value'.trim().isNotEmpty))
              .toList();
      final groups = <String, List<List<dynamic>>>{};
      for (var i = 0; i < rows.length; i++) {
        final ref =
            (_kind == 'Sales' || _kind == 'Purchases')
                ? cell(rows[i], 'documentref')
                : '';
        groups.putIfAbsent(ref.isEmpty ? 'row-$i' : ref, () => []).add(rows[i]);
      }
      for (final group in groups.entries) {
        final first = group.value.first;
        if (_kind == 'Customers') {
          await repo.createCustomer({
            'name': cell(first, 'name'),
            'phone': cell(first, 'phone'),
            'email': cell(first, 'email'),
            'address': cell(first, 'address'),
            'notes': cell(first, 'notes'),
          });
        } else if (_kind == 'Suppliers') {
          await repo.createSupplier({
            'name': cell(first, 'name'),
            'phone': cell(first, 'phone'),
            'email': cell(first, 'email'),
            'address': cell(first, 'address'),
            'notes': cell(first, 'notes'),
          });
        } else if (_kind == 'Products') {
          await repo.createProduct({
            'name': cell(first, 'name'),
            'sku': cell(first, 'sku'),
            'unit': cell(first, 'unit').isEmpty ? 'item' : cell(first, 'unit'),
            'defaultPrice': numberOf(cell(first, 'defaultprice')),
            'costPrice': numberOf(cell(first, 'costprice')),
            'stockQuantity': numberOf(cell(first, 'stockquantity')),
            'minStockLevel':
                cell(first, 'minstocklevel').isEmpty
                    ? null
                    : numberOf(cell(first, 'minstocklevel')),
            'trackInventory': true,
          });
        } else if (_kind == 'Expenses') {
          await repo.createExpense({
            'category':
                cell(first, 'category').isEmpty
                    ? 'Other'
                    : cell(first, 'category'),
            'amount': numberOf(cell(first, 'amount')),
            'expenseDate':
                DateTime.tryParse(cell(first, 'date'))?.toIso8601String(),
            'description': cell(first, 'description'),
          });
        } else if (_kind == 'Sales') {
          final matches =
              customers
                  .where(
                    (c) =>
                        c.name.toLowerCase() ==
                        cell(first, 'customer').toLowerCase(),
                  )
                  .toList();
          if (matches.isEmpty) {
            throw Exception('Customer not found: ${cell(first, 'customer')}');
          }
          final lines = <Json>[];
          for (final row in group.value) {
            final found =
                products
                    .where(
                      (p) =>
                          (cell(row, 'sku').isNotEmpty &&
                              p.sku?.toLowerCase() ==
                                  cell(row, 'sku').toLowerCase()) ||
                          p.name.toLowerCase() ==
                              cell(row, 'product').toLowerCase(),
                    )
                    .toList();
            if (found.isEmpty) {
              throw Exception('Product not found: ${cell(row, 'product')}');
            }
            final p = found.first;
            lines.add({
              'productId': p.id,
              'quantity': numberOf(cell(row, 'quantity')),
              'unitPrice':
                  cell(row, 'unitprice').isEmpty
                      ? p.defaultPrice
                      : numberOf(cell(row, 'unitprice')),
            });
          }
          await repo.createSale({
            'customerId': matches.first.id,
            'items': lines,
            'paymentAmount': numberOf(cell(first, 'paidamount')),
            'paymentMethod':
                cell(first, 'paymentmethod').isEmpty
                    ? 'Other'
                    : cell(first, 'paymentmethod'),
            'soldAt': DateTime.tryParse(cell(first, 'date'))?.toIso8601String(),
            'notes': '${cell(first, 'notes')} Import: ${group.key}'.trim(),
          });
        } else {
          final matches =
              suppliers
                  .where(
                    (s) =>
                        s.name.toLowerCase() ==
                        cell(first, 'supplier').toLowerCase(),
                  )
                  .toList();
          if (matches.isEmpty) {
            throw Exception('Supplier not found: ${cell(first, 'supplier')}');
          }
          final lines = <Json>[];
          for (final row in group.value) {
            final found =
                products
                    .where(
                      (p) =>
                          (cell(row, 'sku').isNotEmpty &&
                              p.sku?.toLowerCase() ==
                                  cell(row, 'sku').toLowerCase()) ||
                          p.name.toLowerCase() ==
                              cell(row, 'product').toLowerCase(),
                    )
                    .toList();
            final p = found.isEmpty ? null : found.first;
            lines.add({
              'productId': p?.id,
              'description':
                  cell(row, 'description').isEmpty
                      ? (p?.name ?? cell(row, 'product'))
                      : cell(row, 'description'),
              'unit':
                  cell(row, 'unit').isEmpty
                      ? (p?.unit ?? 'item')
                      : cell(row, 'unit'),
              'quantity': numberOf(cell(row, 'quantity')),
              'unitCost': numberOf(cell(row, 'unitcost')),
            });
          }
          await repo.createPurchase({
            'supplierId': matches.first.id,
            'items': lines,
            'paymentAmount': numberOf(cell(first, 'paidamount')),
            'paymentMethod':
                cell(first, 'paymentmethod').isEmpty
                    ? 'Other'
                    : cell(first, 'paymentmethod'),
            'purchasedAt':
                DateTime.tryParse(cell(first, 'date'))?.toIso8601String(),
            'notes': '${cell(first, 'notes')} Import: ${group.key}'.trim(),
          });
        }
        if (mounted) setState(() => _done++);
      }
      if (mounted) {
        showMessage(
          context,
          tr(context, 'Import complete', 'Nhập dữ liệu hoàn tất'),
        );
      }
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Import data', 'Nhập dữ liệu'))),
    body: PagePadding(
      child: ListView(
        children: [
          PageIntro(
            title: tr(context, 'CSV import', 'Nhập từ CSV'),
            subtitle: tr(
              context,
              'Import contacts, catalog and financial documents.',
              'Nhập danh bạ, danh mục và chứng từ tài chính.',
            ),
          ),
          const SizedBox(height: 18),
          DropdownButtonFormField<String>(
            initialValue: _kind,
            decoration: InputDecoration(
              labelText: tr(context, 'Record type', 'Loại dữ liệu'),
            ),
            items:
                [
                      'Customers',
                      'Suppliers',
                      'Products',
                      'Expenses',
                      'Sales',
                      'Purchases',
                    ]
                    .map(
                      (value) =>
                          DropdownMenuItem(value: value, child: Text(value)),
                    )
                    .toList(),
            onChanged:
                (v) => setState(() {
                  _kind = v!;
                  _rows = [];
                  _name = null;
                }),
          ),
          const SizedBox(height: 14),
          OutlinedButton.icon(
            onPressed: _busy ? null : _pick,
            icon: const Icon(Icons.file_open_outlined),
            label: Text(
              _name ?? tr(context, 'Choose CSV file', 'Chọn tệp CSV'),
            ),
          ),
          const SizedBox(height: 14),
          if (_rows.isNotEmpty)
            PaperCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${_rows.length - 1} ${tr(context, 'rows ready', 'dòng sẵn sàng')}',
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    tr(
                      context,
                      'Header names follow the web CSV templates. Sales and purchases group rows by documentRef.',
                      'Tên cột theo mẫu CSV trên web. Bán hàng và nhập hàng được nhóm theo documentRef.',
                    ),
                  ),
                  if (_busy) ...[
                    const SizedBox(height: 12),
                    LinearProgressIndicator(
                      value:
                          (_rows.length - 1) <= 0
                              ? 0
                              : (_done / (_rows.length - 1))
                                  .clamp(0.0, 1.0)
                                  .toDouble(),
                    ),
                  ],
                ],
              ),
            ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _busy || _rows.length < 2 ? null : _import,
            icon: const Icon(Icons.upload),
            label: Text(tr(context, 'Import records', 'Nhập bản ghi')),
          ),
        ],
      ),
    ),
  );
}
