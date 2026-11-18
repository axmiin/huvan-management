'use client';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '../../lib/supabase';
import { f, dmy, today } from '../../lib/util';

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: 'var(--panel)', borderRadius: '16px 16px 0 0', padding: 20, width: '100%', maxWidth: 480,
      paddingBottom: 'calc(20px + env(safe-area-inset-bottom))' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
        <button onClick={onClose} style={{ margin: 0, padding: 6, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 10 }}>
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginBottom: 4 }}>{label}</label>
    {children}
  </div>
);

const Inp = (props) => <input style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', color: 'var(--ink)', font: 'inherit' }} {...props} />;
const Sel = ({ children, ...p }) => <select style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--bg)', color: 'var(--ink)', font: 'inherit' }} {...p}>{children}</select>;
const Btn = ({ alt, style: s, ...p }) => <button style={{ margin: 0, background: alt ? 'transparent' : 'var(--accent)', color: alt ? 'var(--ink)' : 'var(--on)', border: alt ? '1px solid var(--line)' : 'none', borderRadius: 10, padding: '10px 16px', font: 'inherit', fontWeight: 600, cursor: 'pointer', ...s }} {...p} />;
const Row2 = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10 }}>{children}</div>;

export default function Cash() {
  const [A, setA] = useState([]), [S, setS] = useState([]), [E, setE] = useState([]), [T, setT] = useState([]);
  const [err, setErr] = useState(''), [sel, setSel] = useState('');
  const [modal, setModal] = useState(null);
  const [tf, setTf] = useState({ entry_date: today(), from_account: '', to_account: '', amount: '', note: '' });
  const [af, setAf] = useState({ name: '', type: 'bank', opening_balance: '' });
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const r = await Promise.all([
      sb.from('accounts').select('*').order('created_at'),
      sb.from('sales').select('*'),
      sb.from('expenses').select('*'),
      sb.from('transfers').select('*'),
    ]);
    const bad = r.find((x) => x.error); if (bad) return setErr(bad.error.message);
    const [ac, sa, ex, tr] = r.map((x) => x.data);
    setA(ac); setS(sa); setE(ex); setT(tr);
    setSel((p) => p || (ac[0] ? ac[0].id : ''));
    setTf((p) => ({ ...p, from_account: p.from_account || (ac[0] ? ac[0].id : ''), to_account: p.to_account || (ac[1] ? ac[1].id : '') }));
  };
  useEffect(() => { load(); }, []);

  const name = (id) => (A.find((x) => x.id === id) || {}).name || '';
  const bal = useMemo(() => {
    const b = {}; A.forEach((a) => { b[a.id] = +a.opening_balance; });
    S.forEach((x) => { b[x.account_id] = (b[x.account_id] || 0) + +x.amount; });
    E.forEach((x) => { b[x.account_id] = (b[x.account_id] || 0) - +x.amount; });
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
      if (x.from_account === sel) ev.push({ d: x.entry_date, c: x.created_at, t: 'Transfer out', n: 'To ' + name(x.to_account) + (x.note ? ' · ' + x.note : ''), v: -x.amount });
      if (x.to_account === sel) ev.push({ d: x.entry_date, c: x.created_at, t: 'Transfer in', n: 'From ' + name(x.from_account) + (x.note ? ' · ' + x.note : ''), v: +x.amount });
    });
    ev.sort((p, q) => p.d.localeCompare(q.d) || p.c.localeCompare(q.c));
    let r = +a.opening_balance;
    return [{ d: '', t: 'Opening balance', n: '', v: null, r }, ...ev.map((x) => ({ ...x, r: (r += x.v) }))];
  }, [A, S, E, T, sel]);

  const addT = async () => {
    const a = parseFloat(tf.amount);
    if (!tf.from_account || !tf.to_account || tf.from_account === tf.to_account) return setErr('Choose two different accounts.');
    if (!(a > 0)) return setErr('Enter an amount above 0.');
    if ((bal[tf.from_account] || 0) < a && !confirm(name(tf.from_account) + ' will go below zero. Continue?')) return;
    const r = await sb.from('transfers').insert({ entry_date: tf.entry_date, from_account: tf.from_account, to_account: tf.to_account, amount: a, note: tf.note.trim() || null });
    if (r.error) return setErr(r.error.message);
    setErr(''); setTf({ ...tf, amount: '', note: '' }); setModal(null); load();
  };

  const addA = async () => {
    if (!af.name.trim()) return setErr('Enter an account name.');
    const r = await sb.from('accounts').insert({ name: af.name.trim(), type: af.type, opening_balance: parseFloat(af.opening_balance) || 0 });
    if (r.error) return setErr(r.error.message.includes('duplicate') ? 'That account name already exists.' : r.error.message);
    setErr(''); setAf({ name: '', type: 'bank', opening_balance: '' }); setModal(null); load();
  };

  const saveEdit = async () => {
    if (!editing.name.trim()) return setErr('Enter an account name.');
    const r = await sb.from('accounts').update({ name: editing.name.trim(), opening_balance: parseFloat(editing.opening_balance) || 0 }).eq('id', editing.id);
    if (r.error) return setErr(r.error.message); setErr(''); setModal(null); setEditing(null); load();
  };

  const rmA = async (a) => {
    if (!confirm('Delete ' + a.name + '? This can\'t be undone.')) return;
    const r = await sb.from('accounts').delete().eq('id', a.id);
    if (r.error) setErr('Cannot delete ' + a.name + ' — it has existing entries.'); else { load(); }
  };

  const delT = async (id) => { if (confirm('Delete this transfer?')) { await sb.from('transfers').delete().eq('id', id); load(); } };

  const csv = () => {
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const t = [['Date', 'Type', 'Details', 'Amount', 'Balance'],
      ...stmt.map((x) => [x.d ? dmy(x.d) : '', x.t, x.n, x.v != null ? x.v.toFixed(2) : '', x.r.toFixed(2)])]
      .map((r) => r.map(q).join(',')).join('\n');
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' }));
    l.download = 'statement-' + name(sel).replace(/\W+/g, '-') + '.csv'; l.click();
  };

  const hist = [...T].sort((p, q) => q.entry_date.localeCompare(p.entry_date) || q.created_at.localeCompare(p.created_at));

  return (<>
    <h1>Cash &amp; Accounts</h1>

    <Row2 style={{ marginBottom: 16 }}>
      <Btn onClick={() => { setErr(''); setModal('transfer'); }} style={{ width: '100%' }}>⇄ Transfer</Btn>
      <Btn alt onClick={() => { setErr(''); setModal('addaccount'); }} style={{ width: '100%' }}>+ Add account</Btn>
    </Row2>

    {err && <p className="err" style={{ marginBottom: 10 }}>{err}</p>}

    <div className="sum" style={{ marginBottom: 20 }}>
      {A.map((a) => (
        <div key={a.id} style={{ position: 'relative' }}>
          {a.name}<b>{f(bal[a.id] || 0)}</b>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <a style={{ fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }} onClick={() => { setEditing({ ...a }); setErr(''); setModal('edit'); }}>Edit</a>
            <a style={{ fontSize: 11, cursor: 'pointer', color: 'var(--muted)' }} onClick={() => rmA(a)}>Delete</a>
          </div>
        </div>
      ))}
      <div>Total<b>{f(total)}</b></div>
    </div>

    <div className="two">
      <div className="card">
        <h2>Account statement</h2>
        <Field label="Account">
          <Sel value={sel} onChange={(e) => setSel(e.target.value)}>
            {A.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Sel>
        </Field>
        <Btn alt onClick={csv} style={{ marginTop: 8, width: '100%' }}>Export CSV</Btn>
        <div className="xt">
          <table><thead><tr><th>Date</th><th>Type</th><th>Details</th><th>Amount</th><th>Balance</th></tr></thead>
            <tbody>{stmt.map((x, i) => (
              <tr key={i}>
                <td>{x.d ? dmy(x.d) : ''}</td>
                <td>{x.t}</td>
                <td>{x.n}</td>
                <td className="n" style={{ color: x.v < 0 ? '#c0392b' : x.v > 0 ? '#27ae60' : '' }}>{x.v != null ? f(x.v) : ''}</td>
                <td className="n">{f(x.r)}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Transfer history</h2>
        <div className="xt">
          <table><thead><tr><th>Date</th><th>From</th><th>To</th><th>Note</th><th>Amount</th><th></th></tr></thead>
            <tbody>{hist.length ? hist.map((x) => (
              <tr key={x.id}>
                <td>{dmy(x.entry_date)}</td><td>{name(x.from_account)}</td><td>{name(x.to_account)}</td>
                <td>{x.note}</td><td className="n">{f(x.amount)}</td>
                <td><a onClick={() => delT(x.id)} style={{ cursor: 'pointer' }}>×</a></td>
              </tr>
            )) : <tr><td colSpan="6">No transfers yet</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>

    {modal === 'transfer' && (
      <Modal title="Transfer between accounts" onClose={() => setModal(null)}>
        <Row2>
          <Field label="From"><Sel value={tf.from_account} onChange={(e) => setTf({ ...tf, from_account: e.target.value })}>{A.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Sel></Field>
          <Field label="To"><Sel value={tf.to_account} onChange={(e) => setTf({ ...tf, to_account: e.target.value })}>{A.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Sel></Field>
        </Row2>
        <Field label="Date"><Inp type="date" value={tf.entry_date} onChange={(e) => setTf({ ...tf, entry_date: e.target.value })} /></Field>
        <Field label="Amount"><Inp type="number" step="0.01" min="0" value={tf.amount} onChange={(e) => setTf({ ...tf, amount: e.target.value })} /></Field>
        <Field label="Note (optional)"><Inp value={tf.note} onChange={(e) => setTf({ ...tf, note: e.target.value })} /></Field>
        {err && <p className="err">{err}</p>}
        <Row2 style={{ marginTop: 14 }}>
          <Btn alt onClick={() => setModal(null)} style={{ width: '100%' }}>Cancel</Btn>
          <Btn onClick={addT} style={{ width: '100%' }}>Transfer</Btn>
        </Row2>
      </Modal>
    )}

    {modal === 'addaccount' && (
      <Modal title="Add account" onClose={() => setModal(null)}>
        <Field label="Name"><Inp value={af.name} onChange={(e) => setAf({ ...af, name: e.target.value })} /></Field>
        <Field label="Type"><Sel value={af.type} onChange={(e) => setAf({ ...af, type: e.target.value })}><option value="bank">Bank</option><option value="cash">Cash</option></Sel></Field>
        <Field label="Opening balance"><Inp type="number" step="0.01" value={af.opening_balance} onChange={(e) => setAf({ ...af, opening_balance: e.target.value })} /></Field>
        {err && <p className="err">{err}</p>}
        <Row2 style={{ marginTop: 14 }}>
          <Btn alt onClick={() => setModal(null)} style={{ width: '100%' }}>Cancel</Btn>
          <Btn onClick={addA} style={{ width: '100%' }}>Add account</Btn>
        </Row2>
      </Modal>
    )}

    {modal === 'edit' && editing && (
      <Modal title="Edit account" onClose={() => { setModal(null); setEditing(null); }}>
        <Field label="Name"><Inp value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></Field>
        <Field label="Opening balance"><Inp type="number" step="0.01" value={editing.opening_balance} onChange={(e) => setEditing({ ...editing, opening_balance: e.target.value })} /></Field>
        {err && <p className="err">{err}</p>}
        <Row2 style={{ marginTop: 14 }}>
          <Btn alt onClick={() => { setModal(null); setEditing(null); }} style={{ width: '100%' }}>Cancel</Btn>
          <Btn onClick={saveEdit} style={{ width: '100%' }}>Save</Btn>
        </Row2>
      </Modal>
    )}
  </>);
}
