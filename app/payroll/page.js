function Payslip({ p, staff, accounts, no, onClose }) {
  const st = staff.find((x)=>x.id===p.staff_id)||{};
  const ac = accounts.find((x)=>x.id===p.account_id)||{};
  const monthLabel = (m) => { const [y,mo]=m.split('-'); return new Date(y,mo-1,1).toLocaleString('en-US',{month:'long',year:'numeric'}); };
  const print = () => {
    const w = window.open('','_blank');
    w.document.write('<html><head><title>Payslip '+no+'</title><style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{font-family:system-ui,sans-serif}@media print{@page{size:A5 portrait;margin:0}}</style></head><body>');
    w.document.write(document.getElementById('payslip-inner').outerHTML);
    w.document.write('</body></html>');
    w.document.close(); w.focus(); setTimeout(()=>w.print(),400);
  };
  return (
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
  );
}
