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
- `DATABASE_URL=<Railway Postgres URL>`
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

### sof-ia-gateway (if used)
- `PORT=3000`
- `AUTH_SERVICE_URL=<sof-ia-auth URL>`

### sof-ia-frontend
- Build arg / env: `VITE_API_URL=<public backend URL>/api`
- Build arg / env: `VITE_CHATBOT_WEB_API_URL=<public chat-web URL>`
- Build arg / env: `VITE_PUBLIC_CHATBOT_URL=<public frontend URL>/chatbot`
- Build arg / env: `VITE_WEBCHAT_TENANT_ID=tenant_ai_demo`
- Build arg / env: `VITE_TELEGRAM_BOT_URL=<public telegram bot URL>`

### chatbot-web-service (Back_SOFIA)
- `PORT=3060`
- `ORCHESTRATOR_SERVICE_URL=<orchestrator internal URL>`
- `WEBCHAT_TENANT_ID=tenant_ai_demo`
- `REQUEST_TIMEOUT_MS=30000`
- `CORS_ORIGIN=<public frontend URL>`

## Important notes

- The public webchat UI is the frontend route: `<frontend-url>/chatbot`.
- The `chat-web` service URL is an API, not a web page. Validate it with `<chat-web-url>/health` and `POST /v1/chatbot/web/message`.

## Seed admin user

After first deploy of `sof-ia-auth`, run once in Railway shell:

- `npm run seed`

This creates/updates the admin account from `SEED_ADMIN_EMAIL`.
