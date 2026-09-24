'use client';
import { useMemo, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cx, Empty, SearchInput } from './index';

export interface Col<T> {
  key: string; header: ReactNode; cell: (r: T) => ReactNode; sort?: (r: T) => number | string; align?: 'left' | 'right' | 'center';
  className?: string; hideMobile?: boolean; mobileLabel?: string; width?: string; primary?: boolean;
}

export function DataTable<T>({ rows, cols, rowKey, onRow, pageSize = 12, search, searchPlaceholder, toolbar, empty, dense, initialSort, footer, selectable, selected, onSelect }: {
  rows: T[]; cols: Col<T>[]; rowKey: (r: T) => string; onRow?: (r: T) => void; pageSize?: number; search?: (r: T) => string; searchPlaceholder?: string;
  toolbar?: ReactNode; empty?: ReactNode; dense?: boolean; initialSort?: { key: string; dir: 'asc' | 'desc' }; footer?: ReactNode;
  selectable?: boolean; selected?: Set<string>; onSelect?: (s: Set<string>) => void;
}) {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: string; dir: 'asc' | 'desc' } | undefined>(initialSort);
  const filtered = useMemo(() => {
    let r = rows;
    if (q && search) { const s = q.toLowerCase(); r = r.filter((x) => search(x).toLowerCase().includes(s)); }
    if (sort) { const c = cols.find((c) => c.key === sort.key); if (c?.sort) { const f = c.sort; r = [...r].sort((a, b) => { const x = f(a); const y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1); }); } }
    return r;
  }, [rows, q, sort, cols, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const p = Math.min(page, pages - 1);
  const slice = filtered.slice(p * pageSize, p * pageSize + pageSize);
  const toggleSort = (k: string) => setSort((s) => (s?.key === k ? (s.dir === 'desc' ? { key: k, dir: 'asc' } : undefined) : { key: k, dir: 'desc' }));
  const allOnPage = selectable && slice.length > 0 && slice.every((r) => selected?.has(rowKey(r)));
  const toggle = (id: string) => { const n = new Set(selected); if (n.has(id)) n.delete(id); else n.add(id); onSelect?.(n); };

  return (
    <div>
      {(search || toolbar) && (
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          {search && <SearchInput value={q} onChange={(v) => { setQ(v); setPage(0); }} placeholder={searchPlaceholder} className="sm:w-72" />}
          {toolbar && <div className="flex flex-1 flex-wrap items-center gap-2 sm:justify-end">{toolbar}</div>}
        </div>
      )}
      {filtered.length === 0 ? (empty || <Empty title="Ma’lumot topilmadi" body={q ? 'Qidiruv so‘zini o‘zgartirib ko‘ring.' : 'Hozircha yozuvlar yo‘q.'} />) : (
        <>
          {/* Desktop table */}
          <div className="thin-scroll hidden overflow-x-auto rounded-2xl border border-line md:block">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="bg-surface-2 text-left">
                  {selectable && <th className="w-9 px-3"><input type="checkbox" checked={!!allOnPage} onChange={() => { const n = new Set(selected); slice.forEach((r) => (allOnPage ? n.delete(rowKey(r)) : n.add(rowKey(r)))); onSelect?.(n); }} className="accent-[var(--accent)]" /></th>}
                  {cols.map((c) => (
                    <th key={c.key} style={{ width: c.width }} className={cx('whitespace-nowrap px-3 py-2.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-t3', c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                      {c.sort ? <button onClick={() => toggleSort(c.key)} className={cx('inline-flex items-center gap-1 hover:text-t1', c.align === 'right' && 'flex-row-reverse')}>{c.header}{sort?.key === c.key ? (sort.dir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3 opacity-40" />}</button> : c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {slice.map((r) => (
                  <tr key={rowKey(r)} onClick={onRow ? () => onRow(r) : undefined} className={cx('border-t border-line transition-colors', onRow && 'cursor-pointer hover:bg-surface-2', selected?.has(rowKey(r)) && 'bg-accent-soft')}>
                    {selectable && <td className="px-3" onClick={(e) => e.stopPropagation()}><input type="checkbox" checked={!!selected?.has(rowKey(r))} onChange={() => toggle(rowKey(r))} className="accent-[var(--accent)]" /></td>}
                    {cols.map((c) => <td key={c.key} className={cx('px-3 text-t1 [&_.font-mono]:whitespace-nowrap', dense ? 'py-2' : 'py-2.5', c.align === 'right' && 'num whitespace-nowrap text-right', c.align === 'center' && 'text-center', c.className)}>{c.cell(r)}</td>)}
                  </tr>
                ))}
              </tbody>
              {footer && <tfoot className="border-t border-line-strong bg-surface-2">{footer}</tfoot>}
            </table>
          </div>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {slice.map((r) => {
              const prim = cols.find((c) => c.primary) || cols[0];
              return (
                <div key={rowKey(r)} onClick={onRow ? () => onRow(r) : undefined} className={cx('rounded-2xl border border-line bg-surface-2 p-3.5', onRow && 'active:scale-[.99]')}>
                  <div className="mb-2 flex items-start justify-between gap-2">
                    {selectable && <input type="checkbox" onClick={(e) => e.stopPropagation()} checked={!!selected?.has(rowKey(r))} onChange={() => toggle(rowKey(r))} className="mt-1 accent-[var(--accent)]" />}
                    <div className="min-w-0 flex-1 text-[13.5px] font-semibold">{prim.cell(r)}</div>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                    {cols.filter((c) => c !== prim && !c.hideMobile).map((c) => (
                      <div key={c.key} className="min-w-0"><dt className="text-[10.5px] uppercase tracking-wide text-t3">{c.mobileLabel || c.header}</dt><dd className="truncate text-[12.5px] text-t1">{c.cell(r)}</dd></div>
                    ))}
                  </dl>
                </div>
              );
            })}
          </div>
          {pages > 1 && (
            <div className="mt-3 flex items-center justify-between text-[12px] text-t3">
              <span className="num">{p * pageSize + 1}–{Math.min(filtered.length, (p + 1) * pageSize)} / {filtered.length}</span>
              <div className="flex items-center gap-1">
                <button disabled={p === 0} onClick={() => setPage(p - 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-40 hover:bg-surface-2" aria-label="Oldingi"><ChevronLeft className="h-4 w-4" /></button>
                <span className="num px-2">{p + 1} / {pages}</span>
                <button disabled={p >= pages - 1} onClick={() => setPage(p + 1)} className="grid h-8 w-8 place-items-center rounded-lg border border-line disabled:opacity-40 hover:bg-surface-2" aria-label="Keyingi"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
