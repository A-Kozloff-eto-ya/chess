# Client Plan — Chess App

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Nuxt 4 |
| UI Library | @nuxt/ui v4 (Tailwind CSS + Reka UI) |
| Board Rendering | vue3-chessboard (Chessground + chess.js) |
| Chess Logic | chess.js |
| Engine (client) | stockfish.js (nmrugg) lite single-threaded WASM via Web Worker |
| Real-time | Nitro native WebSocket (client wrapper) |
| Auth | nuxt-auth-utils (useUserSession composable) |
| Validation | Zod |
| State | Vue 3 reactivity + composables |

---

## Directory Structure

```
app/
  assets/
    css/
      main.css              -- Tailwind + Nuxt UI imports
  components/
    board/
      ChessBoard.vue        -- Wrapper over vue3-chessboard with custom styling
    game/
      GameLobby.vue         -- Create/join game, matchmaking UI
      GameControls.vue      -- Resign, draw offer, new game buttons
      MoveHistory.vue       -- Scrollable move list with notation
      Timer.vue             -- Chess clock display
      GameStatus.vue        -- Checkmate, draw, resignation overlay
    analysis/
      AnalysisPanel.vue     -- Post-game analysis sidebar
      EvalBar.vue           -- Vertical evaluation bar (centipawns)
      EngineLines.vue       -- Multi-PV lines display
      BlunderBadge.vue      -- Move quality indicator (!, ?, ??)
    engine/
      EngineSettings.vue    -- ELO slider, hints toggle, depth control
      HintPanel.vue         -- Best move hints (optional, togglable)
    user/
      LoginModal.vue        -- Login/register form
      UserProfile.vue       -- Profile display (rating, stats, avatar)
      UserAvatar.vue        -- Avatar component
    spectator/
      SpectatorView.vue     -- View for watching live games
      LiveGamesList.vue     -- List of friends' active games
    common/
      AppHeader.vue         -- Navigation, user menu
      AppSidebar.vue        -- Main sidebar navigation
      NotificationToast.vue -- Toast notifications
  pages/
    index.vue               -- Home page / lobby
    play/
      [id].vue              -- Active game page
    play-ai.vue             -- Play vs AI page
    analyze/
      [id].vue              -- Post-game analysis page
    profile/
      [username].vue        -- User profile page
    game/
      [id].vue              -- Game replay page
  composables/
    useChessGame.ts         -- Game state management (FEN, moves, turn, clock)
    useStockfish.ts         -- Web Worker communication with Stockfish WASM
    useWebSocket.ts         -- WebSocket connection, reconnect, message handling
    useAnalysis.ts          -- Post-game analysis logic (blunder detection)
    useFriends.ts           -- Friends list, requests, online status
  layouts/
    default.vue             -- AppHeader + main content
  plugins/
  app.vue                   -- Root with UApp wrapper
shared/
  types/
    index.ts                -- Shared types
    auth.d.ts               -- UserSession type augmentation
public/
  stockfish/
    stockfish-18-lite-single.js
    stockfish-18-lite-single.wasm
    (downloaded from nmrugg/stockfish.js releases)
```

---

## Composables Design

### useChessGame.ts

```
State:
  - fen: string (current position)
  - moves: Move[] (move history)
  - turn: 'w' | 'b'
  - isCheck: boolean
  - isCheckmate: boolean
  - isDraw: boolean
  - isGameOver: boolean
  - pgn: string
  - timeControl: { white: number, black: number, increment: number }
  - whiteTime: number (ms remaining)
  - blackTime: number (ms remaining)

Methods:
  - makeMove(from, to, promotion?): Move | null
  - undoMove(): void
  - resetGame(): void
  - loadFen(fen: string): void
  - loadPgn(pgn: string): void
  - getLegalMoves(square: string): string[]
  - startClock(): void
  - stopClock(): void

Events emitted:
  - onMove(move)
  - onCheck()
  - onCheckmate(color)
  - onDraw(reason)
  - onTimeOut(color)
```

### useStockfish.ts

