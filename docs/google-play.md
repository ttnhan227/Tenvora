# Google Play Release & Store Compliance

This document contains store listing copy, Play Console Data Safety disclosures, and policy compliance verification for the Tenvora Android mobile application.

---

## 1. Store Listing Information

* **App Name:** Tenvora
* **Short Description:** Deterministic ledger and business management for local enterprises.
* **Full Description:**
  Tenvora replaces informal credit notebooks and scattered paper receipts with an append-only financial ledger, real-time customer and supplier debt tracking, fast counter sales, and camera receipt capture.
* **Category:** Business / Productivity
* **Content Rating:** Everyone
* **Privacy Policy URL:** `https://tenvora.app/privacy` (or deployed landing URL)
* **Account Deletion Guidance URL:** `https://tenvora.app/delete-account`

---

## 2. Play Console Data Safety Declarations

| Category | Data Type | Purpose & Handling |
| :--- | :--- | :--- |
| **Personal Info** | Name, Email address, User IDs | Account management, authentication, tenant membership. |
| **Financial Info** | Purchase history, ledger entries, customer/supplier balances | Core app functionality. Stored securely on PostgreSQL backend with strict tenant isolation. |
| **Photos & Videos** | Photos / Camera | User-selected receipt and invoice image captures for permanent business records. |
| **Messages / Content** | In-app assistant queries & proposals | Optional AI-assisted categorization. Processed via configured LLM providers with explicit user confirmation. |
| **App Info & Performance** | Diagnostics, error logs | App stability, crash logging, and performance improvement. |

* **Data Encryption:** All data in transit is encrypted using HTTPS / TLS 1.3.
* **Account & Data Deletion:**
  * Users can delete individual sessions or their full account and personal records directly in the web app under **Settings → Account → Your Data** via `POST /api/account/data/delete`.
  * Historical tenant business records (sales ledgers, posted inventory) retain immutable audit trails for compliance.

---

## 3. Signing & Build Verification

* **Package ID:** `com.tenvora.app`
* **Upload Key SHA-1 Fingerprint:** `EA:49:3F:D3:A0:32:E0:A2:CE:5C:A1:D3:EA:6B:1A:48:D7:38:0A:67`
* **Required GitHub Secrets:**
  * `MOBILE_API_BASE_URL` — Production backend API URL.
  * `GOOGLE_SERVER_CLIENT_ID` — Google OAuth Client ID for Android Sign-In.
  * `ANDROID_KEYSTORE_BASE64` — Base64-encoded release upload keystore.
  * `ANDROID_KEY_PROPERTIES` — Keystore credentials and alias.

---

## 4. Submission Checklist

- [ ] Release AAB built via GitHub Actions (`Build & Release Mobile APK`).
- [ ] Google Play Data Safety form completed to match the table above.
- [ ] Financial features verified to meet Google Play financial guidelines.
- [ ] Demo credentials (`owner@tenvora.internal`) provided in Google Play Console App Access review notes.
