import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/core/theme/tenvora_theme.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:tenvora_mobile/state/app_controller.dart';
import 'package:tenvora_mobile/ui/widgets/common.dart';

void main() {
  testWidgets('status text meets contrast in both themes', (tester) async {
    final store = SessionStore();
    final app = AppController(
      repository: TenvoraRepository(ApiClient(store)),
      sessionStore: store,
    )..initializing = false;
    addTearDown(app.dispose);

    for (final brightness in Brightness.values) {
      final theme = tenvoraTheme(brightness);
      final isDark = brightness == Brightness.dark;
      final fills = {
        'Pending': TenvoraColors.amber,
        'Archived': TenvoraColors.danger,
        'Active': theme.colorScheme.primary,
      };
      final foregrounds = {
        'Pending': isDark ? TenvoraColors.amber : TenvoraColors.amberInk,
        'Archived':
            isDark ? TenvoraColors.dangerInkDark : TenvoraColors.dangerInk,
        'Active': theme.colorScheme.primary,
      };
      final surfaces =
          isDark
              ? [TenvoraColors.nightCard, TenvoraColors.night]
              : [TenvoraColors.card, TenvoraColors.paper];

      for (final entry in fills.entries) {
        await tester.pumpWidget(
          AppScope(
            controller: app,
            child: MaterialApp(
              key: ValueKey(brightness),
              theme: theme,
              home: Scaffold(body: Center(child: StatusPill(entry.key))),
            ),
          ),
        );

        final text = tester.widget<Text>(find.text(entry.key));
        final foreground = foregrounds[entry.key]!;
        expect(
          text.style?.color,
          foreground,
          reason: '${entry.key} status in $brightness mode',
        );

        for (final surface in surfaces) {
          final pillSurface = Color.alphaBlend(
            entry.value.withValues(alpha: .12),
            surface,
          );
          expect(
            _contrastRatio(foreground, pillSurface),
            greaterThanOrEqualTo(4.5),
            reason: '$entry on $surface in $brightness theme',
          );
        }
        expect(tester.takeException(), isNull);
      }
    }
  });
}

double _contrastRatio(Color foreground, Color background) {
  final foregroundLuminance = foreground.computeLuminance();
  final backgroundLuminance = background.computeLuminance();
  final lighter =
      foregroundLuminance > backgroundLuminance
          ? foregroundLuminance
          : backgroundLuminance;
  final darker =
      foregroundLuminance > backgroundLuminance
          ? backgroundLuminance
          : foregroundLuminance;
  return (lighter + .05) / (darker + .05);
}
