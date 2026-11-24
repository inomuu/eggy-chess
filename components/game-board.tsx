"use client"

import { useState, useMemo } from "react"
import GamePiece from "./game-piece"
import GameOverModal from "./game-over-modal"

type Player = "player1" | "player2"
type PieceSize = "small" | "medium" | "large"
type Piece = { player: Player; size: PieceSize } | null
type GameState = {
  board: Piece[][]
  currentPlayer: Player
  selectedPieceSize: PieceSize | null
  player1Pieces: Record<PieceSize, number>
  player2Pieces: Record<PieceSize, number>
  gameOver: boolean
  winner: Player | "draw" | null
  winningCells: [number, number][] | null
  notice: string | null
}
type Scores = { player1: number; player2: number }

const SIZE_VALUES: Record<PieceSize, number> = { small: 1, medium: 2, large: 3 }
const SIZES: PieceSize[] = ["small", "medium", "large"]

const init = (): GameState => ({
  board: Array(3).fill(null).map(() => Array(3).fill(null)),
  currentPlayer: "player1",
  selectedPieceSize: null,
  player1Pieces: { small: 3, medium: 3, large: 2 },
  player2Pieces: { small: 3, medium: 3, large: 2 },
  gameOver: false, winner: null, winningCells: null, notice: null,
})

/** Can `player` place any egg they have left (on an empty cell or a smaller enemy egg)? */
function hasMove(board: Piece[][], pieces: Record<PieceSize, number>, player: Player) {
  return SIZES.some(size => pieces[size] > 0 && board.some(row => row.some(cell =>
    !cell || (cell.player !== player && SIZE_VALUES[size] > SIZE_VALUES[cell.size]))))
}

function checkWin(board: Piece[][], p1: Record<PieceSize, number>, p2: Record<PieceSize, number>) {
  const lines: [number, number][][] = [
    [[0,0],[0,1],[0,2]],[[1,0],[1,1],[1,2]],[[2,0],[2,1],[2,2]],
    [[0,0],[1,0],[2,0]],[[0,1],[1,1],[2,1]],[[0,2],[1,2],[2,2]],
    [[0,0],[1,1],[2,2]],[[0,2],[1,1],[2,0]],
  ]
  for (const line of lines) {
    const cs = line.map(([r,c]) => board[r][c])
    if (cs[0]?.player && cs.every(c => c?.player === cs[0]?.player))
      return { winner: cs[0]!.player as Player, gameOver: true, winningCells: line as [number,number][] }
  }
  // Ends on cell count when all eggs are used, or when neither player has a legal move left.
  const allUsed = [...Object.values(p1),...Object.values(p2)].every(v=>v===0)
  if (allUsed || (!hasMove(board, p1, "player1") && !hasMove(board, p2, "player2"))) {
    let a=0,b=0
    for (let r=0;r<3;r++) for (let c=0;c<3;c++) {
      if (board[r][c]?.player==="player1") a++
      if (board[r][c]?.player==="player2") b++
    }
    return { winner:(a>b?"player1":b>a?"player2":"draw") as any, gameOver:true, winningCells:null }
  }
  return { winner: null, gameOver: false, winningCells: null }
}

