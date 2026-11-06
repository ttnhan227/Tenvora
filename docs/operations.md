# Production Operations & Deployment Runbook

This document outlines the deployment architecture, database recovery procedures, and production verification checklist for the Tenvora platform.

---

## 1. Hosting & Deployment Architecture

| Service | Platform | Configuration & Auto-Deploy |
| :--- | :--- | :--- |
| **Backend API** | Render / Container | Dockerized ASP.NET Core (.NET 10). Auto-deploys from `main`. |
| **Web Client** | Render / Static / Docker | React 18 + Vite production build served via Nginx. Auto-deploys from `main`. |
| **Database** | Supabase / PostgreSQL 16+ | Managed relational database with connection pooling and automated daily snapshots. |
| **Mobile Client** | Google Play / GitHub Releases | Flutter release APK / AAB artifacts built through GitHub Actions. |

### Environment Variables
* Production secrets (`ConnectionStrings__DefaultConnection`, `Jwt__Key`, `Google__ClientId`, provider API keys) must be configured in Render service environment settings.
* Landing page buttons point to the stable public APK release URL. Once public on Google Play, set `VITE_GOOGLE_PLAY_URL=https://play.google.com/store/apps/details?id=com.tenvora.app` in frontend environment variables.

---

## 2. Database Verification & Disaster Recovery

### Invariant & Integrity Checks
1. **Tenant Scoping**: All relational queries enforce tenant isolation via EF Core query filters.
2. **Row-Level Security (RLS)**: PostgreSQL `FORCE ROW LEVEL SECURITY` session policies protect data across all tenant layers.
3. **Automated Recovery Testing**:
   Run the isolated PostgreSQL backup and restore verification:
   ```bash
   bash scripts/verify-postgres-recovery.sh <container-id>
   ```

### Backup & Restore Procedure
1. **Automated Backups**: Ensure daily point-in-time recovery (PITR) is enabled on the managed database.
2. **Migration Rollouts**:
   * Take a manual database snapshot before applying schema migrations.
   * Apply migrations automatically at service startup or via controlled CI/CD steps.
   * If migration rollback is required, restore the pre-migration snapshot rather than dropping schemas.
3. **Staging Recovery Drills**:
   * Periodically restore a production snapshot to an isolated staging environment.
   * Verify ledger math, customer balances, and image attachments.

---

## 3. Health Monitoring & Observability

The API exposes standard ASP.NET Core health check endpoints:

* **Liveness:** `GET /api/health/live` — Verifies the process is running and responsive.
* **Readiness:** `GET /api/health/ready` — Verifies database connectivity and readiness to serve traffic.

Configure uptime monitors (e.g., Render Health Checks or external uptime services) against `/api/health/ready` with a 30-second interval.

---

## 4. Production Release Checklist

Before promoting any release to production:

- [ ] **Automated Tests**: All backend (187 xUnit tests) and frontend (91 Vitest tests) pass via `pwsh scripts/verify-all.ps1`.
- [ ] **Security**: CORS origins are restricted to configured web domains; SSL/TLS is enforced.
- [ ] **Secrets**: No `.env` files or developmental keys are checked into source control.
- [ ] **Storage**: Object storage bucket policies allow authenticated receipt and document uploads with secure access.
- [ ] **Mobile Parity**: Mobile signing keystore SHA-1 fingerprint matches the Google OAuth client credentials.
