'use client';
import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { Menu, X, Moon, Sun, ArrowRight, Sparkles } from 'lucide-react';
import { Logo } from '@/components/shell/Logo';
import { useApp } from '@/lib/store';
import { cx } from '@/components/ui';

const LINKS = [
  { href: '/#imkoniyatlar', label: 'Imkoniyatlar' },
  { href: '/#qanday', label: 'Qanday ishlaydi' },
  { href: '/pricing', label: 'Narxlar' },
  { href: '/#savollar', label: 'Savollar' },
  { href: '/contact', label: 'Aloqa' },
];

/** Marketing sahifalar uchun yengil sarlavha (landing, narxlar, huquqiy). */
export function SiteHeader({ sticky = true }: { sticky?: boolean }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const theme = useApp((s) => s.theme);
  const toggleTheme = useApp((s) => s.toggleTheme);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    h(); window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return (
    <header className={cx('z-50 w-full', sticky && 'sticky top-0')}>
      <div className={cx('border-b transition-colors', scrolled ? 'border-line bg-[color-mix(in_oklab,var(--bg),transparent_12%)] backdrop-blur-xl' : 'border-transparent')}>
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <Link href="/" className="shrink-0" aria-label="BALANS AI — bosh sahifa"><Logo /></Link>
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Asosiy menyu">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 text-[13px] font-medium text-t2 transition hover:bg-surface-2 hover:text-t1">{l.label}</Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={toggleTheme} className="grid h-9 w-9 place-items-center rounded-xl text-t2 transition hover:bg-surface-2 hover:text-t1" aria-label={theme === 'dark' ? 'Yorug‘ rejim' : 'Qorong‘i rejim'}>
              {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <Link href="/app" className="hidden rounded-xl px-3 py-2 text-[13px] font-medium text-t1 transition hover:bg-surface-2 sm:block">Kirish</Link>
            <Link href="/signup" className="group inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-b from-accent to-[color-mix(in_oklab,var(--accent),black_10%)] px-3.5 py-2 text-[13px] font-semibold text-white shadow-[0_8px_24px_-10px_var(--accent)] transition hover:brightness-110">
              Bepul boshlash <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
            </Link>
            <button onClick={() => setOpen((o) => !o)} className="grid h-9 w-9 place-items-center rounded-xl text-t1 md:hidden" aria-label="Menyu" aria-expanded={open}>
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <div className="anim-pop border-b border-line bg-surface-solid px-4 py-3 md:hidden">
          <nav className="grid gap-1" aria-label="Mobil menyu">
            {LINKS.map((l) => <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-[14px] font-medium text-t1 hover:bg-surface-2">{l.label}</Link>)}
            <Link href="/app" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-[14px] font-medium text-t1 hover:bg-surface-2">Kirish (demo)</Link>
            <Link href="/signup" onClick={() => setOpen(false)} className="mt-1 rounded-xl bg-accent px-3 py-2.5 text-center text-[14px] font-semibold text-white">30 kun bepul</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-[color-mix(in_oklab,var(--surface-solid),transparent_40%)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-t3">
            Buxgalteriya, moliya, sotuv, xarid, ombor, ishlab chiqarish, HR, soliqlar va AI CFO — bitta tizimda.
          </p>
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-accent"><Sparkles className="h-3.5 w-3.5" /> DATA → AI TAHLIL → QAROR → HARAKAT</p>
        </div>
        <FooterCol title="Mahsulot" links={[['Imkoniyatlar', '/#imkoniyatlar'], ['Narxlar', '/pricing'], ['Demo panel', '/app'], ['Sinov (30 kun)', '/signup']]} />
        <FooterCol title="Kompaniya" links={[['Aloqa', '/contact'], ['Foydalanish shartlari', '/terms'], ['Maxfiylik siyosati', '/privacy']]} />
        <FooterCol title="Resurslar" links={[['Tez-tez savollar', '/#savollar'], ['Taqqoslash jadvali', '/pricing#taqqoslash'], ['Hisob va tarif', '/account']]} />
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-5 text-[11.5px] text-t3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} BALANS AI. Barcha huquqlar himoyalangan.</p>
          <p>Demo ma’lumotlar. To‘lovlar test rejimida. {`QQS 12%`} narxga kiritilgan.</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h3 className="text-[11.5px] font-semibold uppercase tracking-[0.08em] text-t3">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map(([label, href]) => <li key={href}><Link href={href} className="text-[13px] text-t2 transition hover:text-t1">{label}</Link></li>)}
      </ul>
    </div>
  );
}

/** Marketing sahifa qobig‘i: sarlavha, kontent, footer. */
export function MarketingShell({ children, header = true }: { children: ReactNode; header?: boolean }) {
  return (
    <div className="flex min-h-screen flex-col">
      {header && <SiteHeader />}
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
