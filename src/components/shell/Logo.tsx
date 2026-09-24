export function LogoMark({ size = 34 }: { size?: number }) {
  // Minimal balance symbol: two offset bars on a fulcrum, inside a rounded square
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <defs>
        <linearGradient id="lg-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b8bff" /><stop offset="1" stopColor="#4f46e5" /></linearGradient>
        <linearGradient id="lg-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".35" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
      </defs>
      <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#lg-a)" />
      <rect x="1" y="1" width="38" height="19" rx="11" fill="url(#lg-b)" />
      <rect x="9" y="12" width="15" height="4.2" rx="2.1" fill="#fff" />
      <rect x="16" y="19.5" width="15" height="4.2" rx="2.1" fill="#fff" fillOpacity=".78" />
      <path d="M20 26.5 L24.2 31.5 H15.8 Z" fill="#fff" fillOpacity=".92" />
    </svg>
  );
}
export function Logo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && (
        <div className="leading-none">
          <div className="text-[15px] font-bold tracking-[0.02em] text-t1">BALANS <span className="bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent">AI</span></div>
          <div className="mt-1 text-[10px] font-medium tracking-[0.02em] text-t3">AI-powered Business Management</div>
        </div>
      )}
    </div>
  );
}
