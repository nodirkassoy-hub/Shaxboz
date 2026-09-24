'use client';
import { forwardRef, useEffect, useRef, useState, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { X, Check, AlertTriangle, Info, ChevronDown, Search, Inbox } from 'lucide-react';
import { useApp } from '@/lib/store';
import { moneyC, money, pct } from '@/lib/core/money';

export const cx = clsx;

// ─── Card ──────────────────────────────────────────────────────
export function Card({ children, className, pad = true, hover, onClick, id }: { children: ReactNode; className?: string; pad?: boolean; hover?: boolean; onClick?: () => void; id?: string }) {
  return <div id={id} onClick={onClick} className={cx('glass glass-hi rounded-[18px]', pad && 'p-4 sm:p-5', hover && 'lift cursor-pointer', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, icon, actions, className }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <div className={cx('mb-4 flex items-start justify-between gap-3', className)}>
      <div className="flex min-w-0 items-start gap-2.5">
        {icon && <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</div>}
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em] text-t1">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-t3">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
    </div>
  );
}

// ─── Buttons ───────────────────────────────────────────────────
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'soft'; size?: 'xs' | 'sm' | 'md'; icon?: ReactNode; loading?: boolean };
export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button({ variant = 'secondary', size = 'sm', icon, loading, className, children, disabled, ...rest }, ref) {
  const v = {
    primary: 'bg-gradient-to-b from-accent to-[color-mix(in_oklab,var(--accent),black_12%)] text-white shadow-[0_6px_20px_-8px_var(--accent)] hover:brightness-110',
    secondary: 'bg-surface-2 text-t1 border border-line hover:border-line-strong hover:bg-surface-3',
    ghost: 'text-t2 hover:text-t1 hover:bg-surface-2',
    danger: 'bg-neg/12 text-neg border border-neg/25 hover:bg-neg/20',
    success: 'bg-pos/12 text-pos border border-pos/25 hover:bg-pos/20',
    soft: 'bg-accent-soft text-accent hover:brightness-110',
  }[variant];
  const s = { xs: 'h-7 px-2.5 text-[11.5px] gap-1 rounded-[9px]', sm: 'h-8.5 px-3 text-[12.5px] gap-1.5 rounded-[11px]', md: 'h-10 px-4 text-[13.5px] gap-2 rounded-xl' }[size];
  return (
    <button ref={ref} disabled={disabled || loading} className={cx('inline-flex select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-150 active:scale-[.98] disabled:pointer-events-none disabled:opacity-45', v, s, className)} {...rest}>
      {loading ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
});

export function IconButton({ label, children, className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button aria-label={label} title={label} className={cx('grid h-9 w-9 place-items-center rounded-xl text-t2 transition hover:bg-surface-2 hover:text-t1', className)} {...rest}>{children}</button>;
}

// ─── Badges & status ───────────────────────────────────────────
export type Tone = 'neutral' | 'accent' | 'pos' | 'neg' | 'warn' | 'info';
const TONE: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-t2 border-line', accent: 'bg-accent-soft text-accent border-accent/20', pos: 'bg-pos/10 text-pos border-pos/20',
  neg: 'bg-neg/10 text-neg border-neg/20', warn: 'bg-warn/10 text-warn border-warn/25', info: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
};
export function Badge({ tone = 'neutral', children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-1.5 py-[1px] text-[10.5px] font-semibold leading-[18px]', TONE[tone], className)}>{dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}{children}</span>;
}

const STATUS: Record<string, [string, Tone]> = {
  paid: ['To‘langan', 'pos'], open: ['Ochiq', 'info'], partial: ['Qisman', 'warn'], overdue: ['Muddati o‘tgan', 'neg'], void: ['Bekor', 'neutral'], draft: ['Qoralama', 'neutral'],
  quote: ['Taklif', 'neutral'], confirmed: ['Tasdiqlangan', 'info'], in_production: ['Ishlab chiqarishda', 'accent'], delivered: ['Yetkazilgan', 'accent'], invoiced: ['Hisob chiqarilgan', 'warn'], cancelled: ['Bekor qilingan', 'neutral'],
  request: ['So‘rov', 'neutral'], rfq: ['RFQ yuborilgan', 'info'], quoted: ['Takliflar olingan', 'accent'], pending_approval: ['Tasdiq kutilmoqda', 'warn'], approved: ['Tasdiqlangan', 'pos'],
  partially_received: ['Qisman qabul', 'warn'], received: ['Qabul qilingan', 'accent'], billed: ['Hisob kiritilgan', 'info'], rejected: ['Rad etilgan', 'neg'],
  planned: ['Rejalashtirilgan', 'neutral'], released: ['Ishga tushirilgan', 'info'], in_progress: ['Jarayonda', 'accent'], qc: ['Sifat nazorati', 'warn'], completed: ['Yakunlangan', 'pos'],
  pending: ['Kutilmoqda', 'warn'], changes_requested: ['O‘zgartirish so‘ralgan', 'info'], signed: ['Imzolangan', 'pos'], archived: ['Arxiv', 'neutral'],
  posted: ['Provodka qilingan', 'info'], reversed: ['Storno', 'neutral'], matched: ['Moslashtirilgan', 'pos'], suggested: ['Taklif', 'warn'], unmatched: ['Moslanmagan', 'neg'],
  active: ['Faol', 'pos'], leave: ['Ta’tilda', 'warn'], terminated: ['Ishdan ketgan', 'neutral'], disposed: ['Chiqarilgan', 'neutral'], planning: ['Rejalashtirish', 'neutral'], on_hold: ['To‘xtatilgan', 'warn'],
  filed: ['Topshirilgan', 'info'], running: ['Ishlamoqda', 'pos'], idle: ['Bo‘sh', 'neutral'], maintenance: ['Ta’mirda', 'warn'],
  new: ['Yangi lid', 'neutral'], qualified: ['Malakali', 'info'], proposal: ['Taklif', 'accent'], negotiation: ['Muzokara', 'warn'], won: ['Yutildi', 'pos'], lost: ['Yo‘qotildi', 'neg'],
  ok: ['Yetarli', 'pos'], low: ['Kam', 'warn'], out: ['Tugagan', 'neg'], over: ['Ortiqcha', 'info'],
};
export const statusLabel = (s: string) => STATUS[s]?.[0] ?? s;
export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const [label, tone] = STATUS[status] || [status, 'neutral' as Tone];
  return <Badge tone={tone} dot className={className}>{label}</Badge>;
}

export function DemoTag({ kind = 'demo', className }: { kind?: 'demo' | 'estimate' | 'fact' | 'rec'; className?: string }) {
  const m = { demo: ['DEMO', 'warn'], estimate: ['TAXMINIY', 'info'], fact: ['FAKT', 'pos'], rec: ['TAVSIYA', 'accent'] }[kind] as [string, Tone];
  return <Badge tone={m[1]} className={cx('tracking-wider', className)}>{m[0]}</Badge>;
}

// ─── Money display (respects presentation currency) ────────────
export function useMoney() {
  const cur = useApp((s) => s.filters.currency);
  return { c: (v: number) => moneyC(v, cur), f: (v: number) => money(v, cur), cur };
}
export function Money({ v, compact = true, className, sign }: { v: number; compact?: boolean; className?: string; sign?: boolean }) {
  const m = useMoney();
  const s = compact ? m.c(v) : m.f(v);
  return <span className={cx('num', className)}>{sign && v > 0 ? '+' : ''}{s}</span>;
}

export function Delta({ v, good = 'up', className, suffix }: { v: number; good?: 'up' | 'down'; className?: string; suffix?: string }) {
  if (!Number.isFinite(v)) return null;
  const positive = good === 'up' ? v >= 0 : v <= 0;
  return <span className={cx('num inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[11.5px] font-semibold', Math.abs(v) < 0.05 ? 'text-t3' : positive ? 'text-pos' : 'text-neg', className)}>{v > 0 ? '▲' : v < 0 ? '▼' : '•'} {pct(Math.abs(v)).replace('+', '')}{suffix}</span>;
}

// ─── Animated number ───────────────────────────────────────────
export function CountUp({ value, format, duration = 700 }: { value: number; format: (n: number) => string; duration?: number }) {
  const [v, setV] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now(); const a = from.current; const b = value;
    if (a === b) { setV(b); return; }
    let raf = 0;
    const tick = (t: number) => { const k = Math.min(1, (t - start) / duration); const e = 1 - Math.pow(1 - k, 3); setV(a + (b - a) * e); if (k < 1) raf = requestAnimationFrame(tick); else from.current = b; };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="num">{format(v)}</span>;
}

// ─── Sparkline (pure SVG, cheap) ───────────────────────────────
export function Spark({ data, color = 'var(--accent)', height = 34, className, fill = true }: { data: number[]; color?: string; height?: number; className?: string; fill?: boolean }) {
  const w = 120; const h = height;
  if (!data.length) return null;
  const min = Math.min(...data); const max = Math.max(...data); const r = max - min || 1;
  const pts = data.map((d, i) => [(i / Math.max(1, data.length - 1)) * w, h - 3 - ((d - min) / r) * (h - 6)]);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const id = `sp${Math.abs(data.reduce((a, b) => a + b, 0) | 0) % 99999}${data.length}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={cx('w-full', className)} style={{ height: h }} aria-hidden>
      <defs><linearGradient id={id} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".28" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      {fill && <path d={`${path} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />}
      <path d={path} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="2.4" fill={color} />
    </svg>
  );
}

