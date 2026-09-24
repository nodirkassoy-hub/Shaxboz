'use client';
import { useMemo, useState } from 'react';
import { CheckCheck, Check, X, MessageSquare, Clock, ShieldCheck, Sparkles, ShoppingCart, Receipt, Wallet, UserRound, Boxes, Factory, BookOpen, CalendarClock, History } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import { canDecide, roleOf, ROLES } from '@/lib/rbac';
import { byId } from '@/lib/db';
import { fmtDate, fmtDateTime, diffDays, TODAY } from '@/lib/core/dates';
import { PageHeader, Card, Button, Badge, Modal, Textarea, StatusBadge, cx, Segmented, Empty, Avatar } from '@/components/ui';
import type { ApprovalItem, ApprovalKind } from '@/lib/types';

const KIND: Record<ApprovalKind, { l: string; icon: typeof Check }> = {
  purchase_order: { l: 'Xarid buyurtmasi', icon: ShoppingCart }, expense: { l: 'Xarajat', icon: Receipt }, payment: { l: 'To‘lov', icon: Wallet }, invoice: { l: 'Hisob-faktura / chegirma', icon: Receipt },
  payroll: { l: 'Ish haqi', icon: UserRound }, stock_adjustment: { l: 'Ombor tuzatishi', icon: Boxes }, production: { l: 'Ishlab chiqarish so‘rovi', icon: Factory }, journal: { l: 'Qo‘lda provodka', icon: BookOpen },
  ai_action: { l: 'AI taklifi', icon: Sparkles }, leave: { l: 'Ta’til', icon: CalendarClock },
};
const EFFECT: Record<string, string> = {
  approve_po: 'PO tasdiqlanadi → ta’minotchiga yuborishga tayyor, ombor “yo‘lda” sifatida ko‘radi.', approve_payroll: 'Ish haqi provodkasi yaratiladi (Dt mehnat xarajatlari / Kt 6710, 6413, 6520).',
  approve_expense: 'Ta’minotchi hisobi va provodka yaratiladi (Dt xarajat + QQS / Kt 6010).', pay_supplier: 'Bank orqali to‘lov provodkasi (Dt 6010 / Kt 5110).', adjust_stock: 'Ombor qoldig‘i tuzatiladi va kamomad provodkasi yaratiladi (Dt 9432 / Kt zaxira).',
  approve_quote: 'Taklif buyurtmaga aylanadi va zaxira rezervlanadi.', journal: 'Qo‘lda kiritilgan provodka bosh kitobga yoziladi.', ai_reminders: 'Eslatmalar navbatga qo‘yiladi (email ulanmagan — yuborilmaydi).',
  ai_purchase: 'Xarid so‘rovi yaratiladi va PO tasdiqlashga yuboriladi.', ai_recategorize: 'Tuzatuvchi provodka yaratiladi. Asl provodka o‘zgarmaydi.', leave: 'Ta’til tasdiqlanadi va davomat jadvaliga tushadi.', note: 'Moliyaviy provodka yaratilmaydi — faqat qaror qayd etiladi.',
};

