"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useState, useEffect } from "react"

type Props = { winner: "player1" | "player2" | "draw" | null; onPlayAgain: () => void }

export default function GameOverModal({ winner, onPlayAgain }: Props) {
  const [open, setOpen] = useState(false)
  useEffect(() => { if (winner) setOpen(true) }, [winner])

  const isDraw = winner === "draw"
  const isP1 = winner === "player1"
  const accentColor = isP1 ? '#4D96FF' : isDraw ? '#FDCB6E' : '#FF6584'
  const label = isP1 ? "PLAYER 1" : isDraw ? null : "PLAYER 2"
  const emoji = isP1 ? "🥚" : isDraw ? "🤝" : "🥚"

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="border-[4px] p-0 rounded-2xl max-w-xs font-pixel gap-0 overflow-hidden"
        style={{ borderColor: '#2D3436', background: '#FFFFFF', boxShadow: '8px 8px 0 #2D3436' }}
      >
        {/* Header bar */}
        <div className="px-4 py-3 flex items-center justify-center gap-2"
          style={{ background: accentColor }}>
          <span className="text-[20px]">{emoji}</span>
          <DialogTitle className="text-[9px] m-0"
            style={{ fontFamily: 'var(--font-pixel,monospace)', color: 'white', textShadow: '2px 2px 0 rgba(0,0,0,0.35)' }}>
            {isDraw ? "DRAW!" : "GAME OVER!"}
          </DialogTitle>
          <span className="text-[20px]">{emoji}</span>
        </div>

        {/* Body */}
        <DialogHeader className="px-6 pt-5 pb-2">
          <DialogDescription asChild>
            <div className="text-center">
              <div className="text-[36px] mb-3">
                {isDraw ? "🤝" : isP1 ? "🏆" : "🏆"}
              </div>
              {isDraw ? (
                <div style={{ lineHeight: '2.4' }}>
                  <p className="text-[9px]" style={{ color: '#2D3436' }}>EQUAL CONTROL!</p>
                  <p className="text-[7px]" style={{ color: '#636E72' }}>Both players tied.</p>
                </div>
              ) : (
                <div style={{ lineHeight: '2.6' }}>
                  <p className="text-[11px]" style={{ color: accentColor, textShadow: `2px 2px 0 rgba(0,0,0,0.1)` }}>
                    {label}
                  </p>
                  <p className="text-[8px]" style={{ color: '#2D3436' }}>WINS THE MATCH!</p>
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-5 mt-3">
          <button
            onClick={() => { setOpen(false); onPlayAgain() }}
            className="cartoon-btn text-[8px] w-full justify-center"
            style={{ background: accentColor, borderColor: '#2D3436', color: '#FFFFFF', textShadow: '1px 1px 0 rgba(0,0,0,0.3)' }}
          >
            ▶ PLAY AGAIN
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