export function Progress({ value, tone = 'accent', className, height = 6 }: { value: number; tone?: 'accent' | 'pos' | 'neg' | 'warn'; className?: string; height?: number }) {
  const c = { accent: 'bg-accent', pos: 'bg-pos', neg: 'bg-neg', warn: 'bg-warn' }[tone];
  return <div className={cx('w-full overflow-hidden rounded-full bg-surface-3', className)} style={{ height }}><div className={cx('h-full rounded-full transition-[width] duration-700', c)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

// ─── Tabs ──────────────────────────────────────────────────────
export function Tabs<T extends string>({ tabs, value, onChange, className }: { tabs: { id: T; label: string; count?: number; icon?: ReactNode }[]; value: T; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={cx('no-scrollbar -mx-1 flex gap-0.5 overflow-x-auto px-1', className)} role="tablist">
      <div className="inline-flex gap-0.5 rounded-[13px] border border-line bg-surface-2 p-[3px]">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)}
            className={cx('inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3 text-[12.5px] font-medium transition-all', value === t.id ? 'bg-surface-solid text-t1 shadow-card' : 'text-t2 hover:text-t1')}>
            {t.icon}{t.label}{t.count !== undefined && <span className={cx('num rounded-md px-1.5 text-[10.5px]', value === t.id ? 'bg-accent-soft text-accent' : 'bg-surface-3 text-t3')}>{t.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, size = 'sm' }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; size?: 'xs' | 'sm' }) {
  return (
    <div className="inline-flex rounded-[11px] border border-line bg-surface-2 p-[2px]">
      {options.map((o) => <button key={o.id} onClick={() => onChange(o.id)} className={cx('rounded-[9px] font-medium transition', size === 'xs' ? 'h-6 px-2 text-[11px]' : 'h-7 px-2.5 text-[12px]', value === o.id ? 'bg-surface-solid text-t1 shadow-card' : 'text-t3 hover:text-t1')}>{o.label}</button>)}
    </div>
  );
}

// ─── Form fields ───────────────────────────────────────────────
export function Field({ label, hint, error, children, className, required }: { label: string; hint?: string; error?: string; children: ReactNode; className?: string; required?: boolean }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[12px] font-medium text-t2">{label}{required && <span className="text-neg"> *</span>}</span>
      {children}
      {error ? <span className="mt-1 block text-[11.5px] text-neg">{error}</span> : hint ? <span className="mt-1 block text-[11.5px] text-t3">{hint}</span> : null}
    </label>
  );
}
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...p }, ref) { return <input ref={ref} className={cx('field', className)} {...p} />; });
export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...p }, ref) { return <select ref={ref} className={cx('field', className)} {...p}>{children}</select>; });
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...p }, ref) { return <textarea ref={ref} className={cx('field min-h-[80px]', className)} {...p} />; });

