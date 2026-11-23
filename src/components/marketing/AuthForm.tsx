'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AlertCircle, ArrowRight, Loader2, LogIn } from 'lucide-react';
import { useBilling } from '@/lib/billing/store';

/** Kirish formasi (demo): email + parol tekshiriladi, hisob brauzerda saqlanadi. */
export function LoginForm() {
  const router = useRouter();
  const account = useBilling((s) => s.account);
  const login = useBilling((s) => s.login);
  const [email, setEmail] = useState(account?.user.email ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) return setError('Emailni kiriting.');
    if (!password) return setError('Parolni kiriting.');
    setBusy(true);
    setTimeout(() => {
      const r = login(email, password);
      setBusy(false);
      if (!r.ok) { setError(r.error || 'Kirishda xatolik.'); return; }
      router.push('/app');
    }, 350);
  };

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="text-[26px] font-extrabold tracking-[-0.02em] text-t1">Tizimga kirish</h1>
      <p className="mt-1.5 text-[13px] text-t2">Hisobingizga kirib ishni davom ettiring.</p>
      {error && <div className="mt-4 flex items-start gap-2 rounded-xl border border-neg/30 bg-neg/8 p-2.5 text-[12px] text-neg"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
      <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
        <label className="block"><span className="mb-1 block text-[12px] font-semibold text-t1">Email</span>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="siz@kompaniya.uz" autoComplete="email" /></label>
        <label className="block"><span className="mb-1 block text-[12px] font-semibold text-t1">Parol</span>
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" /></label>
        <button type="submit" disabled={busy} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent text-[14px] font-semibold text-white transition hover:brightness-110 disabled:opacity-60">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />} Kirish
        </button>
      </form>
      <p className="mt-4 text-center text-[12px] text-t3">Hisobingiz yo‘qmi? <Link href="/signup" className="font-semibold text-accent hover:underline">30 kun bepul boshlash <ArrowRight className="inline h-3 w-3" /></Link></p>
      <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-3 text-[11.5px] leading-relaxed text-t3">
        <b className="text-t2">Demo hisob:</b> {account?.user.email ?? 'demo@balans.uz'} — istalgan 8+ belgili parol. Yoki to‘g‘ridan-to‘g‘ri <Link href="/app" className="font-semibold text-accent hover:underline">demo panelni oching</Link>.
      </div>
    </div>
  );
}
