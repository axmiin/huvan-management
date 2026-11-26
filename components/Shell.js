// Shell

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sb } from '../lib/supabase';

const Svg = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" style={{ width:18,height:18,flex:'none' }}>
    <path d={d}/>
  </svg>
);

const NAV = [
  ['/',          'Dashboard',       'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z'],
  ['/sales/',    'Sales & Revenue', 'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6'],
  ['/expenses/', 'Expenses',        'M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z M9 7h6 M9 11h6'],
  ['/cash/',     'Cash & Accounts', 'M3 7h18v12H3z M3 7l2-3h14l2 3 M16 13h2'],
  ['/payroll/',  'Payroll',         'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8'],
  ['/invoices/', 'Invoices',        'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8'],
  ['/settings/', 'Settings',        'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M12 8v4 M12 16h.01'],
];
const MENU_IC  = 'M3 12h18 M3 6h18 M3 18h18';
const CLOSE_IC = 'M18 6L6 18 M6 6l12 12';
const OUT_IC   = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9';

const Brand = ({ onClick }) => (
  <Link href="/" className="brand" onClick={onClick} style={{ textDecoration:'none',color:'inherit' }}>
    <img src="/Logo.png" alt="Huvan" style={{ height: 32, width: 32, maxWidth: 32, objectFit: 'cover', borderRadius: 8 }} />
    <span>Huvan Pro</span>
  </Link>
);

function Sidebar({ path, onNav }) {
  return (
    <div className="sidebar-inner">
      <Brand/>
      <nav className="sidenav">
        {NAV.map(([h,t,d]) => (
          <Link key={h} href={h}
            className={'nl'+(path===h?' on':'')}
            onClick={onNav}>
            <Svg d={d}/>{t}
          </Link>
        ))}
      </nav>
      <span className="sp"/>
      <button className="nl signout" onClick={() => sb.auth.signOut()}>
        <Svg d={OUT_IC}/>Sign out
      </button>
    </div>
  );
}

export default function Shell({ children }) {
  const [session, setSession]       = useState(undefined);
  const [role, setRole]             = useState(undefined);
  const [isSignUp, setIsSignUp]     = useState(false);
  const [em, setEm]                 = useState('');
  const [pw, setPw]                 = useState('');
  const [err, setErr]               = useState('');
  const [msg, setMsg]               = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const path = usePathname();

  const hydrateUser = async (activeSession) => {
    setSession(activeSession);
    if (!activeSession?.user) {
      setRole(null);
      return;
    }

    const uid = activeSession.user.id;
    const email = activeSession.user.email;

    // Ensure email is synced and read current role
    await sb.from('profiles').update({ email }).eq('id', uid);
    const { data: prof } = await sb.from('profiles').select('role').eq('id', uid).single();
    setRole(prof?.role || 'pending');

    const pref = await sb.from('user_preferences').select('theme,accent').eq('id', uid).single();
    if (pref.data) {
      const t = pref.data.theme || 'light';
      const a = pref.data.accent || '#C19A6B';
      if (t === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', t);
      }
      document.documentElement.style.setProperty('--accent', a);
    }
  };

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => hydrateUser(data.session));
    const { data } = sb.auth.onAuthStateChange((_, s) => hydrateUser(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [path]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  if (session === undefined || (session && role === undefined)) return null;

  if (!session) return (
    <div className="login">
      <form className="card" onSubmit={async (e) => {
        e.preventDefault();
        setErr('');
        setMsg('');
        setSubmitting(true);

        const email = em.trim();
        if (isSignUp) {
          const { data, error } = await sb.auth.signUp({ email, password: pw });
          setSubmitting(false);
          if (error) return setErr(error.message);
          if (data.session) {
            await hydrateUser(data.session);
          } else {
            setMsg('Account created. Ask the owner to approve your role (or confirm your email if required).');
          }
        } else {
          const r = await sb.auth.signInWithPassword({ email, password: pw });
          setSubmitting(false);
          setErr(r.error ? 'Sign-in failed. Check your email and password.' : '');
        }
      }}>
        <Brand/>
        <p style={{ fontSize:12,color:'var(--muted)',marginTop:4,marginBottom:8 }}>
          {isSignUp ? 'Create a staff account to request access.' : 'Sign in to your account.'}
        </p>
        <label>Email</label>
        <input type="email" value={em} onChange={e => setEm(e.target.value)} required/>
        <label>Password</label>
        <input type="password" value={pw} onChange={e => setPw(e.target.value)} required/>
        <button type="submit" disabled={submitting} style={{ width:'100%' }}>
          {submitting ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in')}
        </button>
        {msg && <p style={{ fontSize:12,color:'#27ae60',marginTop:8 }}>{msg}</p>}
        <p className="err">{err}</p>
        <button type="button"
          onClick={() => { setIsSignUp(v => !v); setErr(''); setMsg(''); }}
          style={{ width:'100%',marginTop:6,background:'transparent',color:'var(--muted)',border:'none',fontSize:12,cursor:'pointer' }}>
          {isSignUp ? 'Already have an account? Sign in' : 'New staff? Create an account'}
        </button>
      </form>
    </div>
  );

  if (role === 'pending') return (
    <div className="login">
      <div className="card" style={{ textAlign:'center' }}>
        <Brand/>
        <h2 style={{ fontSize:16,marginTop:12,marginBottom:6 }}>Account pending approval</h2>
        <p style={{ fontSize:13,color:'var(--muted)',marginBottom:16 }}>
          Signed in as <strong>{session.user.email}</strong>. An owner needs to assign your role before you can view records.
        </p>
        <button type="button" onClick={() => sb.auth.signOut()} style={{ width:'100%' }}>
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="shell">
      {/* ── desktop sidebar ── */}
      <aside className="side">
        <Sidebar path={path} onNav={() => {}}/>
      </aside>

      {/* ── mobile drawer overlay ── */}
      {drawerOpen && (
        <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}/>
      )}
      <aside className={'drawer'+(drawerOpen?' drawer-open':'')}>
        <div style={{ display:'flex',justifyContent:'flex-end',padding:'12px 12px 0' }}>
          <button onClick={() => setDrawerOpen(false)}
            style={{ margin:0,padding:6,background:'none',border:'none',
              color:'var(--muted)',cursor:'pointer' }}>
            <Svg d={CLOSE_IC}/>
          </button>
        </div>
        <Sidebar path={path} onNav={() => setDrawerOpen(false)}/>
      </aside>

      {/* ── main content ── */}
      <div className="main-wrap">
        {/* mobile top bar */}
        <header className="top">
          <button aria-label="Open menu" onClick={() => setDrawerOpen(true)}
            style={{ margin:0,padding:6,background:'none',border:'none',
              color:'var(--ink)',cursor:'pointer' }}>
            <Svg d={MENU_IC}/>
          </button>
          <Brand/>
          <button aria-label="Sign out" onClick={() => sb.auth.signOut()}
            style={{ margin:0,padding:6,background:'none',border:'none',
              color:'var(--muted)',cursor:'pointer' }}>
            <Svg d={OUT_IC}/>
          </button>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
