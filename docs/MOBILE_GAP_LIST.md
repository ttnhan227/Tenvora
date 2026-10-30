# Tenvora Mobile / Flutter Parity Gap List (Phases 1–5)

> **Specification Reference**: In accordance with the project mission and Phase 5 deliverables, this document details the parity status and comprehensive implementation requirements for the Flutter mobile application (`mobile/`).

---

## 1. Architecture Alignment & Foundations

The Flutter mobile application targets Android API 24+ and Flutter Web using the Controller-Repository-Service architecture. All network calls utilize `Dio` with automatic JWT bearer authorization and HTTP `Accept-Language` header injection (`options.headers['Accept-Language'] = controller.languageCode`).

Internal API contracts remain machine-readable and language-invariant (`"Executed"`, `"sale"`, `"expense"`), while user-facing proposal cards, execution summaries, and notifications are culture-scoped across all 7 supported languages.

---

## 2. Feature Gap Matrix & Parity Requirements

| Phase | Feature / Capability | Web Status | Mobile Parity Status | Mobile Implementation Plan & Endpoints |
| :--- | :--- | :--- | :--- | :--- |
| **Phase 1** | **Action-First Home ("Needs Attention")** | ✅ Shipped | ⚠️ Partial (Shows basic stats) | Integrate `GET /api/dashboard/attention` into `DashboardController`. Render top 5 attention items with urgent badges (stockouts, bills due within 3 days, pending drafts). |
| **Phase 1** | **Deterministic Plain-Language Insights** | ✅ Shipped | ⚠️ Missing | Integrate `GET /api/dashboard/insight` into `dashboard_screen.dart` to display sales week-over-week trends and fast movers. |
| **Phase 1** | **Supplier Quick-Pay Modal** | ✅ Shipped | ⚠️ Missing | Port customer payment dialog to `suppliers_screen.dart` via `POST /api/business/suppliers/{id}/payments` with debt cascade. |
| **Phase 1** | **Unit of Measure Presets Combobox** | ✅ Shipped | ⚠️ Free-text only | Replace free-text unit text field in product form with combobox populated from `GET /api/business/products/units`. |
| **Phase 2** | **Inline Creatable Combobox** | ✅ Shipped | ⚠️ Full navigate-away | Create `CreatableSelectSheet` in Flutter for customer, supplier, and product selection in sales/purchases without screen replacement. |
| **Phase 2** | **Simple Bill Mode on Purchase Form** | ✅ Shipped | ⚠️ Detailed form only | Add tabbed/segmented toggle in `purchases_screen.dart`: `[Detailed restock]` vs `[Simple bill]` (supplier, total, due date, photo). |
| **Phase 2** | **Floating Action Bar & Bulk Operations** | ✅ Shipped | ⚠️ Single item only | Add multi-select mode in `products_screen.dart` and `customers_screen.dart` with bottom sheet for batch archive/export. |
| **Phase 3** | **Capture-First (Camera / Photo OCR)** | ✅ Shipped | ⚠️ Basic photo upload | Use `image_picker` + `POST /api/capture/process` (multipart or JSON). Show side-by-side or scrollable image preview with editable extracted draft fields. |
| **Phase 3** | **Review Queue (Inbox of Staged Drafts)** | ✅ Shipped | ⚠️ Missing | Add Review Queue tab/screen powered by `GET /api/capture/queue` with single-tap bulk approval (`POST /api/capture/bulk-approve`). |
| **Phase 4** | **Global Omni-Search / Command Palette** | ✅ Shipped | ⚠️ Per-page search only | Implement `SearchDelegate` or bottom sheet search modal powered by `GET /api/search/omni?q={query}` across customers, products, and documents. |
| **Phase 4** | **Contextual AI Copilot Drawer** | ✅ Shipped | ⚠️ Standalone chat page | Refactor `AgentChatPage` into a reusable sliding bottom sheet (`showModalBottomSheet`) that receives current route entity context. |
| **Phase 5** | **Undo Toast on Confirmations** | ✅ Shipped | ⚠️ Missing | Display `SnackBar` with `"Undo"` action for 15 seconds after confirming drafts, invoking `POST /api/ai/actions/{actionId}/undo`. |
| **Phase 5** | **Actionable Notification Center & Toggles** | ✅ Shipped | ⚠️ Missing | Add bell icon to `AppBar` in `app_shell.dart` with active badge count and preferences bottom sheet stored in `SharedPreferences`. |
| **Phase 5** | **AI Telemetry & Trust Dashboard** | ✅ Shipped | ⚠️ Missing | Emit `POST /api/telemetry/events` on confirmation/error. Add admin-only AI metrics screen in `management_screens.dart`. |

---

## 3. Core API Specifications for Flutter Mobile

### 1. Document / Invoice Capture
- **Endpoint**: `POST /api/capture/process`
- **Request Body**:
  ```json
  {
    "imageDataUrl": "data:image/jpeg;base64,...",
    "documentTypeHint": "purchase"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "actionId": "uuid",
      "draft": {
        "intent": "purchase",
        "supplierName": "ABC Co.",
        "amount": 5000000,
        "items": [...]
      },
      "provenance": { ... }
    }
  }
  ```

### 2. Proposal Undo Rollback (15-Minute Window)
- **Endpoint**: `POST /api/ai/actions/{actionId}/undo`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "actionId": "uuid",
      "status": "Undone",
      "message": "Action has been undone and changes reverted."
    }
  }
  ```

### 3. Actionable Notifications Feed
- **Endpoint**: `GET /api/dashboard/attention`
- **Response**: Array of `{ id, type, severity, title, subtitle, count, actionLabel, actionRoute, actionKey, metadata }`.

### 4. Anonymous Telemetry Ingestion
- **Endpoint**: `POST /api/telemetry/events`
- **Request Body**:
  ```json
  {
    "eventType": "DraftConfirmed",
    "intent": "purchase",
    "durationMs": 4200,
    "fieldsCorrectedCount": 0,
    "acceptedWithoutEdits": true,
    "isError": false
  }
  ```

---

## 4. Mobile Quality Checklist for Parity Verification

1. **Accessibility**: Minimum touch targets $\ge 48 \times 48\text{ dp}$ on all action buttons and list items.
2. **Offline Gracefulness**: Network disconnections trigger non-destructive retry states without data corruption.
3. **Small Screen Responsiveness**: UI adapts cleanly down to 320px width without `RenderFlex` overflow errors.
4. **Localization**: All strings resolved dynamically through `Languages.dart` with catalog coverage across all 7 supported languages (`en`, `vi`, `es`, `fr`, `de`, `pt`, `id`).
