'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Users, Truck, FileText, Package, UserRound, BookOpen, ShoppingCart, FolderKanban, FileArchive, Sparkles, CornerDownLeft } from 'lucide-react';
import { useApp } from '@/lib/store';
import { cx, Kbd } from '@/components/ui';
import { moneyC } from '@/lib/core/money';
import { fmtDate } from '@/lib/core/dates';
import { can } from '@/lib/rbac';
import { docTotals, invOpen } from '@/lib/db';
import type { ModuleId } from '@/lib/types';

interface Hit { id: string; cat: string; title: string; sub: string; module: ModuleId; tab?: string; params?: Record<string, string>; icon: typeof Search }
const CATS: Record<string, { label: string; icon: typeof Search }> = {
  customer: { label: 'Mijozlar', icon: Users }, supplier: { label: 'Ta’minotchilar', icon: Truck }, invoice: { label: 'Hisob-fakturalar', icon: FileText }, product: { label: 'Mahsulotlar', icon: Package },
  employee: { label: 'Xodimlar', icon: UserRound }, entry: { label: 'Provodkalar', icon: BookOpen }, order: { label: 'Buyurtmalar', icon: ShoppingCart }, project: { label: 'Loyihalar', icon: FolderKanban }, document: { label: 'Hujjatlar', icon: FileArchive },
};

