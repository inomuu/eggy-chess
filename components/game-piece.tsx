type GamePieceProps = {
  player: "player1" | "player2"
  size: "small" | "medium" | "large"
}

const COLORS = {
  player1: { body: '#4D96FF', dark: '#1D5DB8', outline: '#0D2D6A', highlight: '#C4DCFF' },
  player2: { body: '#FF6584', dark: '#CC2A50', outline: '#6A0E28', highlight: '#FFC0D0' },
}

const DIMS: Record<string, [number, number]> = {
  small:  [26, 32],
  medium: [40, 48],
  large:  [54, 65],
}

export default function GamePiece({ player, size }: GamePieceProps) {
  const [w, h] = DIMS[size]
  const c = COLORS[player]
  return (
    <svg width={w} height={h} viewBox="0 0 40 48" style={{ overflow: 'visible', display: 'block' }}>
      {/* Outline / drop shadow */}
      <ellipse cx="21" cy="28" rx="17" ry="22" fill={c.outline} />
      {/* Main egg body */}
      <ellipse cx="20" cy="26" rx="17" ry="22" fill={c.body} />
      {/* Dark shading (bottom-right) */}
      <ellipse cx="25" cy="31" rx="10" ry="13" fill={c.dark} opacity="0.28" />
      {/* Highlight (top-left) */}
      <ellipse cx="13" cy="16" rx="7" ry="9" fill={c.highlight} opacity="0.75" />
      {/* Specular dot */}
      <ellipse cx="11" cy="12" rx="3.5" ry="4.5" fill="white" opacity="0.65" />
    </svg>
  )
}
