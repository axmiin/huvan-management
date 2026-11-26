// Settings

'use client';
import { useEffect, useState } from 'react';
import { sb } from '../../lib/supabase';
import { f } from '../../lib/util';

/* ── shared mini components ── */
const Inp = ({ style: s, ...p }) => (
  <input style={{ width:'100%',padding:'8px 10px',border:'1px solid var(--line)',borderRadius:9,
    background:'var(--bg)',color:'var(--ink)',font:'inherit',fontSize:13,...s }} {...p}/>
);
const Btn = ({ alt, danger, style: s, ...p }) => (
  <button style={{ margin:0,padding:'8px 14px',
    background:danger?'#c0392b':alt?'transparent':'var(--accent)',
    color:danger?'#fff':alt?'var(--ink)':'var(--on)',
    border:alt?'1px solid var(--line)':'none',
    borderRadius:9,font:'inherit',fontWeight:600,fontSize:13,cursor:'pointer',...s }} {...p}/>
);

const ACCENTS = [
  { name:'Caramel',  value:'#C19A6B' },
  { name:'Slate',    value:'#5B7FA6' },
  { name:'Sage',     value:'#6A9B7E' },
  { name:'Rose',     value:'#B56A7A' },
  { name:'Plum',     value:'#7B5EA7' },
  { name:'Terracotta', value:'#C4714A' },
];

