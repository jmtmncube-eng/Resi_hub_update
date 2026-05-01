/**
 * ResiHub brand mark + wordmark. The mark is a tiny cyan house glyph that
 * keys the rose accent — recognisable at 16-32px and works on light/dark.
 */
export function Brand({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const isSm = size === 'sm';
  const markSize = isSm ? 22 : 28;
  const wordSize = isSm ? 18 : 22;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: isSm ? 7 : 9 }}>
      <ResiMark size={markSize} />
      <span style={{
        fontSize:        wordSize,
        fontWeight:      700,
        color:           'var(--cyan)',
        letterSpacing:   '-.03em',
        fontFamily:      "'Space Grotesk', sans-serif",
        lineHeight:      1,
      }}>
        ResiHub
      </span>
    </span>
  );
}

/** Just the mark, no wordmark — for compact contexts. */
export function ResiMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* Rounded square backdrop with brand cyan tint */}
      <rect x="1" y="1" width="30" height="30" rx="8"
            fill="rgba(0,204,204,.14)" stroke="rgba(0,204,204,.45)" strokeWidth="1.2" />
      {/* House glyph — cyan body, rose roof accent */}
      <path
        d="M6.5 15 L16 7 L25.5 15 L25.5 24 A1.5 1.5 0 0 1 24 25.5 L8 25.5 A1.5 1.5 0 0 1 6.5 24 Z"
        fill="none" stroke="#00CCCC" strokeWidth="2" strokeLinejoin="round"
      />
      {/* Roof ridge accent */}
      <path d="M6.5 15 L16 7 L25.5 15" fill="none" stroke="#E8197A" strokeWidth="2" strokeLinejoin="round" />
      {/* Door */}
      <rect x="13.5" y="17.5" width="5" height="8" rx="1" fill="#00CCCC" />
    </svg>
  );
}
