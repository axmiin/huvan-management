// Shell

'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sb } from '../lib/supabase';

const Svg = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width:18,height:18,flex:'none' }}>
    <path d={d}/>
  </svg>
);

const NAV = [
  ['/', 'Dashboard', 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z'],
  ['/sales/', 'Sales & Revenue', 'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6'],
  ['/expenses/', 'Expenses', 'M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z M9 7h6 M9 11h6'],
  ['/cash/', 'Cash & Accounts', 'M3 7h18v12H3z M3 7l2-3h14l2 3 M16 13h2'],
  ['/payroll/', 'Payroll', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8'],
  ['/invoices/', 'Invoices', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8'],
  ['/settings/', 'Settings', 'M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z M12 8v4 M12 16h.01'],
];
const MENU_IC = 'M3 12h18 M3 6h18 M3 18h18';
const CLOSE_IC = 'M18 6L6 18 M6 6l12 12';
const OUT_IC = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9';
const SUN_IC = 'M12 1v2 M12 21v2 M4.22 4.22l1.42 1.42 M18.36 18.36l1.42 1.42 M1 12h2 M21 12h2 M4.22 19.78l1.42-1.42 M18.36 5.64l1.42-1.42 M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z';
const MOON_IC = 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z';

const Brand = ({ onClick }) => (
  <Link href="/" className="brand" onClick={onClick} style={{ textDecoration:'none',color:'inherit' }}>
    <img src="/Logo.png" alt="Huvan" style={{ height:32,width:32,maxWidth:32,objectFit:'cover',borderRadius:8 }} />
    <span>Huvan Pro</span>
  </Link>
);

function Sidebar({ path, onNav, onSignOut, email }) {
  return (
    <div className="sidebar-inner">
      <Brand/>
      <nav className="sidenav">
        {NAV.map(([h,t,d]) => (
          <Link key={h} href={h} className={'nl'+(path===h?' on':'')} onClick={onNav}>
            <Svg d={d}/>{t}
          </Link>
        ))}
      </nav>
      <span className="sp"/>
      {email && (
        <div style={{ marginBottom:8 }}>
          <div style={{ fontSize:11,color:'var(--muted)',marginBottom:4,paddingLeft:2 }}>Signed in as</div>
          <div style={{ padding:'9px 12px',borderRadius:10,border:'1px solid var(--line)',background:'var(--bg)',fontSize:12,fontWeight:600,color:'var(--ink)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }} title={email}>
            {email}
          </div>
        </div>
      )}
      <button type="button" className="nl signout" onClick={onSignOut}>
        <Svg d={OUT_IC}/>Sign out
      </button>
    </div>
  );
}

export default function Shell({ children }) {
  const [session, setSession] = useState(undefined);
  const [role, setRole] = useState(undefined);
  const [theme, setTheme] = useState('light');
  const [isSignUp, setIsSignUp] = useState(false);
  const [em, setEm] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const path = usePathname();

  const applyTheme = (t) => {
    if (t === 'system') {
      document.documentElement.removeAttribute('data-theme');
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(prefersDark ? 'dark' : 'light');
    } else {
      document.documentElement.setAttribute('data-theme', t);
      setTheme(t);
    }
  };

  const toggleTheme = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    if (session?.user?.id) {
      await sb.from('user_preferences').upsert({ id:session.user.id, theme:next, updated_at:new Date().toISOString() });
    }
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setErr('');
    setMsg('');
    try { await sb.auth.signOut({ scope:'local' }); } catch {}
    applyTheme('light');
    setSession(null);
    setRole(null);
    setEm('');
    setPw('');
    setIsSignUp(false);
    setSigningOut(false);
  };

  const hydrateUser = async (activeSession) => {
    setSession(activeSession);
    if (!activeSession?.user) {
      applyTheme('light');
      setRole(null);
      return;
    }
    setRole(undefined);
    const uid = activeSession.user.id;
    const email = activeSession.user.email;
    try {
      if (email) await sb.from('profiles').update({ email }).eq('id', uid);
      const { data: prof } = await sb.from('profiles').select('role').eq('id', uid).maybeSingle();
      setRole(prof?.role || 'pending');
      const { data: pref } = await sb.from('user_preferences').select('theme,accent').eq('id', uid).maybeSingle();
      if (pref) {
        applyTheme(pref.theme || 'light');
        document.documentElement.style.setProperty('--accent', pref.accent || '#C19A6B');
      } else {
        applyTheme('light');
      }
    } catch {
      setRole('pending');
    }
  };

  useEffect(() => {
    let active = true;
    applyTheme('light');
    sb.auth.getSession().then(({ data }) => { if (active) hydrateUser(data.session); });
    const { data } = sb.auth.onAuthStateChange((_e, s) => { if (active) hydrateUser(s); });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [path]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  if (session === undefined || (session && role === undefined)) return null;

  if (!session) {
    return (
      <div className="login">
        <div className="card">
          <form method="post" autoComplete="on" onSubmit={async (e) => {
            e.preventDefault();
            setErr('');
            setMsg('');
            setSubmitting(true);
            const email = em.trim();
            if (isSignUp) {
              const { data, error } = await sb.auth.signUp({ email, password:pw });
              setSubmitting(false);
              if (error) return setErr(error.message);
              if (data.session) await hydrateUser(data.session);
              else setMsg('Account created. Ask the owner to approve your role (or confirm your email if required).');
            } else {
              const r = await sb.auth.signInWithPassword({ email, password:pw });
              setSubmitting(false);
              if (r.error) setErr('Sign-in failed. Check your email and password.');
              else if (r.data?.session) await hydrateUser(r.data.session);
            }
          }}>
            <Brand/>
            <p style={{ fontSize:12,color:'var(--muted)',marginTop:4,marginBottom:8 }}>
              {isSignUp ? 'Create a staff account to request access.' : 'Sign in to your account.'}
            </p>
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" autoComplete="username" value={em} onChange={e => setEm(e.target.value)} required/>
            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={pw} onChange={e => setPw(e.target.value)} required/>
            <button type="submit" disabled={submitting} style={{ width:'100%' }}>
              {submitting ? (isSignUp ? 'Creating account…' : 'Signing in…') : (isSignUp ? 'Create account' : 'Sign in')}
            </button>
            {msg && <p style={{ fontSize:12,color:'#27ae60',marginTop:8 }}>{msg}</p>}
            <p className="err">{err}</p>
          </form>
          <button type="button" onClick={() => { setIsSignUp(v => !v); setErr(''); setMsg(''); }} style={{ width:'100%',marginTop:6,background:'transparent',color:'var(--muted)',border:'none',fontSize:12,cursor:'pointer' }}>
            {isSignUp ? 'Already have an account? Sign in' : 'New staff? Create an account'}
          </button>
        </div>
      </div>
    );
  }

  if (role === 'pending') {
    return (
      <div className="login">
        <div className="card" style={{ textAlign:'center' }}>
          <Brand/>
          <h2 style={{ fontSize:16,marginTop:12,marginBottom:6 }}>Account pending approval</h2>
          <p style={{ fontSize:13,color:'var(--muted)',marginBottom:16 }}>
            Signed in as <strong>{session.user.email}</strong>. An owner needs to assign your role before you can view records.
          </p>
          <button type="button" disabled={signingOut} onClick={handleSignOut} style={{ width:'100%' }}>
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </div>
    );
  }

  const userEmail = session.user.email || '';

  return (
    <div className="shell">
      <aside className="side">
        <Sidebar path={path} onNav={() => {}} onSignOut={handleSignOut} email={userEmail}/>
      </aside>
      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}/>}
      <aside className={'drawer'+(drawerOpen?' drawer-open':'')}>
        <div style={{ display:'flex',justifyContent:'flex-end',padding:'12px 12px 0' }}>
          <button onClick={() => setDrawerOpen(false)} style={{ margin:0,padding:6,background:'none',border:'none',color:'var(--muted)',cursor:'pointer' }}>
            <Svg d={CLOSE_IC}/>
          </button>
        </div>
        <Sidebar path={path} onNav={() => setDrawerOpen(false)} onSignOut={handleSignOut} email={userEmail}/>
      </aside>
      <div className="main-wrap">
        <header className="top">
          <button aria-label="Open menu" onClick={() => setDrawerOpen(true)} style={{ margin:0,padding:6,background:'none',border:'none',color:'var(--ink)',cursor:'pointer' }}>
            <Svg d={MENU_IC}/>
          </button>
          <Brand/>
          <button
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
            style={{ margin:0,padding:6,background:'none',border:'none',color:'var(--ink)',cursor:'pointer' }}>
            <Svg d={theme === 'dark' ? SUN_IC : MOON_IC}/>
          </button>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}
