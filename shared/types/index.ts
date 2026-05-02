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

export interface FriendsResponse {
  friends: UserInfo[]
  pending: Array<{
    id: number
    requesterId: number
    from: UserInfo
  }>
  sent: Array<{
    id: number
    to: UserInfo
  }>
}

export interface GameMove {
  from: string
  to: string
  promotion?: string
  san: string
}

export interface FetchError {
  data?: { statusMessage?: string }
  message?: string
}

export interface GameAnalysis {
  id: number
  gameId: number
  status: 'pending' | 'analyzing' | 'completed' | 'failed'
  analyzedMoves: AnalyzedMove[]
  evaluations: number[]
  accuracy: { white: number; black: number }
  progress?: number
}

export interface EngineBestmoveResponse {
  bestmove: string
  ponder: string | null
  depth: number
  eval: { type: 'cp' | 'mate'; value: number } | null
}

export interface UserInfo {
  id: number
  username: string
  rating: number
  avatar: string | null
}

export type ClientMessage =
  | { type: 'join'; gameId: string }
  | { type: 'spectate'; gameId: string }
  | { type: 'move'; gameId: string; move: MoveData }
  | { type: 'resign'; gameId: string }
  | { type: 'abort'; gameId: string }
  | { type: 'offer_draw'; gameId: string }
  | { type: 'accept_draw'; gameId: string }
  | { type: 'decline_draw'; gameId: string }
  | { type: 'offer_rematch'; gameId: string }
  | { type: 'accept_rematch'; gameId: string }
  | { type: 'decline_rematch'; gameId: string }
  | { type: 'chat'; gameId: string; message: string }
  | { type: 'leave_game'; gameId: string }
  | { type: 'game_invite'; toUserId: number; gameId: string; inviteCode: string }

export type ServerMessage =
  | { type: 'joined'; gameId: string; color: 'white' | 'black'; opponent: UserInfo | null; whiteTime?: number; blackTime?: number; lastMoveAt?: number; fen?: string; moveCount?: number; turn?: 'white' | 'black'; chatHistory?: { from: string; message: string; userId: number }[] }
  | { type: 'opponent_joined'; gameId: string; opponent: UserInfo }
  | { type: 'state_update'; gameId: string; fen: string; moveCount: number; lastMove: { from: string; to: string; san: string } | null; turn: 'white' | 'black'; whiteTime: number; blackTime: number; isCheck: boolean }
  | { type: 'move_rejected'; reason: string; fen: string }
  | { type: 'game_over'; gameId: string; result: string; reason: string }
  | { type: 'draw_offered'; by: string }
  | { type: 'rematch_offered'; by: string }
  | { type: 'rematch_accepted'; gameId: string; newGameId: string }
  | { type: 'rematch_declined' }
  | { type: 'opponent_disconnected'; gameId: string }
  | { type: 'opponent_reconnected'; gameId: string }
  | { type: 'chat'; from: string; message: string }
  | { type: 'error'; message: string }
  | { type: 'friend_request'; requestId: number; from: UserInfo }
  | { type: 'friend_accepted'; friend: UserInfo }
  | { type: 'game_invite'; from: UserInfo; gameId: string; inviteCode: string }
  | { type: 'clock_sync'; gameId: string; whiteTime: number; blackTime: number }
  | { type: 'user_online'; userId: number }
  | { type: 'user_offline'; userId: number }
