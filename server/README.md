# BKR Server

Minimal backend for the BKR frontend. Provides REST endpoints for auth, users, matches, and bets.

Environment:
- Copy `.env.sample` to `.env` and set `MONGODB_URI`, `JWT_SECRET`, `CRIC_API_KEY`, and `ODDS_API_KEY`.

Run locally:

```bash
cd server
npm install
npm run dev    # requires nodemon
# or
npm start
```

API endpoints:
- `POST /api/auth/register` {username,email,password}
- `POST /api/auth/login` {email,password}
- `GET /api/users/me` (auth)
- `POST /api/complaints` {name,email,category,subject,details} (public, limited to 5 submissions per hour per IP)
- `GET /api/admin/complaints` (admin auth)
- `PATCH /api/admin/complaints/:id` {status,internalNotes,resolutionMessage} (admin auth)
- `GET /api/matches`
- `POST /api/bets` (auth)
- `GET /api/wallet` (auth): reads the non-monetary virtual coin balance and ledger
- `POST /api/wallet/rewards/daily` (auth): claims one free daily login reward, once per Indian calendar day
- `/api/admin/*` (admin)

The virtual coin account is stored separately from the user profile in `WalletAccount`; each change and its idempotency key are recorded in `WalletTransaction`. MongoDB transactions are required for atomic account-and-ledger updates, so use MongoDB Atlas or a replica set. No deposit, purchase, transfer, withdrawal, cash prize, or payment integration is provided. Existing legacy `User.balance` values are not migrated into virtual coins.

Daily login rewards use the seven-day schedule (100, 150, 200, 250, 300, 400, and 500 virtual coins), calculated on the server in `Asia/Kolkata`. Consecutive Indian calendar dates advance the cycle; a missed date resets it to Day 1. Each claim's India date, cycle day, and timestamp are stored in the wallet ledger and protected by a unique per-user/date index.
