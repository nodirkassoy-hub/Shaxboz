'use client';
import { AppError } from '@/components/shell/App';
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <AppError error={error} reset={reset} />;
}
