import 'package:flutter_test/flutter_test.dart';
import 'package:tenvora_mobile/app.dart';
import 'package:tenvora_mobile/core/network/api_client.dart';
import 'package:tenvora_mobile/core/storage/session_store.dart';
import 'package:tenvora_mobile/data/tenvora_repository.dart';
import 'package:tenvora_mobile/state/app_controller.dart';

void main() {
  testWidgets('App widget instantiation test', (WidgetTester tester) async {
    final store = SessionStore();
    final api = ApiClient(store);
    final controller = AppController(
      repository: TenvoraRepository(api),
      sessionStore: store,
    );

    await tester.pumpWidget(TenvoraApp(controller: controller));
    expect(find.byType(TenvoraApp), findsOneWidget);
  });
}
