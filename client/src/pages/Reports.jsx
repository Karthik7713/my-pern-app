import { useState, useMemo } from 'react';
import api from '../services/api';
// import mockData from './reportsMock';
import './reports.css';
import { useBooks } from '../hooks/bookContext';

const formatter = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function sanitizeNumber(value){
  if (value == null) return 0;
  if (typeof value === 'number') return value;
  const s = String(value).replace(/[^0-9.-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function numberFormatIN(x){
  if (x == null) return '-';
  return formatter.format(Number(x));
}

export default function Reports(){
  const { activeBookId } = useBooks();
  const [period, setPeriod] = useState('daily');
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState({ key: 'key', dir: 'asc' });
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [doneBy, setDoneBy] = useState('all');

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      // fetch detailed rows (show all transactions matching filters)
      const bookParam = activeBookId ? `?book_id=${encodeURIComponent(activeBookId)}` : '';
      const res = await api.get(`/reports/details${bookParam}`);
      console.debug('reports details raw', res.data);
      const rowsIn = res.data?.rows || [];
      // derive cash_in / cash_out and ensure date_display/date_iso exist
      const sanitized = rowsIn.map(r => {
        const amount = Number(r.amount || 0);
        return {
          ...r,
          cash_in: r.type === 'CASH_IN' ? amount : 0,
          cash_out: r.type === 'CASH_OUT' ? amount : 0,
          date_display: r.date_display || r.date_iso || (r.date ? r.date : ''),
          date_iso: r.date_iso || (r.date_display ? undefined : r.date),
          user_name: r.user_name || r.done_by || ''
        };
      });
      setRows(sanitized);
    } catch (err) {
      console.error('Failed to fetch report details:', err);
      setError('Failed to fetch report details. Try again or check server connection.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = async () => {
    // stubbed: only enabled when rows exist
    if (!rows || rows.length === 0) return;
    const bookParam = activeBookId ? `?book_id=${encodeURIComponent(activeBookId)}` : '';
    try {
      const res = await api.get(`/reports/export/csv${bookParam}`, { responseType: 'blob' });
      const headers = res.headers || {};
      const contentType = (headers['content-type'] || headers['Content-Type'] || '') + '';

      // If server returned JSON error blob, surface readable message
      if (contentType.includes('application/json') || contentType.includes('text/plain')) {
        const text = await (res.data.text ? res.data.text() : new Response(res.data).text());
          try {
            const json = JSON.parse(text);
            setError(json.error || json.message || 'Export failed');
          } catch {
            setError(text || 'Export failed');
          }
        return;
      }

      // Determine filename from Content-Disposition header if present
      const disp = headers['content-disposition'] || headers['Content-Disposition'] || '';
      let filename = '';
      const fnMatch = /filename\*?=(?:UTF-8'')?"?([^";]+)/i.exec(disp);
      if (fnMatch && fnMatch[1]) {
        try { filename = decodeURIComponent(fnMatch[1]); } catch { filename = fnMatch[1]; }
      }

      const ext = contentType.includes('excel') || contentType.includes('html') ? 'xls' : 'csv';
      if (!filename) filename = `report_${Date.now()}.${ext}`;

      const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export CSV failed', err);
      setError('Export failed');
    }
  };

  const exportPdf = () => {
    if (!rows || rows.length === 0) return;
    const bookParam = activeBookId ? `?book_id=${encodeURIComponent(activeBookId)}` : '';
    api.get(`/reports/export/pdf${bookParam}`, { responseType: 'blob' }).then(res => {
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a'); a.href = url; a.download = `report_${Date.now()}.pdf`; a.click();
    }).catch(() => setError('Export failed'));
  };

  const sorted = useMemo(() => {
    if (!rows) return null;
    // apply Done By filter first
    const filtered = doneBy === 'all' ? rows.slice() : rows.filter(r => (r.user_name || r.done_by || '').toString() === doneBy);
    const copy = [...filtered];
    copy.sort((a,b) => {
      const numericKeys = ['cash_in','cash_out','in','out'];
      const key = sortBy.key;
      if (numericKeys.includes(key)) {
        const v1 = sanitizeNumber(a[key]);
        const v2 = sanitizeNumber(b[key]);
        return sortBy.dir === 'asc' ? v1 - v2 : v2 - v1;
      }
      const s1 = (a[key] !== undefined && a[key] !== null) ? String(a[key]) : '';
      const s2 = (b[key] !== undefined && b[key] !== null) ? String(b[key]) : '';
      return sortBy.dir === 'asc' ? s1.localeCompare(s2) : s2.localeCompare(s1);
    });
    return copy;
  }, [rows, sortBy, doneBy]);

  const pageCount = sorted ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const current = sorted ? sorted.slice((page-1)*pageSize, page*pageSize) : [];

  const toggleSort = (key) => {
    setSortBy(s => ({ key, dir: s.key === key ? (s.dir === 'asc' ? 'desc' : 'asc') : 'asc' }));
  };

  // layout debug logs removed

  return (
    <div className="reports-container">
      <div className="reports-inner">
        <header className="reports-header">
          <div>
            <h1>Reports</h1>
            <p className="reports-sub">Generate CSV/PDF exports for selected period</p>
          </div>
        </header>

        {/* Controls: always visible and first in DOM */}
        <section className="reports-controls" role="region" aria-label="Report controls">
          <div className="controls-left">
            <label className="label">Period</label>
            <select aria-label="Select period" value={period} onChange={e=>setPeriod(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="category">By Category</option>
            </select>
          </div>

          <div className="controls-middle">
            <button className="btn primary" onClick={fetchData} aria-label="Generate report" disabled={loading} aria-disabled={loading}>
              {loading ? <span className="spinner" aria-hidden="true" /> : '▶'}
              <span style={{ marginLeft: 8 }}>Generate</span>
            </button>
          </div>

          <div className="controls-right">
            <button className="btn secondary csv" onClick={exportCsv} aria-label="Export CSV" disabled={!rows || rows.length===0 || loading} aria-disabled={!rows || rows.length===0 || loading} title={!rows || rows.length===0 ? 'Generate results first' : 'Export CSV'}>Export CSV</button>
            <button className="btn secondary pdf" onClick={exportPdf} aria-label="Export PDF" disabled={!rows || rows.length===0 || loading} aria-disabled={!rows || rows.length===0 || loading} title={!rows || rows.length===0 ? 'Generate results first' : 'Export PDF'}>Export PDF</button>
          </div>
        </section>

        {error && <div className="reports-error">{error}</div>}

        {/* Summary sits below controls */}
        <div className="reports-summary">
          {!rows && !loading && (
            <div className="reports-empty">
              <div className="empty-illustration">📊</div>
              <h3>No reports yet</h3>
              <p>Generate a report for the selected period to view results.</p>
              <button className="btn primary" onClick={fetchData}>Generate</button>
            </div>
          )}

          {loading && (
            <div className="table-skeleton">
              {Array.from({length:3}).map((_,i)=> (
                <div className="s-row" key={i}><div className="s-cell" style={{height:36}} /></div>
              ))}
            </div>
          )}

          {rows && rows.length > 0 && (
            <div className="kpi-cards">
              <div className="kpi">
                <div className="kpi-label">Total In</div>
                <div className="kpi-value">{numberFormatIN(rows.reduce((s,r)=>s+ sanitizeNumber(r.cash_in),0))}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Total Out</div>
                <div className="kpi-value">{numberFormatIN(rows.reduce((s,r)=>s+ sanitizeNumber(r.cash_out),0))}</div>
              </div>
              <div className="kpi">
                <div className="kpi-label">Net</div>
                <div className="kpi-value">{numberFormatIN(rows.reduce((s,r)=>s+ (sanitizeNumber(r.cash_in)-sanitizeNumber(r.cash_out)),0))}</div>
              </div>
            </div>
          )}
        </div>

        {/* Results area: scrollable and below summary */}
        <div className="reports-results">
          {rows && rows.length > 0 && (
            <>
              <div className="reports-table-wrapper" role="table" aria-label="Reports table">
                {/* Done By filter: derives options from fetched rows */}
                <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ fontSize: 13 }}>Done By:</label>
                  <select value={doneBy} onChange={e=>{ setDoneBy(e.target.value); setPage(1); }}>
                    <option value="all">All</option>
                    {(Array.from(new Set((rows||[]).map(r=>r.user_name || r.done_by || '').filter(Boolean)))).map((u, i) => (
                      <option key={i} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th onClick={()=>toggleSort('date_iso')} role="button">Date {sortBy.key==='date_iso' ? (sortBy.dir==='asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={()=>toggleSort('user_name')} role="button">Done By {sortBy.key==='user_name' ? (sortBy.dir==='asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={()=>toggleSort('cash_in')} role="button" className="num">Cash In {sortBy.key==='cash_in' ? (sortBy.dir==='asc' ? '↑' : '↓') : ''}</th>
                      <th onClick={()=>toggleSort('cash_out')} role="button" className="num">Cash Out {sortBy.key==='cash_out' ? (sortBy.dir==='asc' ? '↑' : '↓') : ''}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {current.map((r, idx) => (
                      <tr key={idx}>
                        <td className="left">{r.date_display || r.date_iso || r.key || '-'}</td>
                        <td className="left">{r.user_name || r.done_by || '-'}</td>
                        <td className="right">{numberFormatIN(sanitizeNumber(r.cash_in))}</td>
                        <td className="right">{numberFormatIN(sanitizeNumber(r.cash_out))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="table-footer">
                <div>Showing {Math.min(sorted.length, page*pageSize)} of {sorted.length} records</div>
                <div className="pagination">
                  <button className="btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}>Prev</button>
                  <span>Page {page} / {pageCount}</span>
                  <button className="btn" onClick={()=>setPage(p=>Math.min(pageCount,p+1))} disabled={page===pageCount}>Next</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
