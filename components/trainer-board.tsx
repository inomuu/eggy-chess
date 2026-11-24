"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import GamePiece from "./game-piece"
import {
  START_BOARD, START_PIECES, legalMoves, outcome, owner, play, posKey, sizeOf,
  type Result, type Side,
} from "@/lib/eggy-solver"
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/eggy-solver.worker"

type Snapshot = { board: number[]; pieces: number[]; side: Side }
type Feedback = { tone: "good" | "bad" | "info"; text: string } | null

const SIZE_NAME = ["", "SM", "MD", "LG"] as const
const SIZE_KEY = ["small", "small", "medium", "large"] as const // index 0 unused
const CELL_NAME = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"]
const PLAYER = (s: Side) => (s === 1 ? "player1" : "player2") as "player1" | "player2"
const moveName = (size: number, cell: number) => `${SIZE_NAME[size]} ${CELL_NAME[cell]}`

const label = (s: Side) => (s === 1 ? "P1" : "P2")

const HINT = {
  win:  { bg: "#6FDC8E", border: "#00B894", shadow: "#007A5E", tag: "WIN" },
  draw: { bg: "#FFEAA7", border: "#FDCB6E", shadow: "#D4A000", tag: "DRAW" },
  lose: { bg: "#FFB3B3", border: "#E17055", shadow: "#B33939", tag: "LOSE" },
}
const rate = (r: Result, mover: Side) => (r === mover ? "win" : r === 0 ? "draw" : "lose")

/** The non-winning move with the highest trap chance (null if there is none). */
function bestTrap<M extends { trap: number | null }>(moves: M[]): (M & { trap: number }) | null {
  let best: (M & { trap: number }) | null = null
  for (const m of moves) if (m.trap !== null && (!best || m.trap > best.trap)) best = m as M & { trap: number }
  return best
}

const fresh = (): Snapshot => ({ board: [...START_BOARD], pieces: [...START_PIECES], side: 1 })

