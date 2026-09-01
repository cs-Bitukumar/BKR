# BKR Ludo

BKR Ludo is an authenticated, private-room multiplayer game integrated into the existing React/Vite and Express application. Open `/ludo` from the dashboard, create a room, and share the six-character code with 1–3 friends.

## Architecture

- `server/ludo/gameEngine.js` contains pure game rules and state transitions.
- `server/ludo/ludoSocket.js` contains authenticated Socket.IO room transport, validation, rate limiting, and disconnect/reconnect handling.
- `client/src/pages/ludo/LudoPage.jsx` owns the socket session and lobby/game state.
- `client/src/pages/ludo/components/LudoLobby.jsx` renders create/join controls.
- `client/src/pages/ludo/components/LudoBoard.jsx` renders the responsive 15×15 four-color board from server state.
- `client/src/pages/ludo/LudoPage.css` contains the isolated responsive Ludo UI.

Active rooms are held in server memory. This avoids adding a new database dependency and keeps existing BKR models and APIs unchanged. A production deployment with multiple server instances should use Socket.IO's adapter (for example, Redis) or sticky sessions before scaling horizontally.

## Socket.IO

The Ludo namespace is `/ludo`. The client authenticates with the existing JWT as `handshake.auth.token`. The server resolves the user from MongoDB and never trusts a client-provided user ID.

Client/server events:

- `createRoom`, `joinRoom`, `reconnectRoom`, `leaveRoom`
- `startGame`, `rollDice`, `moveToken`
- `gameState`, `playerJoined`, `playerLeft`, `playerDisconnected`, `playerReconnected`
- `gameStarted`, `diceRolled`, `tokenMoved`, `gameFinished`, `ludoError`

Action acknowledgements use `{ ok: true, ... }` or `{ ok: false, message }`.

## Rules implemented

- 2–4 players, one assigned color each: red, green, yellow, blue.
- Four tokens per player.
- A token leaves home only on a six.
- A token cannot move beyond the final home position.
- Landing on an opponent on an unsafe track cell captures that token.
- Standard safe cells cannot be captured.
- A six grants another turn; other rolls advance to the next connected player.
- A player wins when all four tokens reach final home.
- The server generates dice values and validates turn, token ownership, dice state, movement distance, captures, and winner state.

## Local multiplayer test

```bash
cd server
npm install
npm run dev

# in another terminal
cd client
npm install
npm run dev
```

Log in with two or more accounts in separate browser windows/devices, open `/ludo`, create a room, share its code, and start the game from the host window.

## Verification

```bash
cd server
npm test

cd ../client
npm run lint
npm run build
```

The current implementation keeps completed game history out of MongoDB. Add a Ludo result model only when match history, rankings, or audits are required.
