# BKR Ludo

BKR Ludo is an authenticated, private-room multiplayer game integrated into the existing React/Vite and Express application. Open `/ludo` from the dashboard, create a room, and share the six-character code with 1–3 friends.

## Architecture

- `server/ludo/gameEngine.js` contains pure game rules and state transitions.
- `server/ludo/ludoSocket.js` contains authenticated Socket.IO room transport, validation, rate limiting, and disconnect/reconnect handling.
- `client/src/pages/ludo/LudoPage.jsx` owns the socket session and lobby/game state.
- `client/src/pages/ludo/components/LudoLobby.jsx` renders the wallet bar, the bet chips, and the create/join controls.
- `client/src/pages/ludo/components/LudoBoard.jsx` renders the responsive 15×15 four-color board from server state.
- `client/src/pages/ludo/LudoPage.css` contains the isolated responsive Ludo UI.

Active rooms are held in server memory. This avoids adding a new database dependency and keeps existing BKR models and APIs unchanged. A production deployment with multiple server instances should use Socket.IO's adapter (for example, Redis) or sticky sessions before scaling horizontally.

## Socket.IO

The Ludo namespace is `/ludo`. The client authenticates with the existing JWT as `handshake.auth.token`. The server resolves the user from MongoDB and never trusts a client-provided user ID.

Client/server events:

- `createRoom`, `joinRoom`, `reconnectRoom`, `leaveRoom`
- `startGame`, `rollDice`, `moveToken`
- `gameState`, `playerJoined`, `playerLeft`, `playerDisconnected`, `playerReconnected`
- `gameStarted`, `diceRolled`, `tokenMoved`, `gameFinished`, `walletUpdated`, `ludoError`

Action acknowledgements use `{ ok: true, ... }` or `{ ok: false, message }`.

## Rules implemented

- 2–4 players, one assigned color each: red, green, yellow, blue.
- Seating is chosen so opponents always face each other across the board:
  a two-player room seats green against blue, a three-player room takes the two
  opposite homes first (red/yellow/green), and a four-player room uses every home.
  `colorForSeat()` and `areOppositeColors()` in the engine own this mapping.
- Four tokens per player.
- A token leaves home only on a six.
- A token cannot move beyond the final home position.
- Landing on an opponent on an unsafe track cell captures that token.
- Standard safe cells cannot be captured.
- A six grants another turn; other rolls advance to the next connected player.
- A player wins when all four tokens reach final home (`winReason: 'tokens'`).
- A player who leaves a live room hands the win to the last human still seated
  (`winReason: 'walkover'`), and that player is paid the pot immediately.
- The server generates dice values and validates turn, token ownership, dice state, movement distance, captures, and winner state.

## Board interaction

- The dice button is rendered inside the home yard of whichever color is on
  turn (`LudoBoard` places it over the matching corner of the 15×15 grid), so
  every player reads the turn from the board itself.
- The dice is only enabled for the player who owns the turn; opponents see the
  same dice in the active player's home with the rolled value.
- A two-player match therefore shows the dice alternating between the two
  opposite corners (green and blue homes).

## Wallet and bets

The lobby is wired to the BKR wallet, so a match can be played for free or for a
cash pot:

- Bet options: ₹1, ₹5, ₹10, ₹20 and ₹100 per player, plus free play (₹0).
- `STAKE_OPTIONS` in `server/ludo/gameEngine.js` is the single source of truth and
  the server rejects any other amount sent by a client.
- Stakes are debited from every human player when the game starts, using an
  atomic `User.findOneAndUpdate({ balance: { $gte: stake } })`, and one
  `WalletTransaction` of type `bet` is written per player.
- The winner is credited the whole pot (`stake × seats`) with a `payout`
  transaction. Bot seats are funded by the house, so a solo win still pays a full
  pot. A bot win keeps the pot and is never refunded.
- If a player cannot cover the stake, the start is rejected, any already
  collected stakes are refunded, and the room returns to the waiting state.
- Abandoned staked rooms (every participant left or disconnected) refund the
  collected stakes with `adjustment` transactions instead of keeping the money.
- When only one human player is left in a live staked room because the other
  player left or never reconnected, that player wins by walkover and is credited
  the whole pot with a `payout` transaction — the leaver forfeits their stake.
- `walletUpdated { balance }` is emitted to every affected socket, so the client
  refreshes the balance and the cached wallet snapshot immediately.

Free play remains the default, which keeps the game playable for members whose
wallet balance is still empty.

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

The current implementation keeps completed game history out of MongoDB. Add a Ludo result model only when match history, rankings, or audits are required. Stake movements are the exception: every debit, refund, and payout is persisted in the existing `WalletTransaction` collection, while the live escrow for a running room is held in server memory.
