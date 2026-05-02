import { spawn, type ChildProcess } from 'child_process'

interface PoolWorker {
  proc: ChildProcess
  busy: boolean
  ready: boolean
  currentTask: EngineTask | null
}

const pool: PoolWorker[] = []
const POOL_SIZE = 2
const QUEUE_MAX = 10

interface EngineTask {
  positionCmd: string
  movetime: number
  elo?: number
  type: 'bestmove' | 'eval' | 'analysis'
  resolve: (result: unknown) => void
  reject: (err: Error) => void
  timeout: ReturnType<typeof setTimeout>
  evalScore: { type: 'cp' | 'mate'; value: number } | null
  depth: number
  pv: string[]
}

interface EngineTaskWithMeta extends EngineTask {
  stockfishPath: string
}

const queue: EngineTaskWithMeta[] = []

function parseEvalFromInfo(line: string): { type: 'cp' | 'mate'; value: number } | null {
  if (!line.includes(' score ')) return null
  const match = line.match(/score (cp|mate) (-?\d+)/)
  if (!match || !match[2]) return null
  return { type: match[1] as 'cp' | 'mate', value: parseInt(match[2]) }
}

function createWorker(stockfishPath: string): PoolWorker {
  const proc = spawn(stockfishPath, { stdio: ['pipe', 'pipe', 'pipe'] })
  const worker: PoolWorker = { proc, busy: false, ready: false, currentTask: null }

  let buffer = ''

  proc.stdout.on('data', (data: Buffer) => {
    buffer += data.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed === 'uciok' || trimmed === 'readyok') {
        worker.ready = true
        processQueue()
      }

      if (!worker.currentTask) continue

      if (trimmed.startsWith('info')) {
        const score = parseEvalFromInfo(trimmed)
        if (score) {
          worker.currentTask.evalScore = score
        }
        const depthMatch = trimmed.match(/\bdepth (\d+)\b/)
        if (depthMatch) worker.currentTask.depth = parseInt(depthMatch[1])
        if (worker.currentTask.type === 'analysis') {
          const pvMatch = trimmed.match(/ pv (.+)$/)
          if (pvMatch) worker.currentTask.pv = pvMatch[1].trim().split(/\s+/)
        }
      }

      if (trimmed.startsWith('bestmove') && worker.currentTask) {
        const task = worker.currentTask
        worker.currentTask = null
        worker.busy = false
        clearTimeout(task.timeout)

        if (task.type === 'eval') {
          task.resolve({ eval: task.evalScore })
        } else if (task.type === 'analysis') {
          const parts = trimmed.split(/\s+/)
          task.resolve({ eval: task.evalScore, bestmove: parts[1] ?? '', depth: task.depth, pv: task.pv })
        } else {
          const parts = trimmed.split(/\s+/)
          task.resolve({ bestmove: parts[1] ?? '', ponder: parts[3] ?? null, depth: task.depth, eval: task.evalScore })
        }
        processQueue()
      }
    }
  })

  proc.stderr?.on('data', (data: Buffer) => {
    console.error('[Stockfish]', data.toString().trim())
  })

  proc.on('error', (err: Error) => {
    console.error('[Stockfish] Process error:', err)
    if (worker.currentTask) {
      worker.currentTask.reject(err)
      worker.currentTask = null
    }
    worker.busy = false
    worker.ready = false
    const idx = pool.indexOf(worker)
    if (idx > -1) pool.splice(idx, 1)
  })

  proc.on('close', (code: number | null) => {
    console.error('[Stockfish] Process exited with code', code)
    if (worker.currentTask) {
      worker.currentTask.reject(new Error(`Stockfish exited with code ${code}`))
      worker.currentTask = null
    }
    worker.busy = false
    worker.ready = false
    const idx = pool.indexOf(worker)
    if (idx > -1) pool.splice(idx, 1)
  })

  proc.stdin.write('uci\n')
  return worker
}

function getOrCreateWorker(stockfishPath: string): PoolWorker | null {
  for (const w of pool) {
    if (!w.busy && w.ready && !w.proc.killed) return w
  }
  if (pool.length < POOL_SIZE) {
    const w = createWorker(stockfishPath)
    pool.push(w)
    return null
  }
  return null
}

