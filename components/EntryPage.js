//Entry Page

'use client';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '../lib/supabase';
import { f, dmy, today } from '../lib/util';

const isCashAccount = (acct) =>
  String(acct?.type || '').toLowerCase() === 'cash' || /\bcash\b/i.test(acct?.name || '');

const compareLatest = (a, b) => {
  const dateCmp = String(b.entry_date || '').localeCompare(String(a.entry_date || ''));
  if (dateCmp !== 0) return dateCmp;
  return String(b.created_at || '').localeCompare(String(a.created_at || ''));
};

const Modal = ({ title, onClose, children }) => (
  <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:50,display:'flex',alignItems:'flex-end',justifyContent:'center' }} onClick={(e)=>e.target===e.currentTarget&&onClose()}>
    <div style={{ background:'#f0ece8',borderRadius:'16px 16px 0 0',padding:20,width:'100%',maxWidth:440,paddingBottom:'calc(20px + env(safe-area-inset-bottom))',maxHeight:'90vh',overflowY:'auto' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
        <span style={{ fontSize:16,fontWeight:600 }}>{title}</span>
        <button type="button" onClick={onClose} style={{ margin:0,padding:6,background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20,lineHeight:1 }}>✕</button>
      </div>{children}
    </div>
  </div>
);

export default function EntryPage({ table, title, noun, cats: base, open, onClose, renderActions, showBankBalance = false }) {
  const [rows, setRows] = useState([]);
  const [accts, setAccts] = useState([]);
  const [salesRows, setSalesRows] = useState([]);
  const [expRows, setExpRows] = useState([]);
  const [m, setM] = useState(today().slice(0, 7));
  const [err, setErr] = useState('');
  const [localOpen, setLocalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acctFilter, setAcctFilter] = useState('all');
  const [form, setForm] = useState({ entry_date: today(), details: '', category: '', amount: '', account_id: '' });

  const isOpen = open !== undefined ? open : localOpen;
  const close = () => { setErr(''); onClose ? onClose() : setLocalOpen(false); };

  const load = async () => {
    const queries = [
      sb.from('accounts').select('*').order('created_at'),
      sb.from(table).select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false }),
    ];
    if (showBankBalance) {
      queries.push(sb.from('sales').select('amount,account_id'));
      queries.push(sb.from('expenses').select('amount,account_id'));
    }

    const [a, r, s, ex] = await Promise.all(queries);
    if (a.error || r.error) return setErr((a.error || r.error).message);

    setAccts(a.data || []);
    setRows([...(r.data || [])].sort(compareLatest));
    if (showBankBalance) {
      if (s && !s.error) setSalesRows(s.data || []);
      if (ex && !ex.error) setExpRows(ex.data || []);
    }
    setForm((p) => ({ ...p, account_id: p.account_id || (a.data?.[0] ? a.data[0].id : '') }));
  };

  useEffect(() => { load(); }, [table, showBankBalance]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const an = (id) => (accts.find((x) => x.id === id) || {}).name || '';

  const add = async (e) => {
    if (e) e.preventDefault();
    if (saving) return;
    const a = parseFloat(form.amount);
    if (!form.details.trim() || !(a > 0) || !form.account_id) return setErr('Enter details, an amount above 0 and an account.');
    setSaving(true);
    const r = await sb.from(table).insert({ entry_date: form.entry_date, details: form.details.trim(), category: form.category.trim() || null, amount: a, account_id: form.account_id });
    setSaving(false);
    if (r.error) return setErr(r.error.message);
    setErr(''); setForm((p) => ({ ...p, details: '', amount: '' })); close(); load();
  };

  const del = async (id) => {
    if (confirm('Delete this ' + noun + '?')) {
      await sb.from(table).delete().eq('id', id);
      load();
    }
  };

  const cats = useMemo(() => [...new Set([...base, ...rows.map((x) => x.category).filter(Boolean)])], [rows, base]);

  const filteredAcctIds = useMemo(() => {
    if (acctFilter === 'all') return null;
    return new Set(accts.filter(a => (a.type || '').toLowerCase() === acctFilter).map(a => a.id));
  }, [accts, acctFilter]);

  const bankBalance = useMemo(() => {
    if (!showBankBalance) return 0;
    const salesByAcct = {};
    salesRows.forEach((s) => {
      if (s.account_id) salesByAcct[s.account_id] = (salesByAcct[s.account_id] || 0) + (Number(s.amount) || 0);
    });
    const expByAcct = {};
    expRows.forEach((x) => {
      if (x.account_id) expByAcct[x.account_id] = (expByAcct[x.account_id] || 0) + (Number(x.amount) || 0);
    });

    return accts
      .filter((acct) => !isCashAccount(acct))
      .reduce((sum, acct) => {
        if (acct.balance !== undefined && acct.balance !== null && !Number.isNaN(Number(acct.balance))) {
          return sum + Number(acct.balance);
        }
        const opening = Number(acct.opening_balance) || 0;
        return sum + opening + (salesByAcct[acct.id] || 0) - (expByAcct[acct.id] || 0);
      }, 0);
  }, [showBankBalance, accts, salesRows, expRows]);

  const { list, total, top } = useMemo(() => {
    let list = rows
      .filter((x) => !m || x.entry_date.slice(0, 7) === m)
      .map((x) => ({ ...x, a: +x.amount }))
      .sort(compareLatest);
    if (filteredAcctIds) list = list.filter(x => filteredAcctIds.has(x.account_id));
    const by = {}; let total = 0;
    list.forEach((x) => { total += x.a; const c = x.category || 'Uncategorised'; by[c] = (by[c] || 0) + x.a; });
    const best = Object.entries(by).sort((p, q) => q[1] - p[1])[0];
    return { list, total, top: best ? best[0] : '-' };
  }, [rows, m, filteredAcctIds]);

  const csv = () => {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const t = [['Date', 'Details', 'Category', 'Account', 'Amount'], ...list.map((x) => [dmy(x.entry_date), x.details, x.category || '', an(x.account_id), x.a.toFixed(2)])].map((r) => r.map(q).join(',')).join('\n');
    const l = document.createElement('a'); l.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' }));
    l.download = 'huvan-' + table + '.csv'; l.click();
  };

  const filterBtnStyle = (val) => ({
    margin:0, padding:'6px 14px', borderRadius:20, border:'1px solid',
    cursor:'pointer', font:'inherit', fontSize:12, fontWeight:600,
    background: acctFilter === val ? 'var(--accent)' : 'transparent',
    color: acctFilter === val ? 'var(--on)' : 'var(--muted)',
    borderColor: acctFilter === val ? 'var(--accent)' : 'var(--line)',
  });

  return (<><h1>{title}</h1>
    <div className="card" style={{ marginBottom:16 }}>
      <h2>{title} overview</h2>
      <label>Month (clear to show all)</label>
      <input type="month" value={m} onChange={(e) => setM(e.target.value)} style={{width:'100%',maxWidth:'100%',boxSizing:'border-box'}} />
      <div className="sum">
        <div>Total<b>{f(total)}</b></div>
        <div>Entries<b>{list.length}</b></div>
        {showBankBalance
          ? <div>Bank balance<b>{f(bankBalance)}</b></div>
          : <div>Biggest category<b>{top}</b></div>}
      </div>
      <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:12 }}>
        <span style={{ fontSize:12,fontWeight:500,color:'var(--muted)' }}>Account:</span>
        <button type="button" style={filterBtnStyle('all')} onClick={()=>setAcctFilter('all')}>All</button>
        <button type="button" style={filterBtnStyle('bank')} onClick={()=>setAcctFilter('bank')}>Bank</button>
        <button type="button" style={filterBtnStyle('cash')} onClick={()=>setAcctFilter('cash')}>Cash</button>
      </div>
      <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
        {renderActions && renderActions({ openModal: () => { setErr(''); setLocalOpen(true); } })}
        <button type="button" className="alt" onClick={csv}>Export CSV</button>
      </div>
      {!isOpen && err && <p className="err">{err}</p>}
    </div>
    <div className="card">
      <h2>{title} list</h2>
      <div className="xt"><table><thead><tr><th>Date</th><th>Details</th><th>Category</th><th>Account</th><th>Amount</th><th></th></tr></thead>
        <tbody>{list.length ? list.map((x) => (<tr key={x.id}><td>{dmy(x.entry_date)}</td><td>{x.details}</td><td>{x.category}</td><td>{an(x.account_id)}</td>
          <td className="n">{f(x.a)}</td><td><a onClick={() => del(x.id)}>×</a></td></tr>)) : <tr><td colSpan="6">No entries</td></tr>}</tbody></table></div>
    </div>
    {isOpen && <Modal title={'Add ' + noun} onClose={close}><form onSubmit={add}>
      <label>Date</label><input type="date" value={form.entry_date} onChange={set('entry_date')} style={{width:'100%',maxWidth:'100%',boxSizing:'border-box'}} />
      <label>Details</label><input value={form.details} onChange={set('details')} />
      <label>Category</label><input list={table + '-cats'} value={form.category} onChange={set('category')} />
      <datalist id={table + '-cats'}>{cats.map((c) => <option key={c} value={c} />)}</datalist>
      <label>Account</label><select value={form.account_id} onChange={set('account_id')}>{accts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <label>Amount</label><input type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} />
      <button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add'}</button><p className="err">{err}</p>
    </form></Modal>}
  </>);
}
