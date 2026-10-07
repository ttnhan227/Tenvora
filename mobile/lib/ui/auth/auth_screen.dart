import 'package:flutter/material.dart';

import '../more/privacy_screen.dart';

import '../../core/utils/formatters.dart';
import '../../state/app_controller.dart';
import '../widgets/common.dart';
import '../widgets/language_picker.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});
  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _company = TextEditingController();
  bool _register = false;
  bool _obscure = true;
  String _currency = 'USD';

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _company.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_form.currentState?.validate() ?? false)) return;
    final app = AppScope.of(context);
    final ok =
        _register
            ? await app.register(
              _company.text,
              _email.text,
              _password.text,
              _currency,
            )
            : await app.login(_email.text, _password.text);
    if (!ok && mounted) {
      showMessage(
        context,
        app.lastError ??
            tr(context, 'Authentication failed', 'Đăng nhập thất bại'),
        error: true,
      );
    }
  }

  Future<void> _google() async {
    final app = AppScope.of(context);
    final ok = await app.loginWithGoogle();
    if (!ok && mounted) {
      showMessage(
        context,
        app.lastError ??
            tr(context, 'Google sign-in failed', 'Đăng nhập Google thất bại'),
        error: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final app = AppScope.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const TenvoraMark(size: 48),
                      const SizedBox(width: 13),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Tenvora',
                              style: Theme.of(context).textTheme.headlineMedium,
                            ),
                            Text(
                              tr(
                                context,
                                'Business, clearly run.',
                                'Vận hành kinh doanh rõ ràng.',
                              ),
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      ),
                      const LanguageButton(),
                    ],
                  ),
                  const SizedBox(height: 48),
                  Text(
                    _register
                        ? tr(
                          context,
                          'Create your workspace',
                          'Tạo không gian làm việc',
                        )
                        : tr(context, 'Welcome back', 'Chào mừng trở lại'),
                    style: Theme.of(context).textTheme.displaySmall,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _register
                        ? tr(
                          context,
                          'Start managing sales, stock and cash flow.',
                          'Bắt đầu quản lý bán hàng, kho và dòng tiền.',
                        )
                        : tr(
                          context,
                          'Sign in to continue to your business.',
                          'Đăng nhập để tiếp tục quản lý doanh nghiệp.',
                        ),
                    style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                  ),
                  const SizedBox(height: 28),
                  Form(
                    key: _form,
                    child: Column(
                      children: [
                        if (_register) ...[
                          TextFormField(
                            controller: _company,
                            textInputAction: TextInputAction.next,
                            decoration: InputDecoration(
                              labelText: tr(
                                context,
                                'Company name',
                                'Tên doanh nghiệp',
                              ),
                              prefixIcon: const Icon(Icons.storefront_outlined),
                            ),
                            validator:
                                (v) =>
                                    (v?.trim().isEmpty ?? true)
                                        ? tr(
                                          context,
                                          'Company name is required',
                                          'Vui lòng nhập tên doanh nghiệp',
                                        )
                                        : null,
                          ),
                          const SizedBox(height: 14),
                        ],
                        TextFormField(
                          controller: _email,
                          keyboardType: TextInputType.emailAddress,
                          textInputAction: TextInputAction.next,
                          autocorrect: false,
                          decoration: InputDecoration(
                            labelText: tr(context, 'Email', 'Email'),
                            prefixIcon: Icon(Icons.mail_outline),
                          ),
                          validator:
                              (v) =>
                                  !(v?.contains('@') ?? false)
                                      ? tr(
                                        context,
                                        'Enter a valid email',
                                        'Email không hợp lệ',
                                      )
                                      : null,
                        ),
                        const SizedBox(height: 14),
                        TextFormField(
                          controller: _password,
                          obscureText: _obscure,
                          onFieldSubmitted: (_) => _submit(),
                          decoration: InputDecoration(
                            labelText: tr(context, 'Password', 'Mật khẩu'),
                            prefixIcon: const Icon(Icons.lock_outline),
                            suffixIcon: IconButton(
                              onPressed:
                                  () => setState(() => _obscure = !_obscure),
                              icon: Icon(
                                _obscure
                                    ? Icons.visibility_outlined
                                    : Icons.visibility_off_outlined,
                              ),
                            ),
                          ),
                          validator: (v) {
                            final value = v ?? '';
                            if (!_register) {
                              return value.isEmpty
                                  ? tr(
                                    context,
                                    'Password is required',
                                    'Vui lòng nhập mật khẩu',
                                  )
                                  : null;
                            }
                            final strong =
                                value.length >= 12 &&
                                value.contains(RegExp('[A-Z]')) &&
                                value.contains(RegExp('[a-z]')) &&
                                value.contains(RegExp('[0-9]'));
                            return strong
                                ? null
                                : tr(
                                  context,
                                  'Use 12+ characters with upper/lowercase and a number',
                                  'Dùng ít nhất 12 ký tự, gồm chữ hoa, chữ thường và số',
                                );
                          },
                        ),
                        if (_register) ...[
                          const SizedBox(height: 14),
                          DropdownButtonFormField<String>(
                            initialValue: _currency,
                            decoration: InputDecoration(
                              labelText: tr(
                                context,
                                'Base currency',
                                'Tiền tệ cơ sở',
                              ),
                              prefixIcon: const Icon(Icons.currency_exchange),
                            ),
                            items:
                                supportedCurrencies
                                    .map(
                                      (v) => DropdownMenuItem(
                                        value: v,
                                        child: Text(tr(context, v, v)),
                                      ),
                                    )
                                    .toList(),
                            onChanged:
                                (v) => setState(() => _currency = v ?? 'VND'),
                          ),
                        ],
                        const SizedBox(height: 20),
                        FilledButton(
                          onPressed: app.busy ? null : _submit,
                          child:
                              app.busy
                                  ? const SizedBox(
                                    width: 22,
                                    height: 22,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                  : Text(
                                    _register
                                        ? tr(
                                          context,
                                          'Create workspace',
                                          'Tạo không gian',
                                        )
                                        : tr(context, 'Sign in', 'Đăng nhập'),
                                  ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                  Row(
                    children: [
                      const Expanded(child: Divider()),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 12),
                        child: Text(tr(context, 'or', 'hoặc')),
                      ),
                      const Expanded(child: Divider()),
                    ],
                  ),
                  const SizedBox(height: 14),
                  OutlinedButton.icon(
                    onPressed: app.busy ? null : _google,
                    icon: const Icon(Icons.g_mobiledata, size: 28),
                    label: Text(
                      tr(
                        context,
                        'Continue with Google',
                        'Tiếp tục với Google',
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  TextButton(
                    onPressed:
                        app.busy
                            ? null
                            : () => setState(() => _register = !_register),
                    child: Text(
                      _register
                          ? tr(
                            context,
                            'Already have an account? Sign in',
                            'Đã có tài khoản? Đăng nhập',
                          )
                          : tr(
                            context,
                            'New to Tenvora? Create an account',
                            'Mới dùng Tenvora? Tạo tài khoản',
                          ),
                    ),
                  ),
                  TextButton(
                    onPressed:
                        () => Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const PrivacyScreen(),
                          ),
                        ),
                    child: Text(tr(context, 'Privacy', 'Quyền riêng tư')),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
