import 'package:flutter/material.dart';

import '../../core/localization/languages.dart';
import '../../core/utils/formatters.dart';
import '../../state/app_controller.dart';

class LanguageButton extends StatelessWidget {
  const LanguageButton({super.key});

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: tr(context, 'Language', 'Ngôn ngữ'),
    icon: const Icon(Icons.language),
    onPressed: () => showLanguagePicker(context),
  );
}

Future<void> showLanguagePicker(BuildContext context) async {
  final app = AppScope.of(context);
  final selected = await showModalBottomSheet<String>(
    context: context,
    useSafeArea: true,
    isScrollControlled: true,
    showDragHandle: true,
    builder:
        (sheetContext) => ConstrainedBox(
          constraints: BoxConstraints(
            maxHeight: MediaQuery.sizeOf(sheetContext).height * .85,
          ),
          child: ListView(
            shrinkWrap: true,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 12),
                child: Text(
                  tr(context, 'Language', 'Ngôn ngữ'),
                  style: Theme.of(sheetContext).textTheme.titleLarge,
                ),
              ),
              ListTile(
                title: Text(
                  tr(context, 'Use device language', 'Dùng ngôn ngữ thiết bị'),
                ),
                leading: Icon(
                  app.languagePreference == 'system'
                      ? Icons.radio_button_checked
                      : Icons.radio_button_unchecked,
                ),
                onTap: () => Navigator.pop(sheetContext, 'system'),
              ),
              for (final language in appLanguages)
                ListTile(
                  title: Text(language.name),
                  subtitle:
                      language.name == language.englishName
                          ? null
                          : Text(language.englishName),
                  leading: Icon(
                    app.languagePreference == language.code
                        ? Icons.radio_button_checked
                        : Icons.radio_button_unchecked,
                  ),
                  onTap: () => Navigator.pop(sheetContext, language.code),
                ),
              SizedBox(height: MediaQuery.paddingOf(sheetContext).bottom + 12),
            ],
          ),
        ),
  );
  if (selected != null) await app.setLanguage(selected);
}
