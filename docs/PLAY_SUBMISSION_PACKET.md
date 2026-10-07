# Tenvora first Play submission

Version name: **1.0.0**. Package: `com.tenvora.app`. Use version code 1 only if it has never been uploaded to this Play app. Changing the internal version code does not require changing the public version name.

## Listing draft

App name: Tenvora

Short description: Sales, stock, expenses and customer balances for your small business.

Full description:

Tenvora brings your shop records together in a compact mobile workspace. Record sales and payments, track inventory and supplier purchases, keep operating expenses, and review customer receivables and supplier payables. Business reports help you review the records entered by your team.

The optional AI assistant can answer questions about your business records and prepare changes for you to review. Before AI requests, Tenvora explains which information is sent to Google Gemini and asks for your agreement. You confirm proposed record changes before execution. AI answers may be incorrect and should be checked against your records.

The Android interface supports English, Vietnamese, Spanish, French, German, Brazilian Portuguese and Indonesian. Access your hosted workspace from Android and the web; the web interface supports English and Vietnamese. An account and internet connection are required for hosted business features. Camera and image selection are optional for receipt and product photos.

Tenvora records business transactions; it does not transfer money, provide banking or originate loans. The assistant is intended for recordkeeping and factual summaries, not investment, lending, insurance, tax or legal advice.

Support: ccleemon227@gmail.com

Privacy: https://tenvora-client.onrender.com/privacy

Account deletion: https://tenvora-client.onrender.com/delete-account

Use screenshots captured from the current signed Android release. Recheck them against the Play-installed build before submission. Do not use the illustrative website dashboards as screenshots or claim unverified merchant counts, uptime, speed or revenue.

## App access instructions (English)

Select “All or some functionality is restricted” and provide the dedicated reviewer email/password. The local credentials are in `.audit/play-reviewer-credentials.json`, deliberately ignored by Git; do not upload that file as a public release asset.

1. Open Tenvora and choose email/password sign-in. Use the supplied dedicated credentials; Google sign-in is optional. No OTP, payment or personal account is required for this reviewer login.
2. The account opens **Tenvora Review — Synthetic Shop**, a dedicated workspace containing fictional customer, supplier, product, sale, purchase and expense records. It has administrator access to inspect all protected features.
3. Use the main navigation to inspect sales, customer balances and products. Use More for purchases, supplier balances, expenses, reports and Settings.
4. Open AI and ask “Which customers still owe me?” Read the data disclosure and select Agree and continue to use this optional feature. Select Not now to decline. Proposed changes require confirmation. Assistant replies have a report action.
5. Settings includes language, appearance, workspace settings, privacy, account deletion and sign-out. Account deletion permanently removes this synthetic workspace if it is its only member; contact support if the supplied account has been deleted during review so it can be restored with fresh fixtures.

Keep the review account available throughout review. Recheck its login before each submission. Replenish the synthetic fixture if reviewers change or delete it. Never put real customer data in this account.

## Data safety worksheet

This is a code-based worksheet, not a pre-certified declaration. Check each final Console question against the release and actual provider arrangements. Hosted account and business features collect data off-device; do not answer “no collection.”

| Data to evaluate | Actual use | Required/optional considerations |
| --- | --- | --- |
| Personal info: email, user identifiers | Registration, authentication, workspace membership | Required for account use |
| Personal info: name, phone, address | Optional profile and customer/supplier fields | Fields are optional; collected when entered/imported |
| Financial info: purchase history and other financial information | Sales, purchases, expenses, payments and balances | Core recordkeeping; declare actual types used, not bank/card data that is never entered |
| Photos | Selected receipt/product images | Optional; only selected images uploaded |
| Messages / other user-generated content | AI prompts, conversation history, responses, reports and record notes | AI and notes optional; conversations retained on hosted storage |
| App activity / interactions | Workspace audit history and AI report events | Security and functionality; distinguish from marketing analytics |
| Diagnostics / other applicable log data | Server errors, timestamps and security logs, potentially IP | Confirm Render/server logging and actual retention |

Purposes to assess: app functionality, account management, security/fraud prevention. No ad SDK or advertising-ID permission was found in the inspected mobile release. Do not claim an independent security certification.

HTTPS release API and disabled cleartext traffic support encryption in transit; this is not an end-to-end encryption claim. Account deletion is available in-app and on the public website. Explain shared-record and backup retention as in the privacy policy.

Third-party processing: Render hosting/database, Google sign-in and Google Gemini. The owner confirmed on October 7 that the Gemini API Cloud project has billing enabled. Google's paid-service terms say prompts/responses are not used for product improvement; limited abuse/security/legal retention still applies. Evaluate Google's service-provider and user-initiated/disclosure-and-consent sharing exceptions against actual processing. An exception to the form's “sharing” definition does not remove the requirement to disclose off-device collection or describe providers in Privacy. Keep this billing configuration active and verify future provider changes before updating declarations.

Reference: https://support.google.com/googleplay/android-developer/answer/10787469

## Owner steps in Play Console

- Resolve personal-account financial-services classification with Play support using the draft in `PLAY_POLICY_REVIEW.md`; this document cannot grant an exemption.
- Create the app and enter accurate ads, content-rating, target-audience, app-access, financial-feature and Data safety declarations. Intended users are adult business operators; do not claim child-directed operation.
- Set up Play App Signing and register its signing certificate in Google OAuth for `com.tenvora.app`.
- Upload the newly verified bundle with the AI disclosure, install it through Play testing and check sign-in, photos, offline/error recovery and deletion. Review the pre-launch report.
- Complete the account-specific closed-testing and production-access steps. For applicable new personal accounts, at least 12 testers must remain opted in for 14 consecutive days.
- Only after approval, make the Play listing URL the primary landing-page link. Do not enable it before the listing is public.

Google Play creation, declarations and publication remain the owner's responsibility. No Play credentials are required by the build workflow.
