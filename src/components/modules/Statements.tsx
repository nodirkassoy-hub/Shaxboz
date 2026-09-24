'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import { pnl, balanceSheet, cashFlow } from '@/lib/core/ledger';
import { fmtDate } from '@/lib/core/dates';
import { prevPeriod } from '@/lib/analytics';
import { Card, CardHeader, Segmented, Badge, cx, Explain, DemoTag, Delta } from '@/components/ui';
import { ExportButton } from '@/components/ui/Export';
import { change } from '@/lib/core/money';

type Row = { label: ReactNode; v: number; p?: number; lvl?: 0 | 1 | 2; bold?: boolean; neg?: boolean; line?: boolean; exp?: string };

function Table({ rows, showPrev, prevLabel, curLabel }: { rows: Row[]; showPrev: boolean; prevLabel: string; curLabel: string }) {
  const { mf } = useCtx();
  return (
    <div className="thin-scroll overflow-x-auto">
      <table className="w-full min-w-[520px] text-[13px]">
        <thead><tr className="border-b border-line text-[11px] uppercase tracking-wide text-t3"><th className="py-2 text-left font-semibold">Modda</th><th className="py-2 text-right font-semibold">{curLabel}</th>{showPrev && <><th className="py-2 text-right font-semibold">{prevLabel}</th><th className="w-20 py-2 text-right font-semibold">Farq</th></>}</tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i} className={cx(r.line && 'border-t border-line-strong', r.bold && 'font-semibold')}>
            <td className={cx('py-1.5 text-t1', r.lvl === 1 && 'pl-4 text-t2', r.lvl === 2 && 'pl-8 text-[12.5px] text-t3')}>{r.label}</td>
            <td className={cx('num py-1.5 text-right', r.v < 0 ? 'text-neg' : 'text-t1')}>{r.neg && r.v > 0 ? `(${mf(r.v)})` : mf(r.v)}</td>
            {showPrev && <><td className="num py-1.5 text-right text-t3">{r.p !== undefined ? (r.neg && r.p > 0 ? `(${mf(r.p)})` : mf(r.p)) : ''}</td><td className="py-1.5 text-right">{r.p !== undefined && r.bold ? <Delta v={change(r.v, r.p)} good={r.neg ? 'down' : 'up'} /> : null}</td></>}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

export function Statements({ initial = 'pnl' }: { initial?: 'pnl' | 'bs' | 'cf' }) {
  const [st, setSt] = useState<'pnl' | 'bs' | 'cf'>(initial);
  return (
    <div className="space-y-3">
      <Segmented value={st} onChange={setSt} options={[{ id: 'pnl', label: 'Foyda va zarar' }, { id: 'bs', label: 'Buxgalteriya balansi' }, { id: 'cf', label: 'Pul oqimlari' }]} />
      {st === 'pnl' && <PnL />}{st === 'bs' && <BS />}{st === 'cf' && <CF />}
    </div>
  );
}

export function PnL() {
  const { db, s, from, to } = useCtx();
  const pp = prevPeriod(from, to);
  const a = useMemo(() => pnl(db.entries, s, from, to), [db, s, from, to]); const b = useMemo(() => pnl(db.entries, s, pp.from, pp.to), [db, s, pp.from, pp.to]);
  const pv = (arr: { code: string; amount: number }[], code: string) => arr.find((x) => x.code === code)?.amount ?? 0;
  const rows: Row[] = [
    { label: 'Sotishdan tushum (QQSsiz)', v: a.revenue, p: b.revenue, bold: true },
    ...a.revenueLines.map((l) => ({ label: `${l.code} ${l.name}`, v: l.amount, p: pv(b.revenueLines, l.code), lvl: 2 as const })),
    { label: 'Sotish tannarxi', v: a.cogs, p: b.cogs, bold: true, neg: true },
    ...a.cogsLines.map((l) => ({ label: `${l.code} ${l.name}`, v: l.amount, p: pv(b.cogsLines, l.code), lvl: 2 as const, neg: true })),
    { label: <span className="flex items-center">Yalpi foyda <span className="ml-2 text-[11px] font-normal text-t3">{a.grossMargin.toFixed(1)}%</span></span>, v: a.gross, p: b.gross, bold: true, line: true },
    ...a.opexGroups.flatMap((g) => [{ label: g.group, v: g.amount, p: b.opexGroups.find((x) => x.group === g.group)?.amount ?? 0, lvl: 1 as const, neg: true }, ...g.lines.map((l) => ({ label: `${l.code} ${l.name}`, v: l.amount, p: b.opexGroups.flatMap((x) => x.lines).find((x) => x.code === l.code)?.amount ?? 0, lvl: 2 as const, neg: true }))]),
    { label: 'Operatsion foyda', v: a.operating, p: b.operating, bold: true, line: true },
    { label: 'Boshqa daromadlar', v: a.otherIncome, p: b.otherIncome, lvl: 1 },
    { label: 'Moliyaviy xarajatlar (foizlar)', v: a.financeCost, p: b.financeCost, lvl: 1, neg: true },
    { label: 'Soliqqa tortilgunga qadar foyda', v: a.pbt, p: b.pbt, bold: true, line: true },
    { label: 'Foyda solig‘i (hisoblangan)', v: a.incomeTax, p: b.incomeTax, lvl: 1, neg: true },
    { label: <span className="flex items-center">Sof foyda <span className="ml-2 text-[11px] font-normal text-t3">{a.netMargin.toFixed(1)}%</span></span>, v: a.net, p: b.net, bold: true, line: true },
  ];
  return (
    <Card>
      <CardHeader title="Foyda va zarar hisoboti" subtitle={`${fmtDate(from)}–${fmtDate(to)} · solishtirma: ${fmtDate(pp.from)}–${fmtDate(pp.to)}`} actions={<><DemoTag /><ExportButton module="reports" name="foyda-zarar" title="Foyda va zarar hisoboti" cols={[{ key: 'l', label: 'Modda' }, { key: 'v', label: 'Joriy', type: 'money' }, { key: 'p', label: 'Oldingi', type: 'money' }]} rows={() => rows.map((r) => ({ l: typeof r.label === 'string' ? r.label : '', v: r.v, p: r.p ?? '' }))} /></>} />
      <Table rows={rows} showPrev curLabel="Joriy davr" prevLabel="Oldingi" />
      <p className="mt-3 text-[11.5px] text-t3">Foyda solig‘i choraklik hisoblanadi (sozlanadigan stavka); joriy chorak uchun hali hisoblanmagan bo‘lishi mumkin. Ish haqi va amortizatsiya oy oxirida hisoblanadi.</p>
    </Card>
  );
}

export function BS() {
  const { db, s, to } = useCtx();
  const bs = useMemo(() => balanceSheet(db.entries, s, to), [db, s, to]);
  const g = (arr: typeof bs.current): Row[] => arr.flatMap((x) => [{ label: x.group, v: x.amount, lvl: 1 as const, bold: true }, ...x.lines.map((l) => ({ label: `${l.code} ${l.name}`, v: l.amount, lvl: 2 as const }))]);
  const assets: Row[] = [{ label: 'I. Uzoq muddatli aktivlar', v: bs.totalNonCurrent, bold: true }, ...g(bs.nonCurrent), { label: 'II. Joriy aktivlar', v: bs.totalCurrent, bold: true, line: true }, ...g(bs.current), { label: 'AKTIVLAR JAMI', v: bs.totalAssets, bold: true, line: true }];
  const le: Row[] = [{ label: 'III. Majburiyatlar', v: bs.totalLiabilities, bold: true }, ...g(bs.liabilities), { label: 'IV. Xususiy kapital', v: bs.totalEquity, bold: true, line: true }, ...bs.equity.map((e) => ({ label: `${e.code} ${e.name}`, v: e.amount, lvl: 2 as const })), { label: 'Joriy yil sof foydasi (yopilmagan)', v: bs.currentEarnings, lvl: 2 }, { label: 'PASSIVLAR JAMI', v: bs.totalLE, bold: true, line: true }];
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader title="Aktivlar" subtitle={`${fmtDate(to)} holatiga`} actions={<Badge tone={bs.balanced ? 'pos' : 'neg'} dot>{bs.balanced ? 'Aktiv = Passiv' : 'Balans buzilgan'}</Badge>} /><Table rows={assets} showPrev={false} curLabel="Summa" prevLabel="" /></Card>
      <Card><CardHeader title="Passivlar" subtitle="Majburiyatlar va kapital" actions={<ExportButton module="reports" name="balans" title={`Buxgalteriya balansi ${fmtDate(to)}`} cols={[{ key: 'l', label: 'Modda' }, { key: 'v', label: 'Summa', type: 'money' }]} rows={() => [...assets, ...le].map((r) => ({ l: typeof r.label === 'string' ? r.label : '', v: r.v }))} />} /><Table rows={le} showPrev={false} curLabel="Summa" prevLabel="" />
        <p className={cx('mt-3 flex items-center gap-1.5 text-[12px]', bs.balanced ? 'text-pos' : 'text-neg')}>{bs.balanced ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}Balans tengligi: Aktivlar − Passivlar = {Math.round(bs.totalAssets - bs.totalLE)} so‘m</p>
      </Card>
    </div>
  );
}

