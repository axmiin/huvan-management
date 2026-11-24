'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sb } from '../lib/supabase';

const NAV = [
  ['/sales/',    'Sales & Income', 'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6'],
  ['/expenses/', 'Expenses',       'M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z M9 7h6 M9 11h6'],
  ['/cash/',     'Cash & Accounts','M3 7h18v12H3z M3 7l2-3h14l2 3 M16 13h2'],
  ['/payroll/',  'Payroll',        'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 1 0 7.8'],
  ['/invoices/', 'Invoices',       'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8'],
  ['/testing/', 'Testing', 'M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 1 2 2M9 21H5a2 2 0 0 0-2-2m0 0V5'],
];

const MENU_IC = 'M3 12h18 M3 6h18 M3 18h18';
const CLOSE_IC = 'M18 6L6 18 M6 6l12 12';
const OUT_IC   = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9';
const MOON_IC  = 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';
const SUN_IC   = 'M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z';

const Brand = ({ onClick }) => (
  <Link href="/" className="brand" onClick={onClick} style={{ textDecoration:'none',color:'inherit' }}>
    <img src="/Logo.png" alt="Huvan" style={{ height: 32, width: 32, maxWidth: 32, objectFit: 'cover', borderRadius: 8 }} />
    <span>Huvan Pro</span>
  </Link>
);

function Sidebar({ path, onNav, dark, setDark }) {
  return (
    <div className="sidebar-inner">
      <Brand/>

      <nav>
        {NAV.map(([href, label, d]) => (
          <Link key={href} href={href} onClick={onNav}
            className={'nl' + (path.startsWith(href) ? ' active' : '')}>
            <Svg d={d}/>{label}
          </Link>
        ))}
      </nav>
      <span className="sp"/>
      <button className="nl" onClick={() => { setDark(d => !d); onNav(); }}
  style={{ justifyContent:'flex-start' }}>
        <Svg d={dark ? SUN_IC : MOON_IC}/>
        {dark ? 'Light mode' : 'Dark mode'}
      </button>
      
      <button className="nl signout" onClick={() => { onNav(); setTimeout(() => sb.auth.signOut(), 35); }}>
        <Svg d={OUT_IC}/>Sign out
      </button>
    </div>
  );
}

function Svg({ d, style }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true">
    <path d={d}/>
  </svg>;
}

export default function Shell({ children }) {
  const [session, setSession] = useState(undefined);
  const [email, setEmail]     = useState('');
  const [pw, setPw]           = useState('');
  const [err, setErr]         = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [dark, setDark]             = useState(false);
  const path = usePathname();

  // auth
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // restore saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setDark(true);
  }, []);

  // apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  // close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [path]);

  async function login(e) {
    e.preventDefault();
    setErr('');
    const { error } = await sb.auth.signInWithPassword({ email, password: pw });
    if (error) setErr(error.message);
  }

  if (session === undefined) return (
    <div style={{ minHeight:'100vh', display:'grid', placeItems:'center', background:'var(--bg)' }}>
      <div className="brand"><span className="logo">H</span><span>Loading...</span></div>
    </div>
  );

  if (!session) return (
    <div className="login-page">
      <style>{`
        .login-page{min-height:100vh;display:grid;place-items:center;background:var(--bg);padding:24px}
        .login-card{width:100%;max-width:380px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:32px}
        .login-card h1{font-size:20px;margin:0 0 6px}
        .login-card p{color:var(--muted);font-size:13px;margin:0 0 24px}
        .login-card input{width:100%;height:42px;margin-bottom:12px;padding:0 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg);color:var(--ink);font-size:14px}
        .login-card button{width:100%;height:42px;border:0;border-radius:6px;background:var(--accent);color:#fff;font-weight:600;font-size:14px;cursor:pointer}
      `}</style>
      <form className="login-card" onSubmit={login}>
        <div className="brand" style={{ marginBottom:24 }}>
          <span className="logo">H</span><span>Huvan Management</span>
        </div>
        <h1>Sign in</h1>
        <p>Use your account to continue</p>
        {err && <div style={{ color:'#c0392b',fontSize:13,marginBottom:12 }}>{err}</div>}
        <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
        <input type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} required/>
        <button type="submit">Sign in</button>
      </form>
    </div>
  );

  return (
    <div className="shell">
      {/* ── desktop sidebar ── */}
      <aside className="side">
        <Sidebar path={path} onNav={() => {}} dark={dark} setDark={setDark}/>
      </aside>

      {/* ── mobile drawer overlay ── */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}/>
      )}

      {/* ── mobile drawer ── */}
      <aside className={'drawer' + (drawerOpen ? ' open' : '')}>
        <div className="drawer-head">
          <button className="drawer-close" aria-label="Close menu" onClick={() => setDrawerOpen(false)}>
            <Svg d={CLOSE_IC}/>
          </button>
        </div>
        <Sidebar path={path} onNav={() => setDrawerOpen(false)} dark={dark} setDark={setDark}/>
      </aside>

      {/* ── main content ── */}
      <div className="main-wrap">
        
        {/* mobile top bar */}
        <header className="top">
          <button aria-label="Open menu" onClick={() => setDrawerOpen(true)}
  style={{ margin:0,padding:10,background:'none',border:'none',
              color:'var(--ink)',cursor:'pointer' }}>
  <Svg d={MENU_IC} style={{ width:24,height:24 }}/>
          </button>

          <Brand onClick={() => setDrawerOpen(false)}/>
          <button aria-label="Toggle theme" onClick={() => setDark(d => !d)}
            style={{ margin:0,padding:6,background:'none',border:'none',
              color:'var(--muted)',cursor:'pointer' }}>
            <Svg d={dark ? SUN_IC : MOON_IC}/>
          </button>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}