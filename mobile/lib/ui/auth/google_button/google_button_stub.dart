import 'package:flutter/material.dart';
import '../../../core/utils/formatters.dart';

Widget buildGoogleSignInButton({
  required BuildContext context,
  required bool busy,
  required VoidCallback onPressed,
}) {
  return OutlinedButton.icon(
    onPressed: busy ? null : onPressed,
    icon: const Icon(Icons.g_mobiledata, size: 28),
    label: Text(tr(context, 'Continue with Google', 'Tiếp tục với Google')),
  );
}
