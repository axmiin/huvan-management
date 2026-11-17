'use client';
import { useEffect, useState } from 'react';
import { sb } from '../lib/supabase';
import { f, today } from '../lib/util';
export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { (async () => {
    const [a, s, e] = await Promise.all([sb.from('accounts').select('opening_balance'),
      sb.from('sales').select('entry_date,amount'), sb.from('expenses').select('entry_date,amount')]);
    if (a.error || s.error || e.error) return;
    const m = today().slice(0, 7);
    const sum = (l, p) => l.reduce((t, x) => t + (p(x) ? +x.amount : 0), 0);
    const inM = (x) => x.entry_date.slice(0, 7) === m;
    const bal = a.data.reduce((t, x) => t + +x.opening_balance, 0) + sum(s.data, () => true) - sum(e.data, () => true);
    setD({ s: sum(s.data, inM), e: sum(e.data, inM), bal });
  })(); }, []);
  return (<><h1>Dashboard</h1><p className="muted">This month</p>
    {d && <div className="sum"><div>Sales<b>{f(d.s)}</b></div><div>Expenses<b>{f(d.e)}</b></div><div>Net<b>{f(d.s - d.e)}</b></div><div>Total balance<b>{f(d.bal)}</b></div></div>}</>);
}
