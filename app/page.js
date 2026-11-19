'use client';
import { useEffect, useState, useMemo, useRef } from 'react';
import { sb } from '../lib/supabase';
import { f, today } from '../lib/util';

function DonutChart({ data, colors }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current || !data.length) return;
    const load = () => {
      if (!window.Chart) return setTimeout(load, 50);
      if (chartRef.current) chartRef.current.destroy();
      const isDark = matchMedia('(prefers-color-scheme:dark)').matches;
      chartRef.current = new window.Chart(canvasRef.current, {
        type: 'doughnut',
        data: { labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.value), backgroundColor: colors, borderWidth: 0, hoverOffset: 8, borderRadius: 4 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '72%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? '#1e1e2e' : '#fff', titleColor: isDark ? '#f0efec' : '#0b0b0b',
              bodyColor: isDark ? '#c3c2b7' : '#52514e', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              borderWidth: 1, padding: 10, cornerRadius: 8,
              callbacks: { label: (c) => ' ' + c.label + ': MVR ' + Number(c.raw).toLocaleString() }
            }
          }
        }
      });
    };
    load();
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);
  return <canvas ref={canvasRef} />;
}

function TrendChart({ labels, values }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    const load = () => {
      if (!window.Chart) return setTimeout(load, 50);
      if (chartRef.current) chartRef.current.destroy();
      const isDark = matchMedia('(prefers-color-scheme:dark)').matches;
      const grid = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
      const ctx = canvasRef.current.getContext('2d');
      const grad = ctx.createLinearGradient(0, 0, 0, 240);
      grad.addColorStop(0, isDark ? 'rgba(99,102,241,0.35)' : 'rgba(99,102,241,0.18)');
      grad.addColorStop(1, 'rgba(99,102,241,0)');
      chartRef.current = new window.Chart(canvasRef.current, {
        type: 'line',
        data: { labels, datasets: [{ label: 'Revenue', data: values, borderColor: '#6366f1', backgroundColor: grad, borderWidth: 2.5, pointRadius: 4, pointBackgroundColor: '#6366f1', pointBorderColor: isDark ? '#1a1a2e' : '#fff', pointBorderWidth: 2, pointHoverRadius: 6, tension: 0.45, fill: true }] },
        options: {
          responsive: true, maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: isDark ? '#1e1e2e' : '#fff', titleColor: isDark ? '#f0efec' : '#0b0b0b',
              bodyColor: isDark ? '#c3c2b7' : '#52514e', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              borderWidth: 1, padding: 10, cornerRadius: 8,
              callbacks: { label: (c) => ' MVR ' + Number(c.raw).toLocaleString() }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: '#898781', font: { size: 11 } }, border: { display: false } },
            y: { grid: { color: grid }, ticks: { color: '#898781', font: { size: 11 }, callback: (v) => 'MVR ' + Math.round(v / 1000) + 'k' }, border: { display: false } }
          }
        }
      });
    };
    load();
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [labels, values]);
  return <canvas ref={canvasRef} />;
}

const CAT_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#a78bfa', '#14b8a6', '#fb923c'];

function StatCard({ icon, iconBg, iconColor, label, value, delta, deltaType }) {
  const cls = deltaType === 'up'
    ? { background: '#eaf3de', color: '#3b6d11' }
    : deltaType === 'dn'
    ? { background: '#fcebeb', color: '#a32d2d' }
    : { background: 'var(--bg)', color: 'var(--muted)' };
  return (
    <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 14 }}>
      <div style={{ width: 32, height: 32, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}><path d={icon} /></svg>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.01em', marginBottom: 6 }}>{value}</div>
      <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 7px', borderRadius: 20, ...cls }}>{delta}</span>
    </div>
  );
}

