import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import '../../state/app_controller.dart';

String tr(BuildContext context, String en, String vi) =>
    AppScope.of(context).isVietnamese ? vi : en;

String money(num value, [String currency = 'VND']) {
  final digits = currency == 'VND' ? 0 : 2;
  return NumberFormat.currency(
    symbol: currency == 'VND' ? '₫' : '$currency ',
    decimalDigits: digits,
  ).format(value);
}

String stockQuantity(num value) => NumberFormat('0.###').format(value);

String shortDate(DateTime date) =>
    DateFormat('dd MMM yyyy').format(date.toLocal());
String compactDate(DateTime date) =>
    DateFormat('dd/MM/yy').format(date.toLocal());

double numberOf(String value) =>
    double.tryParse(value.replaceAll(',', '')) ?? 0;

String imageDataUrl(List<int> bytes) {
  final mime =
      bytes.length >= 4 && bytes[0] == 137 && bytes[1] == 80
          ? 'image/png'
          : bytes.length >= 12 &&
              ascii.decode(bytes.sublist(0, 4), allowInvalid: true) == 'RIFF'
          ? 'image/webp'
          : 'image/jpeg';
  return 'data:$mime;base64,${base64Encode(bytes)}';
}

Uint8List? dataUrlBytes(String? value) {
  if (value == null || !value.contains(',')) return null;
  try {
    return base64Decode(value.substring(value.indexOf(',') + 1));
  } catch (_) {
    return null;
  }
}

String readableError(Object error) {
  final text = error.toString();
  if (text.contains('GoogleSignInException') &&
      text.contains('clientConfigurationError')) {
    return 'Google sign-in is not configured for this Android build. '
        'Install the latest Tenvora build and try again.';
  }
  if (text.startsWith('ApiFailure: ')) return text.substring(12);
  if (text.startsWith('Exception: ')) return text.substring(11);
  return text;
}
