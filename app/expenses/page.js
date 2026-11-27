'use client';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '../../lib/supabase';
import { f, dmy, today } from '../../lib/util';

const TABLE = 'expenses';
const TITLE = 'Expenses';
const NOUN = 'expense';
const BASE_CATS = ['Ingredients', 'Wages', 'Rent', 'Utilities', 'Supplies', 'Transport'];

const isCashAccount = (acct) =>
  String(acct?.type || '').toLowerCase() === 'cash' || /\bcash\b/i.test(acct?.name || '');

const compareLatest = (a, b) => {
  const dateCmp = String(b.entry_date || '').localeCompare(String(a.entry_date || ''));
  if (dateCmp !== 0) return dateCmp;
  return String(b.created_at || '').localeCompare(String(a.created_at || ''));
};

const Modal = ({ title, onClose, children }) => (
  <div
    style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div
      style={{
        background: '#f0ece8',
        borderRadius: '16px 16px 0 0',
        padding: 20,
        width: '100%',
        maxWidth: 440,
        paddingBottom: 'calc(20px + env(safe-area-inset-bottom))',
        maxHeight: '90vh',
        overflowY: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <span style={{ fontSize: 16, fontWeight: 600 }}>{title}</span>
        <button
          onClick={onClose}
          style={{ margin: 0, padding: 6, background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default function Page() {
  const [rows, setRows] = useState([]);
  const [accts, setAccts] = useState([]);
  const [salesRows, setSalesRows] = useState([]);
  const [m, setM] = useState(today().slice(0, 7));
  const [err, setErr] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ entry_date: today(), details: '', category: '', amount: '', account_id: '' });

  const load = async () => {
    const [a, r, s] = await Promise.all([
      sb.from('accounts').select('*').order('created_at'),
      sb.from(TABLE).select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false }),
      sb.from('sales').select('amount,account_id'),
    ]);
    if (a.error || r.error) return setErr((a.error || r.error).message);
    setAccts(a.data || []);
    setRows([...(r.data || [])].sort(compareLatest));
    if (!s.error && s.data) setSalesRows(s.data);
    setForm((p) => ({ ...p, account_id: p.account_id || (a.data?.[0] ? a.data[0].id : '') }));
  };

  useEffect(() => { load(); }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const an = (id) => (accts.find((x) => x.id === id) || {}).name || '';

  const add = async () => {
    const a = parseFloat(form.amount);
    if (!form.details.trim() || !(a > 0) || !form.account_id) return setErr('Enter details, an amount above 0 and an account.');
    const r = await sb.from(TABLE).insert({
      entry_date: form.entry_date,
      details: form.details.trim(),
      category: form.category.trim() || null,
      amount: a,
      account_id: form.account_id,
    });
    if (r.error) return setErr(r.error.message);
    setErr('');
    setForm({ ...form, details: '', amount: '' });
    setModalOpen(false);
    load();
  };

  const del = async (id) => {
    if (confirm('Delete this ' + NOUN + '?')) {
      await sb.from(TABLE).delete().eq('id', id);
      load();
    }
  };

  const cats = useMemo(() => [...new Set([...BASE_CATS, ...rows.map((x) => x.category).filter(Boolean)])], [rows]);

  const bankBalance = useMemo(() => {
    const salesByAcct = {};
    salesRows.forEach((s) => {
      if (s.account_id) salesByAcct[s.account_id] = (salesByAcct[s.account_id] || 0) + (Number(s.amount) || 0);
    });
    const expByAcct = {};
    rows.forEach((x) => {
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
  }, [accts, rows, salesRows]);

  const { list, total } = useMemo(() => {
    const filtered = rows
      .filter((x) => !m || x.entry_date.slice(0, 7) === m)
      .map((x) => ({ ...x, a: +x.amount }))
      .sort(compareLatest);
    const sumTotal = filtered.reduce((acc, x) => acc + x.a, 0);
    return { list: filtered, total: sumTotal };
  }, [rows, m]);

  const csv = () => {
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const t = [['Date', 'Details', 'Category', 'Account', 'Amount'], ...list.map((x) => [dmy(x.entry_date), x.details, x.category || '', an(x.account_id), x.a.toFixed(2)])]
      .map((r) => r.map(q).join(','))
      .join('\n');
    const l = document.createElement('a');
    l.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' }));
    l.download = 'huvan-' + TABLE + '.csv';
    l.click();
  };

  return (
    <>
      <h1>{TITLE}</h1>
      <div className="card">
        <h2>{TITLE} list</h2>
        <label>Month (clear to show all)</label>
        <input
          type="month"
          value={m}
          onChange={(e) => setM(e.target.value)}
          style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
        />
        <div className="sum">
          <div>Total<b>{f(total)}</b></div>
          <div>Entries<b>{list.length}</b></div>
          <div>Bank balance<b>{f(bankBalance)}</b></div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              setErr('');
              setModalOpen(true);
            }}
          >
            Add Expense
          </button>
          <button className="alt" onClick={csv}>Export CSV</button>
        </div>
        {!modalOpen && err && <p className="err">{err}</p>}
        <div className="xt">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Details</th>
                <th>Category</th>
                <th>Account</th>
                <th>Amount</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.length ? (
                list.map((x) => (
                  <tr key={x.id}>
                    <td>{dmy(x.entry_date)}</td>
                    <td>{x.details}</td>
                    <td>{x.category}</td>
                    <td>{an(x.account_id)}</td>
                    <td className="n">{f(x.a)}</td>
                    <td><a onClick={() => del(x.id)}>×</a></td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6">No entries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <Modal title={'Add ' + NOUN} onClose={() => setModalOpen(false)}>
          <label>Date</label>
          <input
            type="date"
            value={form.entry_date}
            onChange={set('entry_date')}
            style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}
          />
          <label>Details</label>
          <input value={form.details} onChange={set('details')} />
          <label>Category</label>
          <input list={TABLE + '-cats'} value={form.category} onChange={set('category')} />
          <datalist id={TABLE + '-cats'}>{cats.map((c) => <option key={c} value={c} />)}</datalist>
          <label>Account</label>
          <select value={form.account_id} onChange={set('account_id')}>
            {accts.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <label>Amount</label>
          <input type="number" step="0.01" min="0" value={form.amount} onChange={set('amount')} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
            <button className="alt" onClick={() => setModalOpen(false)}>Cancel</button>
            <button onClick={add}>Add</button>
          </div>
          <p className="err">{err}</p>
        </Modal>
      )}
    </>
  );
}
