'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { sb } from '../../lib/supabase';
import { f, dmy, today } from '../../lib/util';

const LOGO = '/logo.png';
const STAMP = '/stamp.png';

// ── helpers ──────────────────────────────────────────────
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const fmtDate = (v) => { if (!v) return ''; const [y,m,d] = v.split('-'); return d+'/'+m+'/'+y; };
const todayStr = () => today();

const nextNo = (saved, type) => {
 const prefix = type === 'quotation' ? 'QT' : 'HV';
 const y = new Date().getFullYear(), max = saved
 .filter(s => (s.type||'invoice') === type)
 .reduce((mx, s) => {
   const m = new RegExp('^'+prefix+'(\\d{4})\\/(\\d+)$').exec(s.no||'');
   return m&&+m[1]===y?Math.max(mx,+m[2]):mx;
 }, 0);
 return prefix+y+'/'+String(max+1).padStart(3,'0');
};


// ── small UI pieces ───────────────────────────────────────
const Inp = (p) => <input style={{ width:'100%',padding:'8px 10px',border:'1px solid var(--line)',borderRadius:9,background:'var(--bg)',color:'var(--ink)',font:'inherit',fontSize:13,boxSizing:'border-box' }} {...p}/>;

const Btn = ({ alt, danger, style:s, ...p }) => <button style={{ margin:0,padding:'8px 14px',background:danger?'#c0392b':alt?'transparent':'var(--accent)',color:danger?'#fff':alt?'var(--ink)':'var(--on)',border:alt?'1px solid var(--line)':danger?'none':'none',borderRadius:9,font:'inherit',fontWeight:600,fontSize:13,cursor:'pointer',...s }} {...p}/>;

const Field = ({ label, children, style:s }) => <div style={{ marginBottom:10,...s }}><label style={{ display:'block',fontSize:11,fontWeight:500,color:'var(--muted)',marginBottom:3 }}>{label}</label>{children}</div>;


 // ── modal ─────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide }) => (
 <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:60,display:'flex',alignItems:'center',justifyContent:'center',padding:16 }}
 onClick={(e)=>e.target===e.currentTarget&&onClose()}>
 <div style={{ background:'var(--panel)',borderRadius:16,padding:20,width:'100%',maxWidth:wide?900:460,maxHeight:'92vh',overflowY:'auto' }}>
 <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16 }}>
 <span style={{ fontSize:15,fontWeight:600 }}>{title}</span>
 <button onClick={onClose} style={{ margin:0,padding:'4px 8px',background:'none',border:'none',color:'var(--muted)',cursor:'pointer',fontSize:20,lineHeight:1 }}>✕</button>
 </div>
 {children}
 </div>
 </div>
);




