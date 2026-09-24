'use client';
import { useMemo, useState } from 'react';
import { ShieldCheck, Users, History, KeyRound, Plug, Building2, Monitor, LogIn, Check, X, Minus, Globe, Palette, RotateCcw, Lock, Smartphone } from 'lucide-react';
import { useApp } from '@/lib/store';
import { useCtx } from '@/components/dash/hooks';
import { ROLES, PERMISSIONS, MODULE_IDS, PERM_LABELS, roleOf } from '@/lib/rbac';
import { INTEGRATIONS } from '@/lib/integrations';
import { translate } from '@/lib/i18n';
import { fmtDateTime, fmtDate } from '@/lib/core/dates';
import { PageHeader, Card, CardHeader, Tabs, Button, Badge, cx, Segmented, Select, Input, Field, Confirm, Avatar } from '@/components/ui';
import { DataTable } from '@/components/ui/DataTable';
import { ExportButton } from '@/components/ui/Export';
import { AlertRules } from './Notifications';
import type { Perm, ModuleId, Lang } from '@/lib/types';

type Tab = 'general' | 'roles' | 'audit' | 'security' | 'integrations' | 'alerts';

export default function Settings() {
  const nav = useApp((s) => s.nav);
  const [tab, setTab] = useState<Tab>((nav.tab as Tab) || 'general');
  return (
    <div>
      <PageHeader title="Sozlamalar" crumbs={['Nazorat']} subtitle="Rollar va ruxsatlar, audit izi, xavfsizlik, integratsiyalar, ogohlantirishlar" />
      <Tabs className="mb-4" value={tab} onChange={setTab} tabs={[{ id: 'general', label: 'Umumiy', icon: <Palette className="h-3.5 w-3.5" /> }, { id: 'roles', label: 'Rollar va ruxsatlar', icon: <Users className="h-3.5 w-3.5" /> }, { id: 'audit', label: 'Audit jurnali', icon: <History className="h-3.5 w-3.5" /> }, { id: 'security', label: 'Xavfsizlik', icon: <ShieldCheck className="h-3.5 w-3.5" /> }, { id: 'integrations', label: 'Integratsiyalar', icon: <Plug className="h-3.5 w-3.5" /> }, { id: 'alerts', label: 'Ogohlantirishlar' }]} />
      {tab === 'general' && <General />}{tab === 'roles' && <Roles />}{tab === 'audit' && <Audit />}{tab === 'security' && <Security />}{tab === 'integrations' && <Integrations />}{tab === 'alerts' && <div className="max-w-2xl"><AlertRules edit /></div>}
    </div>
  );
}