export function SearchInput({ value, onChange, placeholder = 'Qidirish…', className }: { value: string; onChange: (v: string) => void; placeholder?: string; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => { const t = setTimeout(() => { if (v !== value) onChange(v); }, 200); return () => clearTimeout(t); }, [v]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={cx('relative', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-t3" />
      <input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className="field h-9 pl-8 text-[13px]" />
    </div>
  );
}

// ─── Modal / Drawer ────────────────────────────────────────────
export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md', icon }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; icon?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k); const o = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = o; };
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-3xl', xl: 'sm:max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal>
      <div className="anim-fade absolute inset-0 bg-black/45" onClick={onClose} />
      <div className={cx('anim-pop relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[22px] border border-line bg-surface-solid shadow-pop sm:rounded-[20px]', w)}>
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          {icon && <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">{icon}</div>}
          <div className="min-w-0 flex-1"><h2 className="text-[15px] font-semibold text-t1">{title}</h2>{subtitle && <p className="mt-0.5 text-[12.5px] text-t3">{subtitle}</p>}</div>
          <IconButton label="Yopish" onClick={onClose} className="-mr-2 -mt-1"><X className="h-4 w-4" /></IconButton>
        </div>
        <div className="thin-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl' }: { open: boolean; onClose: () => void; title: ReactNode; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[75]">
      <div className="anim-fade absolute inset-0 bg-black/35" onClick={onClose} />
      <aside className={cx('anim-slide absolute inset-y-0 right-0 flex w-full flex-col border-l border-line bg-surface-solid shadow-pop', width)}>
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0 flex-1"><h2 className="truncate text-[15px] font-semibold text-t1">{title}</h2>{subtitle && <div className="mt-0.5 text-[12.5px] text-t3">{subtitle}</div>}</div>
          <IconButton label="Yopish" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </div>
        <div className="thin-scroll flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-surface-2 px-5 py-3">{footer}</div>}
      </aside>
    </div>
  );
}

