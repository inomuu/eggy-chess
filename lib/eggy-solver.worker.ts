// Runs the solver off the main thread so the board stays responsive while it thinks.
import { createSolver, type Result, type Side } from "./eggy-solver"
import book from "./eggy-book.json"

const solver = createSolver({ book: book as Record<string, Result> })

export type AnalyzeRequest = { id: number; board: number[]; pieces: number[]; side: Side }
export type AnalyzeResponse = {
  id: number
  /** Perfect-play result of the position with `side` to move. */
  position: Result
  moves: { size: 1 | 2 | 3; cell: number; result: Result }[]
}

self.onmessage = (e: MessageEvent<AnalyzeRequest>) => {
  const { id, board, pieces, side } = e.data
  const moves = solver.rateMoves(board, pieces, side).map(({ move, result }) => ({ ...move, result }))
  const position = solver.solve(board, pieces, side)
  const res: AnalyzeResponse = { id, position, moves }
  ;(self as unknown as Worker).postMessage(res)
}