```
State:
  - isReady: boolean
  - isThinking: boolean
  - evaluation: number (centipawns)
  - bestMove: string | null
  - principalVariations: PV[] (Multi-PV lines)
  - depth: number (current search depth)
  - wdl: { win: number, draw: number, loss: number }

Methods:
  - init(): void (create Web Worker)
  - destroy(): void (terminate worker)
  - analyze(fen: string, depth?: number): void
  - analyzeMultiPV(fen: string, numLines: number, depth?: number): void
  - stop(): void
  - setElo(elo: number): void
  - setSkillLevel(level: number): void
  - getBestMove(fen: string, movetime?: number): Promise<string>
  - playMove(fen: string, movetime?: number): Promise<string>

UCI Protocol handling:
  - postMessage() to send commands
  - onmessage parser for:
    - "info depth ... score cp ... pv ..." -> evaluation + PV
    - "info depth ... score mate ... pv ..." -> mate evaluation
    - "bestmove ..." -> best move result
    - "uciok" -> engine ready
    - "readyok" -> ready for commands
```

### useWebSocket.ts

```
State:
  - isConnected: boolean
  - reconnectAttempts: number
  - lastError: string | null

Methods:
  - connect(): void
  - disconnect(): void
  - send(message: WSMessage): void
  - joinGame(gameId: string): void
  - spectateGame(gameId: string): void
  - sendMove(gameId: string, move: MoveData): void
  - resign(gameId: string): void
  - offerDraw(gameId: string): void

Message handlers:
  - onMessage(callback: (msg: WSMessage) => void)
  - Auto-reconnect with exponential backoff (1s, 2s, 4s, max 30s)
  - Queue messages while disconnected, flush on reconnect
```

### useAnalysis.ts

```
State:
  - moves: AnalyzedMove[] (each move with evaluation)
  - inaccuracies: number
  - mistakes: number
  - blunders: number
  - averageCentipawnLoss: { white: number, black: number }
  - isAnalyzing: boolean
  - progress: number (0-100)

Methods:
  - analyzeGame(moves: string[], startingFen?: string): Promise<AnalyzedMove[]>
  - analyzePosition(fen: string, depth?: number): Promise<EngineEvaluation>
  - getMoveQuality(evalBefore: number, evalAfter: number): 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'

Types:
  AnalyzedMove {
    san: string
    fen: string
    evalBefore: number
    evalAfter: number
    quality: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'
    bestMove: string
    pv: string[]
  }
```

---

## Pages Detail

### index.vue — Home / Lobby

```
Layout: default
Components:
  - GameLobby (create game, set time control, choose color)
  - LiveGamesList (active games of friends)
  - Quick play buttons (Play vs AI, Play Online)
  - User stats summary
```

### play/[id].vue — Active Game

```
Layout: default (sidebar minimized)
Components:
  - OpponentInfo (avatar, name, rating, timer)
  - ChessBoard (interactive, vue3-chessboard)
  - PlayerInfo (avatar, name, rating, timer)
  - MoveHistory (right panel)
  - GameControls (resign, draw, flag)
  - EvalBar (optional, togglable)
  - HintPanel (optional, togglable)

Behavior:
  - Connect to WebSocket on mount, join game room
  - Sync moves via WS
  - Timer runs locally, synced periodically
  - On disconnect: show reconnecting overlay, queue moves
```

### play-ai.vue — Play vs AI

```
Layout: default (sidebar minimized)
Components:
  - ChessBoard
  - EngineSettings (ELO slider, depth, hints toggle)
  - MoveHistory
  - GameControls
  - EvalBar

Behavior:
  - Stockfish runs locally in Web Worker
  - After player moves, Stockfish calculates response
  - Hints mode: show best move arrow on board when enabled
  - ELO setting uses UCI_LimitStrength + UCI_Elo
```

### analyze/[id].vue — Post-game Analysis

```
Layout: default
Components:
  - ChessBoard (readonly + clickable move navigation)
  - AnalysisPanel (sidebar with eval graph, move quality)
  - EvalBar
  - EngineLines (Multi-PV top 3 lines)
  - MoveHistory (with quality badges: !!, !, ?, ??)
  - Navigation controls (first, prev, next, last move)

Behavior:
  - Load game PGN from server
  - Run Stockfish analysis on each position
  - Show evaluation graph over time
  - Click on move to jump to position
  - Show blunder/mistake highlights
```

