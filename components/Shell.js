'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sb } from '../lib/supabase';

const Svg = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const NAV = [
  ['/', 'Home', 'M3 3h7v7H3z M14 3h7v7h-7z M14 14h7v7h-7z M3 14h7v7H3z'],
  ['/sales/', 'Sales', 'M23 6l-9.5 9.5-5-5L1 18 M17 6h6v6'],
  ['/expenses/', 'Expenses', 'M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2z M9 7h6 M9 11h6'],
  ['/cash/', 'Cash', 'M3 7h18v12H3z M3 7l2-3h14l2 3 M16 13h2'],
  ['/payroll/', 'Payroll', 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M23 21v-2a4 4 0 0 0-3-3.9 M16 3.1a4 4 0 0 1 0 7.8'],
  ['/invoices/', 'Invoices', 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h8'],
];
const OUT = 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9';

const Brand = () => (
  <div className="brand">
    <span className="logo">H</span>
    <span>Huvan Management</span>
  </div>
);

export default function Shell({ children }) {
  const [s, setS] = useState(undefined);
  const [em, setEm] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const path = usePathname();

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setS(data.session));
    const { data } = sb.auth.onAuthStateChange((_, x) => setS(x));
    return () => data.subscription.unsubscribe();
  }, []);

  if (s === undefined) return null;

  if (!s) return (
    <div className="login">
      <form className="card" onSubmit={async (e) => {
        e.preventDefault();
        const r = await sb.auth.signInWithPassword({ email: em.trim(), password: pw });
        setErr(r.error ? 'Sign-in failed. Check your email and password.' : '');
      }}>
        <Brand />
        <label>Email</label>
        <input type="email" value={em} onChange={(e) => setEm(e.target.value)} />
        <label>Password</label>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
        <button type="submit" style={{ width: '100%' }}>Sign in</button>
        <p className="err">{err}</p>
      </form>
    </div>
  );

  return (
    <div className="shell">
      <aside className="side">
        <Brand />
        <nav className="sidenav">
          {NAV.map(([h, t, d]) => (
            <Link key={h} href={h} className={'nl' + (path === h ? ' on' : '')}>
              <Svg d={d} />{t}
            </Link>
          ))}
        </nav>
        <span className="sp" />
        <button className="nl signout" onClick={() => sb.auth.signOut()}>
          <Svg d={OUT} />Sign out
        </button>
      </aside>
      <div className="main-wrap">
        <header className="top">
          <Brand />
          <button aria-label="Sign out" onClick={() => sb.auth.signOut()}>
            <Svg d={OUT} />
          </button>
        </header>
        <main>{children}</main>
        <nav className="bottomnav">
          {NAV.map(([h, t, d]) => (
            <Link key={h} href={h} className={path === h ? 'on' : ''}>
              <Svg d={d} />{t}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
