'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { sb } from '../lib/supabase';
const NAV = [['/', 'Dashboard'], ['/sales/', 'Sales & Income'], ['/expenses/', 'Expenses'], ['/cash/', 'Cash & Accounts'], ['/payroll/', 'Payroll'], ['/invoices/', 'Invoices']];
export default function Shell({ children }) {
  const [s, setS] = useState(undefined), [em, setEm] = useState(''), [pw, setPw] = useState(''), [err, setErr] = useState('');
  const path = usePathname();
  useEffect(() => {
    sb.auth.getSession().then(({ data }) => setS(data.session));
    const { data } = sb.auth.onAuthStateChange((_, x) => setS(x));
    return () => data.subscription.unsubscribe();
  }, []);
  if (s === undefined) return null;
  if (!s) return (
    <div className="login"><form className="card" onSubmit={async (e) => {
      e.preventDefault();
      const r = await sb.auth.signInWithPassword({ email: em.trim(), password: pw });
      setErr(r.error ? 'Sign-in failed. Check your email and password.' : '');
    }}>
      <h2>Huvan Management</h2>
      <label>Email</label><input type="email" value={em} onChange={(e) => setEm(e.target.value)} />
      <label>Password</label><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <button type="submit">Sign in</button><p className="err">{err}</p>
    </form></div>
  );
  return (
    <div className="shell">
      <nav><b>Huvan Management</b>
        {NAV.map(([h, t]) => <Link key={h} href={h} className={path === h ? 'on' : ''}>{t}</Link>)}
        <button className="alt" onClick={() => sb.auth.signOut()}>Sign out</button>
      </nav>
      <main>{children}</main>
    </div>
  );
}