export function Confirm({ open, onClose, onConfirm, title, body, confirmLabel = 'Tasdiqlash', tone = 'primary' }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; body: ReactNode; confirmLabel?: string; tone?: 'primary' | 'danger' }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm" icon={tone === 'danger' ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      footer={<><Button variant="ghost" onClick={onClose}>Bekor qilish</Button><Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button></>}>
      <div className="text-[13.5px] leading-relaxed text-t2">{body}</div>
    </Modal>
  );
}

// ─── Toasts ────────────────────────────────────────────────────
export function Toaster() {
  const { toasts, dismiss } = useApp();
  return (
    <div className="pointer-events-none fixed bottom-20 right-3 z-[100] flex w-[min(380px,calc(100vw-24px))] flex-col gap-2 lg:bottom-5 lg:right-5">
      {toasts.map((t) => (
        <div key={t.id} className="anim-slide pointer-events-auto flex gap-3 rounded-2xl border border-line bg-surface-solid p-3.5 shadow-pop">
          <div className={cx('anim-check grid h-7 w-7 shrink-0 place-items-center rounded-full', t.kind === 'success' ? 'bg-pos/15 text-pos' : t.kind === 'error' ? 'bg-neg/15 text-neg' : 'bg-accent-soft text-accent')}>
            {t.kind === 'success' ? <Check className="h-4 w-4" /> : t.kind === 'error' ? <AlertTriangle className="h-4 w-4" /> : <Info className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-t1">{t.title}</p>{t.body && <p className="mt-0.5 text-[12.5px] leading-snug text-t2">{t.body}</p>}</div>
          <button onClick={() => dismiss(t.id)} className="text-t3 hover:text-t1" aria-label="Yopish"><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}

// ─── Empty / skeleton / explain ────────────────────────────────
export function Empty({ title, body, action, icon }: { title: string; body?: string; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface-2 text-t3">{icon || <Inbox className="h-5 w-5" />}</div>
      <p className="text-[13.5px] font-semibold text-t1">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[12.5px] text-t3">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export function Skeleton({ className }: { className?: string }) { return <div className={cx('skeleton', className)} />; }

/** Plain-language explanation of a term (progressive disclosure). */
export function Explain({ term, children }: { term: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button type="button" onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} onBlur={() => setOpen(false)} className="ml-1 grid h-4 w-4 place-items-center rounded-full border border-line text-[9px] font-bold text-t3 hover:border-accent hover:text-accent" aria-label={`${term} nima?`}>?</button>
      {open && <span className="anim-pop absolute left-1/2 top-6 z-50 w-64 -translate-x-1/2 rounded-xl border border-line bg-surface-solid p-3 text-left text-[12px] font-normal leading-relaxed text-t2 shadow-pop"><b className="text-t1">{term}</b> — {children}</span>}
    </span>
  );
}

// ─── Dropdown menu ─────────────────────────────────────────────
export function Menu({ trigger, children, align = 'right', width = 'w-56' }: { trigger: (p: { open: boolean; toggle: () => void }) => ReactNode; children: (close: () => void) => ReactNode; align?: 'left' | 'right'; width?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (!open) return; const h = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, [open]);
  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && <div className={cx('anim-pop absolute top-full z-[60] mt-1.5 overflow-hidden rounded-2xl border border-line bg-surface-solid p-1.5 shadow-pop', align === 'right' ? 'right-0' : 'left-0', width)}>{children(() => setOpen(false))}</div>}
    </div>
  );
}
export function MenuItem({ children, onClick, icon, active, danger, hint }: { children: ReactNode; onClick?: () => void; icon?: ReactNode; active?: boolean; danger?: boolean; hint?: ReactNode }) {
  return <button onClick={onClick} className={cx('flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left text-[13px] transition', active ? 'bg-accent-soft text-accent' : danger ? 'text-neg hover:bg-neg/10' : 'text-t1 hover:bg-surface-2')}>{icon && <span className="text-t3">{icon}</span>}<span className="min-w-0 flex-1 truncate">{children}</span>{hint && <span className="text-[11px] text-t3">{hint}</span>}</button>;
}

export function PageHeader({ title, subtitle, actions, crumbs }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; crumbs?: string[] }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {crumbs && <div className="mb-1 flex items-center gap-1.5 text-[11.5px] text-t3">{crumbs.map((c, i) => <span key={i} className="flex items-center gap-1.5">{i > 0 && <span>/</span>}{c}</span>)}</div>}
        <h1 className="text-[20px] font-semibold leading-tight tracking-[-0.025em] text-t1 sm:text-[24px]">{title}</h1>
        {subtitle && <div className="mt-1 line-clamp-3 text-[12.5px] text-t2 sm:line-clamp-none sm:text-[13px]">{subtitle}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone, icon, onClick, explain }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: 'pos' | 'neg' | 'warn'; icon?: ReactNode; onClick?: () => void; explain?: [string, string] }) {
  return (
    <Card hover={!!onClick} onClick={onClick} className="!p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center text-[12px] font-medium text-t3">{label}{explain && <Explain term={explain[0]}>{explain[1]}</Explain>}</span>
        {icon && <span className="text-t3">{icon}</span>}
      </div>
      <div className={cx('num mt-1.5 whitespace-nowrap text-[16px] font-semibold tracking-[-0.02em] sm:text-[20px]', tone === 'pos' ? 'text-pos' : tone === 'neg' ? 'text-neg' : tone === 'warn' ? 'text-warn' : 'text-t1')}>{value}</div>
      {sub && <div className="mt-0.5 text-[11.5px] text-t3">{sub}</div>}
    </Card>
  );
}

export function Disclosure({ title, children, defaultOpen = false, right }: { title: ReactNode; children: ReactNode; defaultOpen?: boolean; right?: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-line">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] font-semibold text-t1">
        <ChevronDown className={cx('h-4 w-4 text-t3 transition', open && 'rotate-180')} />
        <span className="flex-1">{title}</span>{right}
      </button>
      {open && <div className="border-t border-line px-4 py-3">{children}</div>}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) { return <kbd className="rounded-md border border-line bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-t3">{children}</kbd>; }

export function Avatar({ name, size = 32, color }: { name: string; size?: number; color?: string }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const hue = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
  return <div className="grid shrink-0 place-items-center rounded-[10px] font-semibold text-white" style={{ width: size, height: size, fontSize: size * 0.36, background: color || `linear-gradient(135deg, hsl(${hue} 60% 55%), hsl(${(hue + 40) % 360} 60% 45%))` }}>{ini}</div>;
}
