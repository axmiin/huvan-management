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
        data: { labels: data.map(d => d.label), datasets: [{ data: data.map(d => d.value), backgroundColor: colors, borderWidth: 0, hoverOffset: 0, borderRadius: 4 }] },
        options: {
          responsive: true, maintainAspectRatio: false, cutout: '72%',
          layout: { padding: 12 },
          plugins: {
            legend: { display: false },
            tooltip: {
              enabled: false,
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