/* ── Tab 1: Payroll & Bonus ── */
function BonusTab() {
  const [ranges, setRanges] = useState([]);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ revenue_from:'', revenue_to:'', bonus_amount:'' });

  const load = async () => {
    const r = await sb.from('bonus_ranges').select('*').order('revenue_from');
    if (r.data) setRanges(r.data);
  };
  useEffect(() => { load(); }, []);

  const updateRange = (id, field, value) =>
    setRanges(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

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

  const addRange = async () => {
    const from = parseFloat(form.revenue_from);
    const to = form.revenue_to === '' ? null : parseFloat(form.revenue_to);
    const bonus = parseFloat(form.bonus_amount);
    if (isNaN(from) || isNaN(bonus)) return setErr('Enter valid numbers for From and Bonus.');
    const r = await sb.from('bonus_ranges').insert({ revenue_from:from, revenue_to:to, bonus_amount:bonus });
    if (r.error) return setErr(r.error.message);
    setErr(''); setForm({ revenue_from:'', revenue_to:'', bonus_amount:'' }); load();
  };

  const label = (r) => {
    if (+r.revenue_from === 0 && r.revenue_to !== null) return `Below MVR ${f(+r.revenue_to + 0.01)}`;
    if (r.revenue_to === null) return `MVR ${f(r.revenue_from)} and above`;
    return `MVR ${f(r.revenue_from)} – ${f(r.revenue_to)}`;
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:14 }}>
      <div className="card">
        <h2>Bonus ranges</h2>
        <p style={{ fontSize:12,color:'var(--muted)',marginBottom:14 }}>
          Monthly revenue thresholds that determine staff bonus. Leave "To" blank for "and above".
        </p>
        {saved && <p style={{ fontSize:12,color:'#27ae60',marginBottom:8 }}>Saved.</p>}
        {err && <p className="err" style={{ marginBottom:8 }}>{err}</p>}
        <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:6,marginBottom:6 }}>
          {['From','To','Bonus',''].map(h => <span key={h} style={{ fontSize:11,fontWeight:600,color:'var(--muted)' }}>{h}</span>)}
        </div>
        {ranges.map(r => (
          <div key={r.id} style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:6,marginBottom:6,alignItems:'center' }}>
            <Inp type="number" value={r.revenue_from} onChange={e => updateRange(r.id,'revenue_from',e.target.value)}/>
            <Inp type="number" value={r.revenue_to??''} placeholder="∞" onChange={e => updateRange(r.id,'revenue_to',e.target.value)}/>
            <Inp type="number" value={r.bonus_amount} onChange={e => updateRange(r.id,'bonus_amount',e.target.value)}/>
            <div style={{ display:'flex',gap:4 }}>
              <Btn onClick={()=>saveRange(r)} style={{ padding:'6px 8px',fontSize:12 }}>Save</Btn>
              <Btn alt onClick={()=>deleteRange(r.id)} style={{ padding:'6px 8px',fontSize:12 }}>✕</Btn>
            </div>
          </div>
        ))}
        <div style={{ borderTop:'1px solid var(--line)',marginTop:10,paddingTop:10 }}>
          <p style={{ fontSize:12,fontWeight:600,color:'var(--muted)',marginBottom:8 }}>Add new range</p>
          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:6,alignItems:'center' }}>
            <Inp type="number" placeholder="From" value={form.revenue_from} onChange={e=>setForm({...form,revenue_from:e.target.value})}/>
            <Inp type="number" placeholder="To (∞)" value={form.revenue_to} onChange={e=>setForm({...form,revenue_to:e.target.value})}/>
            <Inp type="number" placeholder="Bonus" value={form.bonus_amount} onChange={e=>setForm({...form,bonus_amount:e.target.value})}/>
            <Btn onClick={addRange} style={{ padding:'8px 10px',fontSize:12 }}>Add</Btn>
          </div>
        </div>
      </div>
      <div className="card">
        <h2>Current rules</h2>
        <p style={{ fontSize:12,color:'var(--muted)',marginBottom:14 }}>
          Active bonus rules applied when recording salary payments.
        </p>
        {ranges.map(r => (
          <div key={r.id} style={{ display:'flex',justifyContent:'space-between',padding:'9px 0',
            borderBottom:'1px solid var(--line)',fontSize:13 }}>
            <span style={{ color:'var(--muted)' }}>{label(r)}</span>
            <span style={{ fontWeight:600,color:+r.bonus_amount===0?'var(--muted)':'var(--ink)' }}>
              {+r.bonus_amount===0?'No bonus':`MVR ${f(r.bonus_amount)}`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Tab 2: Users & Permissions ── */
function UsersTab({ currentUserId }) {
  const [users, setUsers] = useState([]);
  const [err, setErr] = useState('');
  const [saved, setSaved] = useState('');

  const load = async () => {
    const r = await sb.from('profiles').select('id,email,role').order('email');
    if (r.data) {
      // Show pending approvals at the top
      const sorted = [...r.data].sort((a, b) => {
        if (a.role === 'pending' && b.role !== 'pending') return -1;
        if (a.role !== 'pending' && b.role === 'pending') return 1;
        return (a.email || '').localeCompare(b.email || '');
      });
      setUsers(sorted);
    }
  };
  useEffect(() => { load(); }, []);

  const changeRole = (id, role) =>
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));

  const saveUser = async (user) => {
    setErr('');
    const r = await sb.from('profiles').update({ role: user.role }).eq('id', user.id);
    if (r.error) return setErr(r.error.message);
    setSaved(user.id);
    setTimeout(() => setSaved(''), 2000);
    load();
  };

  const removeUser = async (user) => {
    if (user.id === currentUserId) return;
    if (!confirm(`Remove ${user.email || 'this user'}? They will lose access immediately.`)) return;
    setErr('');
    // Deletes from auth.users (and cascades to profiles) via RPC
    const r = await sb.rpc('delete_user_account', { target_user_id: user.id });
    if (r.error) return setErr(r.error.message);
    load();
  };

  return (
    <div className="card">
      <h2>Users & permissions</h2>
      <p style={{ fontSize:12,color:'var(--muted)',marginBottom:14 }}>
        Approve new staff signups or update roles. Only owners can access this page.
      </p>
      {err && <p className="err" style={{ marginBottom:8 }}>{err}</p>}
      <div style={{ display:'grid',gridTemplateColumns:'1fr auto auto',gap:10,marginBottom:8,alignItems:'center' }}>
        <span style={{ fontSize:11,fontWeight:600,color:'var(--muted)' }}>Email</span>
        <span style={{ fontSize:11,fontWeight:600,color:'var(--muted)' }}>Role</span>
        <span/>
      </div>
      {users.map(u => (
        <div key={u.id} style={{ display:'grid',gridTemplateColumns:'1fr auto auto',gap:10,
          padding:'10px 0',borderBottom:'1px solid var(--line)',alignItems:'center' }}>
          <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
            <span style={{ fontSize:13,color:'var(--ink)',wordBreak:'break-all' }}>{u.email||'—'}</span>
            {u.role === 'pending' && (
              <span style={{ fontSize:11,fontWeight:600,padding:'2px 7px',borderRadius:99,
                background:'rgba(193,154,107,0.18)',color:'var(--accent)' }}>
                Needs approval
              </span>
            )}
          </div>
          <select value={u.role||'pending'} onChange={e=>changeRole(u.id,e.target.value)}
            style={{ padding:'6px 10px',border:'1px solid var(--line)',borderRadius:8,
              background:'var(--bg)',color:'var(--ink)',font:'inherit',fontSize:13 }}>
            <option value="pending">Pending</option>
            <option value="staff">Staff</option>
            <option value="owner">Owner</option>
          </select>
          <div style={{ display:'flex',gap:6 }}>
            <Btn onClick={()=>saveUser(u)} style={{ padding:'6px 12px',fontSize:12,
              background:saved===u.id?'#27ae60':undefined,color:saved===u.id?'#fff':undefined }}>
              {saved===u.id?'Saved':'Save'}
            </Btn>
            {u.id !== currentUserId && (
              <Btn alt onClick={()=>removeUser(u)} title="Remove user"
                style={{ padding:'6px 9px',fontSize:12,color:'#c0392b' }}>
                ✕
              </Btn>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


/* ── Tab 3: Appearance ── */
function AppearanceTab({ userId }) {
  const [theme, setTheme] = useState('light');
  const [accent, setAccent] = useState('#C19A6B');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    sb.from('user_preferences').select('theme,accent').eq('id',userId).single()
      .then(({ data }) => {
        if (data) {
          setTheme(data.theme||'light');
          setAccent(data.accent||'#C19A6B');
        }
        setLoading(false);
      });
  }, [userId]);

  const apply = (newTheme, newAccent) => {
    const t = newTheme || theme;
    const a = newAccent || accent;
    if (t === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', t);
    }
    document.documentElement.style.setProperty('--accent', a);
    document.documentElement.style.setProperty('--on', '#fff');
  };

  const save = async () => {
    apply(theme, accent);
    await sb.from('user_preferences').upsert({ id:userId, theme, accent, updated_at:new Date().toISOString() });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  const pickTheme = (t) => { setTheme(t); apply(t, accent); };
  const pickAccent = (a) => { setAccent(a); apply(theme, a); };

  if (loading) return <p className="muted" style={{ fontSize:13 }}>Loading…</p>;

  return (
    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
      <div className="card">
        <h2>Theme</h2>
        <p style={{ fontSize:12,color:'var(--muted)',marginBottom:14 }}>
          Choose how the app looks. Synced across all your devices.
        </p>
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {[['light','☀️  Light'],['dark','🌙  Dark'],['system','⚙️  System default']].map(([val,label]) => (
            <button key={val} onClick={()=>pickTheme(val)}
              style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',
                borderRadius:10,border:'2px solid',cursor:'pointer',font:'inherit',
                textAlign:'left',background:'var(--bg)',fontSize:13,fontWeight:500,
                borderColor:theme===val?'var(--accent)':'var(--line)',
                color:theme===val?'var(--accent)':'var(--ink)' }}>
              {label}
              {theme===val && <span style={{ marginLeft:'auto',fontSize:16 }}>✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Accent colour</h2>
        <p style={{ fontSize:12,color:'var(--muted)',marginBottom:14 }}>
          The highlight colour used throughout the app.
        </p>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16 }}>
          {ACCENTS.map(c => (
            <button key={c.value} onClick={()=>pickAccent(c.value)}
              style={{ padding:'14px 8px',borderRadius:10,border:'2px solid',cursor:'pointer',
                background:c.value,color:'#fff',font:'inherit',fontSize:12,fontWeight:600,
                borderColor:accent===c.value?'var(--ink)':'transparent',
                boxShadow:accent===c.value?'0 0 0 3px rgba(0,0,0,0.15)':'none' }}>
              {c.name}
              {accent===c.value && <div style={{ fontSize:16,marginTop:4 }}>✓</div>}
            </button>
          ))}
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:4 }}>
          <label style={{ fontSize:12,color:'var(--muted)',fontWeight:500 }}>Custom colour</label>
          <input type="color" value={accent} onChange={e=>pickAccent(e.target.value)}
            style={{ width:36,height:36,border:'none',borderRadius:8,cursor:'pointer',padding:2,background:'none' }}/>
          <span style={{ fontSize:12,color:'var(--muted)' }}>{accent}</span>
        </div>
      </div>

      <div style={{ gridColumn:'1/-1',display:'flex',justifyContent:'flex-end' }}>
        <Btn onClick={save} style={{ minWidth:120,
          background:saved?'#27ae60':undefined,color:saved?'#fff':undefined }}>
          {saved?'Saved!':'Save changes'}
        </Btn>
      </div>
    </div>
  );
}

/* ── Main settings page ── */
export default function Settings() {
  const [tab, setTab] = useState('payroll');
  const [userId, setUserId] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    sb.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      const r = await sb.from('profiles').select('role').eq('id', data.user.id).single();
      setRole(r.data?.role || 'staff');
    });
  }, []);

  const tabs = [
    { key:'payroll', label:'Payroll & Bonus' },
    { key:'users',   label:'Users & Permissions', ownerOnly: true },
    { key:'appearance', label:'Appearance' },
  ].filter(t => !t.ownerOnly || role === 'owner');

  return (
    <>
      <h1>Settings</h1>
      <div style={{ display:'flex',gap:4,marginBottom:20,flexWrap:'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={()=>setTab(t.key)}
            style={{ margin:0,padding:'8px 16px',borderRadius:10,border:'none',cursor:'pointer',
              font:'inherit',fontSize:13,fontWeight:600,
              background:tab===t.key?'var(--accent)':'var(--bg)',
              color:tab===t.key?'var(--on)':'var(--muted)',
              border:'1px solid',borderColor:tab===t.key?'var(--accent)':'var(--line)' }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab==='payroll' && <BonusTab/>}
      {tab==='users' && role==='owner' && <UsersTab/>}
      {tab==='appearance' && <AppearanceTab userId={userId}/>}
      {tab==='users' && role==='owner' && <UsersTab currentUserId={userId}/>}

    </>
  );
}
