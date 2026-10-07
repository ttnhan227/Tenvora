import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/theme/tenvora_theme.dart';
import '../../core/utils/formatters.dart';
import '../../domain/models.dart';
import '../../state/app_controller.dart';
import '../widgets/common.dart';
import '../widgets/action_guard.dart';
import '../widgets/search_controller.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});
  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  late final _search = DebouncedSearchController(() {
    if (!mounted) return;
    _page = 1;
    _reload();
  });
  late Future<PagedResult<Product>> _future;
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

  void _load() =>
      _future = AppScope.of(context).repository.products(
        search: _search.text,
        page: _page,
        active: _status == 'All' ? null : _status == 'Active',
      );
  void _reload() => setState(_load);
  Future<void> _edit([Product? value]) async {
    if (await showModalBottomSheet<bool>(
          context: context,
          isScrollControlled: true,
          useSafeArea: true,
          builder: (_) => _ProductForm(product: value),
        ) ==
        true) {
      if (mounted) _reload();
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(tr(context, 'Products & inventory', 'Sản phẩm & kho')),
    ),
    floatingActionButton:
        AppScope.of(context).user!.canManage
            ? FloatingActionButton.extended(
              onPressed: () => _edit(),
              icon: const Icon(Icons.add),
              label: Text(tr(context, 'Product', 'Sản phẩm')),
            )
            : null,
    body: PagePadding(
      child: Column(
        children: [
          TextField(
            controller: _search,
            onSubmitted: (_) => _search.searchNow(),
            decoration: InputDecoration(
              hintText: tr(context, 'Search name or SKU', 'Tìm tên hoặc SKU'),
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
            child: FutureBuilder<PagedResult<Product>>(
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
                    icon: Icons.inventory_2_outlined,
                    title: tr(
                      context,
                      'No products found',
                      'Không tìm thấy sản phẩm',
                    ),
                    message: tr(
                      context,
                      'Build your catalog and track stock here.',
                      'Tạo danh mục và theo dõi tồn kho tại đây.',
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
                        onTap:
                            AppScope.of(context).user!.canManage
                                ? () => _edit(p)
                                : null,
                        child: Row(
                          children: [
                            Container(
                              width: 48,
                              height: 48,
                              decoration: BoxDecoration(
                                color: Theme.of(
                                  context,
                                ).colorScheme.primary.withValues(alpha: .1),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Icon(
                                Icons.inventory_2_outlined,
                                color: Theme.of(context).colorScheme.primary,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Flexible(
                                        child: Text(
                                          p.name,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      if (p.lowStock) ...[
                                        const SizedBox(width: 6),
                                        StatusPill(
                                          tr(context, 'Low stock', 'Sắp hết'),
                                          positive: false,
                                        ),
                                      ],
                                    ],
                                  ),
                                  Text(
                                    [
                                      if (p.sku?.isNotEmpty ?? false) p.sku!,
                                      p.unit,
                                    ].join(' · '),
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
                                  money(p.defaultPrice, p.currency),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                if (p.trackInventory)
                                  Text(
                                    '${stockQuantity(p.stockQuantity)} ${p.unit}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color:
                                          p.lowStock
                                              ? TenvoraColors.danger
                                              : null,
                                    ),
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

class _ProductForm extends StatefulWidget {
  const _ProductForm({this.product});
  final Product? product;
  @override
  State<_ProductForm> createState() => _ProductFormState();
}

class _ProductFormState extends State<_ProductForm> with ActionGuard {
  final _form = GlobalKey<FormState>();
  late final _name = TextEditingController(text: widget.product?.name);
  late final _sku = TextEditingController(text: widget.product?.sku);
  late final _unit = TextEditingController(
    text: widget.product?.unit ?? 'item',
  );
  late final _price = TextEditingController(
    text: widget.product?.defaultPrice.toString() ?? '',
  );
  late final _cost = TextEditingController(
    text: widget.product?.costPrice.toString() ?? '',
  );
  late final _stock = TextEditingController(
    text: widget.product?.stockQuantity.toString() ?? '0',
  );
  late final _minimum = TextEditingController(
    text: widget.product?.minStockLevel?.toString() ?? '',
  );
  late bool _track = widget.product?.trackInventory ?? true;
  late final _notes = TextEditingController(text: widget.product?.notes);
  late bool _active = widget.product?.isActive ?? true;
  bool _busy = false;
  String? _imageData;
  bool _removeImage = false;
  bool _pickingImage = false;
  String? _imageError;
  @override
  void dispose() {
    _name.dispose();
    _sku.dispose();
    _unit.dispose();
    _price.dispose();
    _cost.dispose();
    _stock.dispose();
    _minimum.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    if (_pickingImage || _busy) return;
    setState(() {
      _pickingImage = true;
      _imageError = null;
    });
    try {
      final file = await ImagePicker().pickImage(
        source: ImageSource.gallery,
        imageQuality: 78,
        maxWidth: 1600,
      );
      if (file == null) return;
      final bytes = await file.readAsBytes();
      if (!mounted) return;
      setState(() {
        _imageData = imageDataUrl(bytes);
        _removeImage = false;
      });
    } catch (_) {
      if (mounted) {
        setState(
          () =>
              _imageError = tr(
                context,
                'Could not select a photo. Please try again.',
                'Không chọn được ảnh. Vui lòng thử lại.',
              ),
        );
      }
    } finally {
      if (mounted) setState(() => _pickingImage = false);
    }
  }

  Widget _photoPreview() {
    final bytes = dataUrlBytes(_imageData ?? widget.product?.imageDataUrl);
    Widget unavailable() => SizedBox(
      height: 150,
      child: Center(
        child: Text(
          tr(context, 'Photo unavailable', 'Không hiển thị được ảnh'),
        ),
      ),
    );
    if (bytes == null) return unavailable();
    return Image.memory(
      bytes,
      height: 150,
      fit: BoxFit.cover,
      errorBuilder: (_, error, stack) => unavailable(),
    );
  }

  Future<void> _save() => runAction(() => _saveAction());

  Future<void> _saveAction() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      final input = {
        'name': _name.text.trim(),
        'sku': _sku.text.trim(),
        'unit': _unit.text.trim(),
        'defaultPrice': numberOf(_price.text),
        'costPrice': numberOf(_cost.text),
        'stockQuantity': numberOf(_stock.text),
        'minStockLevel': _minimum.text.isEmpty ? null : numberOf(_minimum.text),
        'trackInventory': _track,
        'isActive': _active,
        'notes': _notes.text.trim(),
        if (_imageData != null) 'imageDataUrl': _imageData,
        if (_removeImage) 'removeImage': true,
      };
      final repo = AppScope.of(context).repository;
      if (widget.product == null) {
        await repo.createProduct(input);
      } else {
        await repo.updateProduct(widget.product!.id, input);
      }
      if (mounted) Navigator.pop(context, true);
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _adjust() => runAction(() => _adjustAction());

  Future<void> _adjustAction() async {
    final amount = TextEditingController();
    final reason = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder:
          (c) => AlertDialog(
            title: Text(tr(context, 'Adjust stock', 'Điều chỉnh kho')),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: amount,
                  keyboardType: const TextInputType.numberWithOptions(
                    signed: true,
                  ),
                  decoration: InputDecoration(
                    labelText: tr(context, 'Quantity (+/-)', 'Số lượng (+/-)'),
                  ),
                ),
                const SizedBox(height: 10),
                TextField(
                  controller: reason,
                  decoration: InputDecoration(
                    labelText: tr(context, 'Reason', 'Lý do'),
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
                child: Text(tr(context, 'Adjust', 'Điều chỉnh')),
              ),
            ],
          ),
    );
    if (!mounted) return;
    if (ok == true) {
      try {
        await AppScope.of(context).repository.adjustStock({
          'productId': widget.product!.id,
          'adjustmentQuantity': numberOf(amount.text),
          'reason': reason.text.trim(),
        });
        if (mounted) Navigator.pop(context, true);
      } catch (e) {
        if (mounted) showMessage(context, readableError(e), error: true);
      }
    }
  }

  Future<void> _history() async {
    try {
      final items = await AppScope.of(
        context,
      ).repository.stockAdjustments(widget.product!.id);
      if (!mounted) return;
      await showModalBottomSheet<void>(
        context: context,
        useSafeArea: true,
        builder:
            (c) => Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          tr(context, 'Stock history', 'Lịch sử tồn kho'),
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                      ),
                      IconButton(
                        onPressed: () => Navigator.pop(c),
                        icon: const Icon(Icons.close),
                      ),
                    ],
                  ),
                  Expanded(
                    child:
                        items.isEmpty
                            ? EmptyState(
                              icon: Icons.history,
                              title: tr(
                                context,
                                'No adjustments',
                                'Chưa có điều chỉnh',
                              ),
                              message: '',
                            )
                            : ListView.separated(
                              itemCount: items.length,
                              separatorBuilder: (_, _) => const Divider(),
                              itemBuilder: (_, i) {
                                final item = items[i];
                                final quantity = jsonDouble(
                                  item['adjustmentQuantity'],
                                );
                                return ListTile(
                                  leading: Icon(
                                    quantity >= 0
                                        ? Icons.add_circle_outline
                                        : Icons.remove_circle_outline,
                                  ),
                                  title: Text(
                                    '${quantity >= 0 ? '+' : ''}$quantity ${widget.product!.unit}',
                                  ),
                                  subtitle: Text('${item['reason'] ?? ''}'),
                                  trailing: Text(
                                    '${item['quantityAfter'] ?? ''}',
                                  ),
                                );
                              },
                            ),
                  ),
                ],
              ),
            ),
      );
    } catch (e) {
      if (mounted) showMessage(context, readableError(e), error: true);
    }
  }

  Future<void> _remove() => runAction(() => _removeAction());

  Future<void> _removeAction() async {
    if (!await confirm(
      context,
      title: tr(context, 'Remove product?', 'Xóa sản phẩm?'),
      message: tr(
        context,
        'Products used in transactions are archived.',
        'Sản phẩm đã có giao dịch sẽ được lưu trữ.',
      ),
      destructive: true,
    )) {
      return;
    }
    if (!mounted) return;
    try {
      await AppScope.of(context).repository.deleteProduct(widget.product!.id);
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
                      widget.product == null
                          ? tr(context, 'New product', 'Sản phẩm mới')
                          : tr(context, 'Edit product', 'Sửa sản phẩm'),
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
                  labelText: tr(context, 'Product name', 'Tên sản phẩm'),
                ),
                validator:
                    (v) =>
                        (v?.trim().isEmpty ?? true)
                            ? tr(context, 'Required', 'Bắt buộc')
                            : null,
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _sku,
                      decoration: const InputDecoration(labelText: 'SKU'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _unit,
                      decoration: InputDecoration(
                        labelText: tr(context, 'Unit', 'Đơn vị'),
                      ),
                      validator:
                          (v) =>
                              (v?.trim().isEmpty ?? true)
                                  ? tr(context, 'Required', 'Bắt buộc')
                                  : null,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _price,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: tr(context, 'Sale price', 'Giá bán'),
                      ),
                      validator:
                          (v) =>
                              numberOf(v ?? '') <= 0
                                  ? tr(context, 'Enter a price', 'Nhập giá')
                                  : null,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: TextFormField(
                      controller: _cost,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        labelText: tr(context, 'Cost', 'Giá vốn'),
                      ),
                    ),
                  ),
                ],
              ),
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: Text(tr(context, 'Track inventory', 'Theo dõi tồn kho')),
                value: _track,
                onChanged: (v) => setState(() => _track = v),
              ),
              if (_track)
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _stock,
                        enabled: widget.product == null,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: tr(context, 'Opening stock', 'Tồn đầu'),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextFormField(
                        controller: _minimum,
                        keyboardType: TextInputType.number,
                        decoration: InputDecoration(
                          labelText: tr(
                            context,
                            'Low stock at',
                            'Cảnh báo khi',
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 12),
              if ((_imageData ?? widget.product?.imageDataUrl) != null &&
                  !_removeImage)
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: _photoPreview(),
                ),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: _busy || _pickingImage ? null : _pickImage,
                      icon: const Icon(Icons.image_outlined),
                      label: Text(
                        (_imageData ?? widget.product?.imageDataUrl) == null ||
                                _removeImage
                            ? tr(
                              context,
                              'Add product photo',
                              'Thêm ảnh sản phẩm',
                            )
                            : tr(context, 'Replace photo', 'Thay ảnh'),
                      ),
                    ),
                  ),
                  if ((_imageData ?? widget.product?.imageDataUrl) != null &&
                      !_removeImage)
                    IconButton(
                      onPressed:
                          () => setState(() {
                            _imageData = null;
                            _removeImage = true;
                          }),
                      icon: const Icon(Icons.delete_outline),
                    ),
                ],
              ),
              if (_imageError != null)
                Text(
                  _imageError!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error),
                ),
              if (_pickingImage) const LinearProgressIndicator(),
              const SizedBox(height: 12),
              TextField(
                controller: _notes,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: tr(context, 'Notes', 'Ghi chú'),
                ),
              ),
              if (widget.product != null)
                SwitchListTile(
                  title: Text(tr(context, 'Active', 'Đang hoạt động')),
                  value: _active,
                  onChanged: (value) => setState(() => _active = value),
                ),
              const SizedBox(height: 20),
              FilledButton(
                onPressed: _busy ? null : _save,
                child: Text(tr(context, 'Save product', 'Lưu sản phẩm')),
              ),
              if (widget.product != null && _track)
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _busy ? null : _adjust,
                        icon: const Icon(Icons.tune),
                        label: Text(
                          tr(context, 'Adjust stock', 'Điều chỉnh kho'),
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.outlined(
                      onPressed: _history,
                      icon: const Icon(Icons.history),
                    ),
                  ],
                ),
              if (widget.product != null)
                TextButton(
                  onPressed: _remove,
                  style: TextButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                  ),
                  child: Text(tr(context, 'Remove product', 'Xóa sản phẩm')),
                ),
            ],
          ),
        ),
      ),
    ),
  );
}