function General() {
  const { theme, toggleTheme, lang, setLang, resetDemo, log, db } = useApp();
  const [conf, setConf] = useState(false);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader title="Ko‘rinish va til" icon={<Globe className="h-4 w-4" />} />
        <div className="space-y-4">
          <Field label="Mavzu"><Segmented value={theme} onChange={() => toggleTheme()} options={[{ id: 'dark', label: 'Qorong‘i' }, { id: 'light', label: 'Yorug‘' }]} /></Field>
          <Field label="Interfeys tili" hint="O‘zbek (lotin) — asosiy til. Rus va ingliz tillari uchun arxitektura tayyor: navigatsiya va asosiy elementlar tarjima qilingan, qolgan matnlar o‘zbek tilida qoladi."><Segmented value={lang} onChange={(l) => setLang(l as Lang)} options={[{ id: 'uz', label: 'O‘zbek' }, { id: 'ru', label: 'Русский' }, { id: 'en', label: 'English' }]} /></Field>
          <div className="rounded-xl border border-line p-3 text-[12px]"><p className="mb-1.5 font-semibold text-t2">Tarjima namunasi</p>{(['nav.finance', 'nav.inventory', 'common.approve', 'ai.greeting'] as const).map((k) => <div key={k} className="grid grid-cols-3 gap-2 py-0.5 text-t2"><span>{translate('uz', k)}</span><span>{translate('ru', k)}</span><span>{translate('en', k)}</span></div>)}</div>
        </div>
      </Card>
      <Card><CardHeader title="Demo ma’lumotlar" icon={<RotateCcw className="h-4 w-4" />} />
        <div className="space-y-2 text-[12.5px] text-t2">
          <p>Bu versiya <b className="text-t1">DEMO rejimida</b> ishlaydi: backend/ma’lumotlar bazasi ulanmagan. BALANS GROUP ma’lumotlari 01.01.2026 dan bugungacha haqiqiy provodka qoidalari bilan simulyatsiya qilingan (deterministik).</p>
          <p>Siz kiritgan amallar ({log.length} ta) brauzeringizda (localStorage) amallar jurnali sifatida saqlanadi va sahifa qayta yuklanganda qayta bajariladi.</p>
          <div className="grid grid-cols-3 gap-2 pt-1 text-center">{[['Provodkalar', db.entries.length], ['Hujjatlar', db.invoices.length + db.bills.length + db.salesOrders.length + db.purchaseOrders.length], ['Audit yozuvlari', db.audit.length]].map(([l, v]) => <div key={l as string} className="rounded-xl bg-surface-2 p-2.5"><p className="num text-[16px] font-semibold text-t1">{(v as number).toLocaleString('ru-RU')}</p><p className="text-[11px] text-t3">{l as string}</p></div>)}</div>
          <Button variant="danger" icon={<RotateCcw className="h-3.5 w-3.5" />} onClick={() => setConf(true)}>Demo ma’lumotlarni qayta tiklash</Button>
        </div>
      </Card>
      <Confirm open={conf} onClose={() => setConf(false)} tone="danger" title="Demo ma’lumotlarni tiklash" confirmLabel="Tiklash" body="Siz kiritgan barcha o‘zgarishlar o‘chiriladi va boshlang‘ich demo holat qayta yaratiladi." onConfirm={resetDemo} />
    </div>
  );
}

function Roles() {
  const { role, setRole } = useApp();
  const [sel, setSel] = useState(role);
  const perms: Perm[] = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'manage'];
  const r = roleOf(sel);
  return (
    <div className="space-y-4">
      <Card className="!p-4"><p className="text-[12.5px] text-t2">Har bir rol faqat ruxsat etilgan modullarni ko‘radi (menyu, tugmalar va amallar ruxsatga qarab yashiriladi/bloklanadi). Tasdiqlash vakolatlari ajratilgan: so‘rovchi o‘z so‘rovini tasdiqlay olmaydi. Demo: rolni tanlab, ilovani shu rol ko‘zi bilan ko‘ring.</p></Card>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <Card pad={false}><div className="p-1.5">{ROLES.map((x) => <button key={x.id} onClick={() => setSel(x.id)} className={cx('flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left', sel === x.id ? 'bg-accent-soft' : 'hover:bg-surface-2')}><Avatar name={x.persona} size={28} /><div className="min-w-0 flex-1"><p className={cx('truncate text-[12.8px] font-medium', sel === x.id ? 'text-accent' : 'text-t1')}>{x.label}</p><p className="truncate text-[11px] text-t3">{x.persona}</p></div>{role === x.id && <Badge tone="pos">joriy</Badge>}</button>)}</div></Card>
        <Card>
          <CardHeader title={r.label} subtitle={`${r.persona} · ${r.desc}`} icon={<KeyRound className="h-4 w-4" />} actions={role !== sel ? <Button variant="primary" size="sm" onClick={() => setRole(sel)}>Shu rol bilan kirish (demo)</Button> : <Badge tone="pos">Siz shu roldasiz</Badge>} />
          <div className="thin-scroll overflow-x-auto rounded-xl border border-line"><table className="w-full min-w-[640px] text-[12.5px]"><thead className="bg-surface-2"><tr><th className="px-3 py-2 text-left font-semibold text-t3">Modul</th>{perms.map((p) => <th key={p} className="px-2 py-2 text-center text-[11px] font-semibold text-t3">{PERM_LABELS[p]}</th>)}</tr></thead>
            <tbody>{MODULE_IDS.map((m) => { const set = PERMISSIONS[sel][m] || []; return <tr key={m} className="border-t border-line"><td className="px-3 py-1.5 text-t1">{translate('uz', `nav.${m}`)}</td>{perms.map((p) => <td key={p} className="text-center">{set.includes(p) ? <Check className="mx-auto h-4 w-4 text-pos" /> : <Minus className="mx-auto h-3.5 w-3.5 text-t3/50" />}</td>)}</tr>; })}</tbody></table></div>
        </Card>
      </div>
    </div>
  );
}

