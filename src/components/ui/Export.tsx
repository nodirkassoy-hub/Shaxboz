'use client';
import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileDown, Check } from 'lucide-react';
import { Button, Modal, cx } from './index';
import { exportCSV, exportXLS, exportPDF, type Column, type Row } from '@/lib/exporter';
import { useApp } from '@/lib/store';
import { can } from '@/lib/rbac';
import { fmtDate } from '@/lib/core/dates';
import type { ModuleId } from '@/lib/types';

export function ExportButton({ name, title, cols, rows, module, size = 'sm', meta }: { name: string; title: string; cols: Column[]; rows: () => Row[]; module: ModuleId; size?: 'xs' | 'sm'; meta?: string[] }) {
  const [open, setOpen] = useState(false);
  const [fmt, setFmt] = useState<'xls' | 'csv' | 'pdf'>('xls');
  const { role, filters, db, dispatch, toast } = useApp();
  if (!can(role, module, 'export')) return null;
  const co = filters.companyId === 'all' ? 'BALANS GROUP' : db.companies.find((c) => c.id === filters.companyId)?.name;
  const m = [co || '', `Davr: ${fmtDate(filters.from)} – ${fmtDate(filters.to)}`, `Valyuta: ${filters.currency === 'UZS' ? 'so‘m' : filters.currency}`, 'DEMO ma’lumot', ...(meta || [])];
  const run = () => {
    const r = rows();
    if (fmt === 'csv') exportCSV(name, cols, r);
    if (fmt === 'xls') exportXLS(name, title, cols, r, m);
    if (fmt === 'pdf' && !exportPDF(title, cols, r, m)) { toast({ kind: 'error', title: 'Brauzer yangi oynani blokladi', body: 'Pop-up ruxsatini yoqing va qayta urinib ko‘ring.' }); return; }
    dispatch('export.log', { what: `${title} (${fmt.toUpperCase()}, ${r.length} qator)` }, { success: `${title}: ${fmt.toUpperCase()} tayyor (${r.length} qator)` });
    setOpen(false);
  };
  const opts = [
    { id: 'xls' as const, label: 'Excel (.xls)', desc: 'Formatlangan jadval, Excel/LibreOffice’da ochiladi', icon: <FileSpreadsheet className="h-5 w-5" /> },
    { id: 'csv' as const, label: 'CSV', desc: 'UTF-8, “;” ajratgich — import uchun qulay', icon: <FileDown className="h-5 w-5" /> },
    { id: 'pdf' as const, label: 'PDF (chop etish)', desc: 'Brauzerning “PDF sifatida saqlash” funksiyasi orqali', icon: <FileText className="h-5 w-5" /> },
  ];
  return (
    <>
      <Button size={size} icon={<Download className="h-3.5 w-3.5" />} onClick={() => setOpen(true)}>Eksport</Button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Eksport: ${title}`} subtitle={m.slice(0, 3).join(' · ')} size="sm" icon={<Download className="h-4 w-4" />}
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Bekor qilish</Button><Button variant="primary" onClick={run} icon={<Download className="h-4 w-4" />}>Yuklab olish</Button></>}>
        <div className="space-y-2">
          {opts.map((o) => (
            <button key={o.id} onClick={() => setFmt(o.id)} className={cx('flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition', fmt === o.id ? 'border-accent bg-accent-soft' : 'border-line hover:bg-surface-2')}>
              <span className={cx('grid h-10 w-10 place-items-center rounded-xl', fmt === o.id ? 'bg-accent text-white' : 'bg-surface-3 text-t2')}>{o.icon}</span>
              <span className="flex-1"><span className="block text-[13px] font-semibold text-t1">{o.label}</span><span className="block text-[12px] text-t3">{o.desc}</span></span>
              {fmt === o.id && <Check className="h-4 w-4 text-accent" />}
            </button>
          ))}
          <p className="pt-1 text-[11.5px] text-t3">Eksport joriy filtrlarni (kompaniya, filial, davr, valyuta) hisobga oladi va audit jurnaliga yoziladi.</p>
        </div>
      </Modal>
    </>
  );
}
