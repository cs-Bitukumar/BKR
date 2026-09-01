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
- `GET /api/matches`
- `POST /api/bets` (auth)
- `GET /api/wallet` and wallet mutation routes (auth)
- `/api/admin/*` (admin)
