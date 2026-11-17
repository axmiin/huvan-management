'use client';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '../../lib/supabase';
import { OPEN, f, dmy, today } from '../../lib/util';
const CATS = ['Ingredients', 'Wages', 'Rent', 'Utilities', 'Supplies', 'Transport'];
export default function Expenses() {
  const [rows, setRows] = useState([]), [m, setM] = useState(today().slice(0, 7)), [err, setErr] = useState('');
  const [form, setForm] = useState({ kind: 'expense', entry_date: today(), details: '', category: '', amount: '' });
  const load = async () => {
    const r = await sb.from('ledger').select('*').order('entry_date').order('created_at');
    if (r.error) setErr(r.error.message); else setRows(r.data);
  };
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const add = async () => {
    const a = parseFloat(form.amount);
    if (!form.details.trim() || !(a > 0)) return setErr('Enter details and an amount above 0.');
    const r = await sb.from('ledger').insert({ ...form, details: form.details.trim(), category: form.category.trim() || null, amount: a });
    if (r.error) return setErr(r.error.message);
    setErr(''); setForm({ ...form, details: '', amount: '' }); load();
  };
  const del = async (id) => { if (confirm('Delete this entry?')) { await sb.from('ledger').delete().eq('id', id); load(); } };
  const { list, s, e, bal } = useMemo(() => {
    let bal = OPEN, s = 0, e = 0; const list = [];
    rows.forEach((x) => {
      const a = +x.amount, sale = x.kind === 'sale'; bal += sale ? a : -a;
      if (m && x.entry_date.slice(0, 7) !== m) return;
      if (sale) s += a; else e += a;
      list.push({ ...x, a, sale, bal });
    });
    return { list, s, e, bal };
  }, [rows, m]);
  const csv = () => {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const t = [['Date', 'Details', 'Category', 'Sales Transfer', 'Expense Amount', 'Balance'],
      ...list.map((x) => [dmy(x.entry_date), x.details, x.category || '', x.sale ? x.a : '', x.sale ? '' : x.a, x.bal.toFixed(2)])]
      .map((r) => r.map(q).join(',')).join('\n');
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' }));
    l.download = 'huvan-ledger.csv'; l.click();
  };
  return (<><h1>Expenses</h1><div className="two">
    <div className="card"><h2>Add entry</h2>
      <label>Type</label><select value={form.kind} onChange={set('kind')}><option value="expense">Expense</option><option value="sale">Sales transfer</option></select>
      <label>Date</label><input type="date" value={form.entry_date} onChange={set('entry_date')} />
      <label>Details</label><input value={form.details} onChange={set('details')} />
      <label>Category</label><input list="cats" value={form.category} onChange={set('category')} />
      <datalist id="cats">{CATS.map((c) => <option key={c} value={c} />)}</datalist>
      <label>Amount</label><input type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} />
      <button onClick={add}>Add</button><p className="err">{err}</p></div>
    <div className="card"><h2>Ledger</h2>
      <label>Month (clear to show all)</label><input type="month" value={m} onChange={(e) => setM(e.target.value)} />
      <div className="sum"><div>Sales<b>{f(s)}</b></div><div>Expenses<b>{f(e)}</b></div><div>Net<b>{f(s - e)}</b></div><div>Balance<b>{f(bal)}</b></div></div>
      <button className="alt" onClick={csv}>Export CSV</button>
      <div className="xt"><table><thead><tr><th>Date</th><th>Details</th><th>Category</th><th>Sales</th><th>Expense</th><th>Balance</th><th></th></tr></thead>
        <tbody>{list.length ? list.map((x) => (<tr key={x.id}><td>{dmy(x.entry_date)}</td><td>{x.details}</td><td>{x.category}</td>
          <td className="n">{x.sale ? f(x.a) : ''}</td><td className="n">{x.sale ? '' : f(x.a)}</td><td className="n">{f(x.bal)}</td>
          <td><a onClick={() => del(x.id)}>×</a></td></tr>)) : <tr><td colSpan="7">No entries</td></tr>}</tbody></table></div>
    </div></div></>);
}
