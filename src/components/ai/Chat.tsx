'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Send, Sparkles, Lightbulb, AlertTriangle, TrendingUp, BarChart3, CheckCircle2, ArrowUpRight, Info, ShieldCheck, Database, RotateCcw } from 'lucide-react';
import { useApp } from '@/lib/store';
import { ask, SUGGESTED, type AiAnswer, type AiAction } from '@/lib/ai';
import { scopeOf } from '@/lib/analytics';
import { cx, Badge, Delta, Button, Modal } from '@/components/ui';
import { useT } from '@/lib/i18n';
import { roleOf } from '@/lib/rbac';

type Msg = { id: number; role: 'user' | 'ai'; text?: string; answer?: AiAnswer & { intent: string } };

export const INSIGHT_META = {
  insight: { icon: Lightbulb, label: '💡 Insight', tone: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  risk: { icon: AlertTriangle, label: '⚠️ Risk', tone: 'text-neg bg-neg/10 border-neg/20' },
  opportunity: { icon: TrendingUp, label: '📈 Imkoniyat', tone: 'text-pos bg-pos/10 border-pos/20' },
  analysis: { icon: BarChart3, label: '📊 Tahlil', tone: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  recommendation: { icon: CheckCircle2, label: '✅ Tavsiya', tone: 'text-accent bg-accent-soft border-accent/20' },
} as const;

const KIND = { fact: { label: 'FAKT', cls: 'border-pos/30 bg-pos/[.06]', badge: 'pos' as const }, estimate: { label: 'TAXMIN', cls: 'border-sky-500/30 bg-sky-500/[.06]', badge: 'info' as const }, recommendation: { label: 'TAVSIYA', cls: 'border-accent/30 bg-accent-soft', badge: 'accent' as const } };

let seq = 1;
const STORE_KEY = 'balans.ai.history';

export function Chat({ compact, initialPrompt }: { compact?: boolean; initialPrompt?: string }) {
  const { db, filters, go, closeAi, dispatch, role } = useApp();
  const t = useT();
  const [msgs, setMsgs] = useState<Msg[]>(() => { try { return JSON.parse(sessionStorage.getItem(STORE_KEY) || '[]'); } catch { return []; } });
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [explain, setExplain] = useState<AiAnswer | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const s = useMemo(() => scopeOf(db, filters), [db, filters]);
  const sent = useRef(false);

  useEffect(() => { try { sessionStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-30))); } catch { /* ignore */ } endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, thinking]);
  const send = (q: string) => {
    const text = q.trim(); if (!text || thinking) return;
    setMsgs((m) => [...m, { id: seq++, role: 'user', text }]); setInput(''); setThinking(true);
    setTimeout(() => {
      const a = ask(db, s, filters.currency, { from: filters.from, to: filters.to }, text);
      setMsgs((m) => [...m, { id: seq++, role: 'ai', answer: a }]); setThinking(false);
    }, 450 + Math.random() * 450);
  };
  useEffect(() => { if (initialPrompt && !sent.current) { sent.current = true; send(initialPrompt); } }, [initialPrompt]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = (a: AiAction, ans: AiAnswer) => {
    if (a.type === 'nav' && a.module) { go(a.module, a.tab, a.params); if (compact) closeAi(); }
    if (a.type === 'ask' && a.prompt) send(a.prompt);
    if (a.type === 'explain') setExplain(ans);
    if (a.type === 'propose' && a.proposal) {
      const p = a.proposal;
      const r = dispatch('approval.request', { kind: 'ai_action', title: `AI taklifi: ${p.title}`, description: p.description, amount: p.amount, companyId: filters.companyId === 'all' ? (p.data.companyId as string) || 'trd' : filters.companyId, approverRole: p.approverRole, deadline: new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10), payload: { action: p.action, data: p.data } }, { success: 'Taklif Tasdiqlash markaziga yuborildi' });
      if (r) setMsgs((m) => [...m, { id: seq++, role: 'ai', text: `✅ “${p.title}” tasdiqlash uchun yuborildi. Moliyaviy yozuvlar faqat mas’ul shaxs tasdiqlagandan keyin o‘zgaradi.` }]);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="thin-scroll flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Greeting */}
        <div className="flex gap-3">
          <AiAvatar />
          <div className="max-w-[92%] rounded-2xl rounded-tl-md border border-line bg-surface-2 px-4 py-3">
            <p className="text-[13.5px] font-semibold text-t1">{t('ai.greeting')}</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-t2">{roleOf(role).persona.split(' ')[0]}, men kompaniyangizning buxgalteriya va operatsion ma’lumotlari asosida javob beraman. Har bir javobda <b className="text-pos">FAKT</b>, <b className="text-sky-500">TAXMIN</b> va <b className="text-accent">TAVSIYA</b> ajratib ko‘rsatiladi.</p>
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-t3"><Database className="h-3 w-3" /> Kontekst: {filters.companyId === 'all' ? 'BALANS GROUP (konsolidatsiya)' : db.companies.find((c) => c.id === filters.companyId)?.name} · {filters.currency}</p>
          </div>
        </div>
        {msgs.length === 0 && (
          <div className={cx('grid gap-2 pl-11', compact ? 'grid-cols-1' : 'sm:grid-cols-2')}>
            {SUGGESTED.slice(0, compact ? 6 : 11).map((q) => <button key={q} onClick={() => send(q)} className="group flex items-center justify-between gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2 text-left text-[12.5px] text-t1 transition hover:border-accent/40 hover:bg-accent-soft">{q}<ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-t3 group-hover:text-accent" /></button>)}
          </div>
        )}
        {msgs.map((m) => m.role === 'user' ? (
          <div key={m.id} className="flex justify-end"><div className="max-w-[85%] rounded-2xl rounded-tr-md bg-gradient-to-br from-accent to-accent-2 px-4 py-2.5 text-[13.5px] text-white shadow-card">{m.text}</div></div>
        ) : m.answer ? <AnswerView key={m.id} a={m.answer} onAction={(x) => act(x, m.answer!)} compact={compact} /> : (
          <div key={m.id} className="flex gap-3"><AiAvatar /><div className="rounded-2xl rounded-tl-md border border-pos/25 bg-pos/[.06] px-4 py-2.5 text-[13px] text-t1">{m.text}</div></div>
        ))}
        {thinking && (
          <div className="flex gap-3"><AiAvatar /><div className="flex items-center gap-2 rounded-2xl rounded-tl-md border border-line bg-surface-2 px-4 py-3 text-[12.5px] text-t3">
            <span className="flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" style={{ animationDelay: `${i * 120}ms` }} />)}</span> Bosh kitob va sub-kitoblar tahlil qilinmoqda…
          </div></div>
        )}
        <div ref={endRef} />
      </div>
      <div className="border-t border-line p-3">
        {msgs.length > 0 && <div className="no-scrollbar mb-2 flex gap-1.5 overflow-x-auto">{SUGGESTED.slice(0, 8).map((q) => <button key={q} onClick={() => send(q)} className="shrink-0 rounded-lg border border-line bg-surface-2 px-2.5 py-1 text-[11.5px] text-t2 hover:text-t1">{q}</button>)}<button onClick={() => { setMsgs([]); }} className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] text-t3 hover:text-t1"><RotateCcw className="h-3 w-3" />Tozalash</button></div>}
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-center gap-2 rounded-2xl border border-line bg-surface-2 p-1.5 pl-3.5 focus-within:border-accent focus-within:shadow-[0_0_0_3px_var(--accent-soft)]">
          <Sparkles className="h-4 w-4 shrink-0 text-accent" />
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={t('ai.placeholder')} className="h-9 min-w-0 flex-1 bg-transparent text-[13.5px] text-t1 outline-none placeholder:text-t3" aria-label="AI savol" />
          <button type="submit" disabled={!input.trim() || thinking} className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-white transition disabled:opacity-40" aria-label="Yuborish"><Send className="h-4 w-4" /></button>
        </form>
        <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-snug text-t3"><ShieldCheck className="mt-px h-3 w-3 shrink-0" />AI javoblari DEMO ma’lumotlarga asoslangan va rasmiy moliyaviy/soliq maslahati emas. AI hech qachon buxgalteriya yozuvlarini o‘zi o‘zgartirmaydi — barcha takliflar tasdiqlashdan o‘tadi.</p>
      </div>
      <Modal open={!!explain} onClose={() => setExplain(null)} title="Hisob-kitob qanday qilingan?" icon={<Info className="h-4 w-4" />} size="md">
        {explain && (
          <div className="space-y-3 text-[13px] leading-relaxed text-t2">
            {explain.explain && <p>{explain.explain}</p>}
            <div><p className="mb-1 text-[11.5px] font-semibold uppercase tracking-wide text-t3">Ma’lumot manbalari</p><ul className="list-disc space-y-0.5 pl-5">{explain.sources.map((s) => <li key={s}>{s}</li>)}</ul></div>
            <p className="rounded-xl border border-line bg-surface-2 p-3 text-[12px]">Bu javob brauzer ichidagi qoidaga asoslangan tahlil dvigateli tomonidan tayyorlangan. Tashqi AI modeli ulanmagan (Sozlamalar → Integratsiyalar).</p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AiAvatar() { return <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-card"><Sparkles className="h-4 w-4" /></div>; }

function AnswerView({ a, onAction, compact }: { a: AiAnswer; onAction: (x: AiAction) => void; compact?: boolean }) {
  const meta = INSIGHT_META[a.insight];
  return (
    <div className="anim-rise flex gap-3">
      <AiAvatar />
      <div className="min-w-0 max-w-[96%] flex-1 rounded-2xl rounded-tl-md border border-line bg-surface-2 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2"><span className={cx('rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold', meta.tone)}>{meta.label}</span><Badge tone="warn">DEMO</Badge></div>
        <h4 className="text-[14px] font-semibold text-t1">{a.title}</h4>
        {a.metrics && a.metrics.length > 0 && (
          <div className={cx('mt-3 grid gap-2', compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4')}>
            {a.metrics.map((m) => <div key={m.label} className="rounded-xl border border-line bg-surface-solid/60 p-2.5"><div className="truncate text-[10.5px] text-t3">{m.label}</div><div className="num mt-0.5 text-[14px] font-semibold text-t1">{m.value}</div>{m.delta !== undefined && <Delta v={m.delta} good={m.good} />}</div>)}
          </div>
        )}
        <div className="mt-3 space-y-2">
          {a.blocks.map((b, i) => (
            <div key={i} className={cx('rounded-xl border-l-[3px] border px-3 py-2', KIND[b.kind].cls)}>
              <Badge tone={KIND[b.kind].badge} className="mb-1">{KIND[b.kind].label}</Badge>
              <p className="text-[12.8px] leading-relaxed text-t1">{b.text}</p>
            </div>
          ))}
        </div>
        {a.table && a.table.rows.length > 0 && (
          <div className="thin-scroll mt-3 overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-[12px]"><thead className="bg-surface-3"><tr>{a.table.cols.map((c) => <th key={c} className="whitespace-nowrap px-2.5 py-1.5 text-left font-semibold text-t3">{c}</th>)}</tr></thead>
              <tbody>{a.table.rows.map((r, i) => <tr key={i} className="border-t border-line">{r.map((c, j) => <td key={j} className={cx('whitespace-nowrap px-2.5 py-1.5 text-t1', j > 0 && 'num')}>{c}</td>)}</tr>)}</tbody></table>
          </div>
        )}
        {a.actions.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{a.actions.map((x) => <Button key={x.label} size="xs" variant={x.type === 'propose' ? 'primary' : x.type === 'nav' ? 'secondary' : 'soft'} onClick={() => onAction(x)} icon={x.type === 'propose' ? <ShieldCheck className="h-3 w-3" /> : x.type === 'explain' ? <Info className="h-3 w-3" /> : undefined}>{x.label}</Button>)}</div>}
        {a.sources.length > 0 && <p className="mt-2.5 text-[10.5px] text-t3">Manba: {a.sources.join(' · ')}</p>}
      </div>
    </div>
  );
}
