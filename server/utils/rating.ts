export function calculateNewRating(
  playerRating: number,
  opponentRating: number,
  result: 1 | 0.5 | 0,
  gamesPlayed: number = 0
): number {
  const kFactor = getKFactor(playerRating, gamesPlayed)
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
  const newRating = playerRating + kFactor * (result - expectedScore)
  return Math.round(Math.max(100, newRating))
}

function getKFactor(rating: number, gamesPlayed: number): number {
  if (gamesPlayed < 30) return 40
  if (rating < 2400) return 20
  return 10
}
