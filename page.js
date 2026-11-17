'use client';
import { useEffect, useState } from 'react';
import { sb } from '../lib/supabase';
import { OPEN, f, today } from '../lib/util';
export default function Dashboard() {
  const [d, setD] = useState(null);
  useEffect(() => { (async () => {
    const r = await sb.from('ledger').select('entry_date,kind,amount');
    if (r.error) return;
    const m = today().slice(0, 7); let bal = OPEN, s = 0, e = 0;
    r.data.forEach((x) => { const a = +x.amount, sale = x.kind === 'sale'; bal += sale ? a : -a;
      if (x.entry_date.slice(0, 7) === m) { if (sale) s += a; else e += a; } });
    setD({ s, e, bal });
  })(); }, []);
  return (<><h1>Dashboard</h1><p className="muted">This month</p>
    {d && <div className="sum"><div>Sales<b>{f(d.s)}</b></div><div>Expenses<b>{f(d.e)}</b></div><div>Net<b>{f(d.s - d.e)}</b></div><div>Balance<b>{f(d.bal)}</b></div></div>}</>);
}
