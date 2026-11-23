import Link from 'next/link';
import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';

export const metadata = { title: 'Sahifa topilmadi' };

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <p className="num text-[56px] font-extrabold leading-none text-accent/30">404</p>
        <h1 className="mt-3 text-[22px] font-bold text-t1">Sahifa topilmadi</h1>
        <p className="mt-2 text-[13px] text-t2">Havola o‘zgargan yoki sahifa mavjud emas. Quyidagi bo‘limlardan davom eting.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link href="/" className="inline-flex h-10 items-center rounded-xl bg-accent px-4 text-[13px] font-semibold text-white">Bosh sahifa</Link>
          <Link href="/app" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface-solid px-4 text-[13px] font-semibold text-t1">Demo panel</Link>
          <Link href="/pricing" className="inline-flex h-10 items-center rounded-xl border border-line bg-surface-solid px-4 text-[13px] font-semibold text-t1">Narxlar</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
