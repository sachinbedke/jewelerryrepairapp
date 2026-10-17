# Backend — Chetmani Jewelry Repair API

Node.js + Express + MongoDB API aligned with the React Native mobile app.

## Quick start

1. Install [MongoDB](https://www.mongodb.com/try/download/community) and start it locally.
2. Copy environment file and adjust if needed:

```bash
cd backend
copy .env.example .env
```

3. Install and run:

```bash
npm install
npm run dev
```

4. Seed test users (in another terminal):

```bash
node scripts/seeds.js
```

## Test login (BRSH — ticket creation)

| Role   | Employee ID | Password   |
|--------|-------------|------------|
| BRSH   | 1234567890  | 1234567890 |
| RHO    | 0987654321  | 0987654321 |
| Karigar| 1122334455  | 1122334455 |

## Mobile app connection

- Server listens on `0.0.0.0:5000` (all network interfaces).
- Open `GET http://<your-pc-ip>:5000/api/server-info` to see LAN IPs.
- Mobile app default API URL: `mobile/constants/api.ts`
  - Android emulator: `http://10.0.2.2:5000`
  - iOS simulator: `http://localhost:5000`
  - Physical phone: change `DEV_HOST` in `api.ts` to your PC LAN IP.

## Supported flows (current scope)

- Login / profile / language preference
- Customer search & create
- Master data (jewellery, repair types, materials, units, stones)
- **Create repair ticket** (multipart + media)
- **Ticket list** (AllTickets, Orders) + status counts
- Comments & activity (basic)
- Assign to RHO, priority/due date updates

## Intentionally disabled (501)

- PDF print / share ticket (`/api/form/print/*`)
- External kaarigar tasks

## Health check

`GET http://localhost:5000/health`
