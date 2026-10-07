import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/domain/models.dart';
import 'package:tenvora_mobile/state/app_controller.dart';
import 'package:tenvora_mobile/ui/agent/agent_screen.dart';
import 'ai_consent_test.dart';

class ConfirmationRepository extends ConsentRepository {
  ConfirmationRepository(super.store, this.intent);
  final String intent;
  int confirmations = 0;
  final result = Completer<Json>();
  @override
  Future<Json> agentChat(String message, {String? conversationId}) async => {
    'conversationId': 'conversation',
    'id': 'reply',
    'role': 'assistant',
    'content': 'Review this action',
    'proposal': {
      'actionId': 'action',
      'intent': intent,
      'status': 'PendingConfirmation',
      'summary': 'Ready to record',
      'requiresConfirmation': true,
      'details': {},
    },
  };
  @override
  Future<Json> confirmAction(String id, bool confirmed) {
    confirmations++;
    return result.future;
  }
}

void main() {
  for (final intent in ['create_customer', 'expense', 'supplier_payment']) {
    testWidgets('$intent confirmation blocks repeat taps and settles once', (
      tester,
    ) async {
      final store = SessionStore();
      final repository = ConfirmationRepository(store, intent);
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
      await tester.enterText(find.byType(TextField), 'Prepare action');
      await tester.testTextInput.receiveAction(TextInputAction.send);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Agree and continue'));
      await tester.pumpAndSettle();
      await tester.ensureVisible(find.text('Confirm'));
      await tester.tap(find.text('Confirm'));
      await tester.tap(find.text('Confirm'));
      await tester.pump();
      expect(repository.confirmations, 1);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      repository.result.complete({
        'actionId': 'action',
        'status': 'Executed',
        'message': 'Action completed',
      });
      await tester.pumpAndSettle();
      expect(find.text('Confirm'), findsNothing);
      expect(find.text('Reject'), findsNothing);
      expect(find.text('Action completed'), findsOneWidget);
      expect(repository.confirmations, 1);
    });
  }
}
