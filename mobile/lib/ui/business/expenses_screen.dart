import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';
import '../../domain/models.dart';
import '../../state/app_controller.dart';
import '../widgets/common.dart';
import '../widgets/action_guard.dart';
import '../widgets/search_controller.dart';
import '../widgets/receipt_photo.dart';

class ExpensesScreen extends StatefulWidget {
  const ExpensesScreen({super.key});
  @override
  State<ExpensesScreen> createState() => _ExpensesScreenState();
}

class _ExpensesScreenState extends State<ExpensesScreen> {
  late final _search = DebouncedSearchController(() {
    if (!mounted) return;
    _page = 1;
    _reload();
  });
  late Future<PagedResult<Expense>> _future;
  bool _ready = false;
  int _page = 1;
  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!_ready) {
      _ready = true;
      _load();
    }
  }

  void _load() {
    _future = AppScope.of(
      context,
    ).repository.expenses(search: _search.text, page: _page);
  }

  void _reload() => setState(_load);
  Future<void> _edit([Expense? e]) async {
    if (await showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) => _ExpenseForm(expense: e),
        ) ==
        true) {
      _reload();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Expenses', 'Chi phí'))),
    floatingActionButton:
        AppScope.of(context).user!.canManage
            ? FloatingActionButton.extended(
              onPressed: () => _edit(),
              icon: const Icon(Icons.add),
              label: Text(tr(context, 'Expense', 'Chi phí')),
            )
            : null,
    body: PagePadding(
      child: Column(
        children: [
          TextField(
            controller: _search,
            onSubmitted: (_) => _search.searchNow(),
            decoration: InputDecoration(
              hintText: tr(context, 'Search expenses', 'Tìm chi phí'),
              prefixIcon: const Icon(Icons.search),
            ),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: FutureBuilder<PagedResult<Expense>>(
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
                    action:
                        _page > 1
                            ? TextButton(
                              onPressed: () {
                                _page = 1;
                                _reload();
                              },
                              child: Text(tr(context, 'Try again', 'Thử lại')),
                            )
                            : null,
                    icon: Icons.payments_outlined,
                    title: tr(context, 'No expenses found', 'Chưa có chi phí'),
                    message: tr(
                      context,
                      'Record operating costs and receipts.',
                      'Ghi nhận chi phí hoạt động và hóa đơn.',
                    ),
                  );
                }
                return ListView.separated(
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
                    final e = items[i];
                    return PaperCard(
                      onTap:
                          AppScope.of(context).user!.canManage
                              ? () => _edit(e)
                              : e.receiptImageDataUrl == null
                              ? null
                              : () => showModalBottomSheet<void>(
                                context: context,
                                useSafeArea: true,
                                builder:
                                    (_) => Padding(
                                      padding: const EdgeInsets.all(20),
                                      child: ReceiptPhoto(
                                        value: e.receiptImageDataUrl,
                                        languageCode:
                                            AppScope.of(context).languageCode,
                                      ),
                                    ),
                              ),
                      child: Row(
                        children: [
                          CircleAvatar(
                            child: Icon(
                              e.receiptImageDataUrl == null
                                  ? Icons.receipt_outlined
                                  : Icons.image_outlined,
                              size: 20,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  e.category,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Text(
                                  e.description?.isNotEmpty == true
                                      ? e.description!
                                      : compactDate(e.expenseDate),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                money(e.amount, e.currency),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                compactDate(e.expenseDate),
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    ),
  );
}

class _ExpenseForm extends StatefulWidget {
  const _ExpenseForm({this.expense});
  final Expense? expense;
  @override
  State<_ExpenseForm> createState() => _ExpenseFormState();
}

class _ExpenseFormState extends State<_ExpenseForm> with ActionGuard {
  final _form = GlobalKey<FormState>();
  late String _category = widget.expense?.category ?? 'Utilities';
  late final _amount = TextEditingController(
    text: widget.expense?.amount.toString(),
  );
  late final _description = TextEditingController(
    text: widget.expense?.description,
  );
  late DateTime _date = widget.expense?.expenseDate ?? DateTime.now();
  late String? _receipt = widget.expense?.receiptImageDataUrl;
  bool _busy = false;
  @override
  void dispose() {
    _amount.dispose();
    _description.dispose();
    super.dispose();
  }

  Future<void> _save() => runAction(() => _saveAction());

  Future<void> _saveAction() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      final input = {
        'category': _category,
        'amount': numberOf(_amount.text),
        'expenseDate': _date.toIso8601String(),
        'description': _description.text.trim(),
        if (_receipt != null) 'receiptImageDataUrl': _receipt,
      };
      final repo = AppScope.of(context).repository;
      if (widget.expense == null) {
        await repo.createExpense(input);
      } else {
        await repo.updateExpense(widget.expense!.id, input);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _remove() => runAction(() => _removeAction());

  Future<void> _removeAction() async {
    if (!await confirm(
      context,
      title: tr(context, 'Delete expense?', 'Xóa chi phí?'),
      message: tr(
        context,
        'This cannot be undone.',
        'Thao tác này không thể hoàn tác.',
      ),
      destructive: true,
    )) {
      return;
    }
    if (!mounted) return;
    try {
      await AppScope.of(context).repository.deleteExpense(widget.expense!.id);
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    }
  }

  @override
  Widget build(BuildContext context) => guardActions(
    Padding(
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
                      widget.expense == null
                          ? tr(context, 'New expense', 'Chi phí mới')
                          : tr(context, 'Edit expense', 'Sửa chi phí'),
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
              DropdownButtonFormField<String>(
                initialValue: _category,
                decoration: InputDecoration(
                  labelText: tr(context, 'Category', 'Danh mục'),
                ),
                items:
                    const [
                          'Utilities',
                          'Rent',
                          'Transport',
                          'Marketing',
                          'Payroll',
                          'Supplies',
                          'Other',
                        ]
                        .map(
                          (v) => DropdownMenuItem(
                            value: v,
                            child: Text(tr(context, v, v)),
                          ),
                        )
                        .toList(),
                onChanged: (v) => _category = v!,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _amount,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: tr(context, 'Amount', 'Số tiền'),
                ),
                validator:
                    (v) =>
                        numberOf(v ?? '') <= 0
                            ? tr(context, 'Enter an amount', 'Nhập số tiền')
                            : null,
              ),
              const SizedBox(height: 12),
              ListTile(
                contentPadding: const EdgeInsets.symmetric(horizontal: 4),
                title: Text(tr(context, 'Expense date', 'Ngày chi')),
                subtitle: Text(shortDate(_date)),
                trailing: const Icon(Icons.calendar_month_outlined),
                onTap: () async {
                  final value = await showDatePicker(
                    context: context,
                    initialDate: _date,
                    firstDate: DateTime(2020),
                    lastDate: DateTime.now(),
                  );
                  if (value != null) setState(() => _date = value);
                },
              ),
              const SizedBox(height: 4),
              TextField(
                controller: _description,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: tr(context, 'Description', 'Mô tả'),
                ),
              ),
              const SizedBox(height: 12),
              ReceiptPhoto(
                value: _receipt,
                languageCode: AppScope.of(context).languageCode,
                enabled: !_busy,
                onChanged: (value) => setState(() => _receipt = value),
              ),
              const SizedBox(height: 16),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: Text(tr(context, 'Save expense', 'Lưu chi phí')),
              ),
              if (widget.expense != null)
                TextButton(
                  onPressed: _busy ? null : _remove,
                  style: TextButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                  ),
                  child: Text(tr(context, 'Delete expense', 'Xóa chi phí')),
                ),
            ],
          ),
        ),
      ),
    ),
  );
}
