import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';
import '../../state/app_controller.dart';
import '../agent/agent_screen.dart';
import '../business/sales_screen.dart';
import '../dashboard/dashboard_screen.dart';
import '../more/more_screen.dart';
import '../widgets/common.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});
  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _index = 0;
  final _screens = const [
    DashboardScreen(),
    SalesScreen(embedded: true),
    AgentScreen(),
    MoreScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    final titles = [
      tr(context, 'Overview', 'Tổng quan'),
      tr(context, 'Sales', 'Bán hàng'),
      tr(context, 'Tenvora Agent', 'Trợ lý Tenvora'),
      tr(context, 'Workspace', 'Không gian'),
    ];
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            const TenvoraMark(size: 34),
            const SizedBox(width: 10),
            Expanded(
              child: Text(titles[_index], overflow: TextOverflow.ellipsis),
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: tr(context, 'Language', 'Ngôn ngữ'),
            onPressed: app.toggleLanguage,
            icon: Text(
              app.isVietnamese ? 'EN' : 'VI',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: IndexedStack(index: _index, children: _screens),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: [
          NavigationDestination(
            icon: const Icon(Icons.space_dashboard_outlined),
            selectedIcon: const Icon(Icons.space_dashboard),
            label: tr(context, 'Home', 'Trang chủ'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.receipt_long_outlined),
            selectedIcon: const Icon(Icons.receipt_long),
            label: tr(context, 'Sales', 'Bán hàng'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.auto_awesome_outlined),
            selectedIcon: const Icon(Icons.auto_awesome),
            label: tr(context, 'Agent', 'Trợ lý'),
          ),
          NavigationDestination(
            icon: const Icon(Icons.grid_view_outlined),
            selectedIcon: const Icon(Icons.grid_view),
            label: tr(context, 'More', 'Thêm'),
          ),
        ],
      ),
    );
  }
}