export default function GameBoard() {
  const [gs, setGs] = useState<GameState>(init)
  const [scores, setScores] = useState<Scores>({ player1: 0, player2: 0 })

  const myPieces = gs.currentPlayer==="player1" ? gs.player1Pieces : gs.player2Pieces
  const opPieces = gs.currentPlayer==="player1" ? gs.player2Pieces : gs.player1Pieces
  const op: Player = gs.currentPlayer==="player1" ? "player2" : "player1"

  const validCells = useMemo(() => {
    if (!gs.selectedPieceSize || gs.gameOver || myPieces[gs.selectedPieceSize]<=0) return new Set<string>()
    const sv = SIZE_VALUES[gs.selectedPieceSize]
    const s = new Set<string>()
    for (let r=0;r<3;r++) for (let c=0;c<3;c++) {
      const cell = gs.board[r][c]
      if (!cell || (cell.player!==gs.currentPlayer && sv>SIZE_VALUES[cell.size])) s.add(`${r}-${c}`)
    }
    return s
  }, [gs.selectedPieceSize, gs.board, gs.currentPlayer, gs.gameOver, myPieces])

  const winSet = useMemo(() => new Set(gs.winningCells?.map(([r,c])=>`${r}-${c}`)??[]), [gs.winningCells])

  const pick = (size: PieceSize) => { if (!gs.gameOver) setGs(p=>({...p, selectedPieceSize:p.selectedPieceSize===size?null:size})) }

  const click = (row: number, col: number) => {
    if (gs.gameOver || !gs.selectedPieceSize || !validCells.has(`${row}-${col}`)) return
    const nb = gs.board.map(r=>[...r])
    nb[row][col] = { player:gs.currentPlayer, size:gs.selectedPieceSize }
    const p1={...gs.player1Pieces}, p2={...gs.player2Pieces}
    if (gs.currentPlayer==="player1") p1[gs.selectedPieceSize]--; else p2[gs.selectedPieceSize]--
    const { winner, gameOver, winningCells } = checkWin(nb,p1,p2)
    if (gameOver && winner && winner!=="draw") setScores(s=>({...s,[winner]:s[winner as Player]+1}))
    // A player with eggs left but nowhere legal to put them skips their turn.
    let next: Player = op, notice: string | null = null
    if (!gameOver && !hasMove(nb, op==="player1"?p1:p2, op)) {
      next = gs.currentPlayer
      notice = `${op==="player1"?"P1":"P2"} HAS NO LEGAL MOVE — TURN SKIPPED`
    }
    setGs({ board:nb, currentPlayer:next,
      selectedPieceSize:null, player1Pieces:p1, player2Pieces:p2, gameOver, winner, winningCells, notice })
  }

  const reset = () => setGs(init())
  const p1go = gs.currentPlayer==="player1" && !gs.gameOver
  const p2go = gs.currentPlayer==="player2" && !gs.gameOver

  const C = {
    panelBorder:  '#2D3436',
    panelShadow:  '#2D3436',
    boardBg:      '#A0D8C8',
    pickerBg:     '#FFFAEB',
    footerBg:     '#2D3436',
    p1Active:     '#E8F3FF',
    p2Active:     '#FFE8F0',
    p1Score:      '#4D96FF',
    p2Score:      '#FF6584',
    p1Label:      '#2563EB',
    p2Label:      '#D63059',
    labelMuted:   '#B2BEC3',
    vsBg:         '#6C5CE7',
    divider:      '#E8E8E8',
    opponentBg:   '#F5F6FA',
  }

  return (
    <div
      className="font-pixel border-[4px] rounded-2xl overflow-hidden"
      style={{ borderColor: C.panelBorder, background: '#FFFFFF', boxShadow: `8px 8px 0 ${C.panelShadow}` }}
    >
      {/* ── Score row ── */}
      <div className="flex items-stretch border-b-[3px]" style={{ borderColor: C.divider }}>
        {/* P1 */}
        <div className="flex-1 text-center py-2 px-4 border-r-[2px]"
          style={{ borderColor: C.divider, background: p1go ? C.p1Active : '#FAFAFA' }}>
          <div className="text-[6px] mb-0.5" style={{ color: p1go ? C.p1Label : C.labelMuted }}>
            {p1go ? '◀ PLAYER 1' : 'PLAYER 1'}
          </div>
          <div className="text-[30px] leading-none"
            style={{ color: p1go ? C.p1Score : '#C0C0C0', textShadow: p1go ? `2px 2px 0 #A8CAFF` : `2px 2px 0 #E0E0E0` }}>
            {String(scores.player1).padStart(2,'0')}
          </div>
        </div>

        {/* VS */}
        <div className="flex flex-col items-center justify-center px-3"
          style={{ background: C.vsBg }}>
          <span className="text-[8px]" style={{ color: 'white', textShadow: '1px 1px 0 #3D2A8A' }}>VS</span>
          <span className="text-[10px] mt-0.5">⭐</span>
        </div>

        {/* P2 */}
        <div className="flex-1 text-center py-2 px-4 border-l-[2px]"
          style={{ borderColor: C.divider, background: p2go ? C.p2Active : '#FAFAFA' }}>
          <div className="text-[6px] mb-0.5" style={{ color: p2go ? C.p2Label : C.labelMuted }}>
            {p2go ? 'PLAYER 2 ▶' : 'PLAYER 2'}
          </div>
          <div className="text-[30px] leading-none"
            style={{ color: p2go ? C.p2Score : '#C0C0C0', textShadow: p2go ? `2px 2px 0 #FFB0C4` : `2px 2px 0 #E0E0E0` }}>
            {String(scores.player2).padStart(2,'0')}
          </div>
        </div>
      </div>

      {/* ── Main: board + picker (side by side on desktop, stacked on phones) ── */}
      <div className="flex flex-col sm:flex-row items-stretch border-b-[3px]" style={{ borderColor: C.divider }}>

        {/* Board */}
        <div className="p-3 flex justify-center border-b-[3px] sm:border-b-0 sm:border-r-[3px]" style={{ background: C.boardBg, borderColor: C.divider }}>
          <div className="grid grid-cols-[repeat(3,auto)] gap-[7px]">
            {gs.board.map((row,ri) => row.map((cell,ci) => {
              const key=`${ri}-${ci}`, isV=validCells.has(key), isW=winSet.has(key)
              const dim = !isV && !!gs.selectedPieceSize && !gs.gameOver
              return (
                <div key={key} onClick={()=>click(ri,ci)}
                  className={`w-[25vw] h-[25vw] max-w-[84px] max-h-[84px] sm:w-[84px] sm:h-[84px] flex items-center justify-center select-none cursor-pointer
                    ${isW?'cartoon-cell-win':isV?'cartoon-cell-valid':'cartoon-cell'} ${dim?'opacity-40':''}`}>
                  {cell
                    ? <GamePiece player={cell.player} size={cell.size} />
                    : isV ? <div className="w-3 h-3 rounded-full" style={{ background:'#00B894', opacity:0.6 }} /> : null}
                </div>
              )
            }))}
          </div>
        </div>

        {/* Egg picker */}
        <div className="flex flex-col w-full sm:w-[185px]" style={{ background: C.pickerBg }}>
          {/* Picker header */}
          <div className="flex items-center justify-center gap-1.5 py-2 px-2 text-[7px] border-b-[2px] shrink-0"
            style={{ background: C.vsBg, borderColor: '#3D2A8A', color: 'white', textShadow: '1px 1px 0 #3D2A8A' }}>
            🥚 {gs.currentPlayer==="player1"?"P1":"P2"} — PICK EGG 🥚
          </div>

          {/* Piece buttons */}
          <div className="flex-1 flex flex-row sm:flex-col justify-around items-end sm:items-stretch px-2 py-2 sm:py-1">
            {SIZES.map(size => {
              const count=myPieces[size], isSel=gs.selectedPieceSize===size, empty=count<=0
              return (
                <div key={size} className="flex flex-col items-center gap-1">
                  <button onClick={()=>pick(size)} disabled={empty}
                    className={`cartoon-piece-btn ${isSel?'selected':''}`}>
                    <GamePiece player={gs.currentPlayer} size={size} />
                  </button>
                  <span className="text-[7px]" style={{ color: empty ? C.labelMuted : '#2D3436' }}>
                    ×{count}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Opponent info */}
          <div className="shrink-0 border-t-[2px] px-3 py-2" style={{ borderColor: C.divider, background: C.opponentBg }}>
            <div className="text-[5px] mb-1" style={{ color: C.labelMuted }}>
              {op==="player1"?"P1":"P2"} EGGS
            </div>
            <div className="text-[6px]" style={{ color: '#636E72' }}>
              SM×{opPieces.small} &nbsp;MD×{opPieces.medium} &nbsp;LG×{opPieces.large}
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: C.footerBg }}>
        <span className="text-[6px]" style={{ color: '#FFEAA7' }}>
          {gs.gameOver ? '★ GAME OVER' : gs.notice ? `⚠ ${gs.notice}` : gs.selectedPieceSize ? '▶ PLACE YOUR EGG' : '▶ SELECT AN EGG'}
        </span>
        <button onClick={reset} className="cartoon-btn">
          ↺ RESET
        </button>
      </div>

      {gs.gameOver && <GameOverModal winner={gs.winner} onPlayAgain={reset} />}
    </div>
  )
}