export default function Dashboard() {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [sales, setSales] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [s, e, a] = await Promise.all([
        sb.from('sales').select('entry_date,amount,category'),
        sb.from('expenses').select('entry_date,amount,category'),
        sb.from('accounts').select('opening_balance'),
      ]);
      setSales(s.data || []);
      setExpenses(e.data || []);
      setAccounts(a.data || []);
      setLoading(false);
    })();
  }, []);

  const prevMonth = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }, [month]);

  const sumMonth = (arr, m) => arr.filter(x => x.entry_date.slice(0, 7) === m).reduce((t, x) => t + +x.amount, 0);
  const curSales = sumMonth(sales, month);
  const curExp = sumMonth(expenses, month);
  const prevSales = sumMonth(sales, prevMonth);
  const prevExp = sumMonth(expenses, prevMonth);
  const curProfit = curSales - curExp;
  const prevProfit = prevSales - prevExp;
  const totalBal = accounts.reduce((t, a) => t + +a.opening_balance, 0) + sales.reduce((t, x) => t + +x.amount, 0) - expenses.reduce((t, x) => t + +x.amount, 0);

  const deltaLabel = (cur, prev) => {
    if (prev === 0) return { label: 'No previous data', type: 'nt' };
    const p = Math.round((cur - prev) / prev * 100);
    return { label: (p >= 0 ? '↑' : '↓') + ' ' + Math.abs(p) + '% vs last month', type: p >= 0 ? 'up' : 'dn' };
  };

  const expByCategory = useMemo(() => {
    const by = {};
    expenses.filter(x => x.entry_date.slice(0, 7) === month).forEach(x => {
      const c = x.category || 'Other'; by[c] = (by[c] || 0) + +x.amount;
    });
    return Object.entries(by).sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }));
  }, [expenses, month]);

  const trendData = useMemo(() => {
    const months = [];
    const [y, m] = month.split('-').map(Number);
    for (let i = 7; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    return {
      labels: months.map(m => { const [y, mo] = m.split('-'); return new Date(y, mo - 1, 1).toLocaleString('en-US', { month: 'short' }); }),
      values: months.map(m => sumMonth(sales, m)),
    };
  }, [sales, month]);

  const monthLabel = (m) => { const [y, mo] = m.split('-'); return new Date(y, mo - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }); };
  const revDelta = deltaLabel(curSales, prevSales);
  const expDelta = deltaLabel(curExp, prevExp);
  const profDelta = deltaLabel(curProfit, prevProfit);

  return (
    <>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js" async />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
        <div>
          <h1 style={{ marginBottom: 2 }}>Dashboard</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>{monthLabel(month)}</p>
        </div>
        <input type="month" value={month} onChange={e => setMonth(e.target.value)}
          style={{ padding: '7px 11px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', color: 'var(--ink)', font: 'inherit', fontSize: 13, maxWidth: 180 }} />
      </div>

      {loading ? <p style={{ color: 'var(--muted)' }}>Loading…</p> : <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 16 }}>
          <StatCard icon="M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6" iconBg="#e8f0fd" iconColor="#2a78d6" label="Total revenue" value={'MVR ' + f(curSales)} delta={revDelta.label} deltaType={revDelta.type} />
          <StatCard icon="M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z M9 7h6 M9 11h6" iconBg="#fdeee8" iconColor="#eb6834" label="Total expenses" value={'MVR ' + f(curExp)} delta={expDelta.label} deltaType={expDelta.type === 'up' ? 'dn' : 'up'} />
          <StatCard icon="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M12 6v6l4 2" iconBg="#eaf3de" iconColor="#3b6d11" label="Net profit" value={'MVR ' + f(curProfit)} delta={profDelta.label} deltaType={profDelta.type} />
          <StatCard icon="M3 7h18v12H3z M3 7l2-3h14l2 3 M16 13h2" iconBg="#f0ecfd" iconColor="#6250d6" label="Account balance" value={'MVR ' + f(totalBal)} delta="All accounts" deltaType="nt" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Expenses breakdown</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>By category — {monthLabel(month)}</div>
            {expByCategory.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>No expenses recorded.</p>
              : <>
                <div style={{ position: 'relative', width: 160, height: 160, margin: '0 auto 14px' }}>
                  <DonutChart data={expByCategory} colors={CAT_COLORS} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink)' }}>MVR {Math.round(curExp / 1000)}k</span>
                    <span style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>Total</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {expByCategory.map((d, i) => (
                    <div key={d.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--muted)' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
                        {d.label}
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {f(d.value)} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>{Math.round(d.value / curExp * 100)}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>}
          </div>

          <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>Monthly revenue</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>Income over the last 8 months</div>
            <div style={{ position: 'relative', width: '100%', height: 220 }}>
              <TrendChart labels={trendData.labels} values={trendData.values} />
            </div>
          </div>
        </div>
      </>}
    </>
  );
}
