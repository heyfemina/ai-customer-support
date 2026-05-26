# AI Customer Support System

Full-stack MERN/PostgreSQL SaaS support platform with React/Vite frontend, Express backend, Prisma ORM, PostgreSQL/Supabase support, JWT auth, role-based dashboards, ticketing, live chat UI, Socket.IO events, integrations, analytics, and multilingual UI.

## Install

```bash
cd client
npm install

cd ../server
npm install
npx prisma generate
```

## Environment

Create `server/.env`:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:your_password@your_host:5432/postgres"
JWT_SECRET="your_super_secret_key"
CLIENT_URL="http://localhost:5173"
OPENAI_API_KEY="your_openai_or_gemini_key"
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your_email@gmail.com"
EMAIL_PASS="your_app_password"
```

For Supabase, copy the pooled or direct PostgreSQL connection string from Project Settings > Database and use it as `DATABASE_URL`.

## Database

```bash
cd server
npx prisma migrate dev --name init
npm run prisma:seed
```

## Run

```bash
cd server
npm run dev
```

```bash
cd client
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:5000`

## Demo Logins

- Admin: `admin@example.com` / `admin123`
- Agent: `agent@example.com` / `agent123`
- Customer: `customer@example.com` / `customer123`

## Test Checklist

1. Log in as admin and open dashboard, users, agents, customers, tickets, chats, analytics, AI settings, security, activity logs, and integrations.
2. Log in as agent and open assigned tickets, a ticket details page, live chat queue, transfer UI, and performance reports.
3. Log in as customer and create a ticket, open ticket details, start live chat, send a message, upload a file from the UI, rate a chat, and change language.
4. Confirm backend APIs with Authorization bearer token: `/api/tickets`, `/api/chats`, `/api/reports/dashboard`.
5. Confirm Socket.IO events: `join_chat`, `send_message`, `receive_message`, `typing`, `stop_typing`, `agent_transfer`, and `chat_notification`.

## API Reference

Base URL: `http://localhost:5000/api`

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/profile`
- `PUT /auth/profile`

Users:
- `GET /users`
- `GET /users/:id`
- `POST /users`
- `PUT /users/:id`
- `DELETE /users/:id`

Tickets:
- `POST /tickets`
- `GET /tickets`
- `GET /tickets/:id`
- `PUT /tickets/:id`
- `PUT /tickets/:id/status`
- `POST /tickets/:id/reply`
- `DELETE /tickets/:id`

Chats:
- `POST /chats/start`
- `GET /chats`
- `GET /chats/:id`
- `POST /chats/:id/message`
- `POST /chats/:id/transfer`
- `POST /chats/:id/rating`
- `PUT /chats/:id/close`

AI:
- `POST /ai/reply`
- `POST /ai/translate`
- `POST /ai/summarize-ticket`
- `GET /ai/settings`
- `PUT /ai/settings`

Reports:
- `GET /reports/dashboard`
- `GET /reports/tickets`
- `GET /reports/agents`
- `GET /reports/customers`
- `GET /reports/response-time`

Integrations:
- `GET /integrations`
- `PUT /integrations/:type`
- `POST /integrations/email/test`
- `POST /integrations/whatsapp/test`

Activity:
- `GET /activity-logs`

Socket.IO:
- `join_chat`
- `leave_chat`
- `send_message`
- `receive_message`
- `typing`
- `stop_typing`
- `agent_transfer`
- `chat_notification`
- `disconnect`

## Deploy

### Frontend on Vercel

1. Import the repository.
2. Set root directory to `client`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add `VITE_API_URL=https://your-backend-url/api` and `VITE_SOCKET_URL=https://your-backend-url`.

### Backend on Render or Railway

1. Set root directory to `server`.
2. Build command: `npm install && npx prisma generate`.
3. Start command: `npm start`.
4. Add all environment variables from `server/.env`.
5. Run migration command after database is attached: `npx prisma migrate deploy`.
6. Run seed once if needed: `npm run prisma:seed`.

### Database on Supabase

1. Create a Supabase project.
2. Copy the PostgreSQL connection string.
3. Put it in `DATABASE_URL`.
4. Run `npx prisma migrate deploy` from the backend environment.
