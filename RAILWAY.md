# Railway Deploy Guide (Front-SOFIA)

Create one Railway service per app below.

## Services to deploy

1. `sof-ia-backend/sof-ia-auth`
    - Root Directory: `sof-ia-backend/sof-ia-auth`
    - Dockerfile Path: `Dockerfile`
    - Internal Port: `3001`
2. `sof-ia-backend/sof-ia-gateway` (optional)
   - Root Directory: `sof-ia-backend/sof-ia-gateway`
   - Dockerfile Path: `Dockerfile`
   - Internal Port: `3000`
3. `sof-ia-frontend`
   - Root Directory: `/`
   - Dockerfile Path: `sof-ia-frontend/Dockerfile`
   - Internal Port: `80`

## Required environment variables

### sof-ia-auth
- `PORT=3001`
- `JWT_SECRET=<shared secret>`
- `JWT_EXPIRES_IN=30m`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_SECURE=false`
- `SMTP_USER=<gmail sender>`
- `SMTP_PASS=<gmail app password>`
- `SMTP_FROM="SOF-IA Consultorio <gmail sender>"`
- `SEED_ADMIN_EMAIL=<admin gmail>`
- `SEED_ADMIN_NAME=Administrador SOF-IA`
- `MEET_BASE_URL=https://meet.google.com`
- `SICOP_GATEWAY_URL=<SICOP gateway URL>`
- `SICOP_INTEGRATION_EMAIL=<integration user>`
- `SICOP_INTEGRATION_PASSWORD=<integration password>`
- `SICOP_TIMEOUT_MS=10000`
- `SICOP_RETRY_ATTEMPTS=1`
- `CHATBOT_INTERNAL_TOKEN=<internal token>`

### sof-ia-gateway (if used)
- `PORT=3000`
- `AUTH_SERVICE_URL=<sof-ia-auth URL>`

### sof-ia-frontend
- Build arg / env: `VITE_API_URL=<public backend URL>/api`
- Build arg / env: `VITE_CHATBOT_BACKEND_MODE=sicop_proxy`
- Build arg / env: `VITE_PUBLIC_CHATBOT_URL=<public frontend URL>/chatbot`
- Build arg / env: `VITE_WEBCHAT_TENANT_ID=tenant_ai_demo`
- Build arg / env: `VITE_TELEGRAM_BOT_URL=<public telegram bot URL>`
- Build arg / env: `VITE_PUBLIC_CHATBOT_ONLY=false`

### sof-ia-frontend (public chatbot only, recommended)
- Deploy a second frontend service with the same Dockerfile.
- Build arg / env: `VITE_PUBLIC_CHATBOT_ONLY=true`
- Build arg / env: `VITE_PUBLIC_CHATBOT_URL=<this public service URL>/chatbot`
- Build arg / env: `VITE_CHATBOT_BACKEND_MODE=sicop_proxy`
- Build arg / env: `VITE_WEBCHAT_TENANT_ID=tenant_ai_demo`
- Build arg / env: `VITE_TELEGRAM_BOT_URL=<public telegram bot URL>`
- This mode exposes only `/chatbot` and redirects all other routes to `/chatbot`.

## Important notes

- The public webchat UI is the frontend route: `<frontend-url>/chatbot`.
- For strict separation, keep admin and public chatbot in different frontend services/URLs.
- Webchat now routes through `sofia-auth -> SICOP` (`/api/conversaciones/webchat/message`).
- Legacy `chatbot-web/orchestrator/conversation-service` is no longer required.

## Seed admin user

After first deploy of `sof-ia-auth`, run once in Railway shell:

- `npm run seed`

This creates/updates the admin account from `SEED_ADMIN_EMAIL`.
