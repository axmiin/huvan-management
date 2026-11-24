'use client';
import { useEffect, useMemo, useState } from 'react';
import { sb } from '../../lib/supabase';
import { f, dmy, today } from '../../lib/util';

const OWNER = 'Ali Azeem, Manager';

const LOGO = 'data:image/png;base64,YOUR_LOGO_BASE64_HERE';
const STAMP = 'data:image/png;base64,YOUR_STAMP_BASE64_HERE';


const Modal = ({ title, onClose, children }) => (
  <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:50,display:'flex',alignItems:'flex-end',justifyContent:'center' }}
    onClick={(e)=>e.target===e.currentTarget&&onClose()}>
    <div style={{ background:'#f0ece8',borderRadius:'16px 16px 0 0',padding:20,width:'100%',maxWidth:440,
      paddingBottom:'calc(20px + env(safe-area-inset-bottom))',maxHeight:'90vh',overflowY:'auto' }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
        <span style={{ fontSize:16,fontWeight:600 }}>{title}</span>
        <button onClick={onClose} style={{ margin:0,padding:6,background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20,lineHeight:1 }}>✕</button>
      </div>
      {children}
    </div>
  </div>
);
const Field = ({ label, children }) => (
  <div style={{ marginBottom:10 }}>
    <label style={{ display:'block',fontSize:12,fontWeight:500,color:'var(--muted)',marginBottom:4 }}>{label}</label>
    {children}
  </div>
);
const Inp = (p) => <input style={{ width:'100%',padding:'9px 12px',border:'1px solid var(--line)',borderRadius:10,background:'var(--bg)',color:'var(--ink)',font:'inherit' }} {...p}/>;
const Sel = ({ children,...p }) => <select style={{ width:'100%',padding:'9px 12px',border:'1px solid var(--line)',borderRadius:10,background:'var(--bg)',color:'var(--ink)',font:'inherit' }} {...p}>{children}</select>;
const Btn = ({ alt,full,style:s,...p }) => <button style={{ margin:0,background:alt?'transparent':'var(--accent)',color:alt?'var(--ink)':'var(--on)',border:alt?'1px solid var(--line)':'none',borderRadius:10,padding:'10px 16px',font:'inherit',fontWeight:600,cursor:'pointer',width:full?'100%':'auto',...s }} {...p}/>;
const Row2 = ({ children,style:s }) => <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,...s }}>{children}</div>;
const initM = () => { const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'); };

function Payslip({ p, staff, accounts, no, onClose }) {
  const st = staff.find((x)=>x.id===p.staff_id)||{};
  const ac = accounts.find((x)=>x.id===p.account_id)||{};
  const monthLabel = (m) => { const [y,mo]=m.split('-'); return new Date(y,mo-1,1).toLocaleString('en-US',{month:'long',year:'numeric'}); };
  const print = async () => {
    if (!window.html2canvas) return alert('Still loading, try again.');
    const el = document.getElementById('payslip-inner');
    const c = await window.html2canvas(el, { scale:3, backgroundColor:'#fff', useCORS:true });
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = 'Payslip-' + no.replace(/[^\w-]/g,'-') + '.png';
    a.click();
  };
  

  return (
    <>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" async/>
      <Modal title="Payslip" onClose={onClose}>
      <div id="payslip-inner" style={{ background:'#fff',borderRadius:20,width:'100%',maxWidth:400,overflow:'hidden',fontFamily:'system-ui,sans-serif' }}>
        {/* header */}
        <div style={{ background:'#8A7356',padding:'20px 24px',display:'flex',justifyContent:'space-between',alignItems:'flex-start' }}>
          <div>
            <img src={LOGO} alt="Logo" style={{ width:40,height:40,borderRadius:10,objectFit:'cover',marginBottom:12 }}/>
            <div style={{ fontSize:18,fontWeight:700,color:'#fff',letterSpacing:'-.02em' }}>{st.name}</div>
            <div style={{ fontSize:13,color:'rgba(255,255,255,0.7)',marginTop:2 }}>{st.position}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11,color:'rgba(255,255,255,0.7)',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:4 }}>Payslip</div>
            <div style={{ fontSize:13,fontWeight:600,color:'#fff' }}>{no}</div>
            <div style={{ fontSize:12,color:'rgba(255,255,255,0.65)',marginTop:2 }}>{monthLabel(p.pay_month)}</div>
          </div>
        </div>
        {/* net pay */}
        <div style={{ padding:'20px 24px',background:'#faf8f6',borderBottom:'1px solid #f0ede9' }}>
          <div style={{ fontSize:11,color:'#9a8880',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:6 }}>Net pay</div>
          <div style={{ fontSize:32,fontWeight:700,color:'#1a1410',letterSpacing:'-.03em' }}>MVR {f(p.net_pay)}</div>
        </div>
        {/* breakdown */}
        <div style={{ padding:'20px 24px',background:'#fff' }}>
          <div style={{ fontSize:11,color:'#9a8880',fontWeight:600,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:12 }}>Breakdown</div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f5f2ef' }}>
            <span style={{ fontSize:13,color:'#5a4a42' }}>Basic salary</span>
            <span style={{ fontSize:13,fontWeight:600,color:'#1a1410' }}>MVR {f(p.basic_salary)}</span>
          </div>
          {+p.bonus>0 && <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f5f2ef' }}>
            <span style={{ fontSize:13,color:'#5a4a42' }}>Bonus</span>
            <span style={{ fontSize:13,fontWeight:600,color:'#27ae60' }}>+ MVR {f(p.bonus)}</span>
          </div>}
          {+p.deduction>0 && <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 0',borderBottom:'1px solid #f5f2ef' }}>
            <span style={{ fontSize:13,color:'#5a4a42' }}>{p.note||'Deduction'}</span>
            <span style={{ fontSize:13,fontWeight:600,color:'#c0392b' }}>− MVR {f(p.deduction)}</span>
          </div>}
          <div style={{ display:'flex',justifyContent:'space-between',padding:'14px 0 0' }}>
            <span style={{ fontSize:14,fontWeight:600,color:'#1a1410' }}>Net pay</span>
            <span style={{ fontSize:14,fontWeight:700,color:'#c19a6b' }}>MVR {f(p.net_pay)}</span>
          </div>
        </div>
        {/* meta */}
        <div style={{ padding:'0 24px 20px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,background:'#fff' }}>
          {[['Payment date',dmy(p.created_at?p.created_at.slice(0,10):today())],['Period',monthLabel(p.pay_month)]].map(([l,v])=>(
            <div key={l} style={{ background:'#faf8f6',borderRadius:10,padding:'10px 12px' }}>
              <div style={{ fontSize:10,color:'#9a8880',marginBottom:3 }}>{l}</div>
              <div style={{ fontSize:12,fontWeight:600,color:'#1a1410' }}>{v}</div>
            </div>
          ))}
        </div>
        {/* footer */}
        <div style={{ padding:'14px 24px',borderTop:'1px solid #f0ede9',display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fff' }}>
          <div style={{ fontSize:11,color:'#9a8880',lineHeight:1.6 }}>Authorised by<br/><strong style={{ fontSize:12,color:'#1a1410' }}>{OWNER}</strong></div>
          <img src={STAMP} alt="Stamp" style={{ width:52,height:52,objectFit:'contain',opacity:.8 }}/>
        </div>
      </div>
      <div style={{ display:'flex',gap:8,marginTop:14 }}>
        <Btn alt full onClick={onClose}>Close</Btn>
        <Btn full onClick={print}>Download / Print</Btn>
      </div>
  </Modal>
    </>
  );
}

export default function Payroll() {
  const [role, setRole] = useState(null);
  const [staff, setStaff] = useState([]), [payments, setPayments] = useState([]), [accounts, setAccounts] = useState([]);
  const [month, setMonth] = useState(initM()), [modal, setModal] = useState(null), [err, setErr] = useState('');
  const [sf, setSf] = useState({ name:'',position:'',salary:'' });
  const [pf, setPf] = useState({ staff_id:'',pay_month:initM(),basic_salary:'',bonus:'0',deduction:'0',account_id:'',note:'' });
  const [bonusRanges, setBonusRanges] = useState([]);

  const [editing, setEditing] = useState(null), [viewSlip, setViewSlip] = useState(null);

  useEffect(() => {
    sb.from('profiles').select('role').eq('id',(async()=>{const {data}=await sb.auth.getUser();return data.user.id;})()).single()
      .then(async ({data})=>{
        const {data:ud}=await sb.auth.getUser();
        const r=await sb.from('profiles').select('role').eq('id',ud.user.id).single();
        setRole(r.data?.role||'staff');
      });
    sb.auth.getUser().then(async({data})=>{
      const r=await sb.from('profiles').select('role').eq('id',data.user.id).single();
      setRole(r.data?.role||'staff');
    });
  },[]);

    const calcBonus = (revenue, ranges) => {
    const sorted = [...ranges].sort((a,b) => a.revenue_from - b.revenue_from);
    for (const r of sorted) {
      if (revenue >= r.revenue_from && (r.revenue_to === null || revenue <= r.revenue_to))
        return r.bonus_amount;
    }
    return 0;
  };
  const load = async () => {
    const [s,p,a]=await Promise.all([
      sb.from('staff').select('*').order('name'),
      sb.from('payroll').select('*').order('created_at',{ascending:false}),
      sb.from('accounts').select('*').order('created_at'),
    ]);
        if(s.data) setStaff(s.data);
    const br = await sb.from('bonus_ranges').select('*');
    if(br.data) setBonusRanges(br.data);

    if(p.data) setPayments(p.data);
    if(a.data) { setAccounts(a.data); setPf(x=>({...x,account_id:x.account_id||(a.data[0]?.id||'')})); }
  };
  useEffect(()=>{ if(role==='owner') load(); },[role]);

  const nextNo = () => {
    const y=new Date().getFullYear(),nums=payments.map(p=>{ const m=/^PS(\d{4})\/(\d+)$/.exec(p.payslip_no||''); return m&&+m[1]===y?+m[2]:0; });
    return 'PS'+y+'/'+(Math.max(0,...nums)+1).toString().padStart(3,'0');
  };

  const addStaff = async () => {
    if(!sf.name.trim()) return setErr('Enter a name.');
    const r=await sb.from('staff').insert({name:sf.name.trim(),position:sf.position.trim()||null,salary:parseFloat(sf.salary)||0});
    if(r.error) return setErr(r.error.message);
    setErr(''); setSf({name:'',position:'',salary:''}); setModal(null); load();
  };
  const saveStaff = async () => {
    if(!editing.name.trim()) return setErr('Enter a name.');
    const r=await sb.from('staff').update({name:editing.name.trim(),position:editing.position||null,salary:parseFloat(editing.salary)||0,active:editing.active}).eq('id',editing.id);
    if(r.error) return setErr(r.error.message);
    setErr(''); setModal(null); setEditing(null); load();
  };

  const recordPayment = async () => {
    const basic=parseFloat(pf.basic_salary),bonus=parseFloat(pf.bonus)||0,ded=parseFloat(pf.deduction)||0;
    if(!pf.staff_id||!pf.pay_month||!(basic>0)||!pf.account_id) return setErr('Fill in all required fields.');
    const net=basic+bonus-ded;
    const expR=await sb.from('expenses').insert({entry_date:today(),details:'Salary '+pf.pay_month+' — '+(staff.find(x=>x.id===pf.staff_id)?.name||''),category:'Wages',amount:net,account_id:pf.account_id}).select().single();
    if(expR.error) return setErr(expR.error.message);
    const no=nextNo();
    const r=await sb.from('payroll').insert({staff_id:pf.staff_id,pay_month:pf.pay_month,basic_salary:basic,bonus,deduction:ded,net_pay:net,account_id:pf.account_id,note:pf.note.trim()||null,expense_id:expR.data.id,payslip_no:no});
    if(r.error){ await sb.from('expenses').delete().eq('id',expR.data.id); return setErr(r.error.includes?.('unique')||r.error.message?.includes('unique')?'This staff member already has a payment for that month.':r.error.message); }
    setErr(''); setModal(null); load();
  };

  const delPayment = async (p) => {
    if(!confirm('Delete this payment? The linked expense will also be removed.')) return;
    if(p.expense_id) await sb.from('expenses').delete().eq('id',p.expense_id);
    await sb.from('payroll').delete().eq('id',p.id); load();
  };

  const monthLabel = (m) => { const [y,mo]=m.split('-'); return new Date(y,mo-1,1).toLocaleString('en-US',{month:'short',year:'numeric'}); };
  const paidIds = useMemo(()=>new Set(payments.filter(p=>p.pay_month===month).map(p=>p.staff_id)),[payments,month]);
  const monthTotal = useMemo(()=>payments.filter(p=>p.pay_month===month).reduce((t,p)=>t+ +p.net_pay,0),[payments,month]);
  const active = staff.filter(s=>s.active!==false);
  const paid = active.filter(s=>paidIds.has(s.id)).length;
  const unpaid = active.length - paid;

  if(role===null) return <p className="muted">Loading…</p>;
  if(role!=='owner') return <><h1>Payroll</h1><p className="muted">You don't have permission to view this page.</p></>;

  return (<>
    <h1>Payroll</h1>
    <div style={{ display:'flex',gap:10,marginBottom:20,flexWrap:'wrap' }}>
      <Btn alt onClick={()=>{setErr('');setModal('addstaff')}}>+ Add staff</Btn>
      <Btn onClick={()=>{
        const first=active[0];
        (async () => {
  const salesR = await sb.from('sales').select('amount').gte('entry_date', month+'-01').lte('entry_date', month+'-31');
  const revenue = (salesR.data||[]).reduce((t,x) => t + +x.amount, 0);
  const bonus = calcBonus(revenue, bonusRanges);
  setPf({staff_id:first?.id||'',pay_month:month,basic_salary:first?.salary||'',bonus:String(bonus),deduction:'0',account_id:accounts[0]?.id||'',note:''});
})();

        setErr('');setModal('payment');
      }}>💳 Record payment</Btn>
    </div>

    <div className="card" style={{ marginBottom:16 }}>
      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8 }}>
        <h2 style={{ margin:0 }}>Monthly summary</h2>
        <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{ padding:'6px 10px',border:'1px solid var(--line)',borderRadius:8,background:'var(--bg)',color:'var(--ink)',font:'inherit',fontSize:13 }}/>
      </div>
      <div className="sum">
        <div>Total payroll<b>{f(monthTotal)}</b></div>
        <div>Paid<b style={{ color:'#27ae60' }}>{paid} staff</b></div>
        <div>Unpaid<b style={{ color: unpaid>0?'#c0392b':'var(--ink)' }}>{unpaid} staff</b></div>
      </div>
    </div>

    <div className="card" style={{ marginBottom:16 }}>
      <h2>Staff</h2>
      {active.length===0 && <p className="muted" style={{ fontSize:13 }}>No staff yet. Add someone to get started.</p>}
      {active.map(s=>(
        <div key={s.id} style={{ display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid var(--line)' }}>
          <div style={{ width:36,height:36,borderRadius:'50%',background:'rgba(193,154,107,.2)',color:'#7a5c38',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:600,flex:'none' }}>
            {s.name.split(' ').map(w=>w[0]).slice(0,2).join('')}
          </div>
          <div style={{ flex:1,minWidth:0 }}>
            <div style={{ fontWeight:600,fontSize:14 }}>{s.name}</div>
            <div style={{ fontSize:12,color:'var(--muted)' }}>{s.position}</div>
          </div>
          <div style={{ fontSize:14,fontWeight:600,marginRight:8 }}>{f(s.salary)}</div>
          <span style={{ fontSize:11,fontWeight:500,padding:'3px 10px',borderRadius:20,background:paidIds.has(s.id)?'#eaf3de':'#fcebeb',color:paidIds.has(s.id)?'#3b6d11':'#a32d2d',marginRight:8,whiteSpace:'nowrap' }}>
            {paidIds.has(s.id)?'Paid':'Unpaid'}
          </span>
          <button onClick={()=>{setEditing({...s});setErr('');setModal('editstaff')}} style={{ margin:0,padding:'5px 10px',background:'transparent',border:'1px solid var(--line)',borderRadius:8,cursor:'pointer',fontSize:12,color:'var(--ink)' }}>Edit</button>
        </div>
      ))}
    </div>

    <div className="card">
      <h2>Payment history</h2>
      <div className="xt">
        <table><thead><tr><th>Month</th><th>Staff</th><th>Basic</th><th>Bonus</th><th>Deduction</th><th>Net</th><th>Account</th><th>Note</th><th></th><th></th></tr></thead>
          <tbody>{payments.length?payments.map(p=>{
            const st2=staff.find(x=>x.id===p.staff_id)||{};
            const ac2=accounts.find(x=>x.id===p.account_id)||{};
            return (<tr key={p.id}>
              <td>{monthLabel(p.pay_month)}</td><td>{st2.name}</td>
              <td className="n">{f(p.basic_salary)}</td>
              <td className="n">{+p.bonus>0?f(p.bonus):'—'}</td>
              <td className="n">{+p.deduction>0?f(p.deduction):'—'}</td>
              <td className="n" style={{ fontWeight:600 }}>{f(p.net_pay)}</td>
              <td>{ac2.name}</td><td>{p.note||'—'}</td>
              <td><a onClick={()=>setViewSlip(p)} style={{ cursor:'pointer',fontSize:12,color:'var(--accent)',whiteSpace:'nowrap' }}>Payslip</a></td>
              <td><a onClick={()=>delPayment(p)} style={{ cursor:'pointer',color:'var(--muted)' }}>×</a></td>
            </tr>);
          }):<tr><td colSpan="10">No payments yet</td></tr>}</tbody>
        </table>
      </div>
    </div>

    {modal==='addstaff' && <Modal title="Add staff member" onClose={()=>setModal(null)}>
      <Field label="Full name *"><Inp value={sf.name} onChange={e=>setSf({...sf,name:e.target.value})} placeholder="e.g. Ahmed Hassan"/></Field>
      <Field label="Position"><Inp value={sf.position} onChange={e=>setSf({...sf,position:e.target.value})} placeholder="e.g. Head chef"/></Field>
      <Field label="Monthly salary"><Inp type="number" step="0.01" min="0" value={sf.salary} onChange={e=>setSf({...sf,salary:e.target.value})}/></Field>
      {err&&<p className="err">{err}</p>}
      <Row2 style={{ marginTop:14 }}>
        <Btn alt full onClick={()=>setModal(null)}>Cancel</Btn>
        <Btn full onClick={addStaff}>Add staff</Btn>
      </Row2>
    </Modal>}

    {modal==='editstaff' && editing && <Modal title="Edit staff member" onClose={()=>{setModal(null);setEditing(null)}}>
      <Field label="Full name *"><Inp value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})}/></Field>
      <Field label="Position"><Inp value={editing.position||''} onChange={e=>setEditing({...editing,position:e.target.value})}/></Field>
      <Field label="Monthly salary"><Inp type="number" step="0.01" value={editing.salary} onChange={e=>setEditing({...editing,salary:e.target.value})}/></Field>
      <Field label="Status"><Sel value={editing.active?'active':'inactive'} onChange={e=>setEditing({...editing,active:e.target.value==='active'})}><option value="active">Active</option><option value="inactive">Inactive</option></Sel></Field>
      {err&&<p className="err">{err}</p>}
      <Row2 style={{ marginTop:14 }}>
        <Btn alt full onClick={()=>{setModal(null);setEditing(null)}}>Cancel</Btn>
        <Btn full onClick={saveStaff}>Save</Btn>
      </Row2>
    </Modal>}

    {modal==='payment' && <Modal title="Record salary payment" onClose={()=>setModal(null)}>
      <Field label="Staff member *">
        <Sel value={pf.staff_id} onChange={e=>{
          const s2=staff.find(x=>x.id===e.target.value);
          (async () => {
  const salesR = await sb.from('sales').select('amount').gte('entry_date', pf.pay_month+'-01').lte('entry_date', pf.pay_month+'-31');
  const revenue = (salesR.data||[]).reduce((t,x) => t + +x.amount, 0);
  const bonus = calcBonus(revenue, bonusRanges);
  setPf({...pf,staff_id:e.target.value,basic_salary:s2?.salary||'',bonus:String(bonus)});
})();

        }}>{active.map(s=><option key={s.id} value={s.id}>{s.name} — {f(s.salary)}</option>)}</Sel>
      </Field>
      <Field label="Month *"><input type="month" value={pf.pay_month} onChange={e=>setPf({...pf,pay_month:e.target.value})} style={{ width:'100%',padding:'9px 12px',border:'1px solid var(--line)',borderRadius:10,background:'var(--bg)',color:'var(--ink)',font:'inherit' }}/></Field>
      <Row2>
        <Field label="Basic salary *"><Inp type="number" step="0.01" value={pf.basic_salary} onChange={e=>setPf({...pf,basic_salary:e.target.value})}/></Field>
        <Field label="Bonus"><Inp type="number" step="0.01" value={pf.bonus} onChange={e=>setPf({...pf,bonus:e.target.value})}/></Field>
      </Row2>
      <Field label="Deduction"><Inp type="number" step="0.01" value={pf.deduction} onChange={e=>setPf({...pf,deduction:e.target.value})}/></Field>
      <Field label="Paid from *"><Sel value={pf.account_id} onChange={e=>setPf({...pf,account_id:e.target.value})}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</Sel></Field>
      <Field label="Note (optional)"><Inp value={pf.note} onChange={e=>setPf({...pf,note:e.target.value})} placeholder="e.g. advance recovery"/></Field>
      {pf.staff_id&&<div style={{ background:'var(--bg)',borderRadius:8,padding:'8px 12px',fontSize:12,color:'var(--muted)',marginTop:4 }}>
        Net pay: <strong style={{ color:'var(--ink)' }}>MVR {f((parseFloat(pf.basic_salary)||0)+(parseFloat(pf.bonus)||0)-(parseFloat(pf.deduction)||0))}</strong>
      </div>}
      {err&&<p className="err">{err}</p>}
      <Row2 style={{ marginTop:14 }}>
        <Btn alt full onClick={()=>setModal(null)}>Cancel</Btn>
        <Btn full onClick={recordPayment}>Save payment</Btn>
      </Row2>
    </Modal>}

    {viewSlip && <Payslip p={viewSlip} staff={staff} accounts={accounts} no={viewSlip.payslip_no||'—'} onClose={()=>setViewSlip(null)}/>}
  </>);
}
