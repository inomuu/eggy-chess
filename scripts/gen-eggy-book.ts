// @ts-nocheck
// Precomputes data for the first two moves, which are the slowest positions to analyse:
//  - lib/eggy-book.json:  perfect-play result of every position in the first two moves
//  - lib/eggy-traps.json: trap chance of every possible first reply by Player 2
//    (the share of Player 1's next moves that would hand Player 2 a forced win)
// Run with: node scripts/gen-eggy-book.ts   (Node 23.6+ runs TypeScript directly)
import { writeFileSync } from 'node:fs'
import { createSolver, legalMoves, play, posKey, START_BOARD, START_PIECES } from '../lib/eggy-solver.ts'

const { solve, trapChance } = createSolver({ bits: 26 })
const book: Record<string, number> = {}
const traps: Record<string, number> = {}
const b0 = START_BOARD, pc0 = START_PIECES

book[posKey(b0, pc0, 1)] = solve(b0, pc0, 1)
for (const m1 of legalMoves(b0, pc0, 1)) {
  const [b1, pc1] = play(b0, pc0, 1, m1)
  book[posKey(b1, pc1, 2)] = solve(b1, pc1, 2)
  for (const m2 of legalMoves(b1, pc1, 2)) {
    const [b2, pc2] = play(b1, pc1, 2, m2)
    const r = solve(b2, pc2, 1)
    book[posKey(b2, pc2, 1)] = r
    if (r !== 2) traps[posKey(b2, pc2, 1)] = Math.round(trapChance(b2, pc2, 2) * 1000) / 1000
  }
}
writeFileSync(new URL('../lib/eggy-book.json', import.meta.url), JSON.stringify(book))
writeFileSync(new URL('../lib/eggy-traps.json', import.meta.url), JSON.stringify(traps))
console.log('positions:', Object.keys(book).length, 'traps:', Object.keys(traps).length, 'start result:', book[posKey(b0, pc0, 1)])