function Audit() {
  const { db } = useCtx();
  const [mod, setMod] = useState('all'); const [user, setUser] = useState('all');
  const rows = db.audit.filter((a) => (mod === 'all' || a.module === mod) && (user === 'all' || a.user === user)).slice().reverse();
  const users = [...new Set(db.audit.map((a) => a.user))];
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Audit jurnali" subtitle="Kim · nima · qachon · qaysi yozuv — o‘zgartirib/o‘chirib bo‘lmaydi (append-only)" icon={<History className="h-4 w-4" />} actions={<ExportButton module="settings" name="audit-jurnali" title="Audit jurnali" cols={[{ key: 'at', label: 'Vaqt' }, { key: 'u', label: 'Foydalanuvchi' }, { key: 'r', label: 'Rol' }, { key: 'a', label: 'Amal' }, { key: 'm', label: 'Modul' }, { key: 'rec', label: 'Yozuv' }]} rows={() => rows.map((a) => ({ at: fmtDateTime(a.at), u: a.user, r: roleOf(a.role)?.label, a: a.action, m: a.module, rec: a.record }))} />} />
        <DataTable rows={rows} rowKey={(a) => a.id} pageSize={20} dense search={(a) => `${a.user} ${a.action} ${a.record} ${a.detail || ''}`}
          toolbar={<><Select className="h-9 w-auto text-[12.5px]" value={mod} onChange={(e) => setMod(e.target.value)}><option value="all">Barcha modullar</option>{MODULE_IDS.map((m) => <option key={m} value={m}>{translate('uz', `nav.${m}`)}</option>)}</Select><Select className="h-9 w-auto text-[12.5px]" value={user} onChange={(e) => setUser(e.target.value)}><option value="all">Barcha foydalanuvchilar</option>{users.map((u) => <option key={u}>{u}</option>)}</Select></>}
          cols={[{ key: 'at', header: 'Qachon', cell: (a) => <span className="whitespace-nowrap text-t2">{fmtDateTime(a.at)}</span>, sort: (a) => a.at }, { key: 'u', header: 'Kim', cell: (a) => <div className="flex items-center gap-2"><Avatar name={a.user} size={22} /><div><p className="text-[12.5px]">{a.user}</p><p className="text-[10.5px] text-t3">{roleOf(a.role)?.label}</p></div></div> }, { key: 'a', header: 'Nima', primary: true, cell: (a) => <span>{a.action}{a.detail && <span className="block text-[11px] text-t3">{a.detail}</span>}</span> }, { key: 'm', header: 'Modul', cell: (a) => <Badge>{translate('uz', `nav.${a.module}`)}</Badge> }, { key: 'r', header: 'Yozuv', cell: (a) => <span className="font-mono text-[11.5px] text-t2">{a.record}</span> }]} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardHeader title="Tasdiqlashlar tarixi" icon={<Check className="h-4 w-4" />} /><div className="divide-y divide-line">{db.approvals.filter((a) => a.status !== 'pending').slice(-8).reverse().map((a) => <div key={a.id} className="py-2 text-[12.5px]"><p className="text-t1">{a.title}</p><p className="text-[11px] text-t3">{a.status === 'approved' ? '✓ tasdiqlandi' : a.status === 'rejected' ? '✗ rad etildi' : '↺ o‘zgartirish so‘raldi'} · {a.decidedBy} · {a.decidedAt && fmtDate(a.decidedAt.slice(0, 10))}</p></div>)}</div></Card>
        <Card><CardHeader title="Hujjatlar tarixi" icon={<History className="h-4 w-4" />} /><div className="divide-y divide-line">{db.documents.flatMap((d) => d.history.map((h) => ({ ...h, d }))).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8).map((h, i) => <div key={i} className="py-2 text-[12.5px]"><p className="text-t1">{h.d.title}</p><p className="text-[11px] text-t3">{h.action} · {h.user} · {fmtDate(h.date)}</p></div>)}</div></Card>
      </div>
    </div>
  );
}