export function CF() {
  const { db, s, from, to } = useCtx();
  const cf = useMemo(() => cashFlow(db.entries, s, from, to), [db, s, from, to]);
  const rows: Row[] = [{ label: 'Davr boshidagi pul qoldig‘i', v: cf.opening, bold: true }, ...cf.sections.flatMap((x) => [{ label: x.label, v: x.total, bold: true, line: true }, ...x.lines.map((l) => ({ label: l.label, v: l.amount, lvl: 1 as const }))]), { label: 'Pul mablag‘larining sof o‘zgarishi', v: cf.net, bold: true, line: true }, { label: 'Davr oxiridagi pul qoldig‘i', v: cf.closing, bold: true }];
  return (
    <Card>
      <CardHeader title={<span className="flex items-center">Pul oqimlari hisoboti (to‘g‘ridan-to‘g‘ri usul)<Explain term="Cash Flow">biznesga kirayotgan va chiqayotgan real pul oqimi. Foydadan farqli ravishda, faqat haqiqatda kelgan/ketgan pulni ko‘rsatadi.</Explain></span>} subtitle={`${fmtDate(from)}–${fmtDate(to)} · ichki o‘tkazmalar chiqarilgan`}
        actions={<ExportButton module="reports" name="pul-oqimi" title="Pul oqimlari hisoboti" cols={[{ key: 'l', label: 'Modda' }, { key: 'v', label: 'Summa', type: 'money' }]} rows={() => rows.map((r) => ({ l: typeof r.label === 'string' ? r.label : '', v: r.v }))} />} />
      <Table rows={rows} showPrev={false} curLabel="Summa" prevLabel="" />
    </Card>
  );
}
