// Settings

'use client';
import { useEffect, useState } from 'react';
import { sb } from '../../lib/supabase';
import { f } from '../../lib/util';

const Inp = ({ style: s, ...p }) => (
  <input style={{ width:'100%',padding:'8px 10px',border:'1px solid var(--line)',borderRadius:9,
    background:'var(--bg)',color:'var(--ink)',font:'inherit',fontSize:13,...s }} {...p}/>
);
const Btn = ({ alt, style: s, ...p }) => (
  <button style={{ margin:0,padding:'8px 14px',background:alt?'transparent':'var(--accent)',
    color:alt?'var(--ink)':'var(--on)',border:alt?'1px solid var(--line)':'none',
    borderRadius:9,font:'inherit',fontWeight:600,fontSize:13,cursor:'pointer',...s }} {...p}/>
);

export default function Settings() {
  const [ranges, setRanges] = useState([]);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ revenue_from:'', revenue_to:'', bonus_amount:'' });

  const load = async () => {
    const r = await sb.from('bonus_ranges').select('*').order('revenue_from');
    if (r.data) setRanges(r.data);
  };
  useEffect(() => { load(); }, []);

  const addRange = async () => {
    const from = parseFloat(form.revenue_from);
    const to = form.revenue_to === '' ? null : parseFloat(form.revenue_to);
    const bonus = parseFloat(form.bonus_amount);
    if (isNaN(from) || isNaN(bonus)) return setErr('Enter valid numbers for From and Bonus.');
    const r = await sb.from('bonus_ranges').insert({ revenue_from:from, revenue_to:to, bonus_amount:bonus });
    if (r.error) return setErr(r.error.message);
    setErr(''); setForm({ revenue_from:'', revenue_to:'', bonus_amount:'' }); load();
  };

  const updateRange = async (id, field, value) => {
    setRanges(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const saveRange = async (range) => {
    const r = await sb.from('bonus_ranges').update({
      revenue_from: parseFloat(range.revenue_from),
      revenue_to: range.revenue_to === '' || range.revenue_to === null ? null : parseFloat(range.revenue_to),
      bonus_amount: parseFloat(range.bonus_amount),
    }).eq('id', range.id);
    if (r.error) return setErr(r.error.message);
    setSaved(true); setTimeout(() => setSaved(false), 2000); load();
  };

  const deleteRange = async (id) => {
    if (!confirm('Delete this range?')) return;
    await sb.from('bonus_ranges').delete().eq('id', id); load();
  };

  const label = (r) => {
    if (+r.revenue_from === 0 && r.revenue_to !== null) return `Below MVR ${f(+r.revenue_to + 0.01)}`;
    if (r.revenue_to === null) return `MVR ${f(r.revenue_from)} and above`;
    return `MVR ${f(r.revenue_from)} – ${f(r.revenue_to)}`;
  };

  return (
    <>
      <h1>Settings</h1>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:16, alignItems:'start' }}>
        <div className="card">
          <h2>Bonus ranges</h2>
          <p style={{ fontSize:12, color:'var(--muted)', marginBottom:16 }}>
            Set monthly revenue ranges and the corresponding bonus amount paid to all staff.
            Leave "To" empty for "and above".
          </p>
          {saved && <p style={{ fontSize:12, color:'#27ae60', marginBottom:10 }}>Saved.</p>}
          {err && <p className="err" style={{ marginBottom:10 }}>{err}</p>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:6, marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--muted)' }}>From (MVR)</span>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--muted)' }}>To (MVR)</span>
            <span style={{ fontSize:11, fontWeight:600, color:'var(--muted)' }}>Bonus</span>
            <span/>
          </div>
          {ranges.map(r => (
            <div key={r.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:6, marginBottom:8, alignItems:'center' }}>
              <Inp type="number" value={r.revenue_from} onChange={e => updateRange(r.id, 'revenue_from', e.target.value)}/>
              <Inp type="number" value={r.revenue_to ?? ''} placeholder="∞" onChange={e => updateRange(r.id, 'revenue_to', e.target.value)}/>
              <Inp type="number" value={r.bonus_amount} onChange={e => updateRange(r.id, 'bonus_amount', e.target.value)}/>
              <div style={{ display:'flex', gap:4 }}>
                <Btn onClick={() => saveRange(r)} style={{ padding:'6px 10px', fontSize:12 }}>Save</Btn>
                <Btn alt onClick={() => deleteRange(r.id)} style={{ padding:'6px 10px', fontSize:12 }}>✕</Btn>
              </div>
            </div>
          ))}
          <div style={{ borderTop:'1px solid var(--line)', marginTop:12, paddingTop:12 }}>
            <p style={{ fontSize:12, fontWeight:600, color:'var(--muted)', marginBottom:8 }}>Add new range</p>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:6, alignItems:'center' }}>
              <Inp type="number" placeholder="From" value={form.revenue_from} onChange={e => setForm({ ...form, revenue_from:e.target.value })}/>
              <Inp type="number" placeholder="To (∞)" value={form.revenue_to} onChange={e => setForm({ ...form, revenue_to:e.target.value })}/>
              <Inp type="number" placeholder="Bonus" value={form.bonus_amount} onChange={e => setForm({ ...form, bonus_amount:e.target.value })}/>
              <Btn onClick={addRange} style={{ padding:'8px 10px', fontSize:12 }}>Add</Btn>
            </div>
          </div>
        </div>

        <div className="card">
          <h2>Current ranges</h2>
          <p style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>
            These are the active bonus rules used when recording salary payments.
          </p>
          {ranges.map(r => (
            <div key={r.id} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0',
              borderBottom:'1px solid var(--line)', fontSize:13 }}>
              <span style={{ color:'var(--muted)' }}>{label(r)}</span>
              <span style={{ fontWeight:600, color: +r.bonus_amount === 0 ? 'var(--muted)' : 'var(--ink)' }}>
                {+r.bonus_amount === 0 ? 'No bonus' : `MVR ${f(r.bonus_amount)}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
