'use client';
import { useMemo, useState } from 'react';
import { Upload, FileSpreadsheet, Columns3, ShieldCheck, Eye, CheckCircle2, AlertTriangle, Download, ArrowRight } from 'lucide-react';
import { useApp } from '@/lib/store';
import { Modal, Button, Select, cx, Badge } from '@/components/ui';
import { exportCSV } from '@/lib/exporter';
import { TODAY } from '@/lib/core/dates';

export type ImportKind = 'bank' | 'products' | 'customers';

interface FieldDef { key: string; label: string; required?: boolean; type: 'text' | 'number' | 'date'; aliases: string[] }
const SCHEMAS: Record<ImportKind, { title: string; fields: FieldDef[]; sample: Record<string, string | number>[] }> = {
  bank: { title: 'Bank ko‘chirmasi', fields: [
    { key: 'date', label: 'Sana', required: true, type: 'date', aliases: ['sana', 'date', 'дата'] },
    { key: 'description', label: 'Izoh / to‘lov maqsadi', required: true, type: 'text', aliases: ['izoh', 'description', 'maqsad', 'назначение', 'purpose'] },
    { key: 'amount', label: 'Summa (+kirim / −chiqim)', required: true, type: 'number', aliases: ['summa', 'amount', 'сумма'] },
  ], sample: [{ Sana: '2026-09-23', Izoh: 'Kirim: Silk Road Trading to‘lov', Summa: 12500000 }, { Sana: '2026-09-23', Izoh: 'Bank komissiyasi', Summa: -95000 }, { Sana: '23.09.2026', Izoh: 'Kirim: Mega Savdo', Summa: '8 400 000' }] },
  products: { title: 'Mahsulotlar', fields: [
    { key: 'sku', label: 'SKU', required: true, type: 'text', aliases: ['sku', 'artikul', 'код'] },
    { key: 'name', label: 'Nomi', required: true, type: 'text', aliases: ['nomi', 'name', 'наименование'] },
    { key: 'unit', label: 'Birlik', type: 'text', aliases: ['birlik', 'unit', 'ед'] },
    { key: 'price', label: 'Sotuv narxi', required: true, type: 'number', aliases: ['narx', 'price', 'цена'] },
    { key: 'cost', label: 'Tannarx', type: 'number', aliases: ['tannarx', 'cost', 'себестоимость'] },
  ], sample: [{ SKU: 'TRD-LED-18', Nomi: 'LED panel 30×30 18W', Birlik: 'dona', Narx: 98000, Tannarx: 61000 }, { SKU: 'TRD-KAB-15', Nomi: 'Kabel VVG 3×1.5', Birlik: 'metr', Narx: 9800, Tannarx: 6400 }] },
  customers: { title: 'Mijozlar', fields: [
    { key: 'name', label: 'Nomi', required: true, type: 'text', aliases: ['nomi', 'name', 'наименование', 'kompaniya'] },
    { key: 'stir', label: 'STIR (INN)', required: true, type: 'text', aliases: ['stir', 'inn', 'инн'] },
    { key: 'phone', label: 'Telefon', type: 'text', aliases: ['telefon', 'phone', 'тел'] },
    { key: 'terms', label: 'To‘lov muddati (kun)', type: 'number', aliases: ['muddat', 'terms', 'срок'] },
  ], sample: [{ Nomi: 'Andijon Savdo MChJ', STIR: '315 222 111', Telefon: '+998 74 222 11 00', Muddat: 30 }, { Nomi: 'Qarshi Elektr', STIR: '12345', Telefon: '', Muddat: 15 }] },
};

function parseCSV(text: string): string[][] {
  const delim = (text.split('\n')[0].match(/;/g)?.length || 0) >= (text.split('\n')[0].match(/,/g)?.length || 0) ? ';' : ',';
  const rows: string[][] = []; let cur: string[] = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { f += '"'; i++; } else if (c === '"') q = false; else f += c; }
    else if (c === '"') q = true; else if (c === delim) { cur.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; cur.push(f); rows.push(cur); cur = []; f = ''; } else f += c;
  }
  if (f || cur.length) { cur.push(f); rows.push(cur); }
  return rows.filter((r) => r.some((x) => x.trim()));
}

