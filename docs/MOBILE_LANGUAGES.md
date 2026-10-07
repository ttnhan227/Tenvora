# Android language support

Tenvora supports English, Vietnamese, Spanish, French, German, Brazilian Portuguese and Indonesian in its Android interface. The language button is available before sign-in, during onboarding and throughout the workspace; Settings also opens the picker. Native language names make it possible to recover from an accidental selection.

The first launch follows a supported device language, otherwise English. An explicit selection is stored in `tenvora_lang`, including the existing English/Vietnamese preference. “Use device language” follows later system language changes while the app is running. Language changes do not change account records or the workspace currency.

Flutter's Material localizations cover native calendar/dialog controls. Dates and displayed numbers follow the selected locale. Currency precision follows the ISO currency configuration; stock quantities retain three fractional digits. Decimal-comma input is supported alongside existing decimal-point editor values. CSV imports retain the English template's numeric contract.

Customer names, company names, notes, product names, units, identifiers and imported records are user data and are not automatically translated. The web interface remains English/Vietnamese. The Android language picker does not claim to translate the website.

Google Gemini is instructed to answer in the question's language. Hosted AI availability and quotas are separate from the bundled interface translations. The deterministic built-in assistant has limited natural-language support, especially outside English/Vietnamese; new replies identify that mode. Do not advertise every AI request as supported in every language.

## Maintenance

Edit the JSON catalogs in `mobile/lib/core/localization/`. Keys are the existing English source phrases; values are display translations. The seven catalogs must have identical keys, nonempty values and unchanged placeholders/URLs. Add newly introduced UI phrases to every catalog.

Run `python mobile/tool/generate_language_catalog.py`, then the existing mobile `verify` command to format, analyze and test the generated Dart catalog. Tests cover all catalog keys, device-language fallback, preference persistence, decimal input, and sign-in/settings at 320 × 640 with 150% text scaling.

Translations were completed and reviewed during development; they have not been independently certified by native-speaking professional reviewers. User feedback can refine regional wording without changing financial logic.
