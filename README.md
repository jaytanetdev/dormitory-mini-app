# Dormitory LINE Mini App

Mobile-first customer experience for claiming a room, viewing invoices, paying by dynamic PromptPay QR, and uploading transfer slips.

## Run locally

```bash
pnpm --filter @dormitory/miniapp dev
```

Copy `.env.example` to `.env.local`. The default mock mode works without LINE or backend credentials.

## Environment

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_MOCK_MODE` | Only the explicit value `true` enables local demo data. It never falls back silently. |
| `NEXT_PUBLIC_API_URL` | NestJS API base URL when mock mode is disabled. |
| `NEXT_PUBLIC_LIFF_ID` | LIFF ID from LINE Developers Console. |
| `NEXT_PUBLIC_SLIP_UPLOAD_URL` | Object-storage upload adapter; must return `{ url }` or `{ data: { url } }`. |

## Routes

- `/` — resident home, room, current balance, and recent payments
- `/claim/[token]` — single-use room invite confirmation
- `/invoices/[id]` — invoice ledger and meter breakdown
- `/pay/[id]` — exact-amount PromptPay QR and slip upload
- `/payments` — payment history

## Expected API endpoints

- `GET /miniapp/me`
- `GET /miniapp/invoices`
- `GET /miniapp/invoices/:id`
- `GET /miniapp/payments`
- `GET /miniapp/invites/:token`
- `POST /miniapp/invites/:token/claim`
- `POST /miniapp/invoices/:id/slips` (`multipart/form-data`)

The client exchanges a LIFF **ID token** at `POST /miniapp/auth/line`, stores the returned short-lived resident JWT in `sessionStorage`, and sends that resident token as `Authorization: Bearer <token>`. It never uses a LINE access token as a staff bearer token.
