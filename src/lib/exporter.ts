// Client-side export: CSV (UTF-8 BOM), Excel (SpreadsheetML 2003 .xls — opens in Excel/LibreOffice),
// PDF (browser print of a generated, print-styled document). No server required.
export interface Column { key: string; label: string; type?: 'money' | 'number' | 'text' | 'date' | 'pct' }
export type Row = Record<string, string | number | null | undefined>;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function download(name: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCSV(cols: Column[], rows: Row[]) {
  const q = (v: unknown) => { const s = v == null ? '' : String(v); return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return '\ufeff' + [cols.map((c) => q(c.label)).join(';'), ...rows.map((r) => cols.map((c) => q(typeof r[c.key] === 'number' ? Math.round((r[c.key] as number) * 100) / 100 : r[c.key])).join(';'))].join('\r\n');
}

export function exportCSV(name: string, cols: Column[], rows: Row[]) { download(`${name}.csv`, 'text/csv;charset=utf-8', toCSV(cols, rows)); }

export function exportXLS(name: string, title: string, cols: Column[], rows: Row[], meta: string[] = []) {
  const cell = (v: unknown, c: Column) => {
    if (typeof v === 'number') return `<Cell ss:StyleID="${c.type === 'money' ? 'm' : 'n'}"><Data ss:Type="Number">${Math.round(v * 100) / 100}</Data></Cell>`;
    return `<Cell><Data ss:Type="String">${esc(v == null ? '' : String(v))}</Data></Cell>`;
  };
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Styles><Style ss:ID="h"><Font ss:Bold="1"/><Interior ss:Color="#E0E7FF" ss:Pattern="Solid"/></Style><Style ss:ID="t"><Font ss:Bold="1" ss:Size="14"/></Style><Style ss:ID="m"><NumberFormat ss:Format="#,##0"/></Style><Style ss:ID="n"><NumberFormat ss:Format="#,##0.##"/></Style></Styles>
<Worksheet ss:Name="${esc(title.slice(0, 30))}"><Table>
<Row><Cell ss:StyleID="t"><Data ss:Type="String">${esc(title)}</Data></Cell></Row>
${meta.map((m) => `<Row><Cell><Data ss:Type="String">${esc(m)}</Data></Cell></Row>`).join('')}
<Row></Row><Row>${cols.map((c) => `<Cell ss:StyleID="h"><Data ss:Type="String">${esc(c.label)}</Data></Cell>`).join('')}</Row>
${rows.map((r) => `<Row>${cols.map((c) => cell(r[c.key], c)).join('')}</Row>`).join('\n')}
</Table></Worksheet></Workbook>`;
  download(`${name}.xls`, 'application/vnd.ms-excel', xml);
}

export function exportPDF(title: string, cols: Column[], rows: Row[], meta: string[] = []) {
  const fmt = (v: unknown, c: Column) => typeof v === 'number' ? (c.type === 'pct' ? `${v.toFixed(1)}%` : Math.round(v).toLocaleString('ru-RU').replace(/\u00a0/g, ' ')) : esc(v == null ? '' : String(v));
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{font:12px/1.45 Inter,Arial,sans-serif;color:#0f172a;margin:32px}h1{font-size:18px;margin:0 0 4px}.meta{color:#64748b;font-size:11px;margin-bottom:16px}
table{width:100%;border-collapse:collapse}th{background:#eef2ff;text-align:left;font-weight:600;padding:6px 8px;border-bottom:1px solid #c7d2fe}td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
td.n{text-align:right;font-variant-numeric:tabular-nums}.brand{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #4f46e5;padding-bottom:8px;margin-bottom:12px}
.b{font-weight:800;letter-spacing:.04em;color:#4f46e5}.demo{font-size:10px;color:#b45309;border:1px solid #f59e0b;padding:2px 6px;border-radius:4px}@page{size:A4;margin:14mm}</style></head>
<body><div class="brand"><div class="b">BALANS AI</div><span class="demo">DEMO MA’LUMOT — rasmiy hujjat emas</span></div><h1>${esc(title)}</h1><div class="meta">${meta.map(esc).join(' · ')}</div>
<table><thead><tr>${cols.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>
${rows.map((r) => `<tr>${cols.map((c) => `<td class="${typeof r[c.key] === 'number' ? 'n' : ''}">${fmt(r[c.key], c)}</td>`).join('')}</tr>`).join('')}
</tbody></table><script>window.onload=()=>{setTimeout(()=>window.print(),250)}</script></body></html>`;
  const w = window.open('', '_blank');
  if (w) { w.document.open(); w.document.write(html); w.document.close(); return true; }
  return false;
}
