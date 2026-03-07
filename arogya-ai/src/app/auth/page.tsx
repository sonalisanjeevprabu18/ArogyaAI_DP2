'use client';
import { useState } from 'react';
import { registerUser, loginUser, setCurrentUser } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [form, setForm] = useState({ email: '', password: '', username: '', dob: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        const user = registerUser(form.email, form.password, form.username, form.dob);
        setCurrentUser(user);
      } else {
        const user = loginUser(form.email, form.password);
        setCurrentUser(user);
      }
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', position: 'relative', overflow: 'hidden' }}>
      {/* Zen bg orbs */}
      <div className="zen-bg">
        <div className="zen-orb" style={{ width: 400, height: 400, background: 'var(--zen-sage-light)', top: '-10%', left: '-5%', animationDuration: '14s' }} />
        <div className="zen-orb" style={{ width: 300, height: 300, background: 'var(--zen-rose)', bottom: '-5%', right: '5%', animationDuration: '10s', animationDelay: '3s' }} />
        <div className="zen-orb" style={{ width: 200, height: 200, background: 'var(--zen-sand)', top: '40%', right: '20%', animationDuration: '16s', animationDelay: '6s' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 440 }}>
        {/* Logo */}
        <div className="fade-in" style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: 'linear-gradient(135deg, var(--zen-sage), #5a8060)', borderRadius: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: '0 8px 24px rgba(124,154,126,0.35)' }}>
            <span style={{ fontSize: 28 }}>🌿</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--zen-dark)' }}>ArogyaAI</h1>
          <p style={{ color: 'var(--zen-muted)', fontSize: 15, marginTop: 6 }}>Your digital health sanctuary</p>
        </div>

        {/* Card */}
        <div className="glass-card fade-in-delay" style={{ padding: '36px 32px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--zen-warm)', borderRadius: 12, padding: 4, marginBottom: 28 }}>
            {(['login', 'signup'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{ flex: 1, padding: '9px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, transition: 'all 0.25s', background: mode === m ? 'var(--zen-white)' : 'transparent', color: mode === m ? 'var(--zen-dark)' : 'var(--zen-muted)', boxShadow: mode === m ? '0 2px 8px rgba(61,51,40,0.1)' : 'none' }}>
                {m === 'login' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          <form onSubmit={handle} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--zen-brown)', marginBottom: 6 }}>Username</label>
                <input className="zen-input" type="text" placeholder="your_name" required value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--zen-brown)', marginBottom: 6 }}>Email</label>
              <input className="zen-input" type="email" placeholder="hello@example.com" required value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--zen-brown)', marginBottom: 6 }}>Password</label>
              <input className="zen-input" type="password" placeholder="••••••••" required value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
            </div>
            {mode === 'signup' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--zen-brown)', marginBottom: 6 }}>Date of Birth <span style={{ color: 'var(--zen-rose)' }}>*</span></label>
                <input className="zen-input" type="date" required value={form.dob}
                  onChange={e => setForm(p => ({ ...p, dob: e.target.value }))} />
              </div>
            )}
            {error && (
              <div style={{ background: 'rgba(196,145,122,0.15)', border: '1px solid var(--zen-rose)', borderRadius: 10, padding: '10px 14px', color: 'var(--zen-rose)', fontSize: 13 }}>
                {error}
              </div>
            )}
            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 4, width: '100%' }}>
              {loading ? 'Please wait...' : mode === 'login' ? 'Enter your sanctuary →' : 'Begin your journey →'}
            </button>
          </form>
        </div>

        <p className="fade-in-delay-2" style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--zen-muted)' }}>
          Your health data stays private. Always. 🌸
        </p>
      </div>
    </div>
  );
}
