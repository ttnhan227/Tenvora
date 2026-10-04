import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:image_picker/image_picker.dart';
import 'package:tenvora_mobile/ui/widgets/receipt_photo.dart';

void main() {
  testWidgets(
    'camera and gallery are separate choices and cancel preserves photo',
    (tester) async {
      final sources = <ImageSource>[];
      var changes = 0;
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ReceiptPhoto(
              value: null,
              vietnamese: false,
              onChanged: (_) => changes++,
              pickImage: (source) async {
                sources.add(source);
                return null;
              },
            ),
          ),
        ),
      );
      await tester.tap(find.text('Choose photo'));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Take photo'));
      await tester.pumpAndSettle();
      expect(sources, [ImageSource.gallery, ImageSource.camera]);
      expect(changes, 0);
    },
  );
  testWidgets('saved photo can be opened and zoomed', (tester) async {
    const png =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=';
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ReceiptPhoto(
            value: 'data:image/png;base64,$png',
            vietnamese: false,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.byType(InkWell));
    await tester.pumpAndSettle();
    expect(find.byType(InteractiveViewer), findsOneWidget);
    expect(find.text('Receipt photo'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('gallery image attaches with its actual format', (tester) async {
    String? result;
    final bytes = base64Decode(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0ioAAAAASUVORK5CYII=',
    );
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ReceiptPhoto(
            value: null,
            vietnamese: false,
            onChanged: (value) => result = value,
            pickImage: (_) async => XFile.fromData(bytes, name: 'receipt.png'),
          ),
        ),
      ),
    );
    await tester.tap(find.text('Choose photo'));
    await tester.pumpAndSettle();
    expect(result, 'data:image/png;base64,${base64Encode(bytes)}');
  });
  testWidgets('malformed saved photo shows a readable fallback', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: ReceiptPhoto(
            value: 'data:image/jpeg;base64,invalid!',
            vietnamese: false,
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Photo unavailable'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
