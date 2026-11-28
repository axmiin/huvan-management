'use client';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '../../lib/supabase';
import { f, dmy, today } from '../../lib/util';

/* ── tiny atoms ─────────────────────────────────────────── */
const Inp = ({ style: s, ...p }) => (
  <input style={{ width:'100%',padding:'9px 11px',border:'1px solid var(--line)',
    borderRadius:10,background:'var(--bg)',color:'var(--ink)',font:'inherit',...s }} {...p}/>
);
const Sel = ({ children, style: s, ...p }) => (
  <select style={{ width:'100%',padding:'9px 11px',border:'1px solid var(--line)',
    borderRadius:10,background:'var(--bg)',color:'var(--ink)',font:'inherit',...s }} {...p}>
    {children}
  </select>
);
const Btn = ({ alt, style: s, ...p }) => (
  <button style={{ margin:0,background:alt?'transparent':'var(--accent)',
    color:alt?'var(--ink)':'var(--on)',border:alt?'1px solid var(--line)':'none',
    borderRadius:10,padding:'10px 16px',font:'inherit',fontWeight:600,cursor:'pointer',...s }} {...p}/>
);
const Field = ({ label, children }) => (
  <div style={{ marginBottom:10 }}>
    <label style={{ display:'block',fontSize:12,fontWeight:500,color:'var(--muted)',marginBottom:4 }}>{label}</label>
    {children}
  </div>
);

