import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';
import '../../domain/models.dart';
import '../../state/app_controller.dart';
import '../widgets/common.dart';
import '../widgets/search_controller.dart';

class SuppliersScreen extends StatefulWidget {
  const SuppliersScreen({super.key});
  @override
  State<SuppliersScreen> createState() => _SuppliersScreenState();
}

class _SuppliersScreenState extends State<SuppliersScreen> {
  late final _search = DebouncedSearchController(() {
    if (!mounted) return;
    _page = 1;
    _reload();
  });
  late Future<PagedResult<Supplier>> _future;
  bool _ready = false;
  int _page = 1;
  String _status = 'Active';
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
    _future = AppScope.of(context).repository.suppliers(
      search: _search.text,
      page: _page,
      status: _status == 'All' ? '' : _status,
    );
  }

  void _reload() => setState(_load);
  Future<void> _edit([Supplier? s]) async {
    final name = TextEditingController(text: s?.name);
    final phone = TextEditingController(text: s?.phone);
    final email = TextEditingController(text: s?.email);
    final address = TextEditingController(text: s?.address);
    final notes = TextEditingController(text: s?.notes);
    String status = s?.status ?? 'Active';
    final form = GlobalKey<FormState>();
    bool busy = false;
    final saved = await showModalBottomSheet<bool>(
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
                    child: Form(
                      key: form,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Text(
                            s == null
                                ? tr(
                                  context,
                                  'New supplier',
                                  'Nhà cung cấp mới',
                                )
                                : tr(
                                  context,
                                  'Edit supplier',
                                  'Sửa nhà cung cấp',
                                ),
                            style: Theme.of(context).textTheme.headlineSmall,
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: name,
                            decoration: InputDecoration(
                              labelText: tr(context, 'Name', 'Tên'),
                            ),
                            validator:
                                (v) =>
                                    (v?.trim().isEmpty ?? true)
                                        ? tr(context, 'Required', 'Bắt buộc')
                                        : null,
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: phone,
                            decoration: InputDecoration(
                              labelText: tr(context, 'Phone', 'Số điện thoại'),
                            ),
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: email,
                            decoration: InputDecoration(
                              labelText: tr(context, 'Email', 'Email'),
                            ),
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: address,
                            decoration: InputDecoration(
                              labelText: tr(c, 'Address', 'Địa chỉ'),
                            ),
                          ),
                          const SizedBox(height: 10),
                          TextField(
                            controller: notes,
                            maxLines: 2,
                            decoration: InputDecoration(
                              labelText: tr(c, 'Notes', 'Ghi chú'),
                            ),
                          ),
                          if (s != null)
                            SwitchListTile(
                              title: Text(tr(c, 'Active', 'Đang hoạt động')),
                              value: status == 'Active',
                              onChanged:
                                  busy
                                      ? null
                                      : (value) => setLocal(
                                        () =>
                                            status =
                                                value ? 'Active' : 'Archived',
                                      ),
                            ),
                          const SizedBox(height: 18),
                          FilledButton(
                            onPressed:
                                busy
                                    ? null
                                    : () async {
                                      if (busy ||
                                          !(form.currentState?.validate() ??
                                              false)) {
                                        return;
                                      }
                                      setLocal(() => busy = true);
                                      try {
                                        final input = {
                                          'name': name.text.trim(),
                                          'phone': phone.text.trim(),
                                          'email': email.text.trim(),
                                          'address': address.text.trim(),
                                          'notes': notes.text.trim(),
                                          'status': status,
                                        };
                                        if (s == null) {
                                          await AppScope.of(
                                            context,
                                          ).repository.createSupplier(input);
                                        } else {
                                          await AppScope.of(context).repository
                                              .updateSupplier(s.id, input);
                                        }
                                        if (c.mounted) Navigator.pop(c, true);
                                      } catch (e) {
                                        if (c.mounted) {
                                          showMessage(
                                            c,
                                            readableError(e),
                                            error: true,
                                          );
                                          setLocal(() => busy = false);
                                        }
                                      }
                                    },
                            child: Text(
                              busy
                                  ? tr(context, 'Saving…', 'Đang lưu…')
                                  : tr(
                                    context,
                                    'Save supplier',
                                    'Lưu nhà cung cấp',
                                  ),
                            ),
                          ),
                          if (s != null)
                            TextButton(
                              onPressed:
                                  busy
                                      ? null
                                      : () async {
                                        if (busy) return;
                                        setLocal(() => busy = true);
                                        if (!await confirm(
                                          c,
                                          title: tr(
                                            c,
                                            'Remove supplier?',
                                            'Xóa nhà cung cấp?',
                                          ),
                                          message: tr(
                                            c,
                                            'Suppliers with purchases are archived.',
                                            'Nhà cung cấp có giao dịch sẽ được lưu trữ.',
                                          ),
                                          destructive: true,
                                        )) {
                                          if (c.mounted) {
                                            setLocal(() => busy = false);
                                          }
                                          return;
                                        }
                                        if (!c.mounted) return;
                                        try {
                                          await AppScope.of(
                                            c,
                                          ).repository.deleteSupplier(s.id);
                                          if (c.mounted) Navigator.pop(c, true);
                                        } catch (e) {
                                          if (c.mounted) {
                                            showMessage(
                                              c,
                                              readableError(e),
                                              error: true,
                                            );
                                            setLocal(() => busy = false);
                                          }
                                        }
                                      },
                              style: TextButton.styleFrom(
                                foregroundColor: Theme.of(c).colorScheme.error,
                              ),
                              child: Text(
                                tr(c, 'Remove supplier', 'Xóa nhà cung cấp'),
                              ),
                            ),
                          if (busy) const LinearProgressIndicator(),
                        ],
                      ),
                    ),
                  ),
                ),
          ),
    );
    if (mounted && saved == true) _reload();
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: Text(tr(context, 'Suppliers', 'Nhà cung cấp'))),
    floatingActionButton:
        AppScope.of(context).user!.canManage
            ? FloatingActionButton.extended(
              onPressed: () => _edit(),
              icon: const Icon(Icons.add),
              label: Text(tr(context, 'Supplier', 'Nhà cung cấp')),
            )
            : null,
    body: PagePadding(
      child: Column(
        children: [
          TextField(
            controller: _search,
            onSubmitted: (_) => _search.searchNow(),
            decoration: InputDecoration(
              hintText: tr(context, 'Search suppliers', 'Tìm nhà cung cấp'),
              prefixIcon: const Icon(Icons.search),
            ),
          ),
          const SizedBox(height: 10),
          DropdownButtonFormField<String>(
            initialValue: _status,
            decoration: InputDecoration(
              labelText: tr(context, 'Status', 'Trạng thái'),
            ),
            items:
                ['Active', 'Archived', 'All']
                    .map(
                      (value) => DropdownMenuItem(
                        value: value,
                        child: Text(tr(context, value, value)),
                      ),
                    )
                    .toList(),
            onChanged: (value) {
              _status = value!;
              _page = 1;
              _reload();
            },
          ),
          const SizedBox(height: 12),
          Expanded(
            child: FutureBuilder<PagedResult<Supplier>>(
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
                    icon: Icons.local_shipping_outlined,
                    title: tr(context, 'No suppliers', 'Chưa có nhà cung cấp'),
                    message: tr(
                      context,
                      'Add suppliers for purchasing and payables.',
                      'Thêm nhà cung cấp để quản lý nhập hàng và công nợ.',
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
                    final s = items[i];
                    return PaperCard(
                      onTap:
                          AppScope.of(context).user!.canManage
                              ? () => _edit(s)
                              : null,
                      child: Row(
                        children: [
                          CircleAvatar(
                            child: Text(
                              s.name.isEmpty ? '?' : s.name.characters.first,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  s.name,
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                Text(
                                  '${s.purchaseCount} ${tr(context, 'purchases', 'phiếu nhập')}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ],
                            ),
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                money(s.outstandingBalance, s.currency),
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              Text(
                                tr(context, 'payable', 'phải trả'),
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
