import 'package:flutter/material.dart';

abstract final class TenvoraColors {
  static const ink = Color(0xFF20352E);
  static const forest = Color(0xFF316D58);
  static const forestDark = Color(0xFF245242);
  static const sage = Color(0xFF7CBC9F);
  static const amber = Color(0xFFEDA934);
  static const paper = Color(0xFFF7F3E8);
  static const card = Color(0xFFFFFDF8);
  static const rule = Color(0xFFD8CEB8);
  static const danger = Color(0xFFB8483D);
  static const night = Color(0xFF16201C);
  static const nightCard = Color(0xFF202C27);
}

ThemeData tenvoraTheme(Brightness brightness) {
  final dark = brightness == Brightness.dark;
  final scheme = ColorScheme.fromSeed(
    seedColor: dark ? TenvoraColors.sage : TenvoraColors.forest,
    brightness: brightness,
    primary: dark ? TenvoraColors.sage : TenvoraColors.forest,
    secondary: TenvoraColors.amber,
    surface: dark ? TenvoraColors.nightCard : TenvoraColors.card,
    error: TenvoraColors.danger,
  );
  final base = ThemeData(
    colorScheme: scheme,
    brightness: brightness,
    useMaterial3: true,
  );
  final border = OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: BorderSide(color: dark ? Colors.white24 : TenvoraColors.rule),
  );
  return base.copyWith(
    scaffoldBackgroundColor: dark ? TenvoraColors.night : TenvoraColors.paper,
    appBarTheme: AppBarTheme(
      backgroundColor: Colors.transparent,
      foregroundColor: dark ? Colors.white : TenvoraColors.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: dark ? Colors.white : TenvoraColors.ink,
        fontFamily: 'serif',
        fontWeight: FontWeight.w700,
        fontSize: 22,
      ),
    ),
    textTheme: base.textTheme.copyWith(
      displaySmall: base.textTheme.displaySmall?.copyWith(
        fontFamily: 'serif',
        fontWeight: FontWeight.w700,
      ),
      headlineMedium: base.textTheme.headlineMedium?.copyWith(
        fontFamily: 'serif',
        fontWeight: FontWeight.w700,
      ),
      headlineSmall: base.textTheme.headlineSmall?.copyWith(
        fontFamily: 'serif',
        fontWeight: FontWeight.w700,
      ),
      titleLarge: base.textTheme.titleLarge?.copyWith(
        fontFamily: 'serif',
        fontWeight: FontWeight.w700,
      ),
      bodyLarge: base.textTheme.bodyLarge?.copyWith(height: 1.35),
      bodyMedium: base.textTheme.bodyMedium?.copyWith(height: 1.35),
    ),
    cardTheme: CardThemeData(
      elevation: 0,
      margin: EdgeInsets.zero,
      color: dark ? TenvoraColors.nightCard : TenvoraColors.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: dark ? Colors.white12 : TenvoraColors.rule),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor:
          dark ? Colors.white.withValues(alpha: .05) : TenvoraColors.card,
      border: border,
      enabledBorder: border,
      focusedBorder: border.copyWith(
        borderSide: BorderSide(color: scheme.primary, width: 1.5),
      ),
      errorBorder: border.copyWith(
        borderSide: BorderSide(color: scheme.error, width: 1.5),
      ),
      focusedErrorBorder: border.copyWith(
        borderSide: BorderSide(color: scheme.error, width: 2),
      ),
      errorStyle: TextStyle(
        color: scheme.error,
        fontSize: 13,
        fontWeight: FontWeight.w700,
        height: 1.35,
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w700),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(48, 48),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    navigationBarTheme: NavigationBarThemeData(
      elevation: 0,
      backgroundColor: dark ? TenvoraColors.nightCard : TenvoraColors.card,
      indicatorColor: scheme.primary.withValues(alpha: .15),
      labelTextStyle: WidgetStateProperty.all(
        const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
      ),
    ),
    dividerTheme: DividerThemeData(
      color: dark ? Colors.white12 : TenvoraColors.rule,
    ),
  );
}
