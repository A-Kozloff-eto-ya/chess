# Server Plan — Chess App

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Nitro (Nuxt 4 server engine) |
| Database | PostgreSQL via NuxtHub (Drizzle ORM) |
| Local Dev DB | PGlite (embedded Postgres, zero config) |
| Cache / Pub-Sub | Redis via Nitro unstorage |
| Real-time | Nitro native WebSocket (defineWebSocketHandler) |
| Auth | nuxt-auth-utils (cookie sessions, OAuth, passwords) |
| Chess Logic | chess.js (server-side move validation) |
| Engine | Stockfish binary (child_process for server-side analysis) |
| Validation | Zod |

---

## Directory Structure

```
server/
  api/
    games/
      index.get.ts            -- List user's games (with pagination)
      index.post.ts           -- Create new game / seek opponent
      [id].get.ts             -- Get game by ID (with PGN, moves)
      [id]/
        move.post.ts          -- Submit move (HTTP fallback for WS)
        resign.post.ts        -- Resign game
        draw.post.ts          -- Offer/accept/decline draw
    users/
      me.get.ts               -- Get current user profile
      [username].get.ts       -- Get user by username
      search.get.ts           -- Search users by username
      me.put.ts               -- Update profile (avatar, etc.)
    friends/
      index.get.ts            -- List friends + pending requests
      request.post.ts         -- Send friend request
      accept.post.ts          -- Accept friend request
      decline.post.ts         -- Decline friend request
      remove.post.ts          -- Remove friend
    analysis/
      [id].post.ts            -- Request server-side analysis of a game
      [id].get.ts             -- Get analysis results
    engine/
      evaluate.post.ts        -- Evaluate position (FEN) via server Stockfish
      bestmove.post.ts        -- Get best move for position
  routes/
    auth/
      github.get.ts           -- OAuth GitHub callback
      google.get.ts           -- OAuth Google callback
    _ws.ts                    -- WebSocket handler (game rooms)
  middleware/
    auth.ts                   -- Require authentication for protected routes
  plugins/
    gameManager.ts            -- Nitro plugin: in-memory game state manager
    redis.ts                  -- Redis connection setup
    stockfish.ts              -- Server-side Stockfish process manager
  utils/
    db.ts                     -- Database query helpers
    chess.ts                  -- chess.js wrapper (move validation, PGN gen)
    rating.ts                 -- ELO rating calculation
  db/
    schema.ts                 -- Drizzle ORM schema
    migrations/               -- Auto-generated migrations
shared/
  types/
    index.ts                  -- Shared types (Game, User, Move, WSMessage)
    auth.d.ts                 -- UserSession type augmentation
```

---

## Database Schema (Drizzle)

```typescript
// server/db/schema.ts

import { pgTable, text, serial, timestamp, integer, boolean, pgEnum } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const gameStatusEnum = pgEnum('game_status', ['waiting', 'active', 'completed', 'abandoned'])
export const friendshipStatusEnum = pgEnum('friendship_status', ['pending', 'accepted', 'declined'])

// Users
export const users = pgTable('users', {
  id: serial().primaryKey(),
  username: text().notNull().unique(),
  email: text().notNull().unique(),
  passwordHash: text(),
  avatar: text().default('/default-avatar.png'),
  rating: integer().default(1200),
  provider: text().default('email'),
  providerId: text(),
  createdAt: timestamp().notNull().defaultNow(),
})

// Games
export const games = pgTable('games', {
  id: serial().primaryKey(),
  whitePlayerId: integer().notNull().references(() => users.id),
  blackPlayerId: integer().notNull().references(() => users.id),
  status: gameStatusEnum().notNull().default('waiting'),
  fen: text().notNull(),
  pgn: text(),
  moves: text().notNull().default('[]'),
  result: text(),
  timeControl: text().default('10+0'),
  createdAt: timestamp().notNull().defaultNow(),
  endedAt: timestamp(),
})

// Friendships
export const friendships = pgTable('friendships', {
  id: serial().primaryKey(),
  requesterId: integer().notNull().references(() => users.id),
  addresseeId: integer().notNull().references(() => users.id),
  status: friendshipStatusEnum().notNull().default('pending'),
  createdAt: timestamp().notNull().defaultNow(),
  respondedAt: timestamp(),
})

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  gamesAsWhite: many(games, { relationName: 'whitePlayer' }),
  gamesAsBlack: many(games, { relationName: 'blackPlayer' }),
  friendshipsRequested: many(friendships, { relationName: 'requester' }),
  friendshipsReceived: many(friendships, { relationName: 'addressee' }),
}))

export const gamesRelations = relations(games, ({ one }) => ({
  whitePlayer: one(users, { relationName: 'whitePlayer', fields: [games.whitePlayerId], references: [users.id] }),
  blackPlayer: one(users, { relationName: 'blackPlayer', fields: [games.blackPlayerId], references: [users.id] }),
}))

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, { relationName: 'requester', fields: [friendships.requesterId], references: [users.id] }),
  addressee: one(users, { relationName: 'addressee', fields: [friendships.addresseeId], references: [users.id] }),
}))
```

