// Perfect-play solver for Eggy Chess.
//
// Cell encoding: 0 = empty, 1..3 = Player 1 egg (S/M/L), 4..6 = Player 2 egg (S/M/L).
// Pieces left: [p1S, p1M, p1L, p2S, p2M, p2L].
// Result: 1 = Player 1 wins, 2 = Player 2 wins, 0 = draw (with perfect play from both).
//
// The real game has no rule for a player with eggs left but no legal cell. The solver
// treats that as a skipped turn, and counts cells if neither player can move. (Ending the
// game and counting cells instead gives the same result for every opening.)

export type Side = 1 | 2
export type Result = 0 | 1 | 2
export type Move = { size: 1 | 2 | 3; cell: number }

export const START_BOARD: readonly number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0]
export const START_PIECES: readonly number[] = [3, 3, 2, 3, 3, 2]

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]]

export const owner = (c: number): 0 | Side => (c === 0 ? 0 : c <= 3 ? 1 : 2)
export const sizeOf = (c: number) => (c > 3 ? c - 3 : c)

export function lineWin(b: readonly number[]): { winner: Side; line: number[] } | null {
  for (const line of LINES) {
    const o = owner(b[line[0]])
    if (o && o === owner(b[line[1]]) && o === owner(b[line[2]])) return { winner: o, line }
  }
  return null
}

export function legalMoves(b: readonly number[], pc: readonly number[], p: Side): Move[] {
  const out: Move[] = []
  for (let s = 1 as 1 | 2 | 3; s <= 3; s = (s + 1) as 1 | 2 | 3) {
    if (!pc[(p - 1) * 3 + s - 1]) continue
    for (let i = 0; i < 9; i++) {
      const c = b[i]
      if (c === 0 || (owner(c) !== p && s > sizeOf(c))) out.push({ size: s, cell: i })
    }
  }
  return out
}

export function cellCount(b: readonly number[]): Result {
  let a = 0, d = 0
  for (const c of b) { const o = owner(c); if (o === 1) a++; else if (o === 2) d++ }
  return a > d ? 1 : d > a ? 2 : 0
}

export function play(b: readonly number[], pc: readonly number[], p: Side, m: Move): [number[], number[]] {
  const nb = b.slice(); nb[m.cell] = (p - 1) * 3 + m.size
  const np = pc.slice(); np[(p - 1) * 3 + m.size - 1]--
  return [nb, np]
}

/** Whether the game is over, and who won. `null` while play continues. */
export function outcome(b: readonly number[], pc: readonly number[]): { result: Result; line: number[] | null } | null {
  const w = lineWin(b)
  if (w) return { result: w.winner, line: w.line }
  if (pc.every(v => v === 0)) return { result: cellCount(b), line: null }
  if (!legalMoves(b, pc, 1).length && !legalMoves(b, pc, 2).length) return { result: cellCount(b), line: null }
  return null
}

export const posKey = (b: readonly number[], pc: readonly number[], p: Side) => b.join('') + pc.join('') + p

// The 8 rotations/reflections of the grid, used to share results between mirrored positions.
const SYMS: number[][] = (() => {
  const rot = (i: number) => (i % 3) * 3 + (2 - Math.floor(i / 3))
  const flip = (i: number) => Math.floor(i / 3) * 3 + (2 - (i % 3))
  const out: number[][] = []
  let base = [0, 1, 2, 3, 4, 5, 6, 7, 8]
  for (let k = 0; k < 4; k++) { out.push(base.slice()); out.push(base.map(flip)); base = base.map(rot) }
  return out
})()
const RADIX = [4, 4, 3, 4, 4, 3]

export function createSolver(opts: { bits?: number; book?: Record<string, Result> } = {}) {
  const bits = opts.bits ?? 22
  const size = 1 << bits, mask = size - 1, limit = Math.floor(size * 0.8)
  let K = new Float64Array(size), V = new Uint8Array(size), used = 0
  const book = opts.book

  const key = (b: readonly number[], pc: readonly number[], p: Side) => {
    let best = Infinity
    for (const m of SYMS) { let v = 0; for (let i = 0; i < 9; i++) v = v * 7 + b[m[i]]; if (v < best) best = v }
    let pk = 0; for (let j = 0; j < 6; j++) pk = pk * RADIX[j] + pc[j]
    return (best * 2304 + pk) * 2 + p // never 0, so 0 marks an empty slot
  }
  const slot = (k: number) => {
    const lo = k % 4294967296, hi = Math.floor(k / 4294967296)
    return (Math.imul(lo ^ Math.imul(hi, 0x9e3779b1), 0x85ebca6b) >>> 0) & mask
  }
  const get = (k: number) => { let i = slot(k); while (K[i] !== 0) { if (K[i] === k) return V[i]; i = (i + 1) & mask } return 255 }
  const set = (k: number, v: number) => {
    if (used >= limit) { K = new Float64Array(size); V = new Uint8Array(size); used = 0 } // cache full: start over
    let i = slot(k); while (K[i] !== 0 && K[i] !== k) i = (i + 1) & mask
    if (K[i] === 0) used++
    K[i] = k; V[i] = v
  }

  function solve(b: readonly number[], pc: readonly number[], p: Side): Result {
    if (book && pc[0] + pc[1] + pc[2] + pc[3] + pc[4] + pc[5] >= 14) {
      const hit = book[posKey(b, pc, p)]
      if (hit !== undefined) return hit
    }
    const k = key(b, pc, p), m = get(k)
    if (m !== 255) return m as Result
    let r: Result
    const w = lineWin(b)
    if (w) r = w.winner
    else if (pc.every(v => v === 0)) r = cellCount(b)
    else {
      const ms = legalMoves(b, pc, p), q: Side = p === 1 ? 2 : 1
      if (!ms.length) r = legalMoves(b, pc, q).length ? solve(b, pc, q) : cellCount(b)
      else {
        let draw = false
        r = q
        for (const mv of ms) {
          const [nb, np] = play(b, pc, p, mv)
          const v = solve(nb, np, q)
          if (v === p) { r = p; break }
          if (v === 0) draw = true
        }
        if (r !== p && draw) r = 0
      }
    }
    set(k, r)
    return r
  }

  /** Result of every legal move for the side to move (result is for the position after the move). */
  function rateMoves(b: readonly number[], pc: readonly number[], p: Side): { move: Move; result: Result }[] {
    const q: Side = p === 1 ? 2 : 1
    return legalMoves(b, pc, p).map(move => {
      const [nb, np] = play(b, pc, p, move)
      return { move, result: solve(nb, np, q) }
    })
  }

  return { solve, rateMoves }
}