const normNum = (v: unknown) => { if (typeof v === 'number') return v; const s = String(v ?? '').replace(/\s|\u00a0/g, '').replace(',', '.'); return s === '' ? NaN : Number(s); };
const normDate = (v: unknown) => { if (v instanceof Date) return v.toISOString().slice(0, 10); const s = String(v ?? '').trim(); const m = s.match(/^(\d{2})[./](\d{2})[./](\d{4})$/); if (m) return `${m[3]}-${m[2]}-${m[1]}`; return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; };

export function ImportWizard({ kind, onClose, companyId = 'trd' }: { kind: ImportKind; onClose: () => void; companyId?: string }) {
  const schema = SCHEMAS[kind]; const { dispatch, db } = useApp();
  const [step, setStep] = useState(0); const [file, setFile] = useState(''); const [head, setHead] = useState<string[]>([]); const [data, setData] = useState<unknown[][]>([]);
  const [map, setMap] = useState<Record<string, number>>({}); const [err, setErr] = useState(''); const [skipBad, setSkipBad] = useState(true);
  const steps = [{ l: 'Yuklash', i: Upload }, { l: 'Ustunlar', i: Columns3 }, { l: 'Tekshirish', i: ShieldCheck }, { l: 'Ko‘rib chiqish', i: Eye }, { l: 'Import', i: CheckCircle2 }];

  const onFile = async (f: File) => {
    setErr(''); setFile(f.name);
    try {
      let rows: unknown[][];
      if (/\.xlsx$/i.test(f.name)) { const mod = await import('read-excel-file/browser'); rows = (await mod.readSheet(f)) as unknown[][]; }
      else if (/\.(csv|txt)$/i.test(f.name)) rows = parseCSV(await f.text());
      else throw new Error('Faqat .xlsx, .csv yoki .txt fayllar qo‘llab-quvvatlanadi');
      if (rows.length < 2) throw new Error('Faylda sarlavha va kamida bitta qator bo‘lishi kerak');
      const h = rows[0].map((x) => String(x ?? '').trim()); setHead(h); setData(rows.slice(1));
      const auto: Record<string, number> = {}; schema.fields.forEach((fd) => { const i = h.findIndex((x) => fd.aliases.some((a) => x.toLowerCase().includes(a))); if (i >= 0) auto[fd.key] = i; });
      setMap(auto); setStep(1);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };

  const validated = useMemo(() => data.map((r, idx) => {
    const errors: string[] = []; const out: Record<string, string | number> = {};
    for (const fd of schema.fields) {
      const i = map[fd.key]; const raw = i === undefined ? '' : r[i];
      if (fd.type === 'number') { const n = normNum(raw); if (Number.isNaN(n)) { if (fd.required) errors.push(`${fd.label}: son emas`); } else out[fd.key] = n; }
      else if (fd.type === 'date') { const d = normDate(raw); if (!d) errors.push(`${fd.label}: sana formati noto‘g‘ri (YYYY-MM-DD yoki DD.MM.YYYY)`); else if (d > TODAY) errors.push('Sana kelajakda'); else out[fd.key] = d; }
      else { const s = String(raw ?? '').trim(); if (!s && fd.required) errors.push(`${fd.label}: bo‘sh`); out[fd.key] = s; }
    }
    if (kind === 'products' && out.sku && db.products.some((p) => p.sku === out.sku)) errors.push('SKU allaqachon mavjud');
    if (kind === 'customers' && out.stir && String(out.stir).replace(/\D/g, '').length !== 9) errors.push('STIR 9 xonali bo‘lishi kerak');
    if (kind === 'customers' && out.stir && db.parties.some((p) => p.stir === out.stir)) errors.push('Bu STIR bilan mijoz mavjud');
    if (kind === 'bank' && out.amount === 0) errors.push('Summa 0');
    return { row: idx + 2, out, errors };
  }), [data, map, schema, kind, db]);
  const bad = validated.filter((v) => v.errors.length); const good = validated.filter((v) => !v.errors.length);
  const missing = schema.fields.filter((f) => f.required && map[f.key] === undefined);

  const doImport = () => {
    const rows = good.map((g) => g.out);
    let r: unknown;
    if (kind === 'bank') r = dispatch('bank.import', { lines: rows.map((x) => ({ date: x.date, description: x.description, amount: x.amount, companyId, account: '5110' })) }, { success: `${rows.length} ta bank qatori import qilindi` });
    if (kind === 'products') { for (const x of rows) r = dispatch('product.create', { sku: x.sku, name: x.name, unit: x.unit || 'dona', price: x.price, stdCost: x.cost || 0, companyId, category: 'Import', kind: 'goods', barcode: '—', vat: 12, reorderPoint: 0, reorderQty: 0 }, { silent: true }); useApp.getState().toast({ kind: 'success', title: `${rows.length} ta mahsulot import qilindi` }); }
    if (kind === 'customers') { for (const x of rows) r = dispatch('party.create', { code: 'IMP', name: x.name, kind: 'customer', companyIds: [companyId], branchId: 'tas', stir: String(x.stir), phone: String(x.phone || ''), email: '—', address: '—', terms: Number(x.terms) || 30, segment: 'Import', behaviour: 'normal' }, { silent: true }); useApp.getState().toast({ kind: 'success', title: `${rows.length} ta mijoz import qilindi` }); }
    if (r !== undefined) setStep(4);
  };

  return (
    <Modal open onClose={onClose} size="lg" title={`Import ustaxonasi: ${schema.title}`} subtitle="Excel (.xlsx) yoki CSV · fayl brauzerda qayta ishlanadi" icon={<FileSpreadsheet className="h-4 w-4" />}
      footer={step === 4 ? <Button variant="primary" onClick={onClose}>Yopish</Button> : <>
        {step > 0 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Orqaga</Button>}
        {step === 1 && <Button variant="primary" disabled={missing.length > 0} onClick={() => setStep(2)}>Tekshirish <ArrowRight className="h-3.5 w-3.5" /></Button>}
        {step === 2 && <Button variant="primary" disabled={!good.length || (!skipBad && bad.length > 0)} onClick={() => setStep(3)}>Ko‘rib chiqish <ArrowRight className="h-3.5 w-3.5" /></Button>}
        {step === 3 && <Button variant="primary" onClick={doImport}>{good.length} ta qatorni import qilish</Button>}
      </>}>
      <div className="mb-5 flex items-center gap-1">{steps.map((s, i) => { const I = s.i; return <div key={s.l} className="flex flex-1 items-center gap-1"><div className={cx('flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11.5px] font-medium', i === step ? 'bg-accent-soft text-accent' : i < step ? 'text-pos' : 'text-t3')}><I className="h-3.5 w-3.5" /><span className="hidden sm:inline">{s.l}</span></div>{i < steps.length - 1 && <div className={cx('h-px flex-1', i < step ? 'bg-pos' : 'bg-line')} />}</div>; })}</div>
      {step === 0 && (
        <div>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line bg-surface-2 px-6 py-10 text-center hover:border-accent">
            <Upload className="mb-2 h-7 w-7 text-t3" /><span className="text-[13.5px] font-semibold text-t1">Faylni tanlang</span><span className="mt-1 text-[12px] text-t3">.xlsx, .csv (“;” yoki “,” ajratgich, UTF-8)</span>
            <input type="file" accept=".xlsx,.csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
          </label>
          {err && <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-neg"><AlertTriangle className="h-4 w-4" />{err}</p>}
          <div className="mt-4 flex items-center justify-between rounded-xl border border-line p-3"><span className="text-[12.5px] text-t2">Namuna shablon (xatolar bilan — tekshiruvni sinash uchun)</span><Button size="xs" icon={<Download className="h-3 w-3" />} onClick={() => exportCSV(`shablon-${kind}`, Object.keys(schema.sample[0]).map((k) => ({ key: k, label: k })), schema.sample)}>CSV shablon</Button></div>
        </div>
      )}
      {step === 1 && (
        <div className="space-y-2.5">
          <p className="text-[12.5px] text-t2"><b className="text-t1">{file}</b> · {data.length} qator · {head.length} ustun. Tizim maydonlarini fayl ustunlariga moslang:</p>
          {schema.fields.map((f) => <div key={f.key} className="grid grid-cols-[1fr_1fr] items-center gap-3 rounded-xl border border-line px-3 py-2"><span className="text-[13px] text-t1">{f.label}{f.required && <span className="text-neg"> *</span>}</span><Select className="h-8 text-[12.5px]" value={map[f.key] ?? ''} onChange={(e) => setMap({ ...map, [f.key]: e.target.value === '' ? undefined as never : +e.target.value })}><option value="">— tanlanmagan —</option>{head.map((h, i) => <option key={i} value={i}>{h || `Ustun ${i + 1}`}</option>)}</Select></div>)}
          {missing.length > 0 && <p className="text-[12px] text-neg">Majburiy maydonlar moslanmagan: {missing.map((m) => m.label).join(', ')}</p>}
        </div>
      )}
      {step === 2 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center"><div className="rounded-xl bg-surface-2 p-3"><p className="num text-[18px] font-semibold text-t1">{validated.length}</p><p className="text-[11px] text-t3">Jami qator</p></div><div className="rounded-xl bg-pos/10 p-3"><p className="num text-[18px] font-semibold text-pos">{good.length}</p><p className="text-[11px] text-t3">To‘g‘ri</p></div><div className="rounded-xl bg-neg/10 p-3"><p className="num text-[18px] font-semibold text-neg">{bad.length}</p><p className="text-[11px] text-t3">Xato</p></div></div>
          {bad.length > 0 && <div className="thin-scroll max-h-56 space-y-1 overflow-y-auto rounded-xl border border-neg/25 p-2">{bad.map((b) => <div key={b.row} className="flex gap-2 text-[12px]"><Badge tone="neg">{b.row}-qator</Badge><span className="text-t2">{b.errors.join('; ')}</span></div>)}</div>}
          {bad.length > 0 && <label className="flex items-center gap-2 text-[12.5px] text-t2"><input type="checkbox" checked={skipBad} onChange={(e) => setSkipBad(e.target.checked)} className="accent-[var(--accent)]" />Xato qatorlarni o‘tkazib yuborib, faqat to‘g‘rilarini import qilish</label>}
        </div>
      )}
      {step === 3 && (
        <div className="thin-scroll max-h-72 overflow-auto rounded-xl border border-line"><table className="w-full text-[12px]"><thead className="sticky top-0 bg-surface-2"><tr><th className="px-2 py-1.5 text-left text-t3">#</th>{schema.fields.map((f) => <th key={f.key} className="px-2 py-1.5 text-left font-semibold text-t3">{f.label}</th>)}</tr></thead><tbody>{good.map((g) => <tr key={g.row} className="border-t border-line"><td className="px-2 py-1 text-t3">{g.row}</td>{schema.fields.map((f) => <td key={f.key} className={cx('px-2 py-1 text-t1', f.type === 'number' && 'num text-right')}>{typeof g.out[f.key] === 'number' ? (g.out[f.key] as number).toLocaleString('ru-RU') : String(g.out[f.key] ?? '')}</td>)}</tr>)}</tbody></table></div>
      )}
      {step === 4 && <div className="flex flex-col items-center py-8 text-center"><div className="anim-check grid h-14 w-14 place-items-center rounded-full bg-pos/15 text-pos"><CheckCircle2 className="h-7 w-7" /></div><p className="mt-3 text-[15px] font-semibold text-t1">Import muvaffaqiyatli yakunlandi</p><p className="mt-1 text-[12.5px] text-t3">{good.length} ta yozuv qo‘shildi{bad.length ? `, ${bad.length} ta xato qator o‘tkazib yuborildi` : ''}. Amal audit jurnaliga yozildi.</p></div>}
    </Modal>
  );
}
