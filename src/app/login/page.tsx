import { SiteHeader, SiteFooter } from '@/components/marketing/SiteChrome';
import { LoginForm } from '@/components/marketing/AuthForm';

export const metadata = { title: 'Kirish' };

export default function LoginPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-md rounded-3xl border border-line bg-surface-solid p-6 shadow-pop sm:p-8"><LoginForm /></div>
      </main>
      <SiteFooter />
    </>
  );
}