/* ── slide-up modal ─────────────────────────────────────── */
const Modal = ({ title, onClose, children }) => (
  <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:50,
    display:'flex',alignItems:'flex-end',justifyContent:'center' }}
    onClick={e => e.target===e.currentTarget && onClose()}>
    <div style={{ background:'var(--panel)',borderRadius:'16px 16px 0 0',padding:20,
      width:'100%',maxWidth:520,maxHeight:'88vh',overflowY:'auto',
      paddingBottom:'calc(20px + env(safe-area-inset-bottom))' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
        <span style={{ fontSize:15,fontWeight:600 }}>{title}</span>
        <button onClick={onClose} style={{ margin:0,padding:'4px 8px',background:'none',
          border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20,lineHeight:1 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);

const Grid2 = ({ children, style: s }) => (
  <div style={{ display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,...s }}>
    {children}
  </div>
);

export default function Cash() {
  const [A, setA] = useState([]);
  const [S, setS] = useState([]);
  const [E, setE] = useState([]);
  const [T, setT] = useState([]);
  const [err, setErr]       = useState('');
  const [sel, setSel]       = useState('');
  const [modal, setModal]   = useState(null);
  const [editing, setEditing] = useState(null);
  const [tf, setTf] = useState({ entry_date:today(), from_account:'', to_account:'', amount:'', note:'' });
  const [af, setAf] = useState({ name:'', type:'bank', opening_balance:'' });

  const load = async () => {
    const r = await Promise.all([
      sb.from('accounts').select('*').order('created_at'),
      sb.from('sales').select('*'),
      sb.from('expenses').select('*'),
      sb.from('transfers').select('*'),
    ]);
    const bad = r.find(x => x.error);
    if (bad) return setErr(bad.error.message);
    const [ac, sa, ex, tr] = r.map(x => x.data);
    setA(ac); setS(sa); setE(ex); setT(tr);
    setSel(p => p || (ac[0]?.id || ''));
    setTf(p => ({
      ...p,
      from_account: p.from_account || (ac[0]?.id || ''),
      to_account:   p.to_account   || (ac[1]?.id || ''),
    }));
  };
  useEffect(() => { load(); }, []);

  const name = id => (A.find(x => x.id===id)||{}).name || '';

  const bal = useMemo(() => {
    const b = {};
    A.forEach(a  => { b[a.id]  = +a.opening_balance; });
    S.forEach(x  => { b[x.account_id] = (b[x.account_id]||0) + +x.amount; });
    E.forEach(x  => { b[x.account_id] = (b[x.account_id]||0) - +x.amount; });
    T.forEach(x  => { b[x.from_account] -= +x.amount; b[x.to_account] += +x.amount; });
    return b;
  }, [A, S, E, T]);

  const total = Object.values(bal).reduce((t, v) => t + v, 0);

  const stmt = useMemo(() => {
    const a = A.find(x => x.id===sel); if (!a) return [];
    const ev = [];
    S.filter(x => x.account_id===sel).forEach(x =>
      ev.push({ d:x.entry_date, c:x.created_at, t:'Sale',        n:x.details,                                   v:+x.amount }));
    E.filter(x => x.account_id===sel).forEach(x =>
      ev.push({ d:x.entry_date, c:x.created_at, t:'Expense',     n:x.details,                                   v:-x.amount }));
    T.forEach(x => {
      if (x.from_account===sel)
        ev.push({ d:x.entry_date, c:x.created_at, t:'Transfer out', n:'To '+name(x.to_account)+(x.note?' · '+x.note:''),   v:-x.amount });
      if (x.to_account===sel)
        ev.push({ d:x.entry_date, c:x.created_at, t:'Transfer in',  n:'From '+name(x.from_account)+(x.note?' · '+x.note:''), v:+x.amount });
    });
    ev.sort((p, q) => p.d.localeCompare(q.d) || p.c.localeCompare(q.c));
    let r = +a.opening_balance;
    return [{ d:'', t:'Opening balance', n:'', v:null, r }, ...ev.map(x => ({ ...x, r:(r += x.v) }))];
  }, [A, S, E, T, sel]);

  const addT = async () => {
    const a = parseFloat(tf.amount);
    if (!tf.from_account || !tf.to_account || tf.from_account===tf.to_account)
      return setErr('Choose two different accounts.');
    if (!(a > 0)) return setErr('Enter an amount above 0.');
    if ((bal[tf.from_account]||0) < a &&
        !confirm(name(tf.from_account)+' will go below zero. Continue?')) return;
    const r = await sb.from('transfers').insert({
      entry_date:   tf.entry_date,
      from_account: tf.from_account,
      to_account:   tf.to_account,
      amount:       a,
      note:         tf.note.trim() || null,
    });
    if (r.error) return setErr(r.error.message);
    setErr(''); setTf(p => ({...p, amount:'', note:''})); setModal(null); load();
  };

  const addA = async () => {
    if (!af.name.trim()) return setErr('Enter an account name.');
    const r = await sb.from('accounts').insert({
      name:            af.name.trim(),
      type:            af.type,
      opening_balance: parseFloat(af.opening_balance) || 0,
    });
    if (r.error) return setErr(r.error.message.includes('duplicate')
      ? 'That account name already exists.' : r.error.message);
    setErr(''); setAf({ name:'', type:'bank', opening_balance:'' }); setModal(null); load();
  };

  const saveEdit = async () => {
    if (!editing.name.trim()) return setErr('Enter an account name.');
    const r = await sb.from('accounts')
      .update({ name:editing.name.trim(), opening_balance:parseFloat(editing.opening_balance)||0 })
      .eq('id', editing.id);
    if (r.error) return setErr(r.error.message);
    setErr(''); setModal(null); setEditing(null); load();
  };

  const rmA = async a => {
    if (!confirm('Delete '+a.name+'? This cannot be undone.')) return;
    const r = await sb.from('accounts').delete().eq('id', a.id);
    if (r.error) setErr('Cannot delete '+a.name+' — it has existing entries.');
    else { setErr(''); load(); }
  };

  const delT = async id => {
    if (!confirm('Delete this transfer?')) return;
    await sb.from('transfers').delete().eq('id', id); load();
  };

  const csv = () => {
    const q = v => '"'+String(v==null?'':v).replace(/"/g,'""')+'"';
    const t = [['Date','Type','Details','Amount','Balance'],
      ...stmt.map(x => [x.d?dmy(x.d):'', x.t, x.n, x.v!=null?x.v.toFixed(2):'', x.r.toFixed(2)])]
      .map(r => r.map(q).join(',')).join('\n');
    const l = document.createElement('a');
    l.href = URL.createObjectURL(new Blob(['\ufeff'+t], {type:'text/csv'}));
    l.download = 'statement-'+name(sel).replace(/\W+/g,'-')+'.csv';
    l.click();
  };

  const hist = [...T].sort((p,q) =>
    q.entry_date.localeCompare(p.entry_date) || q.created_at.localeCompare(p.created_at));

  const lk = { cursor:'pointer', fontSize:11, color:'var(--muted)' };

  return (
    <>
      <h1>Cash &amp; Accounts</h1>

      {/* ── action buttons ── */}
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <Btn onClick={() => { setErr(''); setModal('transfer'); }}>⇄ Transfer</Btn>
        <Btn alt onClick={() => { setErr(''); setModal('addaccount'); }}>+ Add account</Btn>
      </div>

      {err && <p className="err" style={{ marginBottom:12 }}>{err}</p>}

      {/* ── balance cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',
        gap:10, marginBottom:20 }}>
        {A.map(a => (
          <div key={a.id} className="card" style={{ padding:14 }}>
            <div style={{ fontSize:12,color:'var(--muted)',marginBottom:4 }}>{a.name}</div>
            <div style={{ fontSize:18,fontWeight:600,color:'var(--ink)',marginBottom:8 }}>
              {f(bal[a.id]||0)}
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <a style={lk} onClick={() => { setEditing({...a}); setErr(''); setModal('edit'); }}>Edit</a>
              <a style={lk} onClick={() => rmA(a)}>Delete</a>
            </div>
          </div>
        ))}
        <div className="card" style={{ padding:14 }}>
          <div style={{ fontSize:12,color:'var(--muted)',marginBottom:4 }}>Total</div>
          <div style={{ fontSize:18,fontWeight:600,color:'var(--ink)' }}>{f(total)}</div>
        </div>
      </div>

      {/* ── statement + history (stack on mobile) ── */}
      <div style={{ display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap:14 }}>

        {/* account statement */}
        <div className="card">
          <h2>Account statement</h2>
          <Field label="Account">
            <Sel value={sel} onChange={e => setSel(e.target.value)}>
              {A.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </Sel>
          </Field>
          <Btn alt onClick={csv} style={{ width:'100%',marginTop:8,marginBottom:4 }}>
            Export CSV
          </Btn>
          <div style={{ overflowX:'auto', marginTop:8 }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:420 }}>
              <thead>
                <tr>
                  {['Date','Details','Amount','Balance'].map(h => (
                    <th key={h} style={{ padding:'6px 6px',borderBottom:'1px solid var(--line)',
                      fontSize:11,textTransform:'uppercase',letterSpacing:'.04em',
                      color:'var(--muted)',fontWeight:600,textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stmt.map((x, i) => (
                  <tr key={i}>
                    <td style={{ padding:'7px 6px',borderBottom:'1px solid var(--line)',whiteSpace:'nowrap' }}>
                      {x.d ? dmy(x.d) : ''}
                    </td>
                    <td style={{ padding:'7px 6px',borderBottom:'1px solid var(--line)',
                      maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                      {x.n}
                    </td>
                    <td style={{ padding:'7px 6px',borderBottom:'1px solid var(--line)',
                      textAlign:'right',whiteSpace:'nowrap',
                      color: x.v==null?'':x.v<0?'#c0392b':'#27ae60' }}>
                      {x.v!=null ? f(x.v) : ''}
                    </td>
                    <td style={{ padding:'7px 6px',borderBottom:'1px solid var(--line)',
                      textAlign:'right',whiteSpace:'nowrap',fontWeight:500 }}>
                      {f(x.r)}
                    </td>
                  </tr>
                ))}
                {stmt.length===0 && (
                  <tr><td colSpan="4" style={{ padding:'12px 6px',color:'var(--muted)' }}>No entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* transfer history */}
        <div className="card">
          <h2>Transfer history</h2>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12,minWidth:380 }}>
              <thead>
                <tr>
                  {['Date','From','To','Note','Amount',''].map(h => (
                    <th key={h} style={{ padding:'6px 6px',borderBottom:'1px solid var(--line)',
                      fontSize:11,textTransform:'uppercase',letterSpacing:'.04em',
                      color:'var(--muted)',fontWeight:600,textAlign:'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {hist.length ? hist.map(x => (
                  <tr key={x.id}>
                    <td style={{ padding:'7px 6px',borderBottom:'1px solid var(--line)',whiteSpace:'nowrap' }}>{dmy(x.entry_date)}</td>
                    <td style={{ padding:'7px 6px',borderBottom:'1px solid var(--line)',whiteSpace:'nowrap' }}>{name(x.from_account)}</td>
                    <td style={{ padding:'7px 6px',borderBottom:'1px solid var(--line)',whiteSpace:'nowrap' }}>{name(x.to_account)}</td>
                    <td style={{ padding:'7px 6px',borderBottom:'1px solid var(--line)',
                      maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{x.note}</td>
                    <td style={{ padding:'7px 6px',borderBottom:'1px solid var(--line)',
                      textAlign:'right',whiteSpace:'nowrap',fontWeight:500 }}>{f(x.amount)}</td>
                    <td style={{ padding:'7px 6px',borderBottom:'1px solid var(--line)' }}>
                      <a onClick={() => delT(x.id)} style={{ cursor:'pointer',color:'var(--muted)' }}>×</a>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="6" style={{ padding:'12px 6px',color:'var(--muted)' }}>No transfers yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Transfer modal ── */}
      {modal==='transfer' && (
        <Modal title="Transfer between accounts" onClose={() => setModal(null)}>
          <Grid2>
            <Field label="From">
              <Sel value={tf.from_account} onChange={e => setTf({...tf, from_account:e.target.value})}>
                {A.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Sel>
            </Field>
            <Field label="To">
              <Sel value={tf.to_account} onChange={e => setTf({...tf, to_account:e.target.value})}>
                {A.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </Sel>
            </Field>
          </Grid2>
          <Field label="Date">
            <Inp type="date" value={tf.entry_date} onChange={e => setTf({...tf, entry_date:e.target.value})}/>
          </Field>
          <Field label="Amount">
            <Inp type="number" step="0.01" min="0" value={tf.amount}
              onChange={e => setTf({...tf, amount:e.target.value})}/>
          </Field>
          <Field label="Note (optional)">
            <Inp value={tf.note} onChange={e => setTf({...tf, note:e.target.value})}/>
          </Field>
          {err && <p className="err">{err}</p>}
          <Grid2 style={{ marginTop:14 }}>
            <Btn alt onClick={() => setModal(null)} style={{ width:'100%' }}>Cancel</Btn>
            <Btn onClick={addT} style={{ width:'100%' }}>Transfer</Btn>
          </Grid2>
        </Modal>
      )}

      {/* ── Add account modal ── */}
      {modal==='addaccount' && (
        <Modal title="Add account" onClose={() => setModal(null)}>
          <Field label="Name">
            <Inp value={af.name} onChange={e => setAf({...af, name:e.target.value})}/>
          </Field>
          <Field label="Type">
            <Sel value={af.type} onChange={e => setAf({...af, type:e.target.value})}>
              <option value="bank">Bank</option>
              <option value="cash">Cash</option>
            </Sel>
          </Field>
          <Field label="Opening balance">
            <Inp type="number" step="0.01" value={af.opening_balance}
              onChange={e => setAf({...af, opening_balance:e.target.value})}/>
          </Field>
          {err && <p className="err">{err}</p>}
          <Grid2 style={{ marginTop:14 }}>
            <Btn alt onClick={() => setModal(null)} style={{ width:'100%' }}>Cancel</Btn>
            <Btn onClick={addA} style={{ width:'100%' }}>Add account</Btn>
          </Grid2>
        </Modal>
      )}

      {/* ── Edit account modal ── */}
      {modal==='edit' && editing && (
        <Modal title="Edit account" onClose={() => { setModal(null); setEditing(null); }}>
          <Field label="Name">
            <Inp value={editing.name}
              onChange={e => setEditing({...editing, name:e.target.value})}/>
          </Field>
          <Field label="Opening balance">
            <Inp type="number" step="0.01" value={editing.opening_balance}
              onChange={e => setEditing({...editing, opening_balance:e.target.value})}/>
          </Field>
          {err && <p className="err">{err}</p>}
          <Grid2 style={{ marginTop:14 }}>
            <Btn alt onClick={() => { setModal(null); setEditing(null); }} style={{ width:'100%' }}>Cancel</Btn>
            <Btn onClick={saveEdit} style={{ width:'100%' }}>Save</Btn>
          </Grid2>
        </Modal>
      )}
    </>
  );
}
