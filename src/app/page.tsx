import { LandingPage } from '@/components/landing/LandingPage';
import { landingStats } from '@/lib/marketing/stats';

export const metadata = {
  title: 'BALANS AI — buxgalteriya, savdo, ombor va AI CFO bitta tizimda',
  description:
    'O‘zbekiston bizneslari uchun AI bilan boshqariladigan yagona tizim: buxgalteriya, moliya, sotuv, xarid, ombor, ishlab chiqarish, HR, soliqlar va AI CFO. 30 kun bepul, bank kartasi talab qilinmaydi.',
  alternates: { canonical: '/' },
};

/** Bosh sahifa: kontent serverda chiziladi (SSR), interaktiv qismlar alohida client komponentda. */
export default function Page() {
  return <LandingPage stats={landingStats()} />;
}