// ── invoice / quotation sheet (A4 proportions, always white) ──
function Sheet({ doc, scale = 1 }) {
 const { no, date, cust, items, type } = doc;
 const isQuote = type === 'quotation';
 const rows = useMemo(() => items.filter(it => it.d || num(it.r)), [items]);
 const total = rows.reduce((s, it) => s + num(it.q) * num(it.r), 0);
 const blanks = Math.max(1, 5 - rows.length);

 return (
 <div id="doc-sheet" style={{ position:'relative',width:794,height:1123,background:'#fff',color:'#000',fontFamily:"'Poppins',system-ui,sans-serif",fontSize:13,overflow:'hidden',flexShrink:0,transform:`scale(${scale})`,transformOrigin:'top left' }}>
 <div style={{ position:'absolute',left:0,top:0,width:2,height:835,background:'#d8d0cb' }}/>
 <div style={{ position:'absolute',right:35,bottom:43,width:2,height:396,background:'#d8d0cb' }}/>
 <div style={{ position:'absolute',left:0,top:140,width:470,borderTop:'1.5px solid #d8d0cb' }}/>
 <div style={{ position:'absolute',left:0,right:0,bottom:0,height:43,background:'#634029' }}/>

 <img src={LOGO} alt="Huvan Café" style={{ position:'absolute',left:90,top:20,width:104,height:104,objectFit:'cover' }}/>

 
 <div style={{ position:'absolute',right:70,top:40,color:'#7b6558',fontWeight:500,fontSize:13,lineHeight:'20px',textAlign:'right' }}>
 +960 9977314 / +960 7718858<br/>huvancafe@gmail.com<br/>Sh. Funadhoo, Riyal<br/>Republic of Maldives
 </div>

 <div style={{ position:'absolute',right:70,top:162,textAlign:'right',lineHeight:'27px',fontSize:14 }}>
 Date: {fmtDate(date)}<br/>
 {isQuote ? 'Quotation No' : 'Invoice No'}: {no}
 </div>

 <div style={{ position:'absolute',left:0,right:0,top:206,textAlign:'center',fontFamily:"Calibri,Carlito,'Trebuchet MS',sans-serif",fontWeight:700,fontSize:18,letterSpacing:'.04em' }}>
 {isQuote ? 'QUOTATION' : 'INVOICE'}
 </div>

 <div style={{ position:'absolute',left:96,right:70,top:246 }}>
 <div style={{ fontSize:14,marginBottom:5 }}><b>Customer</b>: {cust}</div>

 <table style={{ borderCollapse:'separate',borderSpacing:0,width:'100%',fontFamily:"Calibri,Carlito,'Trebuchet MS',sans-serif",fontSize:15 }}>
 <thead>
 <tr>
 {['#','Description','Qty','Rate','Total'].map((h,i) => (
 <th key={h} style={{ border:'0',borderRight:'1px solid #bbb',borderBottom:'1px solid #bbb',borderTop:'1px solid #bbb',padding:'0 8px',height:23,fontWeight:700,textAlign:i===0||i>1?'center':'left', ...(i===0?{borderLeft:'1px solid #bbb',width:44}:i===2?{width:88}:i===3?{width:78}:i===4?{width:89,borderRight:'1px solid #bbb'}:{}) }}>{h}</th>
 ))}
 </tr>
 </thead>

 <tbody>
 {rows.map((it, idx) => {
 const t = num(it.q)*num(it.r);
 const bg = idx%2===0?'#fff':'#ececec';
 return (
 <tr key={idx}>
 {[idx+1, it.d, f(num(it.q)), f(num(it.r)), f(t)].map((v,ci) => (
 <td key={ci} style={{ border:0,borderRight:'1px solid #bbb',borderBottom:'1px solid #bbb',padding:'0 8px',height:23,background:bg,textAlign:ci===0||ci>1?'right':'left',...(ci===0?{borderLeft:'1px solid #bbb',textAlign:'center'}:{}) }}>{v}</td>
 ))}
 </tr>
 );
 })}

 {Array.from({length:blanks}).map((_,i) => (
 <tr key={'b'+i}>
 {[0,1,2,3,4].map(ci => <td key={ci} style={{ border:0,borderRight:'1px solid #bbb',borderBottom:'1px solid #bbb',height:23,background:i%2===0&&rows.length%2===0?'#fff':i%2===0?'#ececec':'#fff',...(ci===0?{borderLeft:'1px solid #bbb'}:{}) }}/>)}
 </tr>
 ))}

 <tr>
 <td style={{ border:0,background:'#fff' }}/>
 <td style={{ border:0,background:'#fff' }}/>
 <td style={{ border:0,borderRight:'1px solid #bbb',background:'#fff' }}/>
 <td style={{ border:0,borderRight:'1px solid #bbb',borderBottom:'1px solid #bbb',textAlign:'center',fontWeight:700,padding:'0 8px',height:23 }}>Total</td>
 <td style={{ border:0,borderRight:'1px solid #bbb',borderBottom:'1px solid #bbb',textAlign:'right',fontWeight:700,padding:'0 8px',height:23 }}>{f(total)}</td>
 </tr>
 </tbody>
 </table>

 <div style={{ fontSize:14,lineHeight:'27px',marginTop:4 }}>Stamp:</div>
 <div style={{ height:41,position:'relative',marginBottom:4 }}>
 <img src={STAMP} alt="Stamp" style={{ position:'absolute',left:73,top:-24,width:81,height:81,objectFit:'contain' }}/>

  
  
 </div>
 <div style={{ fontSize:14,lineHeight:'27px' }}>Account Details:</div>
 <div style={{ fontSize:14,lineHeight:'27px' }}>Account Name: Huvan Café</div>
 <div style={{ fontSize:14,lineHeight:'27px' }}>Account Number: 7770000157347</div>
 {isQuote && <div style={{ fontSize:12,color:'#888',marginTop:12,fontStyle:'italic' }}>This quotation is valid for 30 days from the date above.</div>}
 </div>
 </div>
 );
}