function Security() {
  const { db } = useCtx(); const { dispatch, toast } = useApp();
  const [twofa, setTwofa] = useState(true); const [alerts, setAlerts] = useState(true); const [pw, setPw] = useState({ cur: '', n1: '', n2: '' });
  const strength = [/.{10,}/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) => r.test(pw.n1)).length;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader title="Kirish xavfsizligi" subtitle="Demo: autentifikatsiya serveri ulanmagan — sozlamalar interfeysi" icon={<Lock className="h-4 w-4" />} />
        <div className="space-y-3">
          {[[twofa, setTwofa, 'Ikki bosqichli autentifikatsiya (2FA)', 'TOTP ilova (Google Authenticator va h.k.) orqali', Smartphone], [alerts, setAlerts, 'Yangi qurilmadan kirish haqida ogohlantirish', 'Ilova ichida (email ulanmagan)', LogIn]].map(([v, set, t, d, I], i) => { const Ic = I as typeof Lock; return (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-line p-3"><Ic className="h-4 w-4 text-t3" /><div className="flex-1"><p className="text-[13px] font-medium text-t1">{t as string}</p><p className="text-[11.5px] text-t3">{d as string}</p></div><button onClick={() => { (set as (b: boolean) => void)(!v); toast({ kind: 'info', title: `${t} ${!v ? 'yoqildi' : 'o‘chirildi'} (demo)` }); }} className={cx('relative h-5 w-9 rounded-full transition', v ? 'bg-accent' : 'bg-surface-3')}><span className={cx('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', v ? 'left-[18px]' : 'left-0.5')} /></button></div>
          ); })}
          <div className="rounded-xl border border-line p-3"><p className="mb-2 text-[13px] font-medium text-t1">Parolni o‘zgartirish</p><div className="space-y-2"><Input type="password" placeholder="Joriy parol" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} /><Input type="password" placeholder="Yangi parol (kamida 10 belgi)" value={pw.n1} onChange={(e) => setPw({ ...pw, n1: e.target.value })} /><div className="flex gap-1">{[0, 1, 2, 3].map((i) => <div key={i} className={cx('h-1 flex-1 rounded-full', i < strength ? (strength >= 3 ? 'bg-pos' : 'bg-warn') : 'bg-surface-3')} />)}</div><Input type="password" placeholder="Yangi parolni takrorlang" value={pw.n2} onChange={(e) => setPw({ ...pw, n2: e.target.value })} />
            <Button size="sm" variant="primary" disabled={!pw.cur || strength < 3 || pw.n1 !== pw.n2} onClick={() => { toast({ kind: 'info', title: 'Demo rejim', body: 'Autentifikatsiya serveri ulanmagan — parol saqlanmadi.' }); setPw({ cur: '', n1: '', n2: '' }); }}>Saqlash</Button></div></div>
          <p className="text-[11px] text-t3">BALANS AI hech qanday xavfsizlik sertifikatiga (ISO 27001, SOC 2 va h.k.) ega ekanini da’vo qilmaydi.</p>
        </div>
      </Card>
      <div className="space-y-4">
        <Card><CardHeader title="Faol seanslar" icon={<Monitor className="h-4 w-4" />} />{db.sessions.map((s) => <div key={s.id} className="flex items-center gap-3 border-t border-line py-2.5 first:border-0"><Monitor className="h-4 w-4 text-t3" /><div className="flex-1 text-[12.5px]"><p className="text-t1">{s.device} {s.current && <Badge tone="pos">joriy</Badge>}</p><p className="text-[11px] text-t3">{s.ip} · {s.location} · {fmtDateTime(s.lastActive)}</p></div>{!s.current && <Button size="xs" variant="danger" onClick={() => dispatch('session.revoke', { id: s.id }, { success: 'Seans tugatildi' })}>Tugatish</Button>}</div>)}</Card>
        <Card><CardHeader title="Kirishlar tarixi" icon={<LogIn className="h-4 w-4" />} />{db.logins.map((l) => <div key={l.id} className="flex items-center gap-3 border-t border-line py-2 text-[12.5px] first:border-0"><span className={cx('h-2 w-2 rounded-full', l.result === 'success' ? 'bg-pos' : l.result === '2fa' ? 'bg-sky-500' : 'bg-neg')} /><div className="flex-1"><p className="text-t1">{l.user}</p><p className="text-[11px] text-t3">{l.ip} · {l.device}</p></div><div className="text-right"><Badge tone={l.result === 'success' ? 'pos' : l.result === '2fa' ? 'info' : 'neg'}>{l.result === 'success' ? 'muvaffaqiyatli' : l.result === '2fa' ? '2FA tasdiq' : 'rad etildi'}</Badge><p className="text-[10.5px] text-t3">{fmtDateTime(l.at)}</p></div></div>)}{db.logins.filter((l) => l.result === 'failed').length >= 2 && <p className="mt-2 rounded-lg bg-neg/10 px-3 py-1.5 text-[11.5px] text-neg">Ogohlantirish: 91.203.44.19 dan ketma-ket muvaffaqiyatsiz urinishlar</p>}</Card>
      </div>
    </div>
  );
}

