'use client';
import Link from 'next/link';
import { Lock, Sparkles, Check, ArrowRight, X } from 'lucide-react';
import { useBilling, useEntitlements } from '@/lib/billing/store';
import { PLANS, priceOf, VAT_RATE, TRIAL_DAYS } from '@/lib/config/pricing';
import { useApp } from '@/lib/store';
import { Button, Modal, cx } from '@/components/ui';
import type { ModuleId } from '@/lib/types';

const MODULE_NAMES: Record<string, string> = {
  accounting: 'Buxgalteriya', taxes: 'Soliqlar', hr: 'HR va ish haqi', manufacturing: 'Ishlab chiqarish',
  warehouse: 'Ko‘p ombor', crm: 'CRM', projects: 'Loyihalar', assets: 'Asosiy vositalar', analytics: 'Analitika',
  approvals: 'Tasdiqlashlar', documents: 'Hujjatlar', finance: 'Moliya', inventory: 'Ombor', reports: 'Hisobotlar',
};

/** Tarifda mavjud bo‘lmagan modul uchun chiroyli "Tarifni yangilang" oynasi. */
export function UpgradeGate({ module }: { module: ModuleId }) {
  const ent = useEntitlements();
  const account = useBilling((s) => s.account);
  const openGate = useApp((s) => s.openGate);
  const name = MODULE_NAMES[module] || 'Bu bo‘lim';
  const trial = ent.status === 'trial';
  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-3xl border border-line bg-surface-solid shadow-pop">
        <div className="border-b border-line bg-gradient-to-br from-accent/12 to-accent-2/8 px-5 py-6 text-center sm:px-8">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-accent text-white shadow-[0_12px_30px_-10px_var(--accent)]"><Lock className="h-5.5 w-5.5" /></div>
          <h2 className="mt-3 text-[19px] font-semibold text-t1">“{name}” bo‘limi joriy tarifda yopiq</h2>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-relaxed text-t2">
            {trial
              ? `Sinov davrida barcha modullar ochiq. Sinov tugagach bu bo‘lim tarifga bog‘liq bo‘ladi — ${ent.plan.name} tarifi tanlangan.`
              : `Joriy tarif: ${ent.plan.name}. “${name}” moduli BIZNES va undan yuqori tariflarda ochiladi.`}
          </p>
        </div>
        <div className="grid gap-3 px-5 py-5 sm:grid-cols-3 sm:px-8">
          {PLANS.filter((p) => !p.contact).map((p) => {
            const price = priceOf(p, 'monthly')!;
            const includes = p.limit.modules === 'all' || p.limit.modules.includes(module);
            return (
              <div key={p.id} className={cx('rounded-2xl border p-3.5', includes ? 'border-accent/40 bg-accent-soft/30' : 'border-line bg-surface-2 opacity-70')}>
                <p className="text-[10.5px] font-bold uppercase tracking-wider text-accent">{p.name}</p>
                <p className="num mt-1 text-[15px] font-bold text-t1">{price.toLocaleString('ru-RU').replace(/\u00a0/g, ' ')} <span className="text-[10px] font-medium text-t3">so‘m/oy</span></p>
                <p className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium ">{includes ? <><Check className="h-3.5 w-3.5 text-pos" /><span className="text-pos">Modul bor</span></> : <><X className="h-3.5 w-3.5 text-t3" /><span className="text-t3">Modul yo‘q</span></>}</p>
              </div>
            );
          })}
        </div>
        <div className="flex flex-col gap-2 border-t border-line px-5 py-4 sm:flex-row sm:justify-center sm:px-8">
          <Link href="/checkout?plan=biznes" className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110">
            {trial ? `BIZNES tarifini tanlash · ${TRIAL_DAYS} kun bepul` : 'Tarifni yangilash'} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link href="/pricing" className="inline-flex h-10 items-center justify-center rounded-xl border border-line bg-surface-2 px-4 text-[13px] font-semibold text-t1 hover:border-line-strong">Barcha tariflar</Link>
          <button onClick={() => openGate(module)} className="inline-flex h-10 items-center justify-center rounded-xl px-3 text-[12.5px] font-medium text-t3 hover:text-t1">Batafsil</button>
        </div>
        <p className="border-t border-line px-5 py-2.5 text-center text-[11px] text-t3">Narxlar {VAT_RATE}% QQS bilan · To‘lov test rejimida{account ? ` · Hisob: ${account.company.name}` : ''}</p>
      </div>
    </div>
  );
}

/** Global modal — o‘qish rejimida yozishga urinishda ham ochiladi. */
UpgradeGate.Modal = function GateModal() {
  const gate = useApp((s) => s.gate);
  const closeGate = useApp((s) => s.closeGate);
  const readOnly = useApp((s) => s.readOnly);
  if (!gate) return null;
  return (
    <Modal open onClose={closeGate} size="md" icon={<Sparkles className="h-4 w-4" />} title={readOnly ? 'Hisob o‘qish rejimida' : 'Tarifni yangilang'}
      subtitle={readOnly ? 'Yangi yozuv kiritish uchun tarifni faollashtiring. Ma’lumotlar saqlanadi.' : 'Bu imkoniyat joriy tarifda mavjud emas.'}
      footer={<><Button variant="ghost" onClick={closeGate}>Keyinroq</Button><Link href={readOnly ? '/account' : '/checkout?plan=biznes'}><Button variant="primary">Tarifni tanlash</Button></Link></>}>
      <div className="space-y-2.5 text-[13px] leading-relaxed text-t2">
        <p>{readOnly
          ? 'Sinov davri tugadi yoki to‘lov qilinmagan. Hisob faqat o‘qish rejimida ishlaydi: hisobotlarni ko‘rish va eksport qilish mumkin, lekin yangi hisob-faktura, to‘lov yoki buyurtma kiritib bo‘lmaydi.'
          : 'BIZNES tarifida buxgalteriya, soliqlar, HR, ko‘p ombor va rollar ochiladi. ISHLAB CHIQARISH tarifida esa ishlab chiqarish, tannarx, byudjet va API ham qo‘shiladi.'}</p>
        <ul className="space-y-1.5 rounded-xl border border-line bg-surface-2 p-3">
          {['Ma’lumotlar o‘chirilmaydi va saqlanadi', `To‘lovdan keyin to‘liq tiklanadi (${TRIAL_DAYS} kun sinov qayta berilmaydi)`, 'Tarifni istalgan vaqtda oshirish yoki pasaytirish mumkin'].map((x) => (
            <li key={x} className="flex items-start gap-2 text-[12.5px]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-pos" />{x}</li>
          ))}
        </ul>
      </div>
    </Modal>
  );
};
