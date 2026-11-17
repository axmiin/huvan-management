'use client';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '../lib/supabase';
import { f, dmy, today } from '../lib/util';
export default function EntryPage({ table, title, noun, cats: base }) {
  const [rows, setRows] = useState([]), [accts, setAccts] = useState([]), [m, setM] = useState(today().slice(0, 7)), [err, setErr] = useState('');
  const [form, setForm] = useState({ entry_date: today(), details: '', category: '', amount: '', account_id: '' });
  const load = async () => {
    const [a, r] = await Promise.all([
      sb.from('accounts').select('*').order('created_at'),
      sb.from(table).select('*').order('entry_date').order('created_at')]);
    if (a.error || r.error) return setErr((a.error || r.error).message);
    setAccts(a.data); setRows(r.data);
    setForm((p) => ({ ...p, account_id: p.account_id || (a.data[0] ? a.data[0].id : '') }));
  };
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const an = (id) => (accts.find((x) => x.id === id) || {}).name || '';
  const add = async () => {
    const a = parseFloat(form.amount);
    if (!form.details.trim() || !(a > 0) || !form.account_id) return setErr('Enter details, an amount above 0 and an account.');
    const r = await sb.from(table).insert({ entry_date: form.entry_date, details: form.details.trim(),
      category: form.category.trim() || null, amount: a, account_id: form.account_id });
    if (r.error) return setErr(r.error.message);
    setErr(''); setForm({ ...form, details: '', amount: '' }); load();
  };
  const del = async (id) => { if (confirm('Delete this ' + noun + '?')) { await sb.from(table).delete().eq('id', id); load(); } };
  const cats = useMemo(() => [...new Set([...base, ...rows.map((x) => x.category).filter(Boolean)])], [rows, base]);
  const { list, total, top } = useMemo(() => {
    const list = rows.filter((x) => !m || x.entry_date.slice(0, 7) === m).map((x) => ({ ...x, a: +x.amount }));
    const by = {}; let total = 0;
    list.forEach((x) => { total += x.a; const c = x.category || 'Uncategorised'; by[c] = (by[c] || 0) + x.a; });
    const best = Object.entries(by).sort((p, q) => q[1] - p[1])[0];
    return { list, total, top: best ? best[0] : '-' };
  }, [rows, m]);
  const csv = () => {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const t = [['Date', 'Details', 'Category', 'Account', 'Amount'], ...list.map((x) => [dmy(x.entry_date), x.details, x.category || '', an(x.account_id), x.a.toFixed(2)])]
      .map((r) => r.map(q).join(',')).join('\n');
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' }));
    l.download = 'huvan-' + table + '.csv'; l.click();
  };
  return (<><h1>{title}</h1><div className="two">
    <div className="card"><h2>Add {noun}</h2>
      <label>Date</label><input type="date" value={form.entry_date} onChange={set('entry_date')} />
      <label>Details</label><input value={form.details} onChange={set('details')} />
      <label>Category</label><input list={table + '-cats'} value={form.category} onChange={set('category')} />
      <datalist id={table + '-cats'}>{cats.map((c) => <option key={c} value={c} />)}</datalist>
      <label>Account</label><select value={form.account_id} onChange={set('account_id')}>{accts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <label>Amount</label><input type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} />
      <button onClick={add}>Add</button><p className="err">{err}</p></div>
    <div className="card"><h2>{title} list</h2>
      <label>Month (clear to show all)</label><input type="month" value={m} onChange={(e) => setM(e.target.value)} />
      <div className="sum"><div>Total<b>{f(total)}</b></div><div>Entries<b>{list.length}</b></div><div>Biggest category<b>{top}</b></div></div>
      <button className="alt" onClick={csv}>Export CSV</button>
      <div className="xt"><table><thead><tr><th>Date</th><th>Details</th><th>Category</th><th>Account</th><th>Amount</th><th></th></tr></thead>
        <tbody>{list.length ? list.map((x) => (<tr key={x.id}><td>{dmy(x.entry_date)}</td><td>{x.details}</td><td>{x.category}</td><td>{an(x.account_id)}</td>
          <td className="n">{f(x.a)}</td><td><a onClick={() => del(x.id)}>×</a></td></tr>)) : <tr><td colSpan="6">No entries</td></tr>}</tbody></table></div>
    </div></div></>);
}
