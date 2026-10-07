import 'package:flutter/material.dart';

import '../../core/theme/tenvora_theme.dart';
import '../../core/utils/formatters.dart';
import '../../domain/models.dart';
import '../../state/app_controller.dart';
import '../business/customers_screen.dart';
import '../business/expenses_screen.dart';
import '../business/products_screen.dart';
import '../business/purchases_screen.dart';
import '../widgets/common.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});
  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  String _period = 'today';
  late Future<Dashboard> _future;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (!(_initialized)) {
      _initialized = true;
      _load();
    }
  }

  bool _initialized = false;
  void _load() => _future = AppScope.of(context).repository.dashboard(_period);
  Future<void> _refresh() async {
    setState(_load);
    await _future;
  }

  void _open(Widget page) => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => page),
  ).then((_) => setState(_load));

  @override
  Widget build(BuildContext context) => PagePadding(
    child: RefreshIndicator(
      onRefresh: _refresh,
      child: FutureBuilder<Dashboard>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return ListView(
              children: [
                ErrorState(
                  error: snapshot.error!,
                  onRetry: () => setState(_load),
                ),
              ],
            );
          }
          final data = snapshot.data!;
          return ListView(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          tr(
                            context,
                            'Good day, {name}',
                            'Chào, {name}',
                          ).replaceAll(
                            '{name}',
                            AppScope.of(context).user!.displayName,
                          ),
                          style: Theme.of(context).textTheme.headlineSmall,
                        ),
                        Text(
                          AppScope.of(context).user!.companyName,
                          style: TextStyle(
                            color:
                                Theme.of(context).colorScheme.onSurfaceVariant,
                          ),
                        ),
                      ],
                    ),
                  ),
                  DropdownButton<String>(
                    value: _period,
                    underline: const SizedBox(),
                    items: [
                      DropdownMenuItem(
                        value: 'today',
                        child: Text(tr(context, 'Today', 'Hôm nay')),
                      ),
                      DropdownMenuItem(
                        value: 'week',
                        child: Text(tr(context, 'Week', 'Tuần')),
                      ),
                      DropdownMenuItem(
                        value: 'month',
                        child: Text(tr(context, 'Month', 'Tháng')),
                      ),
                    ],
                    onChanged:
                        (value) => setState(() {
                          _period = value!;
                          _load();
                        }),
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
                childAspectRatio: 1.35,
                children: [
                  MetricCard(
                    label: tr(context, 'Sales', 'Doanh thu'),
                    value: money(data.periodSales, data.currency),
                    icon: Icons.trending_up,
                  ),
                  MetricCard(
                    label: tr(context, 'Net profit', 'Lợi nhuận ròng'),
                    value: money(data.periodNetProfit, data.currency),
                    icon: Icons.insights_outlined,
                    accent:
                        data.periodNetProfit < 0 ? TenvoraColors.danger : null,
                  ),
                  MetricCard(
                    label: tr(context, 'Customer debt', 'Khách còn nợ'),
                    value: money(data.outstandingCustomers, data.currency),
                    icon: Icons.account_balance_wallet_outlined,
                    accent: TenvoraColors.amber,
                  ),
                  MetricCard(
                    label: tr(context, 'Supplier debt', 'Nợ nhà cung cấp'),
                    value: money(data.outstandingSuppliers, data.currency),
                    icon: Icons.inventory_2_outlined,
                    accent: TenvoraColors.amber,
                  ),
                ],
              ),
              const SizedBox(height: 22),
              Text(
                tr(context, 'Quick actions', 'Thao tác nhanh'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 10),
              SizedBox(
                height: 92,
                child: ListView(
                  scrollDirection: Axis.horizontal,
                  children: [
                    _Quick(
                      icon: Icons.people_outline,
                      label: tr(context, 'Customers', 'Khách hàng'),
                      onTap: () => _open(const CustomersScreen()),
                    ),
                    _Quick(
                      icon: Icons.inventory_2_outlined,
                      label: tr(context, 'Products', 'Sản phẩm'),
                      onTap: () => _open(const ProductsScreen()),
                    ),
                    _Quick(
                      icon: Icons.local_shipping_outlined,
                      label: tr(context, 'Purchases', 'Nhập hàng'),
                      onTap: () => _open(const PurchasesScreen()),
                    ),
                    _Quick(
                      icon: Icons.payments_outlined,
                      label: tr(context, 'Expenses', 'Chi phí'),
                      onTap: () => _open(const ExpensesScreen()),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              Text(
                tr(context, 'Cash movement', 'Dòng tiền'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 10),
              PaperCard(
                child: Column(
                  children: [
                    _MoneyRow(
                      tr(context, 'Customer payments', 'Thu từ khách'),
                      data.periodPayments,
                      data.currency,
                      true,
                    ),
                    const Divider(),
                    _MoneyRow(
                      tr(context, 'Purchases', 'Mua hàng'),
                      data.periodPurchases,
                      data.currency,
                      false,
                    ),
                    const Divider(),
                    _MoneyRow(
                      tr(context, 'Supplier payments', 'Trả nhà cung cấp'),
                      data.periodSupplierPayments,
                      data.currency,
                      false,
                    ),
                    const Divider(),
                    _MoneyRow(
                      tr(context, 'Expenses', 'Chi phí'),
                      data.periodExpenses,
                      data.currency,
                      false,
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 22),
              Text(
                tr(context, 'Recent activity', 'Hoạt động gần đây'),
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 10),
              if (data.recentActivity.isEmpty)
                EmptyState(
                  icon: Icons.history,
                  title: tr(context, 'No activity yet', 'Chưa có hoạt động'),
                  message: tr(
                    context,
                    'New sales and purchases will appear here.',
                    'Bán hàng và nhập hàng mới sẽ hiện ở đây.',
                  ),
                )
              else
                ...data.recentActivity
                    .take(6)
                    .map(
                      (item) => Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: PaperCard(
                          child: Row(
                            children: [
                              CircleAvatar(
                                backgroundColor: Theme.of(
                                  context,
                                ).colorScheme.primary.withValues(alpha: .1),
                                child: Icon(
                                  item.type.toLowerCase().contains('sale')
                                      ? Icons.receipt_long
                                      : Icons.swap_horiz,
                                  color: Theme.of(context).colorScheme.primary,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.title,
                                      style: const TextStyle(
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                    Text(
                                      item.detail,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
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
                                    money(item.amount, data.currency),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  Text(
                                    compactDate(item.occurredAt),
                                    style:
                                        Theme.of(context).textTheme.bodySmall,
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

class _Quick extends StatelessWidget {
  const _Quick({required this.icon, required this.label, required this.onTap});
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(right: 10),
    child: SizedBox(
      width: 108,
      child: PaperCard(
        onTap: onTap,
        padding: const EdgeInsets.all(12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 8),
            Text(
              label,
              maxLines: 1,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    ),
  );
}

class _MoneyRow extends StatelessWidget {
  const _MoneyRow(this.label, this.value, this.currency, this.incoming);
  final String label;
  final double value;
  final String currency;
  final bool incoming;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Icon(
        incoming ? Icons.south_west : Icons.north_east,
        size: 18,
        color:
            incoming
                ? Theme.of(context).colorScheme.primary
                : TenvoraColors.amber,
      ),
      const SizedBox(width: 10),
      Expanded(child: Text(label)),
      Text(
        money(value, currency),
        style: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ],
  );
}
