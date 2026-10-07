# Backend deployment

Pushes to main deploy the backend to Cloud Run only after the existing product, frontend, backend, security and Docker CI gates succeed. GitHub authenticates with short-lived Workload Identity Federation, scoped to this repository and main. No service-account key is stored in GitHub.

Service: tenvora-api. Project: tenvora. Region: asia-southeast1. API: https://tenvora-api-495244344153.asia-southeast1.run.app/api. Images are tagged with the full source commit. Deployment changes only the image; Cloud Run environment settings remain managed in GCP. The workflow checks database readiness afterward. Roll back by routing traffic to a previous healthy revision.

Frontend remains on Render and uses its configured GCP API URL. Local services require scripts/update-local.ps1; pushes do not replace local running containers. Google Play submission remains manual. The Build & Release Mobile APK workflow must run with Publish enabled to replace the public mobile-latest download; both APK and AAB read MOBILE_API_BASE_URL from GitHub variables.

The deployment service account can update the existing Cloud Run service, push to the designated Artifact Registry repository, and act as the existing runtime service account. The federation provider restricts repository and owner by immutable numeric IDs and requires main.
