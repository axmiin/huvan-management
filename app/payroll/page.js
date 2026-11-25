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
          {[['Payment date',dmy(