### profile/[username].vue — User Profile

```
Layout: default
Components:
  - UserProfile (username, rating, joined date)
  - Stats cards (games played, winrate, avg opponent rating)
  - Game history table (opponent, result, date, time control)
  - Action buttons (Add friend, Challenge)

Behavior:
  - Load user data from API
  - Paginated game history
  - Friend request button (if logged in and not friend)
```

---

## WebSocket Message Protocol

### Client -> Server

```typescript
type ClientMessage =
  | { type: 'join'; gameId: string }
  | { type: 'spectate'; gameId: string }
  | { type: 'move'; gameId: string; move: { from: string; to: string; promotion?: string } }
  | { type: 'resign'; gameId: string }
  | { type: 'offer_draw'; gameId: string }
  | { type: 'accept_draw'; gameId: string }
  | { type: 'decline_draw'; gameId: string }
  | { type: 'offer_rematch'; gameId: string }
  | { type: 'accept_rematch'; gameId: string }
  | { type: 'chat'; gameId: string; message: string }
  | { type: 'leave_game'; gameId: string }
```

### Server -> Client

```typescript
type ServerMessage =
  | { type: 'joined'; gameId: string; color: 'white' | 'black'; fen: string; opponent: UserInfo }
  | { type: 'spectating'; gameId: string; fen: string; moves: string[]; whitePlayer: UserInfo; blackPlayer: UserInfo }
  | { type: 'move'; gameId: string; move: MoveResult; fen: string; whiteTime: number; blackTime: number }
  | { type: 'game_over'; gameId: string; result: string; reason: string }
  | { type: 'invalid_move'; reason: string }
  | { type: 'draw_offered'; by: string }
  | { type: 'rematch_offered'; by: string }
  | { type: 'opponent_disconnected'; gameId: string }
  | { type: 'opponent_reconnected'; gameId: string }
  | { type: 'chat'; from: string; message: string }
  | { type: 'error'; message: string }
```

---

## Shared Types (shared/types/index.ts)

```typescript
export interface User {
  id: number
  username: string
  email: string
  avatar: string | null
  rating: number
  createdAt: string
}

export interface Game {
  id: number
  whitePlayerId: number
  blackPlayerId: number
  status: 'waiting' | 'active' | 'completed' | 'abandoned'
  fen: string
  pgn: string | null
  moves: string[]
  result: string | null
  timeControl: string
  createdAt: string
  endedAt: string | null
  whitePlayer?: User
  blackPlayer?: User
}

export interface MoveData {
  from: string
  to: string
  promotion?: string
}

export interface MoveResult {
  san: string
  from: string
  to: string
  promotion?: string
  captured?: string
  flags: string
}

export interface EngineEvaluation {
  depth: number
  score: {
    type: 'cp' | 'mate'
    value: number
  }
  wdl?: { win: number; draw: number; loss: number }
  pv: string[]
  multipv: number
}

export interface AnalyzedMove {
  san: string
  from: string
  to: string
  fen: string
  evalBefore: number
  evalAfter: number
  quality: 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder'
  bestMove: string
  bestPv: string[]
}

export interface FriendRequest {
  id: number
  from: User
  to: User
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export interface UserInfo {
  id: number
  username: string
  rating: number
  avatar: string | null
}
```

---

## Implementation Phases

### Phase 2: Board + Local Play

1. Install vue3-chessboard, chess.js
2. Create ChessBoard.vue component (ClientOnly wrapper)
3. Create useChessGame composable
4. Implement local play page (two humans, same device)
5. Add Timer.vue with configurable time controls
6. Add MoveHistory.vue panel
7. Add GameControls.vue (resign, draw, new game)

### Phase 4: Stockfish Client

1. Download stockfish-18-lite-single.js + .wasm to public/stockfish/
2. Create useStockfish composable (Web Worker + UCI parser)
3. Create play-ai.vue page with ELO settings
4. Create useAnalysis composable for post-game analysis
5. Create analyze/[id].vue page with eval bar, PV lines, blunder detection
6. Create EvalBar.vue component
7. Create EngineLines.vue component
8. Add optional hint arrows on board during play
