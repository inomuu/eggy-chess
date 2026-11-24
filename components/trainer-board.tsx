"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import GamePiece from "./game-piece"
import {
  START_BOARD, START_PIECES, legalMoves, outcome, owner, play, posKey, sizeOf,
  type Result, type Side,
} from "@/lib/eggy-solver"
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/eggy-solver.worker"

type Mode = "beatable" | "perfect" | "random" | "manual"
type Snapshot = { board: number[]; pieces: number[]; side: Side }
type Feedback = { tone: "good" | "bad" | "info"; text: string } | null

const SIZE_NAME = ["", "SM", "MD", "LG"] as const
const SIZE_KEY = ["small", "small", "medium", "large"] as const // index 0 unused
const CELL_NAME = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"]
const PLAYER = (s: Side) => (s === 1 ? "player1" : "player2") as "player1" | "player2"
const moveName = (size: number, cell: number) => `${SIZE_NAME[size]} ${CELL_NAME[cell]}`

// Modes offered (and their help text) depend on which side you train.
const MODES: Record<Side, { id: Mode; label: string; help: string }[]> = {
  1: [
    { id: "perfect", label: "PERFECT", help: "P2 never makes a mistake. P1 can always win, but only with exact moves. Find them!" },
    { id: "random", label: "RANDOM", help: "P2 plays random moves. Practise turning your forced win into a real one." },
    { id: "manual", label: "2 PLAYER", help: "You play both sides. Explore any line you like." },
  ],
  2: [
    { id: "beatable", label: "BEATABLE", help: "P1 opens with a move you can beat, then plays perfectly. Find the win!" },
    { id: "perfect", label: "PERFECT", help: "P1 never makes a mistake. You can't win, but you can practise holding on." },
    { id: "random", label: "RANDOM", help: "P1 plays random moves. Watch for chances to grab a forced win." },
    { id: "manual", label: "2 PLAYER", help: "You play both sides. Explore any line you like." },
  ],
}
const label = (s: Side) => (s === 1 ? "P1" : "P2")

const HINT = {
  win:  { bg: "#6FDC8E", border: "#00B894", shadow: "#007A5E", tag: "WIN" },
  draw: { bg: "#FFEAA7", border: "#FDCB6E", shadow: "#D4A000", tag: "DRAW" },
  lose: { bg: "#FFB3B3", border: "#E17055", shadow: "#B33939", tag: "LOSE" },
}
const rate = (r: Result, mover: Side) => (r === mover ? "win" : r === 0 ? "draw" : "lose")

const fresh = (): Snapshot => ({ board: [...START_BOARD], pieces: [...START_PIECES], side: 1 })
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)]

