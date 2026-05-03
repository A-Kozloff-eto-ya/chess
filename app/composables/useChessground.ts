import { ref, onUnmounted } from 'vue'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Config } from 'chessground/config'
import type { Key, Color, Role } from 'chessground/types'
import { Chess } from 'chess.js'

export interface ChessgroundCallbacks {
  onMove?: (move: { from: string; to: string; promotion?: string; san: string; captured?: string }) => void
  onCheck?: () => void
  onCheckmate?: () => void
  onStalemate?: () => void
  onDraw?: () => void
  onPromotionNeeded?: (orig: Key, dest: Key) => void
}

export interface UseChessgroundOptions {
  callbacks?: ChessgroundCallbacks
  autoValidateMoves?: boolean
}

export function useChessground(options: UseChessgroundOptions = {}) {
  const cg = ref<Api | null>(null)
  const chess = ref(new Chess())
  let el: HTMLElement | null = null
  let movableColor: Color | 'both' | undefined
  let storedPremove: { orig: Key; dest: Key } | null = null
  let premoveCallback: ((orig: Key, dest: Key) => void) | null = null

  const toColor = (c: 'w' | 'b'): Color => c === 'w' ? 'white' : 'black'

  const computeDests = (): Map<Key, Key[]> => {
    const dests = new Map<Key, Key[]>()
    const moves = chess.value.moves({ verbose: true })
    for (const m of moves) {
      const from = m.from as Key
      if (!dests.has(from)) dests.set(from, [])
      dests.get(from)!.push(m.to as Key)
    }
    return dests
  }

  const computePremoveDests = (color: Color): Map<Key, Key[]> => {
    const fen = chess.value.fen()
    const parts = fen.split(' ')
    parts[1] = color === 'white' ? 'w' : 'b'
    try {
      const tempChess = new Chess(parts.join(' '))
      const moves = tempChess.moves({ verbose: true })
      const dests = new Map<Key, Key[]>()
      for (const m of moves) {
        const from = m.from as Key
        if (!dests.has(from)) dests.set(from, [])
        dests.get(from)!.push(m.to as Key)
      }
      return dests
    } catch {
      return new Map()
    }
  }

  const buildConfig = (base?: Partial<Config>): Config => {
    const turnColor = toColor(chess.value.turn())
    const autoValidate = options.autoValidateMoves !== false
    const isViewOnly = base?.viewOnly === true
    const hasMovable = base?.movable?.color !== undefined
    movableColor = base?.movable?.color

    const config: Config = {
      fen: chess.value.fen(),
      orientation: base?.orientation ?? 'white',
      turnColor,
      check: chess.value.inCheck() ? turnColor : undefined,
      coordinates: base?.coordinates ?? true,
      autoCastle: true,
      viewOnly: isViewOnly && !hasMovable,
      highlight: {
        lastMove: true,
        check: true,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
      draggable: {
        enabled: !isViewOnly || hasMovable,
        showGhost: true,
      },
      selectable: {
        enabled: !isViewOnly || hasMovable,
      },
      drawable: {
        enabled: true,
      },
    }

    if (base?.coordinatesOnSquares) config.coordinatesOnSquares = base.coordinatesOnSquares
    if (base?.lastMove) config.lastMove = base.lastMove
    if (base?.selected) config.selected = base.selected
    if (base?.disableContextMenu) config.disableContextMenu = base.disableContextMenu
    if (base?.addPieceZIndex) config.addPieceZIndex = base.addPieceZIndex
    if (base?.addDimensionsCssVarsTo) config.addDimensionsCssVarsTo = base.addDimensionsCssVarsTo
    if (base?.blockTouchScroll) config.blockTouchScroll = base.blockTouchScroll
    if (base?.trustAllEvents) config.trustAllEvents = base.trustAllEvents
    if (base?.fen) config.fen = base.fen
    if (base?.turnColor) config.turnColor = base.turnColor
    if (base?.check !== undefined) config.check = base.check

    if (base?.highlight) {
      if (base.highlight.lastMove !== undefined) config.highlight!.lastMove = base.highlight.lastMove
      if (base.highlight.check !== undefined) config.highlight!.check = base.highlight.check
      if (base.highlight.custom) config.highlight!.custom = base.highlight.custom
    }
    if (base?.animation) {
      if (base.animation.enabled !== undefined) config.animation!.enabled = base.animation.enabled
      if (base.animation.duration !== undefined) config.animation!.duration = base.animation.duration
    }
    if (base?.draggable) {
      if (base.draggable.enabled !== undefined) config.draggable!.enabled = base.draggable.enabled
      if (base.draggable.showGhost !== undefined) config.draggable!.showGhost = base.draggable.showGhost
      if (base.draggable.distance !== undefined) config.draggable!.distance = base.draggable.distance
      if (base.draggable.deleteOnDropOff !== undefined) config.draggable!.deleteOnDropOff = base.draggable.deleteOnDropOff
    }
    if (base?.selectable?.enabled !== undefined) config.selectable!.enabled = base.selectable.enabled
    if (base?.drawable) {
      if (base.drawable.enabled !== undefined) config.drawable!.enabled = base.drawable.enabled
      if (base.drawable.visible !== undefined) config.drawable!.visible = base.drawable.visible
      if (base.drawable.shapes) config.drawable!.shapes = base.drawable.shapes
      if (base.drawable.autoShapes) config.drawable!.autoShapes = base.drawable.autoShapes
      if (base.drawable.onChange) config.drawable!.onChange = base.drawable.onChange
    }

    if (!isViewOnly || hasMovable) {
      const movableEnabled = base?.movable?.enabled !== false
      const movableColor = base?.movable?.color ?? turnColor
      const isPlayerTurn = movableColor === turnColor
      config.movable = {
        free: base?.movable?.free ?? !autoValidate,
        color: movableColor,
        dests: movableEnabled
          ? (isPlayerTurn
              ? (autoValidate ? computeDests() : undefined)
              : computePremoveDests(movableColor))
          : new Map(),
        showDests: base?.movable?.showDests ?? true,
        rookCastle: true,
        events: {
          after: (orig, dest, metadata) => {
            if (metadata.premove) return
            handleUserMove(orig, dest)
          },
        },
      }
      if (base?.movable?.dests) config.movable.dests = base.movable.dests
      if (base?.movable?.rookCastle !== undefined) config.movable.rookCastle = base.movable.rookCastle
      if (base?.movable?.events?.after) config.movable.events!.after = base.movable.events.after
      if (base?.movable?.events?.afterNewPiece) config.movable.events!.afterNewPiece = base.movable.events.afterNewPiece

      config.premovable = {
        enabled: base?.premovable?.enabled ?? true,
        showDests: base?.premovable?.showDests ?? true,
        castle: true,
        events: {
          set: (orig: Key, dest: Key) => {
            storedPremove = { orig, dest }
            premoveCallback?.(orig, dest)
          },
          unset: () => {
            storedPremove = null
          },
        },
      }
      if (base?.premovable?.castle !== undefined) config.premovable.castle = base.premovable.castle
      if (base?.premovable?.dests) config.premovable.dests = base.premovable.dests
      if (base?.premovable?.customDests) config.premovable.customDests = base.premovable.customDests
    }

    if (base?.events) config.events = base.events

    return config
  }

  const handleUserMove = (orig: Key, dest: Key) => {
    if (options.autoValidateMoves === false) {
      options.callbacks?.onMove?.({
        from: orig,
        to: dest,
        san: '',
      })
      return
    }

    if (isPawnPromotion(orig, dest)) {
      options.callbacks?.onPromotionNeeded?.(orig, dest)
      return
    }

    try {
      const moveResult = chess.value.move({ from: orig as any, to: dest as any })
      if (moveResult) {
        updateBoardState()
        options.callbacks?.onMove?.({
          from: orig,
          to: dest,
          san: moveResult.san,
          captured: moveResult.captured,
        })
        checkGameState()
      }
    } catch {
      if (cg.value) {
        cg.value.set({ fen: chess.value.fen() })
      }
    }
  }

  const isPawnPromotion = (orig: Key, dest: Key): boolean => {
    const piece = chess.value.get(orig as any)
    if (!piece || piece.type !== 'p') return false
    const destRank = dest[1]
    return (piece.color === 'w' && destRank === '8') || (piece.color === 'b' && destRank === '1')
  }

  const promote = (orig: Key, dest: Key, role: Role) => {
    const promotionMap: Record<string, string> = {
      queen: 'q', rook: 'r', bishop: 'b', knight: 'n',
    }
    try {
      const moveResult = chess.value.move({ from: orig as any, to: dest as any, promotion: promotionMap[role] as 'q' | 'r' | 'b' | 'n' })
      if (moveResult) {
        updateBoardState()
        options.callbacks?.onMove?.({
          from: orig,
          to: dest,
          promotion: promotionMap[role],
          san: moveResult.san,
          captured: moveResult.captured,
        })
        checkGameState()
      }
    } catch {
      if (cg.value) {
        cg.value.set({ fen: chess.value.fen() })
      }
    }
  }

  const cancelPromotion = () => {
    if (cg.value) {
      cg.value.set({ fen: chess.value.fen() })
    }
  }

  const updateBoardState = () => {
    if (!cg.value) return
    const turnColor = toColor(chess.value.turn())
    const effectiveColor = movableColor && movableColor !== 'both' ? movableColor : turnColor
    const isPlayerTurn = effectiveColor === turnColor
    const autoValidate = options.autoValidateMoves !== false
    const newConfig: Partial<Config> = {
      fen: chess.value.fen(),
      turnColor,
      movable: {
        color: effectiveColor,
        dests: autoValidate
          ? (isPlayerTurn ? computeDests() : computePremoveDests(effectiveColor))
          : undefined,
      },
    }
    if (chess.value.inCheck()) {
      newConfig.check = turnColor
    } else {
      newConfig.check = false
    }
    cg.value.set(newConfig)
  }

  const checkGameState = () => {
    if (chess.value.isCheckmate()) {
      options.callbacks?.onCheckmate?.()
    } else if (chess.value.isStalemate()) {
      options.callbacks?.onStalemate?.()
    } else if (chess.value.isDraw()) {
      options.callbacks?.onDraw?.()
    } else if (chess.value.inCheck()) {
      options.callbacks?.onCheck?.()
    }
  }

  const init = (element: HTMLElement, baseConfig?: Partial<Config>) => {
    destroy()
    el = element
    const config = buildConfig(baseConfig)
    cg.value = Chessground(element, config)
  }

  const destroy = () => {
    if (cg.value) {
      cg.value.destroy()
      cg.value = null
    }
    el = null
  }

  const setConfig = (config: Partial<Config>) => {
    if (!cg.value) return
    cg.value.set(buildConfig(config))
  }

  const setPosition = (fen: string) => {
    try {
      chess.value.load(fen)
    } catch {
      return
    }
    if (!cg.value) return
    const turnColor = toColor(chess.value.turn())
    cg.value.set({
      fen: chess.value.fen(),
      turnColor,
      check: chess.value.inCheck() ? turnColor : undefined,
      movable: {
        color: movableColor && movableColor !== 'both' ? movableColor : turnColor,
        dests: options.autoValidateMoves !== false ? computeDests() : undefined,
      },
    })
  }

  const move = (from: string, to: string, promotion?: string): boolean => {
    if (!cg.value) return false
    try {
      const moveResult = chess.value.move({ from: from as any, to: to as any, promotion: promotion as 'q' | 'r' | 'b' | 'n' | undefined })
      if (moveResult) {
        cg.value.move(from as Key, to as Key)
        updateBoardState()
        return true
      }
    } catch {
      return false
    }
    return false
  }

  const undoLastMove = () => {
    const undone = chess.value.undo()
    if (!undone || !cg.value) return
    const hist = chess.value.history({ verbose: true })
    const last = hist[hist.length - 1]
    const lastMove = last ? [last.from as Key, last.to as Key] : undefined
    const turnColor = toColor(chess.value.turn())
    cg.value.set({
      fen: chess.value.fen(),
      turnColor,
      check: chess.value.inCheck() ? turnColor : undefined,
      movable: {
        color: movableColor && movableColor !== 'both' ? movableColor : turnColor,
        dests: options.autoValidateMoves !== false ? computeDests() : undefined,
      },
      lastMove,
    })
  }

  const resetBoard = () => {
    chess.value.reset()
    if (!cg.value) return
    const turnColor = toColor(chess.value.turn())
    cg.value.set({
      fen: chess.value.fen(),
      turnColor,
      check: undefined,
      movable: {
        color: movableColor && movableColor !== 'both' ? movableColor : turnColor,
        dests: options.autoValidateMoves !== false ? computeDests() : undefined,
      },
      lastMove: undefined,
    })
  }

  const toggleOrientation = () => {
    cg.value?.toggleOrientation()
  }

  onUnmounted(destroy)

  let preservedPremove: { orig: Key; dest: Key } | null = null

  const preservePremove = () => {
    if (storedPremove) {
      preservedPremove = { ...storedPremove }
    }
  }

  const consumePremove = (): { from: string; to: string } | null => {
    const pm = storedPremove ?? preservedPremove
    storedPremove = null
    preservedPremove = null
    return pm ? { from: pm.orig, to: pm.dest } : null
  }

  const setPremoveCallback = (cb: (orig: Key, dest: Key) => void) => {
    premoveCallback = cb
  }

  const tryPlayPremove = (): { from: string; to: string; promotion?: string; san: string; captured?: string } | null => {
    const pm = storedPremove ?? preservedPremove
    storedPremove = null
    preservedPremove = null
    if (!pm || !cg.value) return null

    const orig = pm.orig
    const dest = pm.dest

    const piece = chess.value.get(orig as any)
    let promotion: string | undefined
    if (piece?.type === 'p') {
      if ((piece.color === 'w' && dest[1] === '8') || (piece.color === 'b' && dest[1] === '1')) {
        promotion = 'q'
      }
    }

    try {
      const moveResult = chess.value.move({ from: orig as any, to: dest as any, promotion: promotion as any })
      if (moveResult) {
        updateBoardState()
        return {
          from: orig,
          to: dest,
          promotion,
          san: moveResult.san,
          captured: moveResult.captured,
        }
      }
    } catch {}
    return null
  }

  return {
    cg,
    chess,
    init,
    destroy,
    setConfig,
    setPosition,
    move,
    undoLastMove,
    resetBoard,
    toggleOrientation,
    promote,
    cancelPromotion,
    isPawnPromotion,
    consumePremove,
    preservePremove,
    setPremoveCallback,
    tryPlayPremove,
    getHistory: () => chess.value.history(),
    getHistoryVerbose: () => chess.value.history({ verbose: true }),
    getFen: () => chess.value.fen(),
    getTurnColor: () => chess.value.turn(),
    isCheckmate: () => chess.value.isCheckmate(),
    isStalemate: () => chess.value.isStalemate(),
    isDraw: () => chess.value.isDraw(),
    isGameOver: () => chess.value.isGameOver(),
    isInCheck: () => chess.value.inCheck(),
    getLastMove: () => {
      const hist = chess.value.history({ verbose: true })
      return hist.length > 0 ? hist[hist.length - 1] : undefined
    },
  }
}
