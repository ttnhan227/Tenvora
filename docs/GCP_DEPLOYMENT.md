# Backend deployment

Pushes to main deploy the backend to Cloud Run only after the existing product, frontend, backend, security and Docker CI gates succeed. GitHub authenticates with short-lived Workload Identity Federation, scoped to this repository and main. No service-account key is stored in GitHub.

Service: tenvora-api. Project: tenvora. Region: asia-southeast1. API: https://tenvora-api-495244344153.asia-southeast1.run.app/api. Images are tagged with the full source commit. Deployment changes only the image; Cloud Run environment settings remain managed in GCP. The workflow checks database readiness afterward. Roll back by routing traffic to a previous healthy revision.

Frontend remains on Render and uses its configured GCP API URL. Local services require scripts/update-local.ps1; pushes do not replace local running containers. Google Play submission remains manual. Every main push now builds the signed APK and AAB automatically. APK publication waits for the matching CI/GCP deployment to succeed, runs under a shared publication lock, and skips superseded main commits. Landing downloads, QR and push-apk.bat use the resulting public installer. Manual publication is still available. Both APK and AAB read MOBILE_API_BASE_URL from GitHub variables. AAB artifacts are retained in Actions; automatic builds use PLAY_VERSION_CODE (default 1). After a code is uploaded to Play, configure a higher unused code before a future Play submission. Existing phone installations and Google Play submissions remain manual.

The deployment service account can update the existing Cloud Run service, push to the designated Artifact Registry repository, and act as the existing runtime service account. The federation provider restricts repository and owner by immutable numeric IDs and requires main.

The mobile-latest tag is a stable distribution channel. Its Git ref is not moved during publication; the attached tenvora-mobile.build.json and release notes record the actual installer source commit, API address and checksum. This avoids GitHub workflow-token restrictions on moving tags across workflow changes.