function processQueue() {
  while (queue.length > 0) {
    const stockfishPath = queue[0]!.stockfishPath
    const worker = getOrCreateWorker(stockfishPath)
    if (!worker) break

    const task = queue.shift()!
    worker.busy = true
    worker.currentTask = task

    worker.proc.stdin!.write('ucinewgame\n')
    if (task.elo) {
      console.log(`[Stockfish] [${task.type}] Setting ELO=${task.elo}`)
      worker.proc.stdin!.write('setoption name UCI_LimitStrength value true\n')
      worker.proc.stdin!.write(`setoption name UCI_Elo value ${task.elo}\n`)
    } else {
      console.log(`[Stockfish] [${task.type}] No ELO limit (full strength)`)
      worker.proc.stdin!.write('setoption name UCI_LimitStrength value false\n')
    }
    worker.proc.stdin!.write('isready\n')
    worker.proc.stdin!.write(task.positionCmd + '\n')
    worker.proc.stdin!.write(`go movetime ${task.movetime}\n`)
  }
}

export function submitToPool(
  stockfishPath: string,
  positionCmd: string,
  movetime: number,
  elo?: number
): Promise<{ bestmove: string; ponder: string | null; depth: number; eval: { type: 'cp' | 'mate'; value: number } | null }> {
  return new Promise((resolve, reject) => {
    if (queue.length >= QUEUE_MAX) {
      reject(new Error('Engine queue is full'))
      return
    }

    const timeout = setTimeout(() => {
      const idx = queue.findIndex(t => (t as EngineTaskWithMeta).resolve === resolve)
      if (idx > -1) {
        queue.splice(idx, 1)
        reject(new Error('Stockfish timeout (queued)'))
      }
    }, movetime + 10000)

    const task: EngineTaskWithMeta = {
      stockfishPath,
      positionCmd,
      movetime,
      elo,
      type: 'bestmove',
      resolve: resolve as (result: unknown) => void,
      reject,
      timeout,
      evalScore: null,
      depth: 0,
      pv: [],
    }

    queue.push(task)
    processQueue()
  })
}

export function submitEvalToPool(
  stockfishPath: string,
  positionCmd: string,
  movetime: number
): Promise<{ eval: { type: 'cp' | 'mate'; value: number } | null }> {
  return new Promise((resolve, reject) => {
    if (queue.length >= QUEUE_MAX) {
      reject(new Error('Engine queue is full'))
      return
    }

    const timeout = setTimeout(() => {
      const idx = queue.findIndex(t => (t as EngineTaskWithMeta).resolve === resolve)
      if (idx > -1) {
        queue.splice(idx, 1)
        reject(new Error('Stockfish eval timeout (queued)'))
      }
    }, movetime + 10000)

    const task: EngineTaskWithMeta = {
      stockfishPath,
      positionCmd,
      movetime,
      type: 'eval',
      resolve: resolve as (result: unknown) => void,
      reject,
      timeout,
      evalScore: null,
      depth: 0,
      pv: [],
    }

    queue.push(task)
    processQueue()
  })
}

export function submitAnalysisToPool(
  stockfishPath: string,
  positionCmd: string,
  movetime: number
): Promise<{ eval: { type: 'cp' | 'mate'; value: number } | null; bestmove: string; depth: number; pv: string[] }> {
  return new Promise((resolve, reject) => {
    if (queue.length >= QUEUE_MAX) {
      reject(new Error('Engine queue is full'))
      return
    }

    const timeout = setTimeout(() => {
      const idx = queue.findIndex(t => (t as EngineTaskWithMeta).resolve === resolve)
      if (idx > -1) {
        queue.splice(idx, 1)
        reject(new Error('Stockfish analysis timeout (queued)'))
      }
    }, movetime + 10000)

    const task: EngineTaskWithMeta = {
      stockfishPath,
      positionCmd,
      movetime,
      type: 'analysis',
      resolve: resolve as (result: unknown) => void,
      reject,
      timeout,
      evalScore: null,
      depth: 0,
      pv: [],
    }

    queue.push(task)
    processQueue()
  })
}
