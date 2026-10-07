import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/ui/widgets/action_guard.dart';
import 'package:tenvora_mobile/ui/widgets/search_controller.dart';

class GuardFixture extends StatefulWidget {
  const GuardFixture({super.key, required this.request});
  final Future<void> Function() request;
  @override
  State<GuardFixture> createState() => GuardFixtureState();
}

class GuardFixtureState extends State<GuardFixture> with ActionGuard {
  Future<void> submit() => runAction(widget.request);
  @override
  Widget build(BuildContext context) => guardActions(
    Center(child: FilledButton(onPressed: submit, child: const Text('Save'))),
  );
}

void main() {
  testWidgets(
    'locks before repaint, blocks other actions, and unlocks after failure',
    (tester) async {
      var calls = 0;
      var response = Completer<void>();
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: GuardFixture(
              request: () {
                calls++;
                return response.future;
              },
            ),
          ),
        ),
      );
      final state = tester.state<GuardFixtureState>(find.byType(GuardFixture));
      final first = state.submit();
      await state.submit();
      expect(calls, 1);
      await tester.pump();
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      expect(
        tester
            .widget<AbsorbPointer>(find.byType(AbsorbPointer).first)
            .absorbing,
        isTrue,
      );
      final failure = expectLater(first, throwsStateError);
      response.completeError(StateError('offline'));
      await failure;
      await tester.pump();
      expect(find.byType(LinearProgressIndicator), findsNothing);
      response = Completer<void>()..complete();
      await state.submit();
      expect(calls, 2);
    },
  );
  testWidgets(
    'search debounces typing, submits immediately, and cancels on disposal',
    (tester) async {
      var calls = 0;
      final search = SearchController(() => calls++);
      search.text = 'a';
      await tester.pump(const Duration(milliseconds: 200));
      search.text = 'ab';
      await tester.pump(const Duration(milliseconds: 299));
      expect(calls, 0);
      await tester.pump(const Duration(milliseconds: 1));
      expect(calls, 1);
      search.text = 'abc';
      search.searchNow();
      await tester.pump(const Duration(milliseconds: 300));
      expect(calls, 2);
      search.text = 'abcd';
      search.dispose();
      await tester.pump(const Duration(milliseconds: 300));
      expect(calls, 2);
    },
  );
}
