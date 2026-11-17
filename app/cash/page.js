'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sb } from '../../lib/supabase';
import { f, dmy, today } from '../../lib/util';

const Ico = ({ d }) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>);

// Styles for the two buttons and the pop-up. Kept in this file so the page is self-contained.
const CSS = `
.acts{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.acts button{margin:0;display:flex;align-items:center;justify-content:center;gap:8px;padding:12px 16px}
.acts svg{width:18px;height:18px;flex:none}
button:disabled{opacity:.6;cursor:default}
.ov{position:fixed;inset:0;z-index:20;background:rgba(20,14,8,.45);display:flex;align-items:center;justify-content:center;padding:20px;animation:ovin .15s ease-out}
.sheet{background:var(--panel);border:1px solid var(--line);border-radius:16px;width:100%;max-width:420px;max-height:calc(100vh - 40px);max-height:calc(100dvh - 40px);overflow-y:auto;padding:18px;box-shadow:0 20px 60px rgba(0,0,0,.3);outline:none;animation:sheetin .18s ease-out}
.sheet-h{display:flex;align-items:center;justify-content:space-between;gap:12px}
.sheet-h h2{margin:0;font-size:17px}
.sheet .x{margin:0;padding:6px;background:none;color:var(--muted);line-height:0}
.sheet .x svg{width:20px;height:20px}
.mrow{display:flex;gap:10px;margin-top:6px}
.mrow button{flex:1}
@keyframes ovin{from{opacity:0}}
@keyframes sheetin{from{opacity:0;transform:translateY(8px) scale(.98)}}
@keyframes sheetup{from{transform:translateY(100%)}}
@media(max-width:800px){
.ov{align-items:flex-end;padding:0}
.sheet{max-width:none;border-radius:20px 20px 0 0;border-bottom:0;max-height:90vh;max-height:90dvh;padding-bottom:calc(18px + env(safe-area-inset-bottom));animation:sheetup .25s cubic-bezier(.2,.8,.2,1)}
}
@media(prefers-reduced-motion:reduce){.ov,.sheet{animation:none}}
`;

