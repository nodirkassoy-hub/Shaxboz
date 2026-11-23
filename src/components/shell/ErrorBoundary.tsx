'use client';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw } from 'lucide-react';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/types';

interface Props {
  children: ReactNode;
  /** O‘zgarsa boundary avtomatik tiklanadi (masalan, modul/tab almashganda). */
  resetKey?: string;
  /** Kompakt ko‘rinish — sahifa ichida (sidebar saqlanadi). */
  compact?: boolean;
  lang?: Lang;
}

interface State {
  error: Error | null;
  info: string | null;
}

/**
 * Butun ilova uchun umumiy xato tutqichi.
 *
 * React komponentida kutilmagan xato (`TypeError` va h.k.) butun sahifani oq
 * qilib qo‘yishi mumkin. Bu boundary xatoni ushlaydi, foydalanuvchiga tushunarli
 * xabar va "Qayta urinish" tugmasini ko‘rsatadi — ilova "qotib qolmaydi".
 *
 * `resetKey` o‘zgarganda (foydalanuvchi boshqa modulga o‘tsa) boundary o‘zi
 * tiklanadi, ya'ni bitta buzilgan sahifa boshqalarini bloklamaydi.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset();
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Monitoring uchun yagona joy (keyinchalik Sentry va h.k. ulanadi)
    this.setState({ info: (info.componentStack || '').split('\n').slice(0, 6).join('\n') });
    if (process.env.NODE_ENV !== 'production') console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const lang = this.props.lang ?? 'uz';
    const t = (k: string) => translate(lang, k);
    const compact = this.props.compact;

    return (
      <div className={compact ? 'mx-auto max-w-md py-10' : 'grid min-h-screen place-items-center px-4 py-10'}>
        <div role="alert" className="w-full max-w-md rounded-3xl border border-line bg-surface-solid p-6 text-center shadow-pop">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-warn/10 text-warn"><AlertTriangle className="h-6 w-6" /></div>
          <h1 className="mt-4 text-[17px] font-semibold text-t1">{t('errors.unexpected')}</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-t2">{t('errors.unexpectedBody')}</p>
          <details className="mt-3 text-left">
            <summary className="cursor-pointer text-[11.5px] text-t3 hover:text-t1">Texnik tafsilot</summary>
            <p className="mt-1.5 max-h-32 overflow-auto break-words rounded-xl bg-surface-2 p-2 font-mono text-[10.5px] leading-relaxed text-t3">
              {error.message}
              {info ? `\n${info}` : ''}
            </p>
          </details>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <button onClick={this.reset} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[13px] font-semibold text-white hover:brightness-110">
              <RefreshCw className="h-4 w-4" />{t('errors.retry')}
            </button>
            <button onClick={() => { this.reset(); window.location.reload(); }} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-line bg-surface-solid px-4 text-[13px] font-semibold text-t1 hover:border-line-strong">
              <RotateCcw className="h-4 w-4" />{t('errors.reload')}
            </button>
          </div>
          <a href="/contact" className="mt-4 inline-block text-[11.5px] text-t3 hover:text-accent">{t('errors.support')} →</a>
        </div>
      </div>
    );
  }
}
