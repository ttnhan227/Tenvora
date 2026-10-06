import 'package:flutter/material.dart';

import 'app.dart';
import 'core/network/api_client.dart';
import 'core/storage/session_store.dart';
import 'data/tenvora_repository.dart';
import 'state/app_controller.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final store = SessionStore();
  final api = ApiClient(store);
  final controller = AppController(
    repository: TenvoraRepository(api),
    sessionStore: store,
  );
  runApp(TenvoraApp(controller: controller));
  await controller.initialize();
}
