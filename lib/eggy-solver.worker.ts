// Runs the solver off the main thread so the board stays responsive while it thinks.
import { createSolver, type Result, type Side } from "./eggy-solver"
import book from "./eggy-book.json"
import traps from "./eggy-traps.json"

const solver = createSolver({ book: book as Record<string, Result>, traps: traps as Record<string, number> })

export type AnalyzeRequest = { id: number; board: number[]; pieces: number[]; side: Side }
export type AnalyzeResponse = {
  id: number
  /** Perfect-play result of the position with `side` to move. */
  position: Result
  /** `trap`: for moves that don't force a win, the share of opponent replies that hand the win back. */
  moves: { size: 1 | 2 | 3; cell: number; result: Result; trap: number | null }[]
}

self.onmessage = (e: MessageEvent<AnalyzeRequest>) => {
  const { id, board, pieces, side } = e.data
  const moves = solver.rateMoves(board, pieces, side).map(({ move, result, trap }) => ({ ...move, result, trap }))
  const position = solver.solve(board, pieces, side)
  const res: AnalyzeResponse = { id, position, moves }
  ;(self as unknown as Worker).postMessage(res)
}