---

## Auth Setup (nuxt-auth-utils)

### Configuration (nuxt.config.ts)

```typescript
runtimeConfig: {
  session: {
    maxAge: 60 * 60 * 24 * 7, // 1 week
    password: '', // set via NUXT_SESSION_PASSWORD env (min 32 chars)
  },
  oauth: {
    github: {
      clientId: '',
      clientSecret: '',
    },
    google: {
      clientId: '',
      clientSecret: '',
    },
  },
}
```

### Auth Routes

```
server/routes/auth/github.get.ts    -- defineOAuthGitHubEventHandler
server/routes/auth/google.get.ts    -- defineOAuthGoogleEventHandler
server/api/auth/register.post.ts    -- Email/password registration (hashPassword)
server/api/auth/login.post.ts       -- Email/password login (verifyPassword + setUserSession)
server/api/auth/logout.post.ts      -- clearUserSession
```

### Session Type Augmentation (shared/types/auth.d.ts)

```typescript
declare module '#auth-utils' {
  interface User {
    id: number
    username: string
    email: string
    avatar: string | null
    rating: number
  }

  interface UserSession {
    user: User
  }
}
```

### Auth Middleware (server/middleware/auth.ts)

```typescript
export default defineEventHandler(async (event) => {
  if (event.path.startsWith('/api/') && !event.path.startsWith('/api/auth/')) {
    await requireUserSession(event)
  }
})
```

---

## WebSocket Handler (server/routes/_ws.ts)

### Architecture

```
Player A  ----WS---->  Nitro WebSocket Handler  ----pub/sub---->  Player B
                                |
                          Redis Pub/Sub
                                |
                    Spectator 1, Spectator 2, ...
```

### Game Room Manager (server/plugins/gameManager.ts)

```typescript
interface GameRoom {
  gameId: string
  chess: Chess              // chess.js instance (server-authoritative state)
  whitePlayer: Peer | null
  blackPlayer: Peer | null
  spectators: Set<Peer>
  moveList: string[]
  timeControl: { base: number, increment: number }
  whiteTime: number         // ms remaining
  blackTime: number         // ms remaining
  lastMoveAt: number        // timestamp
  status: 'waiting' | 'active' | 'completed' | 'abandoned'
}

// In-memory map (supplement with Redis for multi-instance)
const gameRooms = new Map<string, GameRoom>()
```

### WebSocket Handler Flow

```
upgrade(request):
  1. Parse session cookie -> requireUserSession(request)
  2. If invalid -> reject upgrade (401)

open(peer):
  1. Store user info in peer.data (userId, username, rating)

message(peer, raw):
  Parse JSON message, dispatch by type:

  "join" (gameId):
    1. Look up game in DB (or active game rooms)
    2. Assign color (white/black based on game record)
    3. Create GameRoom if not exists
    4. peer.subscribe("game:{gameId}")
    5. Send { type: "joined", color, fen, opponent }

  "spectate" (gameId):
    1. peer.subscribe("game:{gameId}")
    2. Add to spectators set
    3. Send current state { type: "spectating", fen, moves, ... }

  "move" (gameId, move):
    1. Validate: is it this player's turn?
    2. Validate move with chess.js: chess.move(move)
    3. If invalid -> send { type: "invalid_move" }
    4. Update game room state (FEN, time)
    5. peer.publish("game:{gameId}", { type: "move", move, fen, ... })
    6. Check game end conditions (checkmate, draw, timeout)
    7. If game over -> broadcast { type: "game_over", result, reason }
    8. Persist move to DB (async, non-blocking)
    9. Send acknowledgment to mover

  "resign" (gameId):
    1. Validate player is in this game
    2. End game, set result
    3. Broadcast { type: "game_over", result, reason: "resignation" }
    4. Persist to DB

  "offer_draw" (gameId):
    1. Broadcast to opponent { type: "draw_offered", by: username }

  "accept_draw" (gameId):
    1. End game with 1/2-1/2
    2. Broadcast { type: "game_over", result: "1/2-1/2", reason: "agreement" }

close(peer):
  1. Find all game rooms this peer is in
  2. If player in active game -> notify opponent { type: "opponent_disconnected" }
  3. Start disconnect timer (e.g., 60 seconds to reconnect)
  4. If timer expires -> forfeit game
  5. Clean up spectator subscriptions
```

