import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight, X, FileText, ClipboardList, Landmark, Loader2 } from 'lucide-react';
import { getLedger, getCachedLedger, getRoughBills, getCachedRoughBills } from '../utils/storage';
import { getBillTotals, isNilItem, getActualFees } from '../utils/billTotals';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Bills store dates as "DD-MM-YYYY" (sometimes with / or . separators). Normalise to "YYYY-MM-DD".
const toKey = (raw) => {
  if (!raw) return null;
  const m = String(raw).trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
};
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const sameDay = (a, b) => keyOf(a) === keyOf(b);

const caseTitle = (b) => {
  if (b.caseName && b.caseName.trim()) return b.caseName.trim();
  if (b.party1 || b.party2) return [b.party1, b.party2].filter(Boolean).join(' -Vs- ');
  if (b.othersText) return b.othersText;
  return 'Untitled matter';
};

const formatINR = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function WorkCalendarModal({ onClose }) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [filter, setFilter] = useState('all'); // all | bill | rough
  const [bills, setBills] = useState(() => getCachedLedger());
  const [roughBills, setRoughBills] = useState(() => getCachedRoughBills());
  const [loading, setLoading] = useState(true);
  // Fees are only shown when the ledger has been unlocked this session, matching the Bills Ledger lock.
  const showFees = sessionStorage.getItem('ledgerUnlocked') === 'true';

  useEffect(() => {
    let alive = true;
    Promise.all([getLedger(), getRoughBills()])
      .then(([b, r]) => {
        if (!alive) return;
        if (Array.isArray(b)) setBills(b);
        if (Array.isArray(r)) setRoughBills(r);
      })
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  // Group every work by its date key
  const worksByDay = useMemo(() => {
    const map = {};
    const add = (list, kind) => {
      (list || []).forEach(b => {
        const k = toKey(b.date);
        if (!k) return;
        (map[k] ||= []).push({ ...b, _kind: kind });
      });
    };
    add(bills, 'bill');
    add(roughBills, 'rough');
    return map;
  }, [bills, roughBills]);

  const goToDate = useCallback((d) => {
    setSelected(d);
    if (d.getMonth() !== viewMonth.getMonth() || d.getFullYear() !== viewMonth.getFullYear()) {
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [viewMonth]);

  const shiftMonth = (delta) => setViewMonth(v => new Date(v.getFullYear(), v.getMonth() + delta, 1));

  // Keyboard: Esc closes, arrows move the selected day
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
      const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (step) {
        e.preventDefault();
        goToDate(new Date(selected.getFullYear(), selected.getMonth(), selected.getDate() + step));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, goToDate, onClose]);

  // Lock background scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Build 6x7 grid
  const cells = useMemo(() => {
    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [viewMonth]);

  const monthStats = useMemo(() => {
    const prefix = `${viewMonth.getFullYear()}-${String(viewMonth.getMonth() + 1).padStart(2, '0')}-`;
    let total = 0, billCount = 0, roughCount = 0, activeDays = 0, max = 0;
    Object.entries(worksByDay).forEach(([k, list]) => {
      if (!k.startsWith(prefix)) return;
      activeDays++;
      total += list.length;
      max = Math.max(max, list.length);
      list.forEach(w => (w._kind === 'bill' ? billCount++ : roughCount++));
    });
    return { total, billCount, roughCount, activeDays, max };
  }, [worksByDay, viewMonth]);

  const dayWorks = worksByDay[keyOf(selected)] || [];
  const visibleWorks = dayWorks.filter(w => filter === 'all' || w._kind === filter);
  const dayTotal = dayWorks.reduce((s, w) => s + getBillTotals(w).total, 0);

  const years = useMemo(() => {
    const ys = new Set([today.getFullYear(), viewMonth.getFullYear()]);
    Object.keys(worksByDay).forEach(k => ys.add(Number(k.slice(0, 4))));
    return [...ys].sort((a, b) => a - b);
  }, [worksByDay, today, viewMonth]);

  const heat = (count) => {
    if (!count) return 0;
    const max = Math.max(monthStats.max, 1);
    return 0.12 + 0.38 * (count / max);
  };

  return createPortal(
    <div className="wc-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <style>{CSS}</style>
      <div className="wc-modal" role="dialog" aria-modal="true" aria-label="My works calendar">
        <button className="wc-close" onClick={onClose} aria-label="Close"><X size={18} /></button>

        {/* ---------- Calendar ---------- */}
        <section className="wc-cal">
          <div className="wc-title">
            <CalendarDays size={20} color="#D4AF37" />
            <h2>My Works</h2>
            {loading && <Loader2 size={14} className="wc-spin" />}
          </div>

          <div className="wc-nav">
            <button className="wc-icon-btn" onClick={() => shiftMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
            <div className="wc-selects">
              <select value={viewMonth.getMonth()} onChange={e => setViewMonth(new Date(viewMonth.getFullYear(), Number(e.target.value), 1))}>
                {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
              </select>
              <select value={viewMonth.getFullYear()} onChange={e => setViewMonth(new Date(Number(e.target.value), viewMonth.getMonth(), 1))}>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <button className="wc-icon-btn" onClick={() => shiftMonth(1)} aria-label="Next month"><ChevronRight size={18} /></button>
            <button className="wc-today" onClick={() => goToDate(new Date())}>Today</button>
          </div>

          <div className="wc-grid">
            {WEEKDAYS.map(d => <div key={d} className="wc-wd">{d}</div>)}
            {cells.map(d => {
              const k = keyOf(d);
              const list = worksByDay[k] || [];
              const inMonth = d.getMonth() === viewMonth.getMonth();
              const isSel = sameDay(d, selected);
              const isToday = sameDay(d, today);
              const b = list.filter(w => w._kind === 'bill').length;
              const r = list.length - b;
              return (
                <button
                  key={k}
                  className={`wc-day${inMonth ? '' : ' wc-out'}${isSel ? ' wc-sel' : ''}${isToday ? ' wc-today-cell' : ''}`}
                  style={!isSel && list.length ? { background: `rgba(212,175,55,${heat(list.length)})` } : undefined}
                  onClick={() => goToDate(d)}
                  title={list.length ? `${list.length} work${list.length > 1 ? 's' : ''}` : 'No work'}
                >
                  <span className="wc-num">{d.getDate()}</span>
                  {list.length > 0 && (
                    <span className="wc-dots">
                      {b > 0 && <i className="wc-dot wc-dot-bill" />}
                      {r > 0 && <i className="wc-dot wc-dot-rough" />}
                      <em>{list.length}</em>
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="wc-legend">
            <span><i className="wc-dot wc-dot-bill" /> Bill</span>
            <span><i className="wc-dot wc-dot-rough" /> Rough bill</span>
            <span className="wc-legend-heat">Less <b style={{ opacity: .25 }} /><b style={{ opacity: .55 }} /><b /> More</span>
          </div>

          <div className="wc-stats">
            <div><strong>{monthStats.total}</strong><span>Works</span></div>
            <div><strong>{monthStats.billCount}</strong><span>Bills</span></div>
            <div><strong>{monthStats.roughCount}</strong><span>Rough</span></div>
            <div><strong>{monthStats.activeDays}</strong><span>Active days</span></div>
          </div>
        </section>

        {/* ---------- Day detail ---------- */}
        <section className="wc-day-panel">
          <div className="wc-day-head">
            <div>
              <div className="wc-weekday">{selected.toLocaleDateString('en-GB', { weekday: 'long' })}</div>
              <h3>{selected.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
            </div>
            <div className="wc-day-summary">
              <strong>{dayWorks.length}</strong> work{dayWorks.length === 1 ? '' : 's'}
              {showFees && dayWorks.length > 0 && <span> · {formatINR(dayTotal)}</span>}
            </div>
          </div>

          {dayWorks.length > 0 && (
            <div className="wc-chips">
              {[['all', 'All', dayWorks.length], ['bill', 'Bills', dayWorks.filter(w => w._kind === 'bill').length], ['rough', 'Rough', dayWorks.filter(w => w._kind === 'rough').length]].map(([v, label, n]) => (
                <button key={v} className={`wc-chip${filter === v ? ' wc-chip-on' : ''}`} onClick={() => setFilter(v)}>{label} <span>{n}</span></button>
              ))}
            </div>
          )}

          <div className="wc-list">
            {dayWorks.length === 0 ? (
              <div className="wc-empty">
                <CalendarDays size={40} strokeWidth={1.2} />
                <p>No work recorded on this day</p>
                <small>Use ← → ↑ ↓ to move between days</small>
              </div>
            ) : visibleWorks.length === 0 ? (
              <div className="wc-empty"><p>Nothing in this filter</p></div>
            ) : visibleWorks.map((w, idx) => {
              const items = (w.items || []).filter(it => it.itemType !== 'remarks' && (it.nature || it.fees));
              const { total, isNil } = getBillTotals(w);
              return (
                <article key={w._id || w.id || idx} className="wc-card" style={{ animationDelay: `${idx * 40}ms` }}>
                  <div className="wc-card-top">
                    <span className={`wc-badge ${w._kind === 'bill' ? 'wc-badge-bill' : 'wc-badge-rough'}`}>
                      {w._kind === 'bill' ? <FileText size={12} /> : <ClipboardList size={12} />}
                      {w._kind === 'bill' ? 'Bill' : 'Rough'}
                    </span>
                    {w.memoNo && <span className="wc-memo">#{w.memoNo}</span>}
                    {w._kind === 'bill' && w.status && (
                      <span className={`wc-status ${/paid/i.test(w.status) ? 'wc-paid' : 'wc-due'}`}>{w.status}</span>
                    )}
                  </div>
                  <h4>{caseTitle(w)}</h4>
                  <div className="wc-meta">
                    {w.caseNumber && <span>{w.caseNumber}</span>}
                    {w.court && <span><Landmark size={12} /> {w.court}</span>}
                    {w.cor && <span>Coram: {w.cor}</span>}
                    {(w.client || w.briefedBy) && <span>Client: {w.client || w.briefedBy}</span>}
                  </div>
                  {items.length > 0 && (
                    <ul className="wc-items">
                      {items.map((it, i) => (
                        <li key={i}>
                          <span>{it.nature || '—'}</span>
                          {showFees && (isNilItem(it) ? (
                            <b>
                              NIL
                              {getActualFees(it) > 0 && <small className="wc-actual" title="Admin record — not on the bill"> actual {formatINR(getActualFees(it))}</small>}
                            </b>
                          ) : <b>{formatINR(it.fees)}</b>)}
                        </li>
                      ))}
                      {showFees && (items.length > 1 || isNil) && <li className="wc-items-total"><span>Total</span><b>{isNil ? 'NIL' : formatINR(total)}</b></li>}
                    </ul>
                  )}
                  {w.remarks && <p className="wc-remarks">{w.remarks}</p>}
                </article>
              );
            })}
          </div>
          {!showFees && dayWorks.length > 0 && <div className="wc-fee-note">Unlock the Bills Ledger to see fee amounts here.</div>}
        </section>
      </div>
    </div>,
    document.body
  );
}

const CSS = `
.wc-overlay { position: fixed; inset: 0; z-index: 11000; background: rgba(0,0,0,.65); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 16px; animation: wcFade .2s ease; }
.wc-modal { position: relative; width: 100%; max-width: 1120px; height: min(760px, 92vh); display: grid;
  grid-template-columns: minmax(340px, 460px) 1fr; background: #121214; border: 1px solid rgba(212,175,55,.2);
  border-radius: 16px; box-shadow: 0 30px 80px rgba(0,0,0,.7); overflow: hidden; animation: wcPop .25s cubic-bezier(.16,1,.3,1);
  font-family: var(--font-family-sans); color: #f4f4f5; }
.wc-close { position: absolute; top: 14px; right: 14px; z-index: 2; background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.1);
  color: #d4d4d8; border-radius: 50%; width: 34px; height: 34px; display: grid; place-items: center; cursor: pointer; transition: .2s; }
.wc-close:hover { background: rgba(239,68,68,.15); color: #fca5a5; border-color: rgba(239,68,68,.4); }

.wc-cal { padding: 24px; border-right: 1px solid rgba(212,175,55,.12); display: flex; flex-direction: column; gap: 16px; overflow-y: auto;
  background: linear-gradient(180deg, rgba(212,175,55,.05), transparent 40%); }
.wc-title { display: flex; align-items: center; gap: 10px; }
.wc-title h2 { margin: 0; font-family: var(--font-family-display); font-size: 1.35rem; font-weight: 800; letter-spacing: -.02em; }
.wc-spin { color: #a1a1aa; animation: wcSpin 1s linear infinite; }

.wc-nav { display: flex; align-items: center; gap: 8px; }
.wc-selects { display: flex; gap: 6px; flex: 1; }
.wc-selects select { flex: 1; background: #1c1c1f; color: #f4f4f5; border: 1px solid rgba(255,255,255,.1); border-radius: 8px;
  padding: 7px 8px; font-weight: 600; font-size: .9rem; cursor: pointer; outline: none; }
.wc-selects select:focus { border-color: #D4AF37; }
.wc-icon-btn { background: #1c1c1f; border: 1px solid rgba(255,255,255,.1); color: #e4e4e7; width: 34px; height: 34px; border-radius: 8px;
  display: grid; place-items: center; cursor: pointer; transition: .15s; flex-shrink: 0; }
.wc-icon-btn:hover { border-color: #D4AF37; color: #D4AF37; }
.wc-today { background: transparent; border: 1px solid #D4AF37; color: #D4AF37; padding: 7px 12px; border-radius: 8px; font-weight: 700;
  font-size: .8rem; cursor: pointer; transition: .15s; }
.wc-today:hover { background: #D4AF37; color: #111; }

.wc-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; }
.wc-wd { text-align: center; font-size: .7rem; font-weight: 700; color: #71717a; text-transform: uppercase; letter-spacing: .06em; padding-bottom: 4px; }
.wc-day { position: relative; aspect-ratio: 1; border-radius: 10px; border: 1px solid transparent; background: rgba(255,255,255,.025);
  color: #e4e4e7; cursor: pointer; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  transition: transform .12s, border-color .15s, background .15s; padding: 0; font: inherit; }
.wc-day:hover { border-color: rgba(212,175,55,.55); transform: translateY(-1px); }
.wc-num { font-weight: 600; font-size: .92rem; }
.wc-out { opacity: .3; }
.wc-today-cell { border-color: rgba(212,175,55,.8); }
.wc-today-cell .wc-num { color: #D4AF37; font-weight: 800; }
.wc-sel { background: #D4AF37 !important; color: #111; border-color: #D4AF37; box-shadow: 0 6px 20px rgba(212,175,55,.35); }
.wc-sel .wc-num { color: #111 !important; font-weight: 800; }
.wc-sel .wc-dots em { color: #111; }
.wc-dots { display: flex; align-items: center; gap: 3px; height: 10px; }
.wc-dots em { font-style: normal; font-size: .62rem; font-weight: 700; color: #fde68a; margin-left: 1px; }
.wc-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; }
.wc-dot-bill { background: #22c55e; }
.wc-dot-rough { background: #60a5fa; }
.wc-sel .wc-dot { box-shadow: 0 0 0 1.5px #111; }

.wc-legend { display: flex; flex-wrap: wrap; gap: 14px; font-size: .75rem; color: #a1a1aa; align-items: center; }
.wc-legend span { display: inline-flex; align-items: center; gap: 6px; }
.wc-legend-heat { margin-left: auto; }
.wc-legend-heat b { display: inline-block; width: 12px; height: 12px; border-radius: 3px; background: #D4AF37; }

.wc-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: auto; }
.wc-stats div { background: #1a1a1d; border: 1px solid rgba(255,255,255,.06); border-radius: 10px; padding: 10px 6px; text-align: center; }
.wc-stats strong { display: block; font-family: var(--font-family-display); font-size: 1.25rem; color: #D4AF37; font-variant-numeric: tabular-nums; }
.wc-stats span { font-size: .68rem; color: #a1a1aa; text-transform: uppercase; letter-spacing: .05em; }

.wc-day-panel { display: flex; flex-direction: column; min-height: 0; padding: 24px 24px 16px; }
.wc-day-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; padding-right: 44px; padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,.07); }
.wc-weekday { font-size: .75rem; color: #D4AF37; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; }
.wc-day-head h3 { margin: 2px 0 0; font-family: var(--font-family-display); font-size: 1.5rem; font-weight: 700; }
.wc-day-summary { color: #a1a1aa; font-size: .9rem; white-space: nowrap; }
.wc-day-summary strong { color: #f4f4f5; font-size: 1.1rem; }

.wc-chips { display: flex; gap: 8px; padding: 12px 0 4px; }
.wc-chip { background: #1c1c1f; border: 1px solid rgba(255,255,255,.1); color: #d4d4d8; border-radius: 999px; padding: 5px 12px;
  font-size: .8rem; font-weight: 600; cursor: pointer; transition: .15s; }
.wc-chip span { opacity: .6; margin-left: 4px; }
.wc-chip-on { background: rgba(212,175,55,.15); border-color: #D4AF37; color: #fde68a; }

.wc-list { flex: 1; overflow-y: auto; padding: 10px 4px 8px 0; display: flex; flex-direction: column; gap: 10px; }
.wc-list::-webkit-scrollbar { width: 6px; } .wc-list::-webkit-scrollbar-thumb { background: rgba(212,175,55,.3); border-radius: 3px; }
.wc-card { background: #18181b; border: 1px solid rgba(255,255,255,.07); border-radius: 12px; padding: 14px 16px;
  animation: wcSlide .3s cubic-bezier(.16,1,.3,1) both; transition: border-color .15s; }
.wc-card:hover { border-color: rgba(212,175,55,.35); }
.wc-card-top { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 6px; }
.wc-badge { display: inline-flex; align-items: center; gap: 4px; font-size: .7rem; font-weight: 700; padding: 3px 8px; border-radius: 6px;
  text-transform: uppercase; letter-spacing: .04em; }
.wc-badge-bill { background: rgba(34,197,94,.12); color: #4ade80; }
.wc-badge-rough { background: rgba(96,165,250,.12); color: #93c5fd; }
.wc-memo { font-size: .75rem; color: #a1a1aa; font-family: ui-monospace, monospace; }
.wc-status { margin-left: auto; font-size: .7rem; font-weight: 700; padding: 3px 8px; border-radius: 6px; }
.wc-paid { background: rgba(34,197,94,.12); color: #4ade80; }
.wc-due { background: rgba(245,158,11,.12); color: #fbbf24; }
.wc-card h4 { margin: 0 0 6px; font-size: 1rem; font-weight: 700; color: #fafafa; line-height: 1.35; }
.wc-meta { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: .8rem; color: #a1a1aa; }
.wc-meta span { display: inline-flex; align-items: center; gap: 4px; }
.wc-items { list-style: none; margin: 10px 0 0; padding: 8px 0 0; border-top: 1px dashed rgba(255,255,255,.08); display: flex; flex-direction: column; gap: 4px; }
.wc-items li { display: flex; justify-content: space-between; gap: 12px; font-size: .85rem; color: #d4d4d8; }
.wc-items b { color: #fde68a; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.wc-actual { font-size: .72rem; font-weight: 500; color: #93c5fd; margin-left: 4px; }
.wc-items-total { border-top: 1px solid rgba(255,255,255,.08); padding-top: 4px; margin-top: 2px; font-weight: 700; }
.wc-remarks { margin: 8px 0 0; font-size: .8rem; color: #a1a1aa; font-style: italic; }
.wc-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #52525b; text-align: center; padding: 40px 0; }
.wc-empty p { margin: 0; color: #a1a1aa; font-weight: 600; }
.wc-empty small { font-size: .75rem; }
.wc-fee-note { font-size: .72rem; color: #71717a; text-align: center; padding-top: 8px; }

@keyframes wcFade { from { opacity: 0 } to { opacity: 1 } }
@keyframes wcPop { from { opacity: 0; transform: translateY(12px) scale(.98) } to { opacity: 1; transform: none } }
@keyframes wcSlide { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: none } }
@keyframes wcSpin { to { transform: rotate(360deg) } }

@media (max-width: 860px) {
  .wc-overlay { padding: 0; align-items: stretch; }
  .wc-modal { grid-template-columns: 1fr; grid-template-rows: auto 1fr; height: 100%; max-height: none; border-radius: 0; overflow-y: auto; }
  .wc-cal { border-right: none; border-bottom: 1px solid rgba(212,175,55,.12); padding: 18px 16px; overflow: visible; }
  .wc-day-panel { padding: 18px 16px; min-height: 60vh; }
  .wc-list { overflow: visible; }
  .wc-day-head { padding-right: 0; }
  .wc-day-head h3 { font-size: 1.25rem; }
}
`;
