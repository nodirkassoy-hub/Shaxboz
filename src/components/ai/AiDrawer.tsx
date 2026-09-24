'use client';
import { useEffect } from 'react';
import { X, Maximize2, Sparkles } from 'lucide-react';
import { useApp } from '@/lib/store';
import { Chat } from './Chat';

export default function AiDrawer() {
  const { closeAi, aiPrompt, go } = useApp();
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && closeAi(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [closeAi]);
  return (
    <div className="fixed inset-0 z-[85]">
      <div className="anim-fade absolute inset-0 bg-black/30" onClick={closeAi} />
      <aside className="anim-slide absolute inset-y-0 right-0 flex w-full max-w-[520px] flex-col border-l border-line bg-surface-solid shadow-pop sm:inset-y-3 sm:right-3 sm:rounded-[22px] sm:border">
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white"><Sparkles className="h-4 w-4" /></div>
          <div className="flex-1"><div className="text-[14px] font-semibold text-t1">AI CFO</div><div className="flex items-center gap-1.5 text-[11px] text-t3"><span className="live-dot h-1.5 w-1.5 rounded-full bg-pos" />Ma’lumotlar bilan bog‘langan · qoidaga asoslangan dvigatel</div></div>
          <button onClick={() => { closeAi(); go('ai'); }} className="grid h-8 w-8 place-items-center rounded-lg text-t3 hover:bg-surface-2 hover:text-t1" aria-label="To‘liq ekran"><Maximize2 className="h-4 w-4" /></button>
          <button onClick={closeAi} className="grid h-8 w-8 place-items-center rounded-lg text-t3 hover:bg-surface-2 hover:text-t1" aria-label="Yopish"><X className="h-4 w-4" /></button>
        </div>
        <div className="min-h-0 flex-1"><Chat compact initialPrompt={aiPrompt} /></div>
      </aside>
    </div>
  );
}
