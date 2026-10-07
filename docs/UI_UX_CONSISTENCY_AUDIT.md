# Mobile and web consistency audit

Reviewed October 7, 2026. Scope: authentication/session recovery, navigation,
search, record editing, archive/delete, sales, purchases, payments, reversals,
inventory adjustments, expenses, reports, AI confirmations, and refresh behavior.

## Confirmed issues corrected

- Failed web requests could appear as empty lists, a missing customer, or zero
  report totals. Lists and details now expose errors and retry; failed reports
  cannot be exported or printed as if complete.
- Web customer/supplier **All** filters accidentally used the default Active
  filter. They now explicitly request all statuses.
- Customer debt filters operated on the current page only. Matching customers
  are now filtered before pagination. The balance summary explicitly describes
  the current page rather than claiming to be the total for the business.
- Native search required submitting while web searched as users typed. Native
  lists now debounce typing for 300 ms and retain immediate keyboard submission.
- Native suppliers/products lacked archived/all filtering and useful restoration
  controls. Those controls now match the web operations.
- Editing a supplier/product on native could clear fields entered on web.
  Address, notes, and active/archive state are now included and editable.
- Native financial/detail/form/team/settings actions could overlap while dialogs
  or requests were active. A synchronous action lock blocks overlapping operations,
  shows progress, and releases after failure/cancellation. Supplier forms also
  lock saving/deleting and scroll above the keyboard.
- Web financial retries generated a new request ID after an uncertain outcome.
  They now retain an account-scoped request ID across reloads, coalesce concurrent
  identical writes, and distinguish uncertainty from definitive validation errors.
  Only a digest and request ID are persisted, not submitted business details.
- Stock adjustment retries were not idempotent. Both clients now use durable
  retry IDs; the backend serializes tenant writes and reuses a deterministic,
  tenant-scoped adjustment ID. Changed details with the same ID are rejected.
  Existing history and database schema remain intact.
- Retained native dashboard/sales tabs could remain stale after manual or AI
  writes. Successful repository writes now notify these tabs to reload.
- Several web writes refreshed a selector query but missed its paginated list.
  Both query variants now refresh after the relevant operations.
- Search controllers/form controllers and post-navigation reloads now respect
  screen disposal. Empty later pages provide a return to the first page.
- The native empty-sales creation shortcut now respects read-only permissions.
- Native refresh callbacks no longer return Futures to Flutter setState. Product
  forms accept valid zero prices consistently with web/backend validation.

## Shared operation contract

| Workflow | Mobile and web behavior |
| --- | --- |
| Authentication | Email/Google login; session refresh; transient outages retain sessions |
| Record maintenance | Role-based editing; unused records delete; records with financial history archive |
| Sales and purchases | Shared backend validation, inventory, totals, initial/later payments |
| Payments/corrections | Shared balance rules; confirmations; safe financial retry IDs |
| Stock changes | Auditable adjustments; negative-stock validation; safe retry IDs |
| AI actions | Explicit review; repeat confirmation blocked; server execution is idempotent |
| Failed loading | Error/retry instead of pretending records are absent |
| Search | Automatic updates on typing; native debounce to limit requests |
| Refresh | Updated records reload after successful changes in the same client |

## Differences that still exist

Consistency does not mean identical layouts or feature-for-feature parity.

- Native uses bottom navigation and sheets; desktop web uses a sidebar, tables,
  and dialogs. Native camera/device integration is platform specific.
- Native supports seven UI languages; web supports English and Vietnamese.
- Web has richer report period controls, printing/PDF/HTML/CSV export, XLSX
  imports, and sales draft/cart tools. Native has simpler reports and CSV imports.
- Some optional financial metadata and advanced list filters are richer on web.
- Neither client provides a live cross-device subscription. Changes from another
  device become visible on a new load or refresh; this audit does not promise
  instant synchronization between already-open screens on different devices.

## Validation and limits

Regression tests exercise uncertainty/reload/account separation, overlapping
submissions, error recovery, all-status filters, incomplete report export blocking,
native action locks/search debounce, cross-platform field preservation, repository
refresh notifications, and stock-adjustment retries including concurrent PostgreSQL
requests. Browser checks cover phone layouts, light/dark mode, sales/payments,
imports, language switching, and AI conversation/confirmation refresh.

Web browser tests use controlled API fixtures; native UI tests use controlled
repository fixtures. Backend PostgreSQL tests use isolated disposable databases.
These are complementary checks, not proof that every device, network failure,
or possible workflow is bug-free. Existing installed-app acceptance evidence is
documented separately in ANDROID_RELEASE_ACCEPTANCE.md.

Signed publication remains gated by product/mobile tests and matching main CI
deployment. Failed candidates do not replace the public APK.
