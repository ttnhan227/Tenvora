import 'dart:ui';

import 'catalog.g.dart';

class AppLanguage {
  const AppLanguage(this.code, this.name, this.englishName, this.locale);
  final String code;
  final String name;
  final String englishName;
  final Locale locale;
}

const appLanguages = [
  AppLanguage('en', 'English', 'English', Locale('en')),
  AppLanguage('vi', 'Tiếng Việt', 'Vietnamese', Locale('vi')),
  AppLanguage('es', 'Español', 'Spanish', Locale('es')),
  AppLanguage('fr', 'Français', 'French', Locale('fr')),
  AppLanguage('de', 'Deutsch', 'German', Locale('de')),
  AppLanguage(
    'pt-BR',
    'Português (Brasil)',
    'Brazilian Portuguese',
    Locale('pt', 'BR'),
  ),
  AppLanguage('id', 'Bahasa Indonesia', 'Indonesian', Locale('id')),
];

String resolveLanguage(String? preference, Iterable<Locale> deviceLocales) {
  if (appLanguages.any((language) => language.code == preference)) {
    return preference!;
  }
  for (final locale in deviceLocales) {
    for (final language in appLanguages) {
      if (language.locale.languageCode == locale.languageCode) {
        return language.code;
      }
    }
  }
  return 'en';
}

AppLanguage languageFor(String code) => appLanguages.firstWhere(
  (language) => language.code == code,
  orElse: () => appLanguages.first,
);

String translate(String code, String english, [String? vietnamese]) =>
    languageCatalogs[code]?[english] ??
    (code == 'vi' ? vietnamese : null) ??
    english;
