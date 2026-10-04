import 'package:flutter/material.dart';

import '../../core/utils/formatters.dart';
import '../../state/app_controller.dart';
import '../widgets/common.dart';

class OnboardingScreen extends StatefulWidget {
  const OnboardingScreen({super.key});
  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _form = GlobalKey<FormState>();
  TextEditingController? _company;
  final _name = TextEditingController();
  final _phone = TextEditingController();
  String _currency = 'VND';
  String _type = 'Retail';
  bool _busy = false;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_company != null) return;
    final user = AppScope.of(context).user!;
    _company = TextEditingController(
      text: user.companyName == 'Tenvora' ? '' : user.companyName,
    );
    _currency = user.preferredCurrency;
  }

  @override
  void dispose() {
    _company?.dispose();
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    setState(() => _busy = true);
    try {
      final app = AppScope.of(context);
      final profile = await app.repository.completeOnboarding({
        'companyName': _company!.text.trim(),
        'preferredCurrency': _currency,
        'businessType': _type,
        'fullName': _name.text.trim().isEmpty ? null : _name.text.trim(),
        'phoneNumber': _phone.text.trim().isEmpty ? null : _phone.text.trim(),
      });
      await app.updateProfile(profile);
    } catch (error) {
      if (mounted) showMessage(context, readableError(error), error: true);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      actions: [
        TextButton(
          onPressed: AppScope.of(context).toggleLanguage,
          child: Text(AppScope.of(context).isVietnamese ? 'EN' : 'VI'),
        ),
      ],
    ),
    body: SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _form,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const TenvoraMark(size: 52),
              const SizedBox(height: 24),
              Text(
                tr(
                  context,
                  'Set up your workspace',
                  'Thiết lập không gian làm việc',
                ),
                style: Theme.of(context).textTheme.displaySmall,
              ),
              const SizedBox(height: 8),
              Text(
                tr(
                  context,
                  'A few details help Tenvora tailor your daily operations.',
                  'Một vài thông tin giúp Tenvora phù hợp với hoạt động hàng ngày.',
                ),
                style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
              ),
              const SizedBox(height: 28),
              TextFormField(
                controller: _company,
                decoration: InputDecoration(
                  labelText: tr(context, 'Company name', 'Tên doanh nghiệp'),
                ),
                validator:
                    (v) =>
                        (v?.trim().isEmpty ?? true)
                            ? tr(context, 'Required', 'Bắt buộc')
                            : null,
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _name,
                decoration: InputDecoration(
                  labelText: tr(
                    context,
                    'Your name (optional)',
                    'Tên của bạn (tùy chọn)',
                  ),
                ),
              ),
              const SizedBox(height: 14),
              TextFormField(
                controller: _phone,
                keyboardType: TextInputType.phone,
                decoration: InputDecoration(
                  labelText: tr(
                    context,
                    'Phone (optional)',
                    'Số điện thoại (tùy chọn)',
                  ),
                ),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: InputDecoration(
                  labelText: tr(
                    context,
                    'Business type',
                    'Loại hình kinh doanh',
                  ),
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
                onChanged: (v) => setState(() => _type = v!),
              ),
              const SizedBox(height: 14),
              DropdownButtonFormField<String>(
                initialValue: _currency,
                decoration: InputDecoration(
                  labelText: tr(context, 'Base currency', 'Tiền tệ cơ sở'),
                ),
                items:
                    const ['VND', 'USD', 'EUR', 'GBP', 'SGD']
                        .map((v) => DropdownMenuItem(value: v, child: Text(v)))
                        .toList(),
                onChanged: (v) => setState(() => _currency = v!),
              ),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: _busy ? null : _save,
                icon: const Icon(Icons.arrow_forward),
                label: Text(
                  tr(context, 'Open my workspace', 'Mở không gian làm việc'),
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