export function GlobalSearch() {
  const { searchOpen, setSearch, db, go, role, openAi } = useApp();
  const [q, setQ] = useState(''); const [dq, setDq] = useState('');
  const [sel, setSel] = useState(0);
  const inp = useRef<HTMLInputElement>(null);
  useEffect(() => { const h = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(!useApp.getState().searchOpen); } if (e.key === 'Escape') setSearch(false); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, [setSearch]);
  useEffect(() => { if (searchOpen) { setQ(''); setDq(''); setSel(0); setTimeout(() => inp.current?.focus(), 30); } }, [searchOpen]);
  useEffect(() => { const t = setTimeout(() => setDq(q.trim().toLowerCase()), 140); return () => clearTimeout(t); }, [q]);

  const hits = useMemo(() => {
    if (dq.length < 2) return [] as Hit[];
    const m = (s: string) => s.toLowerCase().includes(dq);
    const out: Hit[] = []; const lim = (cat: string) => out.filter((h) => h.cat === cat).length < 5;
    for (const p of db.parties) if (m(p.name) || m(p.stir) || m(p.code)) { const cat = p.kind === 'customer' ? 'customer' : 'supplier'; if (lim(cat)) out.push({ id: p.id, cat, title: p.name, sub: `${p.code} · STIR ${p.stir} · ${p.segment}`, module: p.kind === 'customer' ? 'crm' : 'purchasing', tab: p.kind === 'customer' ? 'customers' : 'suppliers', params: { party: p.id }, icon: CATS[cat].icon }); }
    for (const i of db.invoices) if ((m(i.no) || m(db.parties.find((p) => p.id === i.customerId)?.name || '')) && lim('invoice')) out.push({ id: i.id, cat: 'invoice', title: i.no, sub: `${db.parties.find((p) => p.id === i.customerId)?.name} · ${fmtDate(i.date)} · ${moneyC(i.total)}${invOpen(i) > 0 ? ` · qoldiq ${moneyC(invOpen(i))}` : ''}`, module: 'finance', tab: 'ar', params: { invoice: i.id }, icon: FileText });
    for (const b of db.bills) if ((m(b.no) || m(b.supplierRef)) && lim('invoice')) out.push({ id: b.id, cat: 'invoice', title: `${b.no} (${b.supplierRef})`, sub: `${db.parties.find((p) => p.id === b.supplierId)?.name} · ${moneyC(b.total)}`, module: 'finance', tab: 'ap', icon: FileText });
    for (const p of db.products) if ((m(p.name) || m(p.sku) || m(p.barcode)) && lim('product')) out.push({ id: p.id, cat: 'product', title: p.name, sub: `${p.sku} · ${p.category}`, module: 'inventory', tab: 'products', params: { product: p.id }, icon: Package });
    for (const e of db.employees) if ((m(e.name) || m(e.position) || m(e.code)) && lim('employee')) out.push({ id: e.id, cat: 'employee', title: e.name, sub: `${e.position} · ${e.department}`, module: 'hr', tab: 'employees', params: { employee: e.id }, icon: UserRound });
    for (const s of db.salesOrders) if (m(s.no) && lim('order')) out.push({ id: s.id, cat: 'order', title: s.no, sub: `${db.parties.find((p) => p.id === s.customerId)?.name} · ${moneyC(docTotals(s.lines).total)}`, module: 'sales', tab: 'orders', params: { order: s.id }, icon: ShoppingCart });
    for (const p of db.purchaseOrders) if (m(p.no) && lim('order')) out.push({ id: p.id, cat: 'order', title: p.no, sub: `Xarid · ${db.parties.find((x) => x.id === p.supplierId)?.name || 'ta’minotchi tanlanmagan'}`, module: 'purchasing', tab: 'orders', params: { po: p.id }, icon: Truck });
    for (const w of db.workOrders) if (m(w.no) && lim('order')) out.push({ id: w.id, cat: 'order', title: w.no, sub: `Ishlab chiqarish · ${db.products.find((p) => p.id === w.productId)?.name}`, module: 'manufacturing', tab: 'orders', icon: ShoppingCart });
    for (const p of db.projects) if ((m(p.name) || m(p.code)) && lim('project')) out.push({ id: p.id, cat: 'project', title: p.name, sub: p.code, module: 'projects', icon: FolderKanban });
    for (const d of db.documents) if ((m(d.title) || m(d.no)) && lim('document')) out.push({ id: d.id, cat: 'document', title: d.title, sub: `${d.no} · ${fmtDate(d.date)}`, module: 'documents', icon: FileArchive });
    if (out.length < 30) for (let i = db.entries.length - 1; i >= 0 && out.filter((h) => h.cat === 'entry').length < 5; i--) { const e = db.entries[i]; if (m(e.no) || m(e.memo)) out.push({ id: e.id, cat: 'entry', title: e.no, sub: `${fmtDate(e.date)} · ${e.memo}`, module: 'accounting', tab: 'journal', params: { q: e.no }, icon: BookOpen }); }
    return out.filter((h) => can(role, h.module));
  }, [dq, db, role]);

  if (!searchOpen) return null;
  const grouped = Object.keys(CATS).map((c) => ({ c, items: hits.filter((h) => h.cat === c) })).filter((g) => g.items.length);
  const flat = grouped.flatMap((g) => g.items);
  const pick = (h: Hit) => { go(h.module, h.tab, h.params); setSearch(false); };
  const askAi = q.trim().length > 6 && /\?|qancha|qaysi|nima|nega|qanday|сколько|какой|how|what|which/i.test(q);

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center p-3 pt-[9vh]" role="dialog" aria-modal aria-label="Global qidiruv">
      <div className="anim-fade absolute inset-0 bg-black/45" onClick={() => setSearch(false)} />
      <div className="anim-pop relative w-full max-w-2xl overflow-hidden rounded-[20px] border border-line bg-surface-solid shadow-pop">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="h-5 w-5 text-t3" />
          <input ref={inp} value={q} onChange={(e) => { setQ(e.target.value); setSel(0); }} placeholder="Mijoz, STIR, hisob-faktura №, SKU, xodim, provodka…"
            onKeyDown={(e) => { if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, flat.length - 1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); } if (e.key === 'Enter') { if (askAi && !flat.length) { openAi(q); setSearch(false); } else if (flat[sel]) pick(flat[sel]); } }}
            className="h-14 flex-1 bg-transparent text-[15px] text-t1 outline-none placeholder:text-t3" />
          <Kbd>Esc</Kbd>
        </div>
        <div className="thin-scroll max-h-[60vh] overflow-y-auto p-2">
          {askAi && (
            <button onClick={() => { openAi(q); setSearch(false); }} className="mb-1 flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-accent/12 to-transparent px-3 py-2.5 text-left">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent to-accent-2 text-white"><Sparkles className="h-4 w-4" /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold text-t1">AI CFO’dan so‘rash</span><span className="block truncate text-[12px] text-t3">“{q}”</span></span>
              <CornerDownLeft className="h-4 w-4 text-t3" />
            </button>
          )}
          {dq.length < 2 && !askAi && (
            <div className="px-3 py-6">
              <p className="mb-3 text-[12px] text-t3">Tezkor qidiruv misollari:</p>
              <div className="flex flex-wrap gap-1.5">{['Premium', 'INV-2026-008', 'LED panel', 'Karimov', 'shkaf', '304 356 782', 'Anor Bank'].map((x) => <button key={x} onClick={() => setQ(x)} className="rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[12px] text-t2 hover:text-t1">{x}</button>)}</div>
              <p className="mb-2 mt-5 text-[12px] text-t3">Yoki tabiiy tilda savol bering:</p>
              <div className="flex flex-wrap gap-1.5">{['2026 yil sentyabr oyida marketingga qancha pul sarfladik?', 'Qaysi omborda mahsulot kam?'].map((x) => <button key={x} onClick={() => setQ(x)} className="rounded-lg border border-accent/25 bg-accent-soft px-2.5 py-1 text-[12px] text-accent">{x}</button>)}</div>
            </div>
          )}
          {dq.length >= 2 && !flat.length && !askAi && <p className="px-3 py-10 text-center text-[13px] text-t3">“{q}” bo‘yicha hech narsa topilmadi</p>}
          {grouped.map((g) => (
            <div key={g.c} className="mb-1">
              <div className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-wider text-t3">{CATS[g.c].label} <span className="num">({g.items.length})</span></div>
              {g.items.map((h) => { const i = flat.indexOf(h); const Icon = h.icon; return (
                <button key={h.cat + h.id} onMouseEnter={() => setSel(i)} onClick={() => pick(h)} className={cx('flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left', sel === i ? 'bg-surface-2' : '')}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface-3 text-t2"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-medium text-t1">{h.title}</span><span className="block truncate text-[11.5px] text-t3">{h.sub}</span></span>
                  {sel === i && <CornerDownLeft className="h-3.5 w-3.5 text-t3" />}
                </button>
              ); })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