// ── item row ──────────────────────────────────────────────
function ItemRow({ item, idx, onChange, onDelete }) {
 return (
 <div className="invoice-items-row" style={{ display:'grid',gridTemplateColumns:'1fr 72px 80px 32px',gap:6,marginBottom:6 }}>
 <Inp value={item.d} maxLength={50} onChange={e=>onChange(idx,'d',e.target.value)} placeholder="Description"/>
 <Inp type="number" step="any" min="0" value={item.q} onChange={e=>onChange(idx,'q',e.target.value)} style={{ textAlign:'right',padding:'8px 6px' }}/>
 <Inp type="number" step="any" min="0" value={item.r} onChange={e=>onChange(idx,'r',e.target.value)} style={{ textAlign:'right',padding:'8px 6px' }}/>
 <button onClick={()=>onDelete(idx)} style={{ margin:0,padding:0,background:'transparent',border:'1px solid var(--line)',borderRadius:9,cursor:'pointer',color:'var(--muted)',fontSize:16 }}>×</button>
 </div>
 );
}


// ── main page ─────────────────────────────────────────────
export default function Invoices() {
 const blankDoc = (type, saved) => ({
 id: null, type, no: nextNo(saved, type),
 date: todayStr(), cust: '', items: [{ d:'',q:1,r:0 }],
 });

 const [saved, setSaved] = useState([]);
 const [doc, setDoc] = useState(null);
 const [modal, setModal] = useState(null);
 const [filter, setFilter] = useState('all');
 const [search, setSearch] = useState('');
 const [err, setErr] = useState('');
 const sheetRef = useRef(null);
 const previewRef = useRef(null);
 const [previewScale, setPreviewScale] = useState(1);

 const load = async () => {
 const r = await sb.from('invoices').select('*').order('created_at', { ascending: false });
 if (r.data) setSaved(r.data);
 };

 useEffect(() => {
 load().then(() => {
 setSaved(prev => { setDoc(blankDoc('invoice', prev)); return prev; });
 });
 }, []);

 const setItems = (items) => setDoc(d => ({ ...d, items }));
 const setField = (k) => (e) => setDoc(d => ({ ...d, [k]: e.target.value }));

 const changeItem = (idx, key, val) => {
 const items = doc.items.map((it, i) => i === idx ? { ...it, [key]: val } : it);
 setItems(items);
 };

 const addItem = () => setItems([...doc.items, { d:'', q:1, r:0 }]);

 const delItem = (idx) => {
 const items = doc.items.filter((_,i)=>i!==idx);
 setItems(items.length?items:[{d:'',q:1,r:0}]);
 };

 const saveDoc = async () => {
 if (!doc.cust.trim()) return setErr('Enter a customer name.');

 const data = {
 no: doc.no,
 type: doc.type||'invoice',
 date: doc.date,
 cust: doc.cust,
 items: doc.items.map(it=>({d:it.d,q:num(it.q),r:num(it.r)})),
 ts: Date.now()
 };

 const id = doc.id || ('doc'+Date.now());

 const r = doc.id
 ? await sb.from('invoices').update({ data, no: doc.no, type: doc.type||'invoice' }).eq('id', id)
 : await sb.from('invoices').insert({ id, no: doc.no, type: doc.type||'invoice', data });

 if (r.error) return setErr(r.error.message);

 setErr('');
 setDoc(d => ({ ...d, id }));
 load();
 };

 const openDoc = (s) => {
 const d = s.data || s;
 setDoc({
 id: s.id,
 type: s.type||'invoice',
 no: d.no||s.no,
 date: d.date,
 cust: d.cust,
 items: d.items||[{d:'',q:1,r:0}]
 });
 setModal(null);
 };

 const deleteDoc = async (id, e) => {
 e.stopPropagation();
 if (!confirm('Delete this document?')) return;
 await sb.from('invoices').delete().eq('id', id);
 load();
 };

 const newDoc = (type) => {
 setDoc(blankDoc(type, saved));
 setErr('');
 };

 const changeDocType = (e) => {
 const type = e.target.value;
 setDoc(d => ({ ...d, type, no: d.id ? d.no : nextNo(saved, type) }));
 };

 useEffect(() => {
 if (modal !== 'preview' || !previewRef.current) return;
 const el = previewRef.current;
 const update = () => setPreviewScale(Math.min(1, el.clientWidth / 794));
 update();
 const observer = new ResizeObserver(update);
 observer.observe(el);
 return () => observer.disconnect();
 }, [modal]);

 const downloadPDF = async () => {
 const el = document.getElementById('doc-sheet');
 if (!el || !window.html2canvas || !window.jspdf) {
 alert('PDF tools are still loading. Please try again.');
 return;
 }

 const btn = document.getElementById('pdf-btn');
 const old = btn?.textContent;
 if (btn) { btn.textContent = 'Preparing…'; btn.disabled = true; }

 const oldTransform = el.style.transform;

 try {
 if (document.fonts?.ready) await document.fonts.ready;
 el.style.transform = 'none';

 const c = await window.html2canvas(el, {
 scale: 2,
 backgroundColor: '#fff',
 width: 794,
 height: 1123,
 scrollX: 0,
 scrollY: 0
 });

 const pdf = new window.jspdf.jsPDF({
 unit: 'mm',
 format: 'a4',
 orientation: 'portrait'
 });

 pdf.addImage(c.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 210, 297);
 pdf.save((doc.no||'document').replace(/[^\w-]+/g,'-')+'.pdf');

 } catch(e) {
 alert('PDF failed: '+e.message);
 } finally {
 el.style.transform = oldTransform;
 if (btn) { btn.textContent = old; btn.disabled = false; }
 }
 };

 const filtered = useMemo(() => saved.filter(s => {
 const matchType = filter === 'all' || (s.type||'invoice') === filter;
 const d = s.data || {};
 const matchSearch = !search ||
 (d.cust||'').toLowerCase().includes(search.toLowerCase()) ||
 (s.no||'').toLowerCase().includes(search.toLowerCase());
 return matchType && matchSearch;
 }), [saved, filter, search]);

 const total = (s) => ((s.data||s).items||[]).reduce((t,it)=>t+num(it.q)*num(it.r),0);
 const typeLabel = (t) => t==='quotation'?'Quotation':'Invoice';

 const typeBadge = (t) => ({
 background: t==='quotation'?'#e8f0fd':'#eaf3de',
 color: t==='quotation'?'#1a5fa8':'#3b6d11'
 });

 if (!doc) return <p className="muted">Loading…</p>;

 return (
 <>
 <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js" async/>
 <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js" async/>

 <style>{`
   .invoice-layout {
     display:grid;
     grid-template-columns:300px minmax(0,1fr);
     gap:16px;
     align-items:start;
   }

   .invoice-date-input {
     width:100%;
     min-width:0;
     box-sizing:border-box;
     display:block;
     min-height:42px;
     -webkit-appearance:none;
     appearance:none;
   }

   .invoice-sheet-frame {
     width:100%;
     position:relative;
     overflow:hidden;
     background:#fff;
   }

   @media (max-width:760px) {
     .invoice-layout {
       grid-template-columns:minmax(0,1fr) !important;
     }

     .invoice-form-card,
     .invoice-saved-card {
       min-width:0;
       width:100%;
     }

     .invoice-items-row {
       grid-template-columns:minmax(0,1fr) 58px 68px 30px !important;
       gap:5px !important;
     }

     .invoice-preview-actions {
       grid-template-columns:1fr !important;
     }
   }
 `}</style>

 <div style={{ marginBottom:16 }}>
   <h1 style={{ margin:0 }}>Invoices &amp; Quotations</h1>
 </div>

 <div className="invoice-layout">

 {/* ── form ── */}
 <div style={{ display:'grid',gap:12 }}>
 <div className="card invoice-form-card">

 <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
 <span style={{ fontWeight:600,fontSize:14 }}>
 {doc.type==='quotation'?'Quotation':'Invoice'} details
 </span>

 <span style={{ fontSize:11,fontWeight:600,padding:'2px 9px',borderRadius:20,...typeBadge(doc.type) }}>
 {typeLabel(doc.type)}
 </span>
 </div>

 <Field label="Document type">
 <select
 value={doc.type||'invoice'}
 onChange={changeDocType}
 style={{ width:'100%',boxSizing:'border-box',padding:'9px 10px',border:'1px solid var(--line)',borderRadius:9,background:'var(--bg)',color:'var(--ink)',font:'inherit',fontSize:13,minHeight:42 }}
 >
 <option value="invoice">Invoice</option>
 <option value="quotation">Quotation</option>
 </select>
 </Field>

 <Field label="Number">
 <Inp value={doc.no} onChange={setField('no')}/>
 </Field>

 <Field label="Date">
 <Inp className="invoice-date-input" type="date" value={doc.date} onChange={setField('date')}/>
 </Field>

 <Field label="Customer">
 <Inp value={doc.cust} onChange={setField('cust')} placeholder="Customer name"/>
 </Field>

 <div style={{ marginTop:12,marginBottom:6 }}>
 <label style={{ fontSize:11,fontWeight:500,color:'var(--muted)' }}>
 Items · <span style={{ fontStyle:'normal' }}>Desc / Qty / Rate</span>
 </label>
 </div>

 {doc.items.map((it,i)=>(
 <ItemRow key={i} item={it} idx={i} onChange={changeItem} onDelete={delItem}/>
 ))}

 <Btn alt onClick={addItem} style={{ width:'100%',marginTop:4,fontSize:12 }}>
 + Add item
 </Btn>

 <div style={{ background:'var(--bg)',borderRadius:8,padding:'8px 10px',marginTop:10,display:'flex',justifyContent:'space-between',fontSize:13 }}>
 <span style={{ color:'var(--muted)' }}>Total</span>
 <span style={{ fontWeight:600 }}>MVR {f(doc.items.reduce((s,it)=>s+num(it.q)*num(it.r),0))}</span>
 </div>

 {err && <p className="err" style={{ marginTop:6 }}>{err}</p>}

 <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:12 }}>
 <Btn onClick={saveDoc} style={{ width:'100%' }}>Save</Btn>
 <Btn alt onClick={()=>setModal('preview')} style={{ width:'100%' }}>Preview</Btn>
 </div>

 <Btn alt onClick={()=>newDoc(doc.type)} style={{ width:'100%',marginTop:6,fontSize:12 }}>
 + New document
 </Btn>

 </div>
 </div>


 {/* ── saved documents ── */}
 <div className="card invoice-saved-card">

 <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,marginBottom:12 }}>
 <h2 style={{ margin:0 }}>Saved documents</h2>

 <div style={{ display:'flex',gap:6 }}>
 {['all','invoice','quotation'].map(t=>(
 <button
 key={t}
 onClick={()=>setFilter(t)}
 style={{ margin:0,padding:'4px 10px',borderRadius:20,border:'1px solid var(--line)',background:filter===t?'var(--accent)':'transparent',color:filter===t?'var(--on)':'var(--muted)',font:'inherit',fontSize:12,fontWeight:500,cursor:'pointer' }}
 >
 {t==='all'?'All':typeLabel(t)+'s'}
 </button>
 ))}
 </div>
 </div>

 <Inp
 value={search}
 onChange={e=>setSearch(e.target.value)}
 placeholder="Search by customer or number…"
 style={{ marginBottom:12 }}
 />

 {filtered.length === 0
 ? <p style={{ color:'var(--muted)',fontSize:13 }}>No documents found.</p>
 : <div className="xt">
 <table>
 <thead>
 <tr>
 <th>No.</th><th>Type</th><th>Date</th><th>Customer</th><th>Total</th><th></th>
 </tr>
 </thead>

 <tbody>
 {filtered.map(s=>(
 <tr key={s.id} style={{ cursor:'pointer' }} onClick={()=>openDoc(s)}>
 <td style={{ fontWeight:600 }}>{s.no}</td>
 <td>
 <span style={{ fontSize:11,fontWeight:500,padding:'2px 7px',borderRadius:12,...typeBadge(s.type||'invoice') }}>
 {typeLabel(s.type||'invoice')}
 </span>
 </td>
 <td>{fmtDate((s.data||{}).date||'')}</td>
 <td>{(s.data||{}).cust||''}</td>
 <td className="n">MVR {f(total(s))}</td>
 <td>
 <a onClick={e=>deleteDoc(s.id,e)} style={{ cursor:'pointer',color:'var(--muted)' }}>×</a>
 </td>
 </tr>
 ))}
 </tbody>
 </table>
 </div>
 }

 </div>
 </div>


 {/* ── preview modal ── */}
 {modal === 'preview' && (
 <Modal title={doc.type==='quotation'?'Quotation preview':'Invoice preview'} onClose={()=>setModal(null)} wide>

 <div
 ref={previewRef}
 className="invoice-sheet-frame"
 style={{ height:1123*previewScale, marginBottom:16 }}
 >
 <Sheet doc={doc} scale={previewScale}/>
 </div>

 <div className="invoice-preview-actions" style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8 }}>
 <Btn alt onClick={()=>setModal(null)} style={{ width:'100%' }}>Close</Btn>
 <Btn id="pdf-btn" onClick={downloadPDF} style={{ width:'100%' }}>Download PDF</Btn>
 </div>

 </Modal>
 )}

 </>
 );
}