export default function Approvals() {
  const { db, s, m } = useCtx(); const { role, dispatch } = useApp();
  const [f, setF] = useState<'mine' | 'pending' | 'decided'>('mine');
  const [dlg, setDlg] = useState<{ a: ApprovalItem; d: 'rejected' | 'changes_requested' } | null>(null); const [comment, setComment] = useState('');
  const all = db.approvals.filter((a) => s.companyIds.includes(a.companyId)).slice().reverse();
  const rows = all.filter((a) => (f === 'decided' ? a.status !== 'pending' : a.status === 'pending' && (f === 'pending' || canDecide(role, a.approverRole))));
  const mine = all.filter((a) => a.status === 'pending' && canDecide(role, a.approverRole)).length;
  const decide = (a: ApprovalItem, d: 'approved' | 'rejected' | 'changes_requested', c = '') => dispatch('approval.decide', { id: a.id, decision: d, comment: c }, { success: d === 'approved' ? 'Tasdiqlandi — tegishli amal bajarildi' : d === 'rejected' ? 'Rad etildi' : 'O‘zgartirish so‘raldi' });
  return (
    <div>
      <PageHeader title="Tasdiqlash markazi" crumbs={['Umumiy']} subtitle="Xaridlar, xarajatlar, to‘lovlar, ish haqi, ombor tuzatishlari, ishlab chiqarish va AI takliflari — bitta navbatda. Tasdiqlashdan oldin hech qanday moliyaviy yozuv o‘zgarmaydi."
        actions={<Segmented value={f} onChange={setF} options={[{ id: 'mine', label: `Mening navbatim (${mine})` }, { id: 'pending', label: 'Barcha kutilayotgan' }, { id: 'decided', label: 'Tarix' }]} />} />
      <div className="mb-4 flex items-center gap-2 rounded-2xl border border-line bg-surface-2 px-4 py-2.5 text-[12.5px] text-t2"><ShieldCheck className="h-4 w-4 text-pos" />Siz: <b className="text-t1">{roleOf(role).persona}</b> ({roleOf(role).label}). Vakolat: CFO — 100 mln so‘mdan yuqori xaridlar, Bosh buxgalter — undan past; CEO/Egasi — barchasi.</div>
      {rows.length === 0 ? <Card><Empty icon={<CheckCheck className="h-5 w-5" />} title={f === 'mine' ? 'Navbatingiz bo‘sh' : 'Yozuv yo‘q'} body={f === 'mine' ? 'Sizning tasdig‘ingizni kutayotgan so‘rov yo‘q. Boshqa rol tanlab ko‘rishingiz mumkin (profil menyusi).' : undefined} /></Card> : (
        <div className="stagger grid gap-3 lg:grid-cols-2">
          {rows.map((a) => { const K = KIND[a.kind]; const I = K.icon; const can = canDecide(role, a.approverRole) && a.status === 'pending'; const days = diffDays(a.deadline, TODAY); return (
            <Card key={a.id} className="flex flex-col !p-4">
              <div className="flex items-start gap-3">
                <div className={cx('grid h-10 w-10 shrink-0 place-items-center rounded-xl', a.kind === 'ai_action' ? 'bg-gradient-to-br from-accent to-accent-2 text-white' : 'bg-accent-soft text-accent')}><I className="h-4.5 w-4.5" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5"><Badge>{K.l}</Badge><Badge tone="neutral">{byId(db.companies, a.companyId)?.short}</Badge>{a.status === 'pending' ? <Badge tone={days < 0 ? 'neg' : days <= 1 ? 'warn' : 'neutral'}><Clock className="h-3 w-3" />{days < 0 ? `${-days} kun kechikdi` : days === 0 ? 'bugun' : `${days} kun`}</Badge> : <StatusBadge status={a.status} />}</div>
                  <p className="mt-1.5 text-[13.5px] font-semibold leading-snug text-t1">{a.title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-t2">{a.description}</p>
                </div>
                {a.amount ? <div className="shrink-0 text-right"><p className="num text-[15px] font-semibold text-t1">{m(a.amount)}</p></div> : null}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-2.5 text-[11.5px]">
                <span className="flex items-center gap-1.5 text-t3"><Avatar name={a.requestedBy} size={18} />So‘radi: <b className="font-medium text-t1">{a.requestedBy}</b></span>
                <span className="text-t3">Tasdiqlovchi: <b className="font-medium text-t1">{ROLES.find((r) => r.id === a.approverRole)?.label}</b></span>
                <span className="text-t3">Yaratildi: {fmtDate(a.requestedAt)}</span><span className="text-t3">Muddat: {fmtDate(a.deadline)}</span>
              </div>
              <p className="mt-2 text-[11.5px] text-t3"><b className="text-t2">Tasdiqlansa:</b> {EFFECT[a.payload.action] || EFFECT.note}</p>
              {a.status !== 'pending' && <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-t3"><History className="h-3 w-3" />{a.decidedBy} · {a.decidedAt ? fmtDateTime(a.decidedAt.length > 10 ? a.decidedAt : a.decidedAt + 'T12:00:00') : ''}{a.comment ? ` · “${a.comment}”` : ''}</p>}
              {can && <div className="mt-3 flex flex-wrap gap-1.5 border-t border-line pt-3"><Button size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} onClick={() => decide(a, 'approved')}>Tasdiqlash</Button><Button size="sm" variant="danger" icon={<X className="h-3.5 w-3.5" />} onClick={() => { setComment(''); setDlg({ a, d: 'rejected' }); }}>Rad etish</Button><Button size="sm" variant="ghost" icon={<MessageSquare className="h-3.5 w-3.5" />} onClick={() => { setComment(''); setDlg({ a, d: 'changes_requested' }); }}>O‘zgartirish so‘rash</Button></div>}
              {a.status === 'pending' && !can && <p className="mt-3 border-t border-line pt-2 text-[11.5px] text-t3">Sizning rolingiz bu so‘rovni tasdiqlay olmaydi (vakolatlar ajratilgan).</p>}
            </Card>
          ); })}
        </div>
      )}
      <Modal open={!!dlg} onClose={() => setDlg(null)} size="sm" title={dlg?.d === 'rejected' ? 'Rad etish sababi' : 'Qanday o‘zgartirish kerak?'} footer={<><Button variant="ghost" onClick={() => setDlg(null)}>Bekor qilish</Button><Button variant={dlg?.d === 'rejected' ? 'danger' : 'primary'} disabled={comment.trim().length < 3} onClick={() => { if (dlg) decide(dlg.a, dlg.d, comment); setDlg(null); }}>Yuborish</Button></>}>
        <p className="mb-2 text-[12.5px] text-t2">{dlg?.a.title}</p><Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Izoh (majburiy)…" autoFocus />
      </Modal>
    </div>
  );
}
