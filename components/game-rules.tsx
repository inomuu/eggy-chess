import GamePiece from "./game-piece"

const SECTION_COLORS = [
  { border: '#4D96FF', header: '#4D96FF', text: 'white' },  // PLACEMENT - blue
  { border: '#00B894', header: '#00B894', text: 'white' },  // HOW TO WIN - green
  { border: '#FDCB6E', header: '#FDCB6E', text: '#2D3436' }, // CAPTURING - yellow
  { border: '#6C5CE7', header: '#6C5CE7', text: 'white' },  // STRATEGY - purple
]

function Section({ title, children, colorIdx }: { title: string; children: React.ReactNode; colorIdx: number }) {
  const sc = SECTION_COLORS[colorIdx]
  return (
    <div className="border-[3px] rounded-xl overflow-hidden"
      style={{ borderColor: sc.border, background: '#FFFFFF', boxShadow: '3px 3px 0 #2D3436' }}>
      <div className="px-3 py-1.5 text-[7px]"
        style={{ background: sc.header, color: sc.text, textShadow: sc.text === 'white' ? '1px 1px 0 rgba(0,0,0,0.3)' : 'none' }}>
        ★ {title}
      </div>
      <div className="px-3 py-2.5 text-[6px] space-y-1.5" style={{ color: '#2D3436', lineHeight: '2.2' }}>
        {children}
      </div>
    </div>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return <div>▸ {children}</div>
}

export default function GameRules() {
  return (
    <div className="font-pixel py-2 px-2 max-w-2xl mx-auto">

      {/* Title panel */}
      <div className="border-[4px] rounded-2xl mb-3 overflow-hidden"
        style={{ borderColor: '#2D3436', background: '#6C5CE7', boxShadow: '6px 6px 0 #2D3436' }}>
        <div className="flex items-center justify-center gap-2 py-3">
          <span className="text-[18px]">🥚</span>
          <span className="text-[10px]" style={{ color: 'white', textShadow: '2px 2px 0 rgba(0,0,0,0.4)' }}>
            HOW TO PLAY
          </span>
          <span className="text-[18px]">🥚</span>
        </div>
      </div>

      {/* Egg sizes */}
      <div className="border-[3px] rounded-xl mb-3 p-3"
        style={{ borderColor: '#2D3436', background: '#FFFFFF', boxShadow: '4px 4px 0 #2D3436' }}>
        <div className="text-[6px] mb-2.5" style={{ color: '#6C5CE7' }}>★ EACH PLAYER STARTS WITH:</div>
        <div className="flex items-end justify-center gap-6">
          {(["small", "medium", "large"] as const).map((size) => (
            <div key={size} className="flex flex-col items-center gap-1.5">
              <GamePiece player="player1" size={size} />
              <span className="text-[6px]" style={{ color: '#636E72' }}>
                {size === "small" ? "SM ×3" : size === "medium" ? "MD ×3" : "LG ×2"}
              </span>
            </div>
          ))}
          <span className="text-[6px] self-center" style={{ color: '#B2BEC3' }}>each player</span>
        </div>
      </div>

      {/* 2×2 rule sections */}
      <div className="grid grid-cols-2 gap-2">
        <Section title="PLACEMENT" colorIdx={0}>
          <Li>Pick an egg size, click a cell</Li>
          <Li>Larger eggs capture smaller enemy eggs</Li>
          <Li>Eggs can&apos;t move once placed</Li>
          <Li>Player 1 (blue) goes first</Li>
        </Section>

        <Section title="HOW TO WIN" colorIdx={1}>
          <Li><span style={{ color: '#E17055' }}>LINE OF 3</span> — 3 in a row wins</Li>
          <Li><span style={{ color: '#4D96FF' }}>MOST CELLS</span> — most eggs when done</Li>
          <Li>No legal move? Your turn is skipped</Li>
          <Li>Nobody can move? Game ends, cells counted</Li>
          <Li><span style={{ color: '#B2BEC3' }}>DRAW</span> — equal cells = tie</Li>
        </Section>

        <Section title="CAPTURING" colorIdx={2}>
          <Li>Small (1) &lt; Medium (2) &lt; Large (3)</Li>
          <Li>Only capture enemies, not own eggs</Li>
          <Li>Captured cell changes owner</Li>
        </Section>

        <Section title="STRATEGY" colorIdx={3}>
          <Li>Save large eggs for key captures</Li>
          <Li>Multiple threats are hard to block</Li>
          <Li>Area control wins if no line forms</Li>
        </Section>
      </div>
    </div>
  )
}