function Integrations() {
  const C: Record<string, string> = { bank: 'Bank', tax: 'Soliq', einvoice: 'E-hujjat', payments: 'To‘lov', messaging: 'Xabarlar', ai: 'AI', erp: 'ERP', files: 'Fayllar', fx: 'Valyuta' };
  return (
    <div className="space-y-4">
      <Card className="!p-4"><p className="text-[12.5px] leading-relaxed text-t2"><Plug className="mr-1.5 inline h-4 w-4 text-t3" />Quyidagi integratsiyalar uchun <b className="text-t1">aniq interfeyslar (kontraktlar)</b> tayyorlangan (<code className="rounded bg-surface-3 px-1 text-[11.5px]">src/lib/integrations.ts</code>), lekin hech biri ulanmagan. Ilova ulangan deb ko‘rsatmaydi. Har bir biznes amali <code className="rounded bg-surface-3 px-1 text-[11.5px]">actions.ts</code> reyestri orqali o‘tadi — kelajakda ular API endpointlariga 1:1 mos keladi.</p></Card>
      <div className="stagger grid gap-3 md:grid-cols-2 xl:grid-cols-3">{INTEGRATIONS.map((i) => (
        <Card key={i.id} className="flex flex-col !p-4">
          <div className="flex items-start justify-between gap-2"><div><Badge>{C[i.category]}</Badge><p className="mt-1.5 text-[13.5px] font-semibold text-t1">{i.name}</p></div>{i.status === 'connected' ? <Badge tone="pos" dot>Ishlaydi</Badge> : <Badge tone="neutral" dot>Ulanmagan</Badge>}</div>
          <p className="mt-1.5 flex-1 text-[12.5px] text-t2">{i.description}</p>
          <p className="mt-2 text-[11.5px] text-t3">{i.notes}</p>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2.5"><code className="text-[11px] text-t3">{i.contract}</code>{i.status !== 'connected' && <Button size="xs" variant="ghost" onClick={() => useApp.getState().toast({ kind: 'info', title: `${i.name}`, body: 'Ulash uchun server tomonida adapter va maxfiy kalitlar kerak. Demo versiyada mavjud emas.' })}>Ulash</Button>}</div>
        </Card>
      ))}</div>
    </div>
  );
}