---

## Redis Integration

### Configuration

```typescript
// server/plugins/redis.ts
// Use Nitro's built-in storage with Redis driver

// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    storage: {
      gameStates: {
        driver: 'redis',
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      },
    },
  },
})
```

### Redis Usage

```
1. Active game state cache:
   - Key: "game:{id}" -> JSON { fen, moves, whiteTime, blackTime, ... }
   - TTL: 24 hours (auto-cleanup for abandoned games)
   - Write-through: update Redis on every move, persist to Postgres async

2. Pub/Sub for multi-instance:
   - Channel: "game:{id}"
   - Publish moves for cross-instance spectator/peer notification
   - Used when deploying multiple Nitro instances

3. User online status:
   - Key: "user:online:{id}" -> timestamp
   - TTL: 5 minutes (refreshed on activity)
   - Used for friends list online indicators

4. Matchmaking queue:
   - Key: "matchmaking:{timeControl}" -> sorted set of waiting players
   - Score: rating (for ELO-based matching)
   - Pop closest-rated players
```

---

## Server-Side Stockfish

### Plugin (server/plugins/stockfish.ts)

```typescript
// Manage Stockfish child process(es)

import { spawn } from 'child_process'

interface StockfishProcess {
  process: ChildProcess
  busy: boolean
  resolve: ((result: string) => void) | null
  buffer: string
}

// Pool of Stockfish processes (e.g., 2-4 instances)
const pool: StockfishProcess[] = []

function createStockfishProcess(): StockfishProcess {
  const proc = spawn('stockfish', [])
  const sf: StockfishProcess = { process: proc, busy: false, resolve: null, buffer: '' }

  proc.stdout.on('data', (data) => {
    sf.buffer += data.toString()
    // Parse UCI responses
    // When "bestmove" received, resolve promise
  })

  return sf
}

function getAvailableProcess(): StockfishProcess | null {
  return pool.find(p => !p.busy) || null
}

// Export functions:
// - evaluatePosition(fen: string, depth: number): Promise<EngineEvaluation>
// - getBestMove(fen: string, movetime: number): Promise<string>
// - analyzeGame(moves: string[]): Promise<AnalyzedMove[]>
```

### API Endpoints

```
POST /api/analysis/[id]
  - Trigger server-side analysis of a completed game
  - Queue analysis job (could be slow for long games)
  - Return analysis ID for polling

GET /api/analysis/[id]
  - Get analysis results (or status: pending/in-progress/complete)

POST /api/engine/evaluate
  Body: { fen: string, depth?: number }
  - Evaluate a single position
  - Return evaluation, best move, PV

POST /api/engine/bestmove
  Body: { fen: string, movetime?: number }
  - Get best move for a position
  - Return move in UCI notation
```

---

## API Endpoints Detail

### Games

```
GET  /api/games?page=1&limit=20&status=completed
  - List current user's games
  - Pagination, optional status filter
  - Return: { games: Game[], total: number, page: number }

POST /api/games
  Body: { opponentId?: number, timeControl?: string, color?: 'white' | 'random' }
  - Create a new game
  - If opponentId provided -> direct challenge
  - If no opponentId -> add to matchmaking queue
  - Return: { gameId: number }

GET  /api/games/[id]
  - Get game details with PGN, moves, players
  - Return: Game (with whitePlayer, blackPlayer populated)

POST /api/games/[id]/move
  Body: { from: string, to: string, promotion?: string }
  - HTTP fallback for move submission (primary path is WebSocket)
  - Validate move, update state
  - Return: { move: MoveResult, fen: string }

POST /api/games/[id]/resign
  - Resign from game
  - Return: { result: string }

POST /api/games/[id]/draw
  Body: { action: 'offer' | 'accept' | 'decline' }
  - Handle draw offers
```

### Users

```
GET  /api/users/me
  - Get current authenticated user
  - Return: User

PUT  /api/users/me
  Body: { avatar?: string }
  - Update user profile
  - Return: User

GET  /api/users/[username]
  - Get public user profile
  - Return: User (without email)

GET  /api/users/search?q=username&page=1&limit=10
  - Search users by username prefix
  - Return: { users: User[] }
```

