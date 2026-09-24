'use client';
import { useMemo, useState } from 'react';
import { Bell, CheckCheck, Settings2, Mail, Send, Smartphone } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import * as A from '@/lib/analytics';
import { fmtDate } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Button, Badge, cx, Segmented, Input, Empty } from '@/components/ui';
import { can } from '@/lib/rbac';

const LV: Record<string, { dot: string; label: string; emoji: string }> = { red: { dot: 'bg-red-500', label: 'Muddati o‘tgan', emoji: '🔴' }, orange: { dot: 'bg-orange-500', label: 'Kam zaxira / xavf', emoji: '🟠' }, yellow: { dot: 'bg-yellow-500', label: 'Soliq muddati', emoji: '🟡' }, blue: { dot: 'bg-sky-500', label: 'G‘ayrioddiy xarajat', emoji: '🔵' }, green: { dot: 'bg-emerald-500', label: 'To‘lov keldi', emoji: '🟢' } };

export default function Notifications() {
  const { db, s } = useCtx(); const { dispatch, go, role } = useApp();
  const [f, setF] = useState<'all' | 'unread'>('unread'); const [lvl, setLvl] = useState<string>('all');
  const alerts = useMemo(() => A.deriveAlerts(db, s), [db, s]);
  const rows = alerts.filter((a) => (f === 'all' || !db.readAlerts.includes(a.id)) && (lvl === 'all' || a.level === lvl));
  return (
    <div>
      <PageHeader title="Bildirishnomalar markazi" crumbs={['Nazorat']} subtitle="Aqlli ogohlantirishlar — buxgalteriya va operatsion ma’lumotlardan real vaqtda hisoblanadi, qoidalarni sozlash mumkin" actions={<Button icon={<CheckCheck className="h-3.5 w-3.5" />} onClick={() => dispatch('alert.read', { ids: alerts.map((a) => a.id) })}>Hammasini o‘qilgan deb belgilash</Button>} />
      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <Card>
          <div className="mb-3 flex flex-wrap items-center gap-2"><Segmented value={f} onChange={setF} options={[{ id: 'unread', label: `O‘qilmagan (${alerts.filter((a) => !db.readAlerts.includes(a.id)).length})` }, { id: 'all', label: `Barchasi (${alerts.length})` }]} /><div className="flex flex-wrap gap-1">{['all', ...Object.keys(LV)].map((k) => <button key={k} onClick={() => setLvl(k)} className={cx('rounded-lg border px-2 py-1 text-[11.5px]', lvl === k ? 'border-accent bg-accent-soft text-accent' : 'border-line text-t2')}>{k === 'all' ? 'Barcha turlar' : `${LV[k].emoji} ${LV[k].label}`}</button>)}</div></div>
          {rows.length === 0 ? <Empty icon={<Bell className="h-5 w-5" />} title="Bildirishnoma yo‘q" /> : <div className="space-y-1.5">{rows.map((a) => { const read = db.readAlerts.includes(a.id); return (
            <div key={a.id} className={cx('flex items-start gap-3 rounded-xl border px-3.5 py-3 transition', read ? 'border-line opacity-60' : 'border-line bg-surface-2')}>
              <span className={cx('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', LV[a.level].dot)} />
              <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold text-t1">{a.title}</p><p className="text-[12.5px] text-t2">{a.body}</p><p className="mt-0.5 text-[11px] text-t3">{fmtDate(a.date)} · {LV[a.level].label}</p></div>
              <div className="flex shrink-0 gap-1">{!read && <Button size="xs" variant="ghost" onClick={() => dispatch('alert.read', { ids: [a.id] })}>O‘qildi</Button>}<Button size="xs" onClick={() => { dispatch('alert.read', { ids: [a.id] }); go(a.module as never, a.tab, a.params); }}>Ochish</Button></div>
            </div>
          ); })}</div>}
        </Card>
        <AlertRules edit={can(role, 'settings', 'edit') || can(role, 'finance', 'approve')} />
      </div>
    </div>
  );
}

export function AlertRules({ edit }: { edit: boolean }) {
  const { db } = useCtx(); const dispatch = useApp((s) => s.dispatch);
  return (
    <Card><CardHeader title="Ogohlantirish qoidalari" subtitle="Email va Telegram kanallari ulanmagan — faqat ilova ichida ko‘rsatiladi" icon={<Settings2 className="h-4 w-4" />} />
      <div className="space-y-2.5">{db.alertRules.map((r) => (
        <div key={r.id} className="rounded-xl border border-line p-3">
          <div className="flex items-center justify-between gap-2"><span className="text-[12.8px] font-medium text-t1">{r.label}</span>
            <button disabled={!edit} onClick={() => dispatch('alert.rule', { id: r.id, enabled: !r.enabled })} className={cx('relative h-5 w-9 rounded-full transition disabled:opacity-50', r.enabled ? 'bg-accent' : 'bg-surface-3')} aria-label="Yoqish/o‘chirish"><span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', r.enabled ? 'left-[18px]' : 'left-0.5')} /></button></div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {r.threshold !== undefined && <label className="flex items-center gap-1.5 text-[11.5px] text-t3">Chegara<Input disabled={!edit} type="number" className="h-7 w-20 !px-2 text-[12px]" defaultValue={r.threshold} onBlur={(e) => +e.target.value !== r.threshold && dispatch('alert.rule', { id: r.id, threshold: +e.target.value }, { success: 'Qoida yangilandi' })} /></label>}
            {([['inApp', Smartphone, 'Ilova'], ['email', Mail, 'Email'], ['telegram', Send, 'Telegram']] as const).map(([k, I, l]) => <button key={k} disabled={!edit || k === 'inApp'} onClick={() => dispatch('alert.rule', { id: r.id, channels: { ...r.channels, [k]: !r.channels[k] } })} className={cx('flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px]', r.channels[k] ? 'border-accent/30 bg-accent-soft text-accent' : 'border-line text-t3')}><I className="h-3 w-3" />{l}{k !== 'inApp' && r.channels[k] && <span className="text-[9.5px]">(ulanmagan)</span>}</button>)}
          </div>
        </div>
      ))}</div>
    </Card>
  );
}