export default function TrainerBoard() {
  const [pos, setPos] = useState<Snapshot>(fresh)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [hints, setHints] = useState(true)
  const [selected, setSelected] = useState<1 | 2 | 3 | null>(null)
  const [analysis, setAnalysis] = useState<(AnalyzeResponse & { key: string }) | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)

  const worker = useRef<Worker | null>(null)
  const reqId = useRef(0)
  const keyById = useRef(new Map<number, string>())

  useEffect(() => {
    const w = new Worker(new URL("../lib/eggy-solver.worker.ts", import.meta.url))
    w.onmessage = (e: MessageEvent<AnalyzeResponse>) => {
      if (e.data.id !== reqId.current) return // stale answer for an earlier position
      setAnalysis({ ...e.data, key: keyById.current.get(e.data.id)! })
    }
    worker.current = w
    return () => w.terminate()
  }, [])

  const key = posKey(pos.board, pos.pieces, pos.side)
  const over = useMemo(() => outcome(pos.board, pos.pieces), [pos])
  const ready = analysis?.key === key ? analysis : null
  const humanTurn = !over // you play both sides

  // Ask the solver about every new position.
  useEffect(() => {
    if (over || !worker.current) return
    const id = ++reqId.current
    keyById.current.set(id, key)
    const req: AnalyzeRequest = { id, board: pos.board, pieces: pos.pieces, side: pos.side }
    worker.current.postMessage(req)
  }, [key, over, pos])

  const commit = useCallback((size: 1 | 2 | 3, cell: number) => {
    setHistory(h => [...h, pos])
    const [board, pieces] = play(pos.board, pos.pieces, pos.side, { size, cell })
    let side: Side = pos.side === 1 ? 2 : 1
    // A side with eggs left but no legal cell skips its turn.
    if (!outcome(board, pieces) && !legalMoves(board, pieces, side).length) side = pos.side
    setPos({ board, pieces, side })
    setSelected(null)
  }, [pos])

  const clickCell = (cell: number) => {
    if (!humanTurn || !selected) return
    const legal = legalMoves(pos.board, pos.pieces, pos.side).some(m => m.size === selected && m.cell === cell)
    if (!legal) return
    if (ready) {
      const mover = pos.side, me = label(mover), other = label(mover === 1 ? 2 : 1)
      const chosen = ready.moves.find(m => m.size === selected && m.cell === cell)!.result
      const wins = ready.moves.filter(m => m.result === mover)
      const [nb, np] = play(pos.board, pos.pieces, mover, { size: selected, cell })
      const end = outcome(nb, np)
      if (end) setFeedback(end.result === mover
        ? { tone: "good", text: `🏆 ${me} wins!` }
        : { tone: end.result === 0 ? "info" : "bad", text: end.result === 0 ? "Game over: draw." : `Game over: ${other} wins.` })
      else if (ready.position === mover && chosen === mover) setFeedback({ tone: "good", text: `✓ Good move. ${me} still has a forced win.` })
      else if (ready.position === mover) setFeedback({
        tone: "bad",
        text: `✗ That throws away the win. Winning moves were: ${wins.slice(0, 4).map(m => moveName(m.size, m.cell)).join(", ")}${wins.length > 4 ? ` (+${wins.length - 4} more)` : ""}.`,
      })
      else if (ready.position === 0 && chosen === 0) setFeedback({ tone: "good", text: `✓ ${me} is holding the draw.` })
      else if (ready.position === 0) setFeedback({ tone: "bad", text: `✗ That loses. ${other} can now force a win.` })
      else {
        // Lost position: judge the move by how likely the opponent is to slip next turn.
        const mine = ready.moves.find(m => m.size === selected && m.cell === cell)!.trap ?? 0
        const best = bestTrap(ready.moves)
        if (!best || best.trap === 0) setFeedback({ tone: "info", text: `${other} can force a win whatever ${me} plays, and no move sets a trap here.` })
        else if (mine >= best.trap - 0.001) setFeedback({ tone: "good", text: `✓ Best move! It gives ${other} the most chances to slip.` })
        else setFeedback({ tone: "bad", text: `✗ Not the best. ${moveName(best.size, best.cell)} would make ${other} slip more often.` })
      }
    }
    commit(selected, cell)
  }

  const undo = () => {
    if (!history.length) return
    const h = history.slice(), prev = h.pop()!
    setHistory(h); setPos(prev); setSelected(null); setFeedback(null)
  }
  const reset = () => { setPos(fresh()); setHistory([]); setSelected(null); setFeedback(null) }
  // Hint data for the side to move.
  const moverPieces = pos.pieces.slice((pos.side - 1) * 3, pos.side * 3)
  // In a lost position every cell is "lose", so mark the best trap (the move the other side
  // is most likely to answer wrongly) as ★ BEST.
  const lost = !!ready && ready.position !== pos.side && ready.position !== 0
  const topTrap = lost ? bestTrap(ready!.moves)?.trap ?? 0 : 0
  const isBest = (m: { trap: number | null }) => lost && topTrap > 0 && m.trap !== null && m.trap >= topTrap - 0.001
  const hintFor = (cell: number) => {
    if (!hints || !humanTurn || !ready || !selected) return null
    const m = ready.moves.find(x => x.size === selected && x.cell === cell)
    if (!m) return null
    const base = HINT[rate(m.result, pos.side)]
    return isBest(m) ? { ...base, tag: "★ BEST", star: true } : { ...base, star: false }
  }
  const winsBySize = (s: number) => ready?.moves.filter(m => m.size === s && m.result === pos.side).length ?? 0
  const bestInSize = (s: number) => !!ready?.moves.some(m => m.size === s && isBest(m))
  const legalForSelected = new Set(selected ? legalMoves(pos.board, pos.pieces, pos.side).filter(m => m.size === selected).map(m => m.cell) : [])

  const moverLabel = pos.side === 1 ? "P1" : "P2"
  const status = over
    ? over.result === 0 ? "DRAW" : `${over.result === 1 ? "PLAYER 1" : "PLAYER 2"} WINS${over.line ? " — 3 IN A ROW" : " — MOST CELLS"}`
    : !ready ? "SOLVING…" : selected ? "▶ PLACE YOUR EGG" : `▶ ${moverLabel} — SELECT AN EGG`
  const evalText = !ready || over ? null
    : ready.position === 0 ? "BOTH SIDES CAN FORCE A DRAW"
    : `${ready.position === 1 ? "P1" : "P2"} CAN FORCE A WIN${lost && humanTurn && topTrap > 0 ? " · TRY ★ BEST" : ""}`
  const evalColor = ready?.position === 2 ? "#FF6584" : ready?.position === 1 ? "#4D96FF" : "#FDCB6E"

  return (
    <div className="font-pixel border-[4px] rounded-2xl overflow-hidden"
      style={{ borderColor: "#2D3436", background: "#FFFFFF", boxShadow: "8px 8px 0 #2D3436" }}>

      {/* Intro */}
      <div className="px-3 py-2 text-[6px] border-b-[3px]" style={{ borderColor: "#E8E8E8", background: "#F5F6FA", color: "#636E72", lineHeight: 1.8 }}>
        You play both sides. Hints show the best move for <span style={{ color: "#6C5CE7" }}>whoever&apos;s turn it is</span>.
      </div>

      <div className="flex flex-col sm:flex-row items-stretch border-b-[3px]" style={{ borderColor: "#E8E8E8" }}>
        {/* Board */}
        <div className="p-3 border-b-[3px] sm:border-b-0 sm:border-r-[3px] flex flex-col gap-2" style={{ background: "#A0D8C8", borderColor: "#E8E8E8" }}>
          <div className="grid grid-cols-[repeat(3,auto)] justify-center gap-[7px]">
            {pos.board.map((c, i) => {
              const hint = hintFor(i)
              const isWin = over?.line?.includes(i)
              const legal = humanTurn && legalForSelected.has(i)
              const dim = humanTurn && !!selected && !legal
              return (
                <div key={i} onClick={() => clickCell(i)}
                  className={`relative w-[25vw] h-[25vw] max-w-[84px] max-h-[84px] sm:w-[84px] sm:h-[84px] flex items-center justify-center select-none
                    ${isWin ? "cartoon-cell-win" : legal && !hint ? "cartoon-cell-valid" : "cartoon-cell"} ${dim ? "opacity-40" : ""}`}
                  style={hint ? (hint.star
                    ? { background: "#FFEAA7", borderColor: "#E1A100", boxShadow: "4px 4px 0 #B07D00", cursor: "pointer" }
                    : { background: hint.bg, borderColor: hint.border, boxShadow: `4px 4px 0 ${hint.shadow}`, cursor: "pointer" }) : undefined}>
                  {c ? <GamePiece player={PLAYER(owner(c) as Side)} size={SIZE_KEY[sizeOf(c)]} /> : null}
                  {hint && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[6px] px-1 rounded whitespace-nowrap"
                      style={{ background: "white", color: hint.star ? "#8A6200" : hint.shadow, border: `1px solid ${hint.star ? "#E1A100" : hint.border}` }}>
                      {hint.tag}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {evalText && hints && (
            <div className="text-center text-[6px] py-1 rounded-lg border-[2px]"
              style={{ borderColor: "#2D3436", background: "white", color: evalColor }}>
              ★ {evalText}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex flex-col w-full sm:w-[200px]" style={{ background: "#FFFAEB" }}>
          <div className="flex items-center justify-center py-2 px-2 text-[7px] border-b-[2px] shrink-0"
            style={{ background: over ? "#6C5CE7" : pos.side === 1 ? "#4D96FF" : "#FF6584", borderColor: "#2D3436", color: "white", textShadow: "1px 1px 0 rgba(0,0,0,0.3)" }}>
            🥚 {over ? "GAME OVER" : `${moverLabel}'S TURN`} 🥚
          </div>
          <div className="flex-1 flex flex-row sm:flex-col justify-around px-2 py-2 sm:py-1">
            {([1, 2, 3] as const).map(s => {
              const count = moverPieces[s - 1], empty = count <= 0, wins = winsBySize(s)
              return (
                <div key={s} className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                  <button onClick={() => humanTurn && setSelected(selected === s ? null : s)} disabled={empty || !humanTurn}
                    className={`cartoon-piece-btn ${selected === s ? "selected" : ""}`} style={{ width: 72, height: 72 }}>
                    <GamePiece player={PLAYER(pos.side)} size={SIZE_KEY[s]} />
                  </button>
                  <div className="flex flex-col items-center sm:items-start gap-1 sm:w-[60px]">
                    <span className="text-[7px]" style={{ color: empty ? "#B2BEC3" : "#2D3436" }}>×{count}</span>
                    {hints && humanTurn && ready && !empty && (
                      <span className="text-[5px]" style={{ color: wins ? "#00B894" : bestInSize(s) ? "#B07D00" : "#B2BEC3", lineHeight: 1.6 }}>
                        {wins ? `${wins} WIN${wins > 1 ? "S" : ""}` : bestInSize(s) ? "★ BEST" : "NO WINS"}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <label className="flex items-center gap-2 px-3 py-2 border-t-[2px] text-[6px] cursor-pointer" style={{ borderColor: "#E8E8E8", color: "#2D3436" }}>
            <input type="checkbox" checked={hints} onChange={e => setHints(e.target.checked)} />
            SHOW HINTS
          </label>
        </div>
      </div>

      {/* Feedback */}
      <div className="px-3 py-2 text-[6px] border-b-[3px] min-h-[34px] flex items-center"
        style={{
          borderColor: "#E8E8E8", lineHeight: 1.9,
          background: feedback?.tone === "good" ? "#E3F9EC" : feedback?.tone === "bad" ? "#FFE8E8" : "#FFFFFF",
          color: feedback?.tone === "good" ? "#007A5E" : feedback?.tone === "bad" ? "#B33939" : "#636E72",
        }}>
        {feedback?.text ?? (lost && hints && humanTurn
          ? `${moverLabel} can't force a win here. Pick the ★ BEST cell: it gives the other side the most ways to go wrong.`
          : "Hints colour each cell for the egg you pick: green wins, red loses.")}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-3 py-2" style={{ background: "#2D3436" }}>
        <span className="text-[6px]" style={{ color: over ? (over.result === 2 ? "#FF9FB3" : over.result === 1 ? "#9CC4FF" : "#FFEAA7") : "#FFEAA7" }}>
          {over ? "★ " : ""}{status}
        </span>
        <div className="flex gap-2">
          <button onClick={undo} disabled={!history.length} className="cartoon-btn" style={{ opacity: history.length ? 1 : 0.5 }}>↶ UNDO</button>
          <button onClick={reset} className="cartoon-btn">↺ NEW</button>
        </div>
      </div>
    </div>
  )
}
