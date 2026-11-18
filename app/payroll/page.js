'use client';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '../../lib/supabase';
import { f, dmy, today } from '../../lib/util';

const Modal = ({ title, onClose, children }) => (
  <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{ background: 'var(--panel)', borderRadius: '16px 16px 0 0', padding: 20, width: '100%', maxWidth: 480, maxHeight: '92vh', overflow: 'auto',
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

const emptyStaff = { name: '', role: 'Staff', pay_type: 'monthly', pay_rate: '', active: true, note: '' };
const emptyPay = { entry_date: today(), staff_id: '', period: today().slice(0, 7), amount: '', account_id: '', note: '' };

export default function Payroll() {
  const [staff, setStaff] = useState([]), [pays, setPays] = useState([]), [accts, setAccts] = useState([]);
  const [err, setErr] = useState(''), [m, setM] = useState(today().slice(0, 7));
  const [modal, setModal] = useState(null);
  const [sf, setSf] = useState(emptyStaff);
  const [pf, setPf] = useState(emptyPay);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    const r = await Promise.all([
      sb.from('staff').select('*').order('name'),
      sb.from('payroll').select('*').order('entry_date', { ascending: false }).order('created_at', { ascending: false }),
      sb.from('accounts').select('*').order('created_at'),
    ]);
    const bad = r.find((x) => x.error);
    if (bad) return setErr(bad.error.message);
    const [st, py, ac] = r.map((x) => x.data);
    setStaff(st); setPays(py); setAccts(ac); setErr('');
    setPf((p) => ({
      ...p,
      staff_id: p.staff_id || (st.find((x) => x.active) || st[0] || {}).id || '',
      account_id: p.account_id || (ac[0] ? ac[0].id : ''),
    }));
  };
  useEffect(() => { load(); }, []);

  const sn = (id) => (staff.find((x) => x.id === id) || {}).name || 'Former staff';
  const an = (id) => (accts.find((x) => x.id === id) || {}).name || '';
  const active = staff.filter((x) => x.active);

  const monthPays = useMemo(() => pays.filter((x) => !m || (x.period || x.entry_date || '').slice(0, 7) === m), [pays, m]);
  const paid = monthPays.reduce((t, x) => t + +x.amount, 0);
  const due = active.reduce((t, s) => t + (s.pay_type === 'monthly' ? +s.pay_rate || 0 : 0), 0);

  const saveStaff = async () => {
    const row = editing || sf;
    if (!row.name.trim()) return setErr('Enter a name.');
    const rate = parseFloat(row.pay_rate);
    if (row.pay_rate !== '' && !(rate >= 0)) return setErr('Enter a pay rate of 0 or more.');
    const body = {
      name: row.name.trim(),
      role: (row.role || '').trim() || null,
      pay_type: row.pay_type,
      pay_rate: row.pay_rate === '' ? 0 : rate,
      active: row.active !== false,
      note: (row.note || '').trim() || null,
    };
    const r = editing
      ? await sb.from('staff').update(body).eq('id', editing.id)
      : await sb.from('staff').insert(body);
    if (r.error) return setErr(r.error.message);
    setErr(''); setSf(emptyStaff); setEditing(null); setModal(null); load();
  };

  const rmStaff = async (s) => {
    if (!confirm('Remove ' + s.name + '? Past payments stay on record.')) return;
    const r = await sb.from('staff').delete().eq('id', s.id);
    if (r.error) {
      const u = await sb.from('staff').update({ active: false }).eq('id', s.id);
      if (u.error) return setErr(u.error.message);
    }
    load();
  };

  const addPay = async () => {
    const a = parseFloat(pf.amount);
    const person = staff.find((x) => x.id === pf.staff_id);
    if (!person) return setErr('Choose a staff member.');
    if (!(a > 0)) return setErr('Enter an amount above 0.');
    if (!pf.account_id) return setErr('Choose the account this was paid from.');
    const details = 'Wages · ' + person.name + (pf.period ? ' · ' + pf.period : '');
    const exp = await sb.from('expenses').insert({
      entry_date: pf.entry_date,
      details,
      category: 'Wages',
      amount: a,
      account_id: pf.account_id,
    }).select('id').single();
    if (exp.error) return setErr(exp.error.message);
    const r = await sb.from('payroll').insert({
      entry_date: pf.entry_date,
      staff_id: pf.staff_id,
      period: pf.period || pf.entry_date.slice(0, 7),
      amount: a,
      account_id: pf.account_id,
      expense_id: exp.data.id,
      note: pf.note.trim() || null,
    });
    if (r.error) {
      await sb.from('expenses').delete().eq('id', exp.data.id);
      return setErr(r.error.message);
    }
    setErr('');
    setPf({ ...pf, amount: '', note: '' });
    setModal(null);
    load();
  };

  const delPay = async (x) => {
    if (!confirm('Delete this payment? The matching wages expense is removed too.')) return;
    const r = await sb.from('payroll').delete().eq('id', x.id);
    if (r.error) return setErr(r.error.message);
    if (x.expense_id) await sb.from('expenses').delete().eq('id', x.expense_id);
    load();
  };

  const csv = () => {
    const q = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const t = [['Date', 'Period', 'Staff', 'Account', 'Note', 'Amount'],
      ...monthPays.map((x) => [dmy(x.entry_date), x.period || '', sn(x.staff_id), an(x.account_id), x.note || '', (+x.amount).toFixed(2)])]
      .map((r) => r.map(q).join(',')).join('\n');
    const l = document.createElement('a');
    l.href = URL.createObjectURL(new Blob(['\ufeff' + t], { type: 'text/csv' }));
    l.download = 'huvan-payroll' + (m ? '-' + m : '') + '.csv';
    l.click();
  };

  const openPay = (person) => {
    setErr('');
    setPf({
      entry_date: today(),
      staff_id: person ? person.id : (active[0] || staff[0] || {}).id || '',
      period: m || today().slice(0, 7),
      amount: person && person.pay_type === 'monthly' && +person.pay_rate ? String(person.pay_rate) : '',
      account_id: pf.account_id || (accts[0] ? accts[0].id : ''),
      note: '',
    });
    setModal('pay');
  };

  return (<>
    <h1>Payroll</h1>
    <p className="muted" style={{ marginTop: -8, marginBottom: 14 }}>Staff pay. Each payment is also recorded as a Wages expense, so cash balances stay in sync.</p>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginBottom: 16 }}>
      <Btn onClick={() => openPay()} style={{ width: '100%' }}>+ Pay</Btn>
      <Btn alt onClick={() => { setErr(''); setSf(emptyStaff); setEditing(null); setModal('staff'); }} style={{ width: '100%' }}>+ Add staff</Btn>
    </div>

    {err && !modal && <p className="err" style={{ marginBottom: 10 }}>{err}</p>}

    <div className="sum" style={{ marginBottom: 20 }}>
      <div>Paid{m ? ' this period' : ''}<b>{f(paid)}</b></div>
      <div>Payments<b>{monthPays.length}</b></div>
      <div>Active staff<b>{active.length}</b></div>
      <div>Monthly rates<b>{f(due)}</b></div>
    </div>

    <div style={{ display: 'grid', gap: 16 }}>
      <div className="card">
        <h2>Staff</h2>
        <div className="xt">
          <table><thead><tr><th>Name</th><th>Role</th><th>Pay</th><th></th></tr></thead>
            <tbody>{staff.length ? staff.map((s) => (
              <tr key={s.id} style={{ opacity: s.active ? 1 : 0.55 }}>
                <td>{s.name}{!s.active && <span className="muted"> · inactive</span>}</td>
                <td>{s.role}</td>
                <td className="n">{s.pay_rate ? f(s.pay_rate) + (s.pay_type === 'hourly' ? '/hr' : s.pay_type === 'daily' ? '/day' : '/mo') : '—'}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <a onClick={() => openPay(s)} style={{ cursor: 'pointer', marginRight: 10 }}>Pay</a>
                  <a onClick={() => { setEditing({ ...s, pay_rate: s.pay_rate ?? '' }); setErr(''); setModal('edit'); }} style={{ cursor: 'pointer', marginRight: 10 }}>Edit</a>
                  <a onClick={() => rmStaff(s)} style={{ cursor: 'pointer' }}>×</a>
                </td>
              </tr>
            )) : <tr><td colSpan="4">No staff yet. Add someone, then record a payment.</td></tr>}</tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2>Payments</h2>
        <Field label="Period (clear to show all)">
          <Inp type="month" value={m} onChange={(e) => setM(e.target.value)} />
        </Field>
        <Btn alt onClick={csv} style={{ marginTop: 8, width: '100%' }}>Export CSV</Btn>
        <div className="xt">
          <table><thead><tr><th>Date</th><th>Period</th><th>Staff</th><th>Account</th><th>Note</th><th>Amount</th><th></th></tr></thead>
            <tbody>{monthPays.length ? monthPays.map((x) => (
              <tr key={x.id}>
                <td>{dmy(x.entry_date)}</td>
                <td>{x.period}</td>
                <td>{sn(x.staff_id)}</td>
                <td>{an(x.account_id)}</td>
                <td>{x.note}</td>
                <td className="n">{f(x.amount)}</td>
                <td><a onClick={() => delPay(x)} style={{ cursor: 'pointer' }}>×</a></td>
              </tr>
            )) : <tr><td colSpan="7">No payments{m ? ' in this period' : ''}</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </div>

    {modal === 'staff' && (
      <Modal title="Add staff" onClose={() => setModal(null)}>
        <StaffForm row={sf} setRow={setSf} />
        {err && <p className="err">{err}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 14 }}>
          <Btn alt onClick={() => setModal(null)} style={{ width: '100%' }}>Cancel</Btn>
          <Btn onClick={saveStaff} style={{ width: '100%' }}>Add staff</Btn>
        </div>
      </Modal>
    )}

    {modal === 'edit' && editing && (
      <Modal title="Edit staff" onClose={() => { setModal(null); setEditing(null); }}>
        <StaffForm row={editing} setRow={setEditing} />
        {err && <p className="err">{err}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 14 }}>
          <Btn alt onClick={() => { setModal(null); setEditing(null); }} style={{ width: '100%' }}>Cancel</Btn>
          <Btn onClick={saveStaff} style={{ width: '100%' }}>Save</Btn>
        </div>
      </Modal>
    )}

    {modal === 'pay' && (
      <Modal title="Record payment" onClose={() => setModal(null)}>
        <Field label="Staff">
          <Sel value={pf.staff_id} onChange={(e) => {
            const person = staff.find((x) => x.id === e.target.value);
            setPf({ ...pf, staff_id: e.target.value, amount: person && person.pay_type === 'monthly' && +person.pay_rate ? String(person.pay_rate) : pf.amount });
          }}>
            {staff.map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (inactive)'}</option>)}
          </Sel>
        </Field>
        <Row2>
          <Field label="Paid on"><Inp type="date" value={pf.entry_date} onChange={(e) => setPf({ ...pf, entry_date: e.target.value })} /></Field>
          <Field label="For period"><Inp type="month" value={pf.period} onChange={(e) => setPf({ ...pf, period: e.target.value })} /></Field>
        </Row2>
        <Row2>
          <Field label="Amount"><Inp type="number" step="0.01" min="0" value={pf.amount} onChange={(e) => setPf({ ...pf, amount: e.target.value })} /></Field>
          <Field label="Paid from"><Sel value={pf.account_id} onChange={(e) => setPf({ ...pf, account_id: e.target.value })}>{accts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</Sel></Field>
        </Row2>
        <Field label="Note (optional)"><Inp value={pf.note} onChange={(e) => setPf({ ...pf, note: e.target.value })} placeholder="e.g. half month, overtime" /></Field>
        {err && <p className="err">{err}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 10, marginTop: 14 }}>
          <Btn alt onClick={() => setModal(null)} style={{ width: '100%' }}>Cancel</Btn>
          <Btn onClick={addPay} style={{ width: '100%' }}>Record payment</Btn>
        </div>
      </Modal>
    )}
  </>);
}

function StaffForm({ row, setRow }) {
  const set = (k) => (e) => setRow({ ...row, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });
  return (<>
    <Field label="Name"><Inp value={row.name} onChange={set('name')} /></Field>
    <Row2>
      <Field label="Role"><Inp value={row.role || ''} onChange={set('role')} placeholder="Barista, cook…" /></Field>
      <Field label="Pay type">
        <Sel value={row.pay_type} onChange={set('pay_type')}>
          <option value="monthly">Monthly</option>
          <option value="daily">Daily</option>
          <option value="hourly">Hourly</option>
        </Sel>
      </Field>
    </Row2>
    <Field label={row.pay_type === 'hourly' ? 'Rate per hour' : row.pay_type === 'daily' ? 'Rate per day' : 'Monthly salary'}>
      <Inp type="number" step="0.01" min="0" value={row.pay_rate} onChange={set('pay_rate')} />
    </Field>
    <Field label="Note (optional)"><Inp value={row.note || ''} onChange={set('note')} /></Field>
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink)', margin: '4px 0 0' }}>
      <input type="checkbox" checked={row.active !== false} onChange={set('active')} style={{ width: 'auto' }} /> Active
    </label>
  </>);
}