export default function TrainerBoard() {
  const [pos, setPos] = useState<Snapshot>(fresh)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [you, setYou] = useState<Side>(2)
  const [mode, setMode] = useState<Mode>("beatable")
  const cpu: Side = you === 1 ? 2 : 1
  const [hints, setHints] = useState(true)
  const [selected, setSelected] = useState<1 | 2 | 3 | null>(null)
  const [analysis, setAnalysis] = useState<(AnalyzeResponse & { key: string }) | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [tally, setTally] = useState({ wins: 0, losses: 0 })

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
  const computerTurn = mode !== "manual" && pos.side === cpu && !over
  const humanTurn = !over && !computerTurn

  // Ask the solver about every new position.
  useEffect(() => {
    if (over || !worker.current) return
    const id = ++reqId.current
    keyById.current.set(id, key)
    const req: AnalyzeRequest = { id, board: pos.board, pieces: pos.pieces, side: pos.side }
    worker.current.postMessage(req)
  }, [key, over, pos])

  // Count finished games once.
  const counted = useRef<string | null>(null)
  useEffect(() => {
    if (!over || mode === "manual" || counted.current === key) return
    counted.current = key
    if (over.result === you) setTally(t => ({ ...t, wins: t.wins + 1 }))
    else if (over.result === cpu) setTally(t => ({ ...t, losses: t.losses + 1 }))
  }, [over, key, mode, you, cpu])

  const commit = useCallback((size: 1 | 2 | 3, cell: number) => {
    setHistory(h => [...h, pos])
    const [board, pieces] = play(pos.board, pos.pieces, pos.side, { size, cell })
    let side: Side = pos.side === 1 ? 2 : 1
    // A side with eggs left but no legal cell skips its turn.
    if (!outcome(board, pieces) && !legalMoves(board, pieces, side).length) side = pos.side
    setPos({ board, pieces, side })
    setSelected(null)
  }, [pos])

  // Computer plays the side you aren't training.
  useEffect(() => {
    if (!computerTurn || !ready) return
    const t = setTimeout(() => {
      const { moves } = ready
      let choice
      const empty = pos.board.every(c => c === 0)
      if (mode === "random") choice = pick(moves)
      else if (mode === "beatable" && empty) choice = pick(moves.filter(m => m.result === you))
      else {
        const best = moves.some(m => m.result === cpu) ? cpu : moves.some(m => m.result === 0) ? 0 : you
        choice = pick(moves.filter(m => m.result === best))
      }
      const end = outcome(...play(pos.board, pos.pieces, cpu, choice))
      if (end) setFeedback(end.result === cpu
        ? { tone: "bad", text: `${label(cpu)} wins. Hit UNDO to step back and look for a better move.` }
        : { tone: "info", text: end.result === 0 ? "Game over: draw." : `🏆 ${label(you)} wins!` })
      else if (empty && mode === "beatable") setFeedback({ tone: "info", text: `P1 opened ${moveName(choice.size, choice.cell)}. You can force a win from here. Find it!` })
      commit(choice.size, choice.cell)
    }, 450)
    return () => clearTimeout(t)
  }, [computerTurn, ready, mode, pos, commit, you, cpu])

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
        ? { tone: "good", text: `🏆 ${me} wins!${mode !== "manual" ? " You found the forced win." : ""}` }
        : { tone: end.result === 0 ? "info" : "bad", text: end.result === 0 ? "Game over: draw." : `Game over: ${other} wins.` })
      else if (ready.position === mover && chosen === mover) setFeedback({ tone: "good", text: `✓ Good move. ${me} still has a forced win.` })
      else if (ready.position === mover) setFeedback({
        tone: "bad",
        text: `✗ That throws away the win. Winning moves were: ${wins.slice(0, 4).map(m => moveName(m.size, m.cell)).join(", ")}${wins.length > 4 ? ` (+${wins.length - 4} more)` : ""}.`,
      })
      else if (ready.position === 0 && chosen === 0) setFeedback({ tone: "good", text: "✓ You're holding the draw." })
      else if (ready.position === 0) setFeedback({ tone: "bad", text: `✗ That loses. ${other} can now force a win.` })
      else setFeedback({ tone: "info", text: `${other} can force a win here whatever you play. Make it hard for them.` })
    }
    commit(selected, cell)
  }

  const undo = () => {
    if (!history.length) return
    // In computer modes, step back to the last position where it was your turn.
    let h = history.slice(), prev = h.pop()!
    while (mode !== "manual" && prev.side === cpu && h.length) prev = h.pop()!
    if (mode !== "manual" && prev.side === cpu) { reset(); return }
    setHistory(h); setPos(prev); setSelected(null); setFeedback(null)
  }
  const reset = () => { setPos(fresh()); setHistory([]); setSelected(null); setFeedback(null); counted.current = null }
  const changeMode = (m: Mode) => { setMode(m); reset() }
  const changeSide = (s: Side) => {
    if (s === you) return
    setYou(s)
    if (!MODES[s].some(m => m.id === mode)) setMode("perfect") // "beatable" only exists for P2
    setTally({ wins: 0, losses: 0 })
    reset()
  }

  // Hint data for the side to move.
  const moverPieces = pos.pieces.slice((pos.side - 1) * 3, pos.side * 3)
  const hintFor = (cell: number) => {
    if (!hints || !humanTurn || !ready || !selected) return null
    const m = ready.moves.find(x => x.size === selected && x.cell === cell)
    return m ? HINT[rate(m.result, pos.side)] : null
  }
  const winsBySize = (s: number) => ready?.moves.filter(m => m.size === s && m.result === pos.side).length ?? 0
  const legalForSelected = new Set(selected ? legalMoves(pos.board, pos.pieces, pos.side).filter(m => m.size === selected).map(m => m.cell) : [])

  const moverLabel = pos.side === 1 ? "P1" : "P2"
  const status = over
    ? over.result === 0 ? "DRAW" : `${over.result === 1 ? "PLAYER 1" : "PLAYER 2"} WINS${over.line ? " — 3 IN A ROW" : " — MOST CELLS"}`
    : computerTurn ? `${label(cpu)} IS THINKING…` : !ready ? "SOLVING…" : selected ? "▶ PLACE YOUR EGG" : `▶ ${mode === "manual" ? moverLabel + " — " : ""}SELECT AN EGG`
  const evalText = !ready || over ? null
    : ready.position === 0 ? "BOTH SIDES CAN FORCE A DRAW"
    : `${ready.position === 1 ? "P1" : "P2"} CAN FORCE A WIN`
  const evalColor = ready?.position === 2 ? "#FF6584" : ready?.position === 1 ? "#4D96FF" : "#FDCB6E"

  return (
    <div className="font-pixel border-[4px] rounded-2xl overflow-hidden"
      style={{ borderColor: "#2D3436", background: "#FFFFFF", boxShadow: "8px 8px 0 #2D3436" }}>

      {/* Side picker */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b-[3px]" style={{ borderColor: "#E8E8E8", background: "#F5F6FA" }}>
        <span className="text-[6px] mr-1" style={{ color: "#636E72" }}>YOU PLAY:</span>
        {([1, 2] as const).map(s => (
          <button key={s} onClick={() => changeSide(s)}
            className="text-[6px] px-2 py-1.5 rounded-lg border-[2px] flex items-center gap-1"
            style={{
              borderColor: "#2D3436",
              background: you === s ? (s === 1 ? "#4D96FF" : "#FF6584") : "white",
              color: you === s ? "white" : "#2D3436",
              boxShadow: you === s ? "none" : "2px 2px 0 #2D3436",
            }}>
            {s === 1 ? "P1 · BLUE · FIRST" : "P2 · PINK · SECOND"}
          </button>
        ))}
        <span className="flex-1" />
        <span className="text-[6px]" style={{ color: "#636E72" }}>
          YOU <span style={{ color: "#00B894" }}>{tally.wins}W</span> · <span style={{ color: "#E17055" }}>{tally.losses}L</span>
        </span>
      </div>

      {/* Mode picker */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b-[3px]" style={{ borderColor: "#E8E8E8", background: "#F5F6FA" }}>
        <span className="text-[6px] mr-1" style={{ color: "#636E72" }}>{label(cpu)} PLAYS:</span>
        {MODES[you].map(m => (
          <button key={m.id} onClick={() => changeMode(m.id)} title={m.help}
            className="text-[6px] px-2 py-1.5 rounded-lg border-[2px]"
            style={{
              borderColor: "#2D3436",
              background: mode === m.id ? "#6C5CE7" : "white",
              color: mode === m.id ? "white" : "#2D3436",
              boxShadow: mode === m.id ? "none" : "2px 2px 0 #2D3436",
            }}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="px-3 py-1.5 text-[6px] border-b-[3px]" style={{ borderColor: "#E8E8E8", color: "#636E72", lineHeight: 1.8 }}>
        {MODES[you].find(m => m.id === mode)?.help}
      </div>

      <div className="flex items-stretch border-b-[3px]" style={{ borderColor: "#E8E8E8" }}>
        {/* Board */}
        <div className="p-3 border-r-[3px] flex flex-col gap-2" style={{ background: "#A0D8C8", borderColor: "#E8E8E8" }}>
          <div className="grid grid-cols-3 gap-[7px]">
            {pos.board.map((c, i) => {
              const hint = hintFor(i)
              const isWin = over?.line?.includes(i)
              const legal = humanTurn && legalForSelected.has(i)
              const dim = humanTurn && !!selected && !legal
              return (
                <div key={i} onClick={() => clickCell(i)}
                  className={`relative w-[84px] h-[84px] flex items-center justify-center select-none
                    ${isWin ? "cartoon-cell-win" : legal && !hint ? "cartoon-cell-valid" : "cartoon-cell"} ${dim ? "opacity-40" : ""}`}
                  style={hint ? { background: hint.bg, borderColor: hint.border, boxShadow: `4px 4px 0 ${hint.shadow}`, cursor: "pointer" } : undefined}>
                  {c ? <GamePiece player={PLAYER(owner(c) as Side)} size={SIZE_KEY[sizeOf(c)]} /> : null}
                  {hint && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[6px] px-1 rounded"
                      style={{ background: "white", color: hint.shadow, border: `1px solid ${hint.border}` }}>
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
        <div className="flex flex-col" style={{ width: 200, background: "#FFFAEB" }}>
          <div className="flex items-center justify-center py-2 px-2 text-[7px] border-b-[2px] shrink-0"
            style={{ background: over ? "#6C5CE7" : pos.side === 1 ? "#4D96FF" : "#FF6584", borderColor: "#2D3436", color: "white", textShadow: "1px 1px 0 rgba(0,0,0,0.3)" }}>
            🥚 {over ? "GAME OVER" : `${moverLabel} ${computerTurn ? "(CPU)" : "(YOU)"}`} 🥚
          </div>
          <div className="flex-1 flex flex-col justify-around px-2 py-1">
            {([1, 2, 3] as const).map(s => {
              const count = moverPieces[s - 1], empty = count <= 0, wins = winsBySize(s)
              return (
                <div key={s} className="flex items-center justify-center gap-2">
                  <button onClick={() => humanTurn && setSelected(selected === s ? null : s)} disabled={empty || !humanTurn}
                    className={`cartoon-piece-btn ${selected === s ? "selected" : ""}`} style={{ width: 72, height: 72 }}>
                    <GamePiece player={PLAYER(pos.side)} size={SIZE_KEY[s]} />
                  </button>
                  <div className="flex flex-col gap-1 w-[60px]">
                    <span className="text-[7px]" style={{ color: empty ? "#B2BEC3" : "#2D3436" }}>×{count}</span>
                    {hints && humanTurn && ready && !empty && (
                      <span className="text-[5px]" style={{ color: wins ? "#00B894" : "#B2BEC3" }}>
                        {wins ? `${wins} WIN${wins > 1 ? "S" : ""}` : "NO WINS"}
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
        {feedback?.text ?? "Hints colour each cell for the egg you pick: green wins, red loses."}
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
