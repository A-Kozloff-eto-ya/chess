import { Chess } from 'chess.js'

export function createChessInstance(fen?: string): Chess {
  return fen ? new Chess(fen) : new Chess()
}

export function validateMove(fen: string, from: string, to: string, promotion?: string) {
  const chess = new Chess(fen)
  try {
    const move = chess.move({ from, to, promotion })
    return { valid: true as const, move, fen: chess.fen(), pgn: chess.pgn() }
  } catch {
    return { valid: false as const, error: 'Invalid move' }
  }
}

export function isGameOver(fen: string) {
  const chess = new Chess(fen)
  return {
    gameOver: chess.isGameOver(),
    checkmate: chess.isCheckmate(),
    draw: chess.isDraw(),
    stalemate: chess.isStalemate(),
    threefoldRepetition: chess.isThreefoldRepetition(),
    insufficientMaterial: chess.isInsufficientMaterial(),
    inCheck: chess.inCheck(),
  }
}

export function generatePgn(moves: string[], fen?: string): string {
  const chess = fen ? new Chess(fen) : new Chess()
  for (const move of moves) {
    chess.move(move)
  }
  return chess.pgn()
}

export function getFenAfterMoves(moves: string[], startingFen?: string): string {
  const chess = startingFen ? new Chess(startingFen) : new Chess()
  for (const move of moves) {
    chess.move(move)
  }
  return chess.fen()
}