### Friends

```
GET  /api/friends
  - List accepted friends + pending requests
  - Return: { friends: User[], pending: FriendRequest[] }

POST /api/friends/request
  Body: { userId: number }
  - Send friend request
  - Return: { success: boolean }

POST /api/friends/accept
  Body: { requestId: number }
  - Accept friend request
  - Return: { success: boolean }

POST /api/friends/decline
  Body: { requestId: number }
  - Decline friend request
  - Return: { success: boolean }

POST /api/friends/remove
  Body: { userId: number }
  - Remove from friends
  - Return: { success: boolean }
```

---

## Rating System

```typescript
// server/utils/rating.ts

// Standard ELO calculation
function calculateNewRating(
  playerRating: number,
  opponentRating: number,
  result: 1 | 0.5 | 0,  // win, draw, loss
  kFactor: number = 32
): number {
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
  const newRating = playerRating + kFactor * (result - expectedScore)
  return Math.round(Math.max(100, newRating))  // minimum rating of 100
}

// K-factor adjustments:
// New players (< 30 games): K = 40
// Players < 2400: K = 20
// Players >= 2400: K = 10
```

---

## Game Lifecycle

```
1. CREATE
   Player A creates game -> POST /api/games
   -> DB: games row (status: "waiting")
   -> Redis: add to matchmaking queue (if no opponent specified)

2. MATCH
   Player B accepts / matchmaking finds match
   -> DB: update status to "active"
   -> Both players connect via WebSocket, join room

3. PLAY
   Players alternate sending moves via WebSocket
   -> Server validates each move (chess.js)
   -> Server updates game state (Redis cache)
   -> Server broadcasts to players + spectators
   -> Server persists move to DB (async)
   -> Server tracks clocks (server-side for anti-cheat)

4. END
   Game ends by: checkmate, draw, resignation, timeout, abandoned
   -> Server generates PGN from move list
   -> DB: update game (status: "completed", pgn, result, endedAt)
   -> Server updates player ratings
   -> Server removes from Redis active games cache
   -> Server notifies players + spectators

5. ANALYZE
   Player requests analysis -> POST /api/analysis/[id]
   -> Server-side Stockfish analyzes each position
   -> Results stored and returned
```

---

## Deployment Considerations

### Environment Variables (.env)

```
NUXT_SESSION_PASSWORD=          # min 32 chars
NUXT_OAUTH_GITHUB_CLIENT_ID=
NUXT_OAUTH_GITHUB_CLIENT_SECRET=
NUXT_OAUTH_GOOGLE_CLIENT_ID=
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=
DATABASE_URL=                   # PostgreSQL connection string
REDIS_URL=redis://localhost:6379
STOCKFISH_PATH=/usr/bin/stockfish
```

### Production Notes

- Run Stockfish binary on server (install via package manager or download)
- Redis for pub/sub required for multi-instance deployment
- PGlite only for local dev; use real PostgreSQL in production
- Set proper COOP/COEP headers if using multi-threaded Stockfish WASM on client
- Rate limit API endpoints to prevent abuse

---

## Implementation Phases

### Phase 1: Infrastructure

1. Install dependencies: @nuxthub/core, drizzle-orm, drizzle-kit, nuxt-auth-utils, chess.js, zod
2. Configure nuxt.config.ts (modules, hub, nitro.websocket, runtimeConfig)
3. Create Drizzle schema (server/db/schema.ts)
4. Run migrations (npx nuxi db generate && npx nuxi db migrate)
5. Create auth routes (OAuth + password)
6. Create auth middleware
7. Create basic API routes for users
8. Seed script for testing

### Phase 3: Multiplayer

1. Install Redis, configure Nitro storage
2. Create gameManager plugin (in-memory game rooms)
3. Create redis plugin
4. Create WebSocket handler (_ws.ts)
5. Create game API routes (CRUD)
6. Implement matchmaking (Redis sorted sets)
7. Implement server-side clock management
8. Implement disconnect/reconnect logic (60s grace period)
9. Game completion flow (PGN generation, rating update)

### Phase 4: Server-Side Stockfish

1. Install Stockfish binary on dev machine
2. Create stockfish plugin (child process pool)
3. Create analysis API endpoints
4. Create engine evaluation API endpoints
5. Implement game analysis pipeline (position-by-position)
6. Store analysis results in database or Redis
