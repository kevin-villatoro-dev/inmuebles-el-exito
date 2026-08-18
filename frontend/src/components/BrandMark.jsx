export function BrandMark({ compact = false }) {
  return (
    <div className="brand-mark" aria-label="Inmuebles el Éxito">
      <svg aria-hidden="true" className="brand-symbol" viewBox="0 0 48 48">
        <path d="M7 35h10V25h10V15h14" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="square" strokeLinejoin="round" />
        <path d="M7 13h12M7 24h10M7 35h10" fill="none" stroke="var(--brand-gold)" strokeWidth="3" strokeLinecap="square" />
      </svg>
      {!compact && <span className="brand-name"><strong>inmuebles</strong><span>el Éxito</span></span>}
    </div>
  );
}
