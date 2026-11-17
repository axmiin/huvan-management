'use client';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '../../lib/supabase';
import { f, dmy, today } from '../../lib/util';
export default function Cash() {
  const [A, setA] = useState([]), [S, setS] = useState([]), [E, setE] = useState([]), [T, setT] = useState([]);
  const [err, setErr] = useState(''), [sel, setSel] = useState('');
  const [tf, setTf] = useState({ entry_date: today(), from_account: '', to_account: '', amount: '', note: '' });
  const [af, setAf] = useState({ name: '', type: 'bank', opening_balance: '' });
  const load = async () => {
    const r = await Promise.all([sb.from('accounts').select('*').order('created_at'), sb.from('sales').select('*'), sb.from('expenses').select('*'), sb.from('transfers').select('*')]);
    const bad = r.find((x) => x.error); if (bad) return setErr(bad.error.message);
    setA(r[0].data); setS(r[1].data); setE(r[2].data); setT(r[3].data);
    const a = r[0].data;
    setSel((p) => p || (a[0] ? a[0].id : ''));
    setTf((p) => ({ ...p, from_account: p.from_account || (a[0] ? a[0].id : ''), to_account: p.to_account || (a[1] ? a[1].id : '') }));
  };
  useEffect(() => { load(); }, []);
  const name = (id) => (A.find((x) => x.id === id) || {}).name || '';
  const bal = useMemo(() => {
    const b = {}; A.forEach((a) => { b[a.id] = +a.opening_balance; });
    S.forEach((x) => { b[x.account_id] += +x.amount; }); E.forEach((x) => { b[x.account_id] -= +x.amount; });
    T.forEach((x) => { b[x.from_account] -= +x.amount; b[x.to_account] += +x.amount; });
    return b;
  }, [A, S, E, T]);
  const total = Object.values(bal).reduce((t, v) => t + v, 0);
  const stmt = useMemo(() => {
    const a = A.find((x) => x.id === sel); if (!a) return [];
    const ev = [];
    S.filter((x) => x.account_id === sel).forEach((x) => ev.push({ d: x.entry_date, c: x.created_at, t: 'Sale', n: x.details, v: +x.amount }));
    E.filter((x) => x.account_id === sel).forEach((x) => ev.push({ d: x.entry_date, c: x.created_at, t: 'Expense', n: x.details, v: -x.amount }));
    T.forEach((x) => {
      if (x.from_account === sel) ev.push({ d: x.entry_date, c: x.created_at, t: 'Transfer out', n: 'To ' + name(x.to_account) + (x.note ? ' - ' + x.note : ''), v: -x.amount });
      if (x.to_account === sel) ev.push({ d: x.entry_date, c: x.created_at, t: 'Transfer in', n: 'From ' + name(x.from_account) + (x.note ? ' - ' + x.note : ''), v: +x.amount });
    });
    ev.sort((p, q) => p.d.localeCompare(q.d) || p.c.localeCompare(q.c));
    let r = +a.opening_balance;
    return [{ d: '', t: 'Opening', n: 'Opening balance', v: 0, r }, ...ev.map((x) => ({ ...x, r: (r += x.v) }))];
  }, [A, S, E, T, sel]);
  const addT = async () => {
    const a = parseFloat(tf.amount);
    if (!tf.from_account || !tf.to_account || tf.from_account === tf.to_account) return setErr('Choose two different accounts.');
    if (!(a > 0)) return setErr('Enter an amount above 0.');
    if (bal[tf.from_account] < a && !confirm(name(tf.from_account) + ' will go below zero. Continue?')) return;
    const r = await sb.from('transfers').insert({ entry_date: tf.entry_date, from_account: tf.from_account, to_account: tf.to_account, amount: a, note: tf.note.trim() || null });
    if (r.error) return setErr(r.error.message);
    setErr(''); setTf({ ...tf, amount: '', note: '' }); load();
  };
  const addA = async () => {
    if (!af.name.trim()) return setErr('Enter an account name.');
    const r = await sb.from('accounts').insert({ name: af.name.trim(), type: af.type, opening_balance: parseFloat(af.opening_balance) || 0 });
    if (r.error) return setErr(r.error.message.includes('duplicate') ? 'That account name already exists.' : r.error.message);
    setErr(''); setAf({ name: '', type: 'bank', opening_balance: '' }); load();
  };
  const edit = async (a) => {
    const n = prompt('Account name', a.name); if (n === null || !n.trim()) return;
    const o = prompt('Opening balance', a.opening_balance); if (o === null || isNaN(parseFloat(o))) return;
    const r = await sb.from('accounts').update({ name: n.trim(), opening_balance: parseFloat(o) }).eq('id', a.id);
    if (r.error) setErr(r.error.message); else { setErr(''); load(); }
  };
  const rm = async (a) => {
    if (!confirm('Delete ' + a.name + '?')) return;
    const r = await sb.from('accounts').delete().eq('id', a.id);
    if (r.error) setErr('Cannot delete ' + a.name + ' because it has entries.'); else { setErr(''); load(); }
  };
  const delT = async (id) => { if (confirm('Delete this transfer?')) { await sb.from('transfers').delete().eq('id', id); load(); } };
  const csv = () => {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const t = [['Date', 'Type', 'Details', 'Amount', 'Balance'], ...stmt.map((x) => [x.d ? dmy(x.d) : '', x.t, x.n, x.v ? x.v.toFixed(2) : '', x.r.toFixed(2)])].map((r) => r.map(q).join(',')).join('\n');
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' }));
    l.download = 'statement-' + name(sel).replace(/\W+/g, '-') + '.csv'; l.click();
  };
  const hist = [...T].sort((p, q) => q.entry_date.localeCompare(p.entry_date) || q.created_at.localeCompare(p.created_at));
  const lk = { cursor: 'pointer', marginRight: 10, fontSize: 11 };
  return (<><h1>Cash &amp; Accounts</h1>
    <div className="sum">
      {A.map((a) => (<div key={a.id}>{a.name}<b>{f(bal[a.id] || 0)}</b>
        <a style={lk} onClick={() => edit(a)}>Edit</a><a style={lk} onClick={() => rm(a)}>Delete</a></div>))}
      <div>Total<b>{f(total)}</b></div>
    </div>
    <p className="err">{err}</p>
    <div className="two">
      <div style={{ display: 'grid', gap: 16 }}>
        <div className="card"><h2>Transfer between accounts</h2>
          <label>Date</label><input type="date" value={tf.entry_date} onChange={(e) => setTf({ ...tf, entry_date: e.target.value })} />
          <label>From</label><select value={tf.from_account} onChange={(e) => setTf({ ...tf, from_account: e.target.value })}>{A.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <label>To</label><select value={tf.to_account} onChange={(e) => setTf({ ...tf, to_account: e.target.value })}>{A.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
          <label>Amount</label><input type="number" step="0.01" min="0" value={tf.amount} onChange={(e) => setTf({ ...tf, amount: e.target.value })} />
          <label>Note (optional)</label><input value={tf.note} onChange={(e) => setTf({ ...tf, note: e.target.value })} />
          <button onClick={addT}>Transfer</button></div>
        <div className="card"><h2>Add account</h2>
          <label>Name</label><input value={af.name} onChange={(e) => setAf({ ...af, name: e.target.value })} />
          <label>Type</label><select value={af.type} onChange={(e) => setAf({ ...af, type: e.target.value })}><option value="bank">Bank</option><option value="cash">Cash</option></select>
          <label>Opening balance</label><input type="number" step="0.01" value={af.opening_balance} onChange={(e) => setAf({ ...af, opening_balance: e.target.value })} />
          <button onClick={addA}>Add account</button></div>
      </div>
      <div className="card"><h2>Account statement</h2>
        <label>Account</label><select value={sel} onChange={(e) => setSel(e.target.value)}>{A.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <button className="alt" onClick={csv}>Export CSV</button>
        <div className="xt"><table><thead><tr><th>Date</th><th>Type</th><th>Details</th><th>Amount</th><th>Balance</th></tr></thead>
          <tbody>{stmt.map((x, i) => (<tr key={i}><td>{x.d ? dmy(x.d) : ''}</td><td>{x.t}</td><td>{x.n}</td><td className="n">{x.v ? f(x.v) : ''}</td><td className="n">{f(x.r)}</td></tr>))}</tbody></table></div>
      </div>
    </div>
    <div className="card" style={{ marginTop: 16 }}><h2>Transfer history</h2>
      <div className="xt"><table><thead><tr><th>Date</th><th>From</th><th>To</th><th>Note</th><th>Amount</th><th></th></tr></thead>
        <tbody>{hist.length ? hist.map((x) => (<tr key={x.id}><td>{dmy(x.entry_date)}</td><td>{name(x.from_account)}</td><td>{name(x.to_account)}</td><td>{x.note}</td>
          <td className="n">{f(x.amount)}</td><td>