// Pop-up: centred on desktop, slides up from the bottom on phones.
function Modal({ title, onClose, children }) {
  const box = useRef(null), cb = useRef(onClose);
  cb.current = onClose;
  useEffect(() => {
    const prev = document.activeElement, overflow = document.body.style.overflow;
    const key = (e) => { if (e.key === 'Escape') cb.current(); };
    document.addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    if (box.current) box.current.focus();
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      if (prev && prev.focus) prev.focus();
    };
  }, []);
  return (
    <div className="ov" onMouseDown={(e) => { if (e.target === e.currentTarget) cb.current(); }}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={box}>
        <div className="sheet-h"><h2>{title}</h2>
          <button type="button" className="x" aria-label="Close" onClick={() => cb.current()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M18 6L6 18 M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Cash() {
  const [A, setA] = useState([]), [S, setS] = useState([]), [E, setE] = useState([]), [T, setT] = useState([]);
  const [err, setErr] = useState(''), [sel, setSel] = useState('');
  const [modal, setModal] = useState(null), [merr, setMerr] = useState(''), [busy, setBusy] = useState(false);
  const [tf, setTf] = useState({ entry_date: today(), from_account: '', to_account: '', amount: '', note: '' });
  const [af, setAf] = useState({ name: '', type: 'bank', opening_balance: '' });
  const load = async () => {
    const r = await Promise.all([sb.from('accounts').select('*').order('created_at'), sb.from('sales').select('*'), sb.from('expenses').select('*'), sb.from('transfers').select('*')]);
    const bad = r.find((x) => x.error); if (bad) return setErr(bad.error.message);
    setA(r[0].data); setS(r[1].data); setE(r[2].data); setT(r[3].data);
    const a = r[0].data;
    setSel((p) => p || (a[0] ? a[0].id : ''));
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
  // Pop-ups: a fresh form each time one opens, with its own error line.
  const open = (kind) => {
    setMerr('');
    if (kind === 'transfer') setTf({ entry_date: today(), from_account: A[0] ? A[0].id : '', to_account: A[1] ? A[1].id : '', amount: '', note: '' });
    else setAf({ name: '', type: 'bank', opening_balance: '' });
    setModal(kind);
  };
  const close = () => { if (!busy) setModal(null); };
  // After a save: refresh the balances, then close. Errors stay inside the pop-up.
  const done = async () => { await load(); setBusy(false); setMerr(''); setErr(''); setModal(null); };
  const addT = async (e) => {
    e.preventDefault(); if (busy) return;
    const a = parseFloat(tf.amount);
    if (!tf.from_account || !tf.to_account || tf.from_account === tf.to_account) return setMerr('Choose two different accounts.');
    if (!(a > 0)) return setMerr('Enter an amount above 0.');
    if (bal[tf.from_account] < a && !confirm(name(tf.from_account) + ' will go below zero. Continue?')) return;
    setBusy(true);
    const r = await sb.from('transfers').insert({ entry_date: tf.entry_date, from_account: tf.from_account, to_account: tf.to_account, amount: a, note: tf.note.trim() || null });
    if (r.error) { setBusy(false); return setMerr(r.error.message); }
    done();
  };
  const addA = async (e) => {
    e.preventDefault(); if (busy) return;
    if (!af.name.trim()) return setMerr('Enter an account name.');
    setBusy(true);
    const r = await sb.from('accounts').insert({ name: af.name.trim(), type: af.type, opening_balance: parseFloat(af.opening_balance) || 0 });
    if (r.error) { setBusy(false); return setMerr(r.error.message.includes('duplicate') ? 'That account name already exists.' : r.error.message); }
    done();
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
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob(['﻿' + t], { type: 'text/csv' }));
    l.download = 'statement-' + name(sel).replace(/\W+/g, '-') + '.csv'; l.click();
  };
  const hist = [...T].sort((p, q) => q.entry_date.localeCompare(p.entry_date) || q.created_at.localeCompare(p.created_at));
  const lk = { cursor: 'pointer', marginRight: 10, fontSize: 11 };
  const opts = A.map((a) => <option key={a.id} value={a.id}>{a.name}</option>);
  return (<><style>{CSS}</style><h1>Cash &amp; Accounts</h1>
    <div className="acts">
      <button onClick={() => open('transfer')}><Ico d="M7 7h13 M16 3l4 4-4 4 M17 17H4 M8 13l-4 4 4 4" />Transfer</button>
      <button className="alt" onClick={() => open('account')}><Ico d="M12 5v14 M5 12h14" />Add account</button>
    </div>
    <div className="sum">
      {A.map((a) => (<div key={a.id}>{a.name}<b>{f(bal[a.id] || 0)}</b>
        <a style={lk} onClick={() => edit(a)}>Edit</a><a style={lk} onClick={() => rm(a)}>Delete</a></div>))}
      <div>Total<b>{f(total)}</b></div>
    </div>
    <p className="err">{err}</p>
    <div className="card"><h2>Account statement</h2>
      <label>Account</label><select value={sel} onChange={(e) => setSel(e.target.value)}>{opts}</select>
      <button className="alt" onClick={csv}>Export CSV</button>
      <div className="xt"><table><thead><tr><th>Date</th><th>Type</th><th>Details</th><th>Amount</th><th>Balance</th></tr></thead>
        <tbody>{stmt.map((x, i) => (<tr key={i}><td>{x.d ? dmy(x.d) : ''}</td><td>{x.t}</td><td>{x.n}</td><td className="n">{x.v ? f(x.v) : ''}</td><td className="n">{f(x.r)}</td></tr>))}</tbody></table></div>
    </div>
    <div className="card" style={{ marginTop: 16 }}><h2>Transfer history</h2>
      <div className="xt"><table><thead><tr><th>Date</th><th>From</th><th>To</th><th>Note</th><th>Amount</th><th></th></tr></thead>
        <tbody>{hist.length ? hist.map((x) => (<tr key={x.id}><td>{dmy(x.entry_date)}</td><td>{name(x.from_account)}</td><td>{name(x.to_account)}</td><td>{x.note}</td>
          <td className="n">{f(x.amount)}</td><td><a onClick={() => delT(x.id)}>×</a></td></tr>)) : <tr><td colSpan="6">No transfers yet</td></tr>}</tbody></table></div>
    </div>
    {modal === 'transfer' && (
      <Modal title="Transfer between accounts" onClose={close}>
        <form onSubmit={addT}>
          <label>Date</label><input type="date" value={tf.entry_date} onChange={(e) => setTf({ ...tf, entry_date: e.target.value })} />
          <label>From</label><select value={tf.from_account} onChange={(e) => setTf({ ...tf, from_account: e.target.value })}>{opts}</select>
          <label>To</label><select value={tf.to_account} onChange={(e) => setTf({ ...tf, to_account: e.target.value })}>{opts}</select>
          <label>Amount</label><input type="number" step="0.01" min="0" inputMode="decimal" value={tf.amount} onChange={(e) => setTf({ ...tf, amount: e.target.value })} />
          <label>Note (optional)</label><input value={tf.note} onChange={(e) => setTf({ ...tf, note: e.target.value })} />
          {merr && <p className="err" role="alert">{merr}</p>}
          <div className="mrow"><button type="button" className="alt" onClick={close}>Cancel</button><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Transfer'}</button></div>
        </form>
      </Modal>)}
    {modal === 'account' && (
      <Modal title="Add account" onClose={close}>
        <form onSubmit={addA}>
          <label>Name</label><input value={af.name} onChange={(e) => setAf({ ...af, name: e.target.value })} />
          <label>Type</label><select value={af.type} onChange={(e) => setAf({ ...af, type: e.target.value })}><option value="bank">Bank</option><option value="cash">Cash</option></select>
          <label>Opening balance</label><input type="number" step="0.01" inputMode="decimal" value={af.opening_balance} onChange={(e) => setAf({ ...af, opening_balance: e.target.value })} />
          {merr && <p className="err" role="alert">{merr}</p>}
          <div className="mrow"><button type="button" className="alt" onClick={close}>Cancel</button><button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Add account'}</button></div>
        </form>
      </Modal>)}
  </>);
}
