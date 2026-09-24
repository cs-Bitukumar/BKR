# BKR Multiplayer Spinner

BKR Spinner is an authenticated, private-room multiplayer wheel game built on the same architecture as BKR Ludo. Open `/spinner` (or `/spinner/play`) from the dashboard, create a room, and share the six-character code with 1–3 friends — or play solo against BKR Bot instantly.

## Architecture

- `server/spinner/gameEngine.js` contains pure game rules: the wheel table, seat order, pointer angles, spin math, rounds, scoring, and winner resolution.
- `server/spinner/spinnerSocket.js` contains authenticated Socket.IO room transport, validation, rate limiting, bot auto-spin, and disconnect/reconnect handling.
- `server/shared/roomWallet.js` holds the wallet/escrow helpers (room codes, stake collection, refunds, payouts) shared with `server/ludo/ludoSocket.js`.
- `client/src/pages/spinner/SpinnerPage.jsx` owns the socket session, lobby, waiting room, and live arena state.
- `client/src/pages/spinner/components/SpinnerLobby.jsx` renders the wallet bar, bet chips, rounds picker, and create/join/solo controls.
- `client/src/pages/spinner/components/SpinnerWheel.jsx` renders the wheel with **one pointer per joined player**.
- `client/src/pages/spinner/components/spinnerGeometry.js` mirrors the server wheel table for rendering; `server/test/spinner-tests.js` asserts both copies stay identical.
- `client/src/pages/spinner/SpinnerPage.css` contains the isolated responsive Spinner UI.

Active rooms are held in server memory, exactly like Ludo. A production deployment with multiple server instances should use a Socket.IO adapter (for example, Redis) or sticky sessions before scaling horizontally.

## Socket.IO

The Spinner namespace is `/spinner`. The client authenticates with the existing JWT as `handshake.auth.token`. The server resolves the user from MongoDB and never trusts a client-provided user ID.

Client/server events:

- `createRoom`, `joinRoom`, `reconnectRoom`, `leaveRoom`
- `startGame`, `spinWheel`
- `gameState`, `playerJoined`, `playerLeft`, `playerDisconnected`, `playerReconnected`
- `gameStarted`, `wheelSpun`, `gameFinished`, `walletUpdated`, `spinnerError`

Action acknowledgements use `{ ok: true, ... }` or `{ ok: false, message }`.

## Rules implemented

- 2–4 seats, one color each: green, orange, violet, sky.
- **One wheel pointer per joined player**, spread evenly around the rim: two players face each other (0°/180°), three sit 120° apart, and a full room uses 0°/90°/180°/270°. `pointerAngleForSeat()` in the engine and in `spinnerGeometry.js` owns this mapping.
- Eight equal segments: 10, 25, 50, Try again (0), 100, 75, 25, and Jackpot (250) points.
- Spins are turn based: the active player spins, the rotation is computed on the server (`rotationForSegment()`) so the winning slice always lands under that player's own pointer, and the result is broadcast to everyone.
- Each player gets the same number of spins per round (default 5, configurable 1–20). Scores accumulate across spins.
- The highest total wins; the biggest single spin breaks a tie, and the earliest seat breaks a dead heat.
- Disconnected players forfeit their remaining spins instead of stalling the room.
- A player who leaves a live room hands the win to the last human still seated (`winReason: 'walkover'`), and that player is paid the pot immediately.
- The server generates the segment index and validates turn order, membership, and game state; the client never decides the result.
- Bots fill every open seat in a solo room and spin automatically on a short delay.

## Wheel rendering

- The wheel is painted with a CSS `conic-gradient` starting at 12 o'clock, matching the angle math used on both server and client.
- Pointer markers are full-size overlays rotated around the wheel centre; each is labelled with the seated player's name just outside the rim on its own axis.
- The wheel always spins forward: every spin adds 4 full revolutions plus the shortest delta to the next result, so accumulated rotation stays continuous.
- After each spin the winning slice rests under the spinning player's arrow, so every observer reads the same result.

## Wallet and bets

The lobby is wired to the BKR wallet through the same `server/shared/roomWallet.js` escrow used by Ludo:

- Stake options: ₹1, ₹5, ₹10, ₹20 and ₹100 per seat, plus free play (₹0).
- `STAKE_OPTIONS` in `server/spinner/gameEngine.js` is the single source of truth and the server rejects any other amount sent by a client.
- Stakes are debited from every human player when the game starts, using an atomic `User.findOneAndUpdate({ balance: { $gte: stake } })`, and one `WalletTransaction` of type `bet` is written per player.
- The pot is `stake × seats`. The winner is credited the whole pot with a `payout` transaction. Bot seats are funded by the house, so a solo win still pays a full pot. A bot win keeps the pot and is never refunded.
- If a player cannot cover the stake, the start is rejected, any already collected stakes are refunded, and the room returns to the waiting state.
- Abandoned staked rooms (every participant left or disconnected) refund the collected stakes with `adjustment` transactions instead of keeping the money.
- When only one human player is left in a live staked room because the others left or never reconnected, that player wins by walkover and is credited the whole pot — the leavers forfeit their stakes.
- `walletUpdated { balance }` is emitted to every affected socket, so the client refreshes the balance and the cached wallet snapshot immediately.

Free play remains the default, which keeps the game playable for members whose wallet balance is still empty.

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

Log in with two or more accounts in separate browser windows/devices, open `/spinner`, create a room, share its code, and start the game from the host window. Each player sees their own pointer on the shared wheel.

## Verification

```bash
cd server
npm test

cd ../client
npm run lint
npm run build
```

The current implementation keeps completed game history out of MongoDB, matching Ludo. Stake movements are the exception: every debit, refund, and payout is persisted in the existing `WalletTransaction` collection, while the live escrow for a running room is held in server memory.
