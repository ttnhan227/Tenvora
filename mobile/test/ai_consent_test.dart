import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:tenvora_mobile/domain/models.dart';
import 'package:tenvora_mobile/state/app_controller.dart';
import 'package:tenvora_mobile/ui/agent/agent_screen.dart';

class ConsentRepository extends TenvoraRepository {
  ConsentRepository(SessionStore store) : super(ApiClient(store));
  int requests = 0;
  @override
  Future<Json> agentChat(String message, {String? conversationId}) async {
    requests++;
    return {'id': 'reply', 'role': 'assistant', 'content': 'Synthetic answer'};
  }
}

void main() {
  testWidgets(
    'AI cancellation sends nothing and agreement permits the request',
    (tester) async {
      final store = SessionStore();
      final repository = ConsentRepository(store);
      final app =
          AppController(repository: repository, sessionStore: store)
            ..initializing = false
            ..user = UserProfile.fromJson({
              'id': 'reviewer',
              'email': 'fixture@example.invalid',
            });
      await tester.pumpWidget(
        AppScope(
          controller: app,
          child: const MaterialApp(home: Scaffold(body: AgentScreen())),
        ),
      );
      await tester.enterText(find.byType(TextField), 'Check balances');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();
      expect(find.text('Before using AI'), findsOneWidget);
      expect(repository.requests, 0);
      await tester.tap(find.text('Not now'));
      await tester.pumpAndSettle();
      expect(repository.requests, 0);
      expect(find.text('Check balances'), findsOneWidget);
      await tester.tap(find.byType(TextField));
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Agree and continue'));
      await tester.pumpAndSettle();
      expect(repository.requests, 1);
      expect(find.text('Synthetic answer'), findsOneWidget);
    },
  );
}
