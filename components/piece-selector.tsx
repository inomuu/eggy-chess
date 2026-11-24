"use client"

import GamePiece from "./game-piece"

type PieceSelectorProps = {
  currentPlayer: "player1" | "player2"
  player1Pieces: Record<string, number>
  player2Pieces: Record<string, number>
  selectedSize: string | null
  onSelectPiece: (size: "small" | "medium" | "large") => void
}

export default function PieceSelector({
  currentPlayer,
  player1Pieces,
  player2Pieces,
  selectedSize,
  onSelectPiece,
}: PieceSelectorProps) {
  const currentPieces = currentPlayer === "player1" ? player1Pieces : player2Pieces
  const opponentPieces = currentPlayer === "player1" ? player2Pieces : player1Pieces
  const opponent = currentPlayer === "player1" ? "player2" : "player1"
  const playerLabel = currentPlayer === "player1" ? "P1 EGGS" : "P2 EGGS"
  const opponentLabel = opponent === "player1" ? "P1" : "P2"

  return (
    <div
      className="font-pixel border-[3px] border-[#9a6840] flex flex-col"
      style={{ background: '#e8d4a8', boxShadow: '4px 4px 0 #6a3820', width: '160px' }}
    >
      {/* Header */}
      <div
        className="text-center py-1.5 px-2 text-[7px] border-b-[3px] border-[#9a6840] flex items-center justify-center gap-1.5"
        style={{ background: '#d08830', color: '#4a2e10', textShadow: '1px 1px 0 #c07020' }}
      >
        <img src="/mushroom.svg" alt="" aria-hidden style={{ width: 16, height: 14, imageRendering: 'pixelated' }} />
        {playerLabel}
        <img src="/mushroom.svg" alt="" aria-hidden style={{ width: 16, height: 14, imageRendering: 'pixelated', transform: 'scaleX(-1)' }} />
      </div>

      {/* Current player pieces — column layout */}
      <div className="flex flex-col gap-1.5 p-2">
        {(["small", "medium", "large"] as const).map((size) => {
          const count = currentPieces[size]
          const isSelected = selectedSize === size
          const isEmpty = count <= 0
          return (
            <button
              key={size}
              onClick={() => onSelectPiece(size)}
              disabled={isEmpty}
              className={`pixel-piece-btn ${isSelected ? 'selected' : ''} flex items-center gap-2 w-full`}
              style={{ opacity: isEmpty ? 0.35 : 1, padding: '4px 6px' }}
            >
              <GamePiece player={currentPlayer} size={size} />
              <div className="flex flex-col items-start gap-0.5 ml-1">
                <span className="text-[5px]" style={{ color: isSelected ? '#8a4010' : '#9a7860' }}>
                  {size.toUpperCase()}
                </span>
                <span className="text-[8px]" style={{ color: isEmpty ? '#c8b090' : '#4a2e10' }}>
                  ×{count}
                </span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Opponent pieces — compact */}
      <div className="border-t-[2px] border-[#c8b090] px-2 pb-2 pt-1.5">
        <div className="text-[5px] mb-1.5" style={{ color: '#b0906a' }}>
          {opponentLabel} EGGS
        </div>
        <div className="flex gap-2 opacity-50 items-end">
          {(["small", "medium", "large"] as const).map((size) => (
            <div key={size} className="flex flex-col items-center gap-0.5">
              <GamePiece player={opponent} size={size} />
              <span className="text-[5px]" style={{ color: '#9a7860' }}>×{opponentPieces[size]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
