// @ts-nocheck
// Precomputes perfect-play results for every position in the first two moves, so the
// trainer can rate Player 2's first reply instantly (it is the slowest position to solve).
// Run with: node scripts/gen-eggy-book.ts   (Node 23.6+ runs TypeScript directly)
import { writeFileSync } from 'node:fs'
import { createSolver, legalMoves, play, posKey, START_BOARD, START_PIECES } from '../lib/eggy-solver.ts'

const { solve } = createSolver({ bits: 26 })
const book: Record<string, number> = {}
const b0 = START_BOARD, pc0 = START_PIECES

book[posKey(b0, pc0, 1)] = solve(b0, pc0, 1)
for (const m1 of legalMoves(b0, pc0, 1)) {
  const [b1, pc1] = play(b0, pc0, 1, m1)
  book[posKey(b1, pc1, 2)] = solve(b1, pc1, 2)
  for (const m2 of legalMoves(b1, pc1, 2)) {
    const [b2, pc2] = play(b1, pc1, 2, m2)
    book[posKey(b2, pc2, 1)] = solve(b2, pc2, 1)
  }
}
writeFileSync(new URL('../lib/eggy-book.json', import.meta.url), JSON.stringify(book))
console.log('positions:', Object.keys(book).length, 'start result:', book[posKey(b0, pc0, 1)])
