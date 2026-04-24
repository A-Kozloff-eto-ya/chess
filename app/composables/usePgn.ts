import { Chess } from 'chess.js'

interface PgnGameData {
  moves: { from: string; to: string; promotion?: string; san: string }[]
  whitePlayer?: { username: string } | null
  blackPlayer?: { username: string } | null
  result: string | null
  timeControl?: string | null
  createdAt?: string | null
}

export function usePgn() {
  const buildPgn = (data: PgnGameData): string => {
    const chess = new Chess()
    const headers: string[] = []

    headers.push('[Event "Chess Game"]')
    headers.push('[Site "Chess"]')
    const date = data.createdAt ? new Date(data.createdAt).toISOString().slice(0, 10).replace(/-/g, '.') : new Date().toISOString().slice(0, 10).replace(/-/g, '.')
    headers.push(`[Date "${date}"]`)
    headers.push(`[White "${data.whitePlayer?.username ?? '?'}"]`)
    headers.push(`[Black "${data.blackPlayer?.username ?? '?'}"]`)
    headers.push(`[Result "${data.result ?? '*'}"]`)
    if (data.timeControl) {
      headers.push(`[TimeControl "${data.timeControl}"]`)
    }

    const sanMoves: string[] = []
    for (const m of data.moves) {
      try {
        chess.move({ from: m.from, to: m.to, promotion: m.promotion })
        sanMoves.push(m.san)
      } catch {
        break
      }
    }

    let moveText = ''
    for (let i = 0; i < sanMoves.length; i++) {
      if (i % 2 === 0) {
        moveText += `${Math.floor(i / 2) + 1}. `
      }
      moveText += `${sanMoves[i]} `
    }
    moveText += data.result ?? '*'

    return headers.join('\n') + '\n\n' + moveText.trim()
  }

  const downloadPgn = (data: PgnGameData, filename?: string) => {
    const pgn = buildPgn(data)
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `game-${Date.now()}.pgn`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const copyPgn = async (data: PgnGameData): Promise<string> => {
    const pgn = buildPgn(data)
    await navigator.clipboard.writeText(pgn)
    return pgn
  }

  const parsePgn = (pgn: string): { moves: { from: string; to: string; promotion?: string; san: string }[]; headers: Record<string, string>; result: string | null } | null => {
    try {
      const chess = new Chess()
      chess.loadPgn(pgn)

      const history = chess.history({ verbose: true })
      const moves = history.map(m => ({
        from: m.from,
        to: m.to,
        promotion: m.promotion || undefined,
        san: m.san,
      }))

      const headerLines = pgn.split('\n').filter(l => l.startsWith('['))
      const headers: Record<string, string> = {}
      for (const line of headerLines) {
        const match = line.match(/\[(\w+)\s+"(.*)"\]/)
        if (match) {
          headers[match[1]] = match[2]
        }
      }

      return { moves, headers, result: headers.Result ?? null }
    } catch {
      return null
    }
  }

  return { buildPgn, downloadPgn, copyPgn, parsePgn }
}
