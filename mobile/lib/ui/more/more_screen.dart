import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';
import '../../state/app_controller.dart';
import '../business/customers_screen.dart';
import '../business/expenses_screen.dart';
import '../business/products_screen.dart';
import '../business/purchases_screen.dart';
import '../business/suppliers_screen.dart';
import '../management/management_screens.dart';
import '../widgets/common.dart';

class MoreScreen extends StatelessWidget {
  const MoreScreen({super.key});
  void _open(BuildContext context, Widget page) =>
      Navigator.push(context, MaterialPageRoute(builder: (_) => page));
  @override
  Widget build(BuildContext context) {
    final user = AppScope.of(context).user!;
    final items = <_MenuItem>[
      _MenuItem(
        Icons.people_outline,
        tr(context, 'Customers', 'Khách hàng'),
        tr(
          context,
          'Contacts, balances and history',
          'Liên hệ, công nợ và lịch sử',
        ),
        const CustomersScreen(),
      ),
      _MenuItem(
        Icons.inventory_2_outlined,
        tr(context, 'Products & stock', 'Sản phẩm & kho'),
        tr(context, 'Catalog and inventory levels', 'Danh mục và tồn kho'),
        const ProductsScreen(),
      ),
      _MenuItem(
        Icons.local_shipping_outlined,
        tr(context, 'Suppliers', 'Nhà cung cấp'),
        tr(context, 'Contacts and payables', 'Liên hệ và công nợ'),
        const SuppliersScreen(),
      ),
      _MenuItem(
        Icons.shopping_cart_outlined,
        tr(context, 'Purchases', 'Nhập hàng'),
        tr(context, 'Stock receipts and supplier bills', 'Nhập kho và hóa đơn'),
        const PurchasesScreen(),
      ),
      _MenuItem(
        Icons.payments_outlined,
        tr(context, 'Expenses', 'Chi phí'),
        tr(context, 'Operating costs and receipts', 'Chi phí và hóa đơn'),
        const ExpensesScreen(),
      ),
      _MenuItem(
        Icons.analytics_outlined,
        tr(context, 'Reports', 'Báo cáo'),
        tr(
          context,
          'Profit, cash flow and balances',
          'Lợi nhuận, dòng tiền và công nợ',
        ),
        const ReportsScreen(),
      ),
      if (user.canManage)
        _MenuItem(
          Icons.upload_file_outlined,
          tr(context, 'Import data', 'Nhập dữ liệu'),
          tr(
            context,
            'Bring in CSV business records',
            'Nhập dữ liệu kinh doanh CSV',
          ),
          const ImportScreen(),
        ),
      _MenuItem(
        Icons.settings_outlined,
        tr(context, 'Settings', 'Cài đặt'),
        tr(
          context,
          'Workspace, profile and appearance',
          'Doanh nghiệp, hồ sơ và giao diện',
        ),
        const SettingsScreen(),
      ),
      if (user.isAdmin)
        _MenuItem(
          Icons.group_outlined,
          tr(context, 'Team', 'Nhóm'),
          tr(
            context,
            'Members, roles and access',
            'Thành viên, vai trò và truy cập',
          ),
          const TeamScreen(),
        ),
      if (user.canManage)
        _MenuItem(
          Icons.history_outlined,
          tr(context, 'Audit log', 'Nhật ký kiểm toán'),
          tr(context, 'Trace business changes', 'Theo dõi thay đổi dữ liệu'),
          const AuditScreen(),
        ),
    ];
    return PagePadding(
      child: ListView(
        children: [
          PaperCard(
            child: Row(
              children: [
                CircleAvatar(
                  radius: 24,
                  child: Text(user.displayName.characters.first.toUpperCase()),
                ),
                const SizedBox(width: 13),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.displayName,
                        style: const TextStyle(fontWeight: FontWeight.w800),
                      ),
                      Text(
                        user.email,
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      Text(
                        user.role,
                        style: TextStyle(
                          fontSize: 11,
                          color: Theme.of(context).colorScheme.primary,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          ...items.map(
            (item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: PaperCard(
                onTap: () => _open(context, item.page),
                padding: const EdgeInsets.symmetric(
                  horizontal: 15,
                  vertical: 13,
                ),
                child: Row(
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: Theme.of(
                          context,
                        ).colorScheme.primary.withValues(alpha: .1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(
                        item.icon,
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
                            style: const TextStyle(fontWeight: FontWeight.w800),
                          ),
                          Text(
                            item.subtitle,
                            style: Theme.of(context).textTheme.bodySmall,
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.chevron_right),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(height: 8),
          OutlinedButton.icon(
            onPressed: () async {
              if (await confirm(
                context,
                title: tr(context, 'Sign out?', 'Đăng xuất?'),
                message: tr(
                  context,
                  'You can sign in again at any time.',
                  'Bạn có thể đăng nhập lại bất cứ lúc nào.',
                ),
              )) {
                if (!context.mounted) return;
                await AppScope.of(context).logout();
              }
            },
            icon: const Icon(Icons.logout),
            label: Text(tr(context, 'Sign out', 'Đăng xuất')),
          ),
        ],
      ),
    );
  }
}

class _MenuItem {
  const _MenuItem(this.icon, this.title, this.subtitle, this.page);
  final IconData icon;
  final String title;
  final String subtitle;
  final Widget page;
}
