# Google Play policy preflight — October 7, 2026

Decision: the verified bundle can enter Play testing, but policy readiness is not fully cleared. This review does not publish the app or certify Google approval. Signed builds run in GitHub Actions; the installed Android release was tested locally in an isolated Android 16 emulator.

## Evidence checked

- Signed retained 1.0.0 bundle: package `com.tenvora.app`, version code 1, target API 36, verified upload certificate, eight 64-bit native libraries checked for 16 KB alignment/packaging. Receipt: `mobile/build/play-release-ci/tenvora-1.0.0.verification.json`.
- Final mobile validation: 46 tests passed, with clean analysis and formatting, including seven-language sign-in/settings at 150% text scaling. Web validation passed 75 unit tests and seven browser tests. Backend regressions cover fractional money, supplier balances, period-aware summaries and read-only AI fallback intent; local backend validation passed 109 tests with five infrastructure/live-provider tests skipped. Hosted synthetic reviewer login and read-only English AI summary are checked separately. These checks do not establish acceptance on a Play-installed physical device.
- Privacy text exists in mobile and at `/privacy`; account deletion exists in Settings and at `/delete-account`. Both public web URLs returned HTTP 200 in this review; that response alone does not prove all browser interactions work.
- The mobile assistant includes in-app reply reporting. Reports need developer review through the process in `GOOGLE_PLAY_HANDOFF.md`.
- The merged bundle receipt lists camera, internet and secure-storage biometric permissions. It does not list broad photo-library, contacts, SMS, location or advertising-ID permissions. Camera access is optional and photo selection is user initiated.

## Items to resolve before submission

1. Public support contact resolved: the owner approved `ccleemon227@gmail.com`. The website now defaults to this address for privacy inquiries and account-deletion help, including when no build environment override is set. Use the same address in Play Console and monitor it. Verify the deployed pages after rollout.
2. AI disclosure now gates mobile requests and all web AI send/parse/proposal calls before transmission. Cancelling sends nothing; web consent resets on account change/reload and mobile consent is scoped to the user and screen lifetime. Explicit Gemini harm filters and recordkeeping-only prompts were added. The owner confirmed Gemini billing is enabled. Continue reviewing reports and validating provider behavior; these measures do not certify complete content safety.
3. Unsupported commerce-volume, merchant-count, speed and uptime claims were replaced with actual feature descriptions. The inaccurate hardcoded APK size was removed. Do not add unverified claims to the Play listing.
4. A dedicated reviewer account with synthetic shop records was created and email/password login verified. Credentials remain only in .audit/play-reviewer-credentials.json outside Git. English App access instructions and listing/Data safety drafts are in PLAY_SUBMISSION_PACKET.md. Keep the account available and replenish fixtures after destructive review tests.
5. Complete Data safety against actual hosted processing: account/profile identifiers; customer/supplier information; sales, purchase, debt/payment and expense records; selected photos; AI prompts, context, responses and reports; operational logs. Do not declare that no data is collected, that all storage is local, or that Google sign-in/AI involves no third parties. Provider/service-provider sharing exceptions require checking actual processing arrangements.
6. Resolve financial-feature/account-type eligibility before assuming a personal account is sufficient. Code implements shop recordkeeping, inventory, receivables/payables and business AI summaries; no money-transfer, banking, investment execution or loan origination integration was found in the reviewed paths. However, Google's definition includes money management and personalized advice. This review cannot certify a bookkeeping exception. Ask Play support to classify the actual functions; answer the Financial features declaration accurately. Changing the store category alone does not resolve eligibility.
7. Register the Play app-signing certificate with Google OAuth for this package, then test Google sign-in using the Play-installed build. The upload certificate can differ from the Play signing certificate.
8. Run Play pre-launch/device acceptance and provide accurate current-app screenshots, content rating, ads and target-audience declarations. Do not present illustrative website mockups as actual app screenshots.
9. If the personal account was created after November 13, 2023, complete the required closed test with at least 12 continuously opted-in testers for 14 consecutive days and apply for production access. Identity verification alone does not grant that access. Check the Console for the account-specific requirement.

## Draft question for Play support

“Tenvora (com.tenvora.app) is a small-shop business recordkeeping app. Users manually record sales, purchases, operating expenses, inventory, customer receivables and supplier payables. It records payments but does not move money, connect bank accounts, originate/facilitate loans, offer trading or sell insurance. Its Gemini assistant summarizes shop records and proposes record changes for user confirmation. Can this app be published from a personal developer account, and which Financial features declaration choices apply to these recordkeeping and AI functions?”

## Official references

- Account types: https://support.google.com/googleplay/android-developer/answer/13634885
- Financial services: https://support.google.com/googleplay/android-developer/answer/9876821
- Financial declaration: https://support.google.com/googleplay/android-developer/answer/13849271
- User data, privacy and consent: https://support.google.com/googleplay/android-developer/answer/10144311
- Account deletion: https://support.google.com/googleplay/android-developer/answer/13327111
- AI content: https://support.google.com/googleplay/android-developer/answer/13985936
- Personal-account testing: https://support.google.com/googleplay/android-developer/answer/14151465

See `GOOGLE_PLAY_HANDOFF.md` for signing, deletion behavior, report handling and operational limits. The owner performs Play Console creation and publication.
