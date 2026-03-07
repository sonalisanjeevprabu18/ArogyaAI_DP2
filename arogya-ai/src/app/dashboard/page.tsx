'use client';
import { getCurrentUser, logoutUser, getProfiles, addProfile, deleteProfile, getRecords, Profile } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const QUOTES = [
  "Your body is doing extraordinary things for you — right now. 🌿",
  "Every breath is a small miracle. You are stronger than you know. ☀️",
  "Health is a journey of self-love, not a destination to reach. 🌸",
  "Be gentle with yourself. Healing takes time and that is beautiful. 🍃",
  "You are worthy of care, rest, and nourishment. Always. 💚",
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [newProfile, setNewProfile] = useState({ name: '', relation: '', dob: '' });
  const [quote] = useState(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  const [records, setRecords] = useState<ReturnType<typeof getRecords>>([]);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace('/auth'); return; }
    setUser(u);
    const ps = getProfiles(u.id);
    // Auto-create self profile if none
    if (ps.length === 0) {
      const self = addProfile(u.id, u.username, 'Self', u.dob);
      setProfiles([self]);
      setActiveProfile(self);
      setRecords(getRecords(self.id));
    } else {
      setProfiles(ps);
      setActiveProfile(ps[0]);
      setRecords(getRecords(ps[0].id));
    }
  }, [router]);

  const switchProfile = (p: Profile) => {
    setActiveProfile(p);
    setRecords(getRecords(p.id));
  };

  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const p = addProfile(user.id, newProfile.name, newProfile.relation, newProfile.dob);
    const updated = [...profiles, p];
    setProfiles(updated);
    setActiveProfile(p);
    setRecords([]);
    setShowAddProfile(false);
    setNewProfile({ name: '', relation: '', dob: '' });
  };

  const handleDeleteProfile = (id: string) => {
    if (!user || profiles.length === 1) return;
    deleteProfile(user.id, id);
    const updated = profiles.filter(p => p.id !== id);
    setProfiles(updated);
    setActiveProfile(updated[0]);
    setRecords(getRecords(updated[0].id));
  };

  const handleSignOut = () => { logoutUser(); router.replace('/auth'); };

  if (!user) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Zen bg */}
      <div className="zen-bg">
        <div className="zen-orb" style={{ width: 500, height: 500, background: 'var(--zen-sage-light)', top: '-15%', right: '-10%', opacity: 0.2, animationDuration: '18s' }} />
        <div className="zen-orb" style={{ width: 350, height: 350, background: 'var(--zen-sand)', bottom: '-5%', left: '-8%', opacity: 0.25, animationDuration: '14s', animationDelay: '4s' }} />
      </div>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,240,232,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(212,201,176,0.4)', padding: '0 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, var(--zen-sage), #5a8060)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18 }}>🌿</span>
            </div>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, color: 'var(--zen-dark)' }}>ArogyaAI</span>
          </div>
          <nav style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/sanctuary" style={{ padding: '7px 16px', borderRadius: 10, background: 'transparent', color: 'var(--zen-brown)', fontSize: 14, fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s', border: '1.5px solid transparent' }}
              onMouseOver={e => (e.currentTarget.style.background = 'var(--zen-warm)')}
              onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>🧘 Sanctuary</Link>
            <button onClick={handleSignOut} className="btn-ghost" style={{ padding: '7px 16px', fontSize: 14 }}>Sign Out</button>
          </nav>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 1100, margin: '0 auto', width: '100%', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        {/* Greeting */}
        <div className="fade-in" style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--zen-dark)', marginBottom: 4 }}>
            Namaste, {user.username} 🙏
          </h1>
          <p style={{ color: 'var(--zen-muted)', fontSize: 15 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Quote card */}
        <div className="glass-card fade-in-delay" style={{ padding: '20px 24px', marginBottom: 28, borderLeft: '4px solid var(--zen-sage)' }}>
          <p style={{ fontSize: 15, color: 'var(--zen-dark)', fontStyle: 'italic', fontFamily: 'Playfair Display, serif' }}>{quote}</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24 }}>
          {/* Profiles sidebar */}
          <div className="fade-in">
            <div className="glass-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--zen-dark)' }}>Family Profiles</h3>
                <button onClick={() => setShowAddProfile(true)} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--zen-sage)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
              {profiles.map(p => (
                <div key={p.id} onClick={() => switchProfile(p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', marginBottom: 6, background: activeProfile?.id === p.id ? 'var(--zen-sage-light)' : 'transparent', transition: 'all 0.2s', border: activeProfile?.id === p.id ? '1.5px solid var(--zen-sage)' : '1.5px solid transparent' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: `hsl(${p.name.charCodeAt(0) * 5 % 360}, 40%, 70%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--zen-dark)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--zen-muted)' }}>{p.relation}</div>
                  </div>
                  {profiles.length > 1 && (
                    <button onClick={ev => { ev.stopPropagation(); handleDeleteProfile(p.id); }}
                      style={{ background: 'none', border: 'none', color: 'var(--zen-muted)', cursor: 'pointer', fontSize: 16, padding: 2 }}>×</button>
                  )}
                </div>
              ))}
              {showAddProfile && (
                <form onSubmit={handleAddProfile} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input className="zen-input" placeholder="Name" required value={newProfile.name} onChange={e => setNewProfile(p => ({ ...p, name: e.target.value }))} style={{ fontSize: 13, padding: '9px 12px' }} />
                  <input className="zen-input" placeholder="Relation (e.g. Mother)" value={newProfile.relation} onChange={e => setNewProfile(p => ({ ...p, relation: e.target.value }))} style={{ fontSize: 13, padding: '9px 12px' }} />
                  <input className="zen-input" type="date" required value={newProfile.dob} onChange={e => setNewProfile(p => ({ ...p, dob: e.target.value }))} style={{ fontSize: 13, padding: '9px 12px' }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button type="submit" className="btn-primary" style={{ flex: 1, padding: '9px 0', fontSize: 13 }}>Add</button>
                    <button type="button" className="btn-ghost" onClick={() => setShowAddProfile(false)} style={{ flex: 1, padding: '9px 0', fontSize: 13 }}>Cancel</button>
                  </div>
                </form>
              )}
            </div>

            {/* Account */}
            <div className="glass-card" style={{ padding: 16, marginTop: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--zen-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Account</h4>
              <div style={{ fontSize: 13, color: 'var(--zen-dark)', marginBottom: 8 }}>
                <span style={{ color: 'var(--zen-muted)' }}>Email: </span>{user.email}
              </div>
              <button onClick={() => setShowDeleteAccount(true)} style={{ background: 'none', border: 'none', color: 'var(--zen-rose)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>
                Delete Account
              </button>
            </div>
          </div>

          {/* Main content */}
          <div className="fade-in-delay">
            {/* Upload button */}
            <Link href={activeProfile ? `/upload?profileId=${activeProfile.id}` : '#'}
              style={{ display: 'block', marginBottom: 24, textDecoration: 'none' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--zen-sage) 0%, #4a7050 100%)', borderRadius: 20, padding: '28px 32px', cursor: 'pointer', transition: 'all 0.3s', boxShadow: '0 8px 32px rgba(124,154,126,0.3)', display: 'flex', alignItems: 'center', gap: 20 }}
                onMouseOver={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(124,154,126,0.4)'; }}
                onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(124,154,126,0.3)'; }}>
                <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.25)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0 }}>📄</div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700, color: 'white', marginBottom: 4 }}>Upload Health Record</h2>
                  <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Upload a document — we'll extract & simplify it for {activeProfile?.name || 'you'}</p>
                </div>
                <div style={{ marginLeft: 'auto', fontSize: 28, color: 'rgba(255,255,255,0.7)' }}>→</div>
              </div>
            </Link>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
              {[{ icon: '📋', label: 'Records', value: records.length },
                { icon: '🧘', label: 'Sanctuary', value: 'Open', link: '/sanctuary' },
                { icon: '📔', label: 'Journal', value: 'Vault', link: '/sanctuary#journal' }].map(s => (
                <Link key={s.label} href={s.link || '#'} style={{ textDecoration: 'none' }}>
                  <div className="glass-card" style={{ padding: '20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
                    onMouseOver={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                    onMouseOut={e => (e.currentTarget.style.transform = 'none')}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--zen-dark)', marginBottom: 2 }}>{s.value}</div>
                    <div style={{ fontSize: 12, color: 'var(--zen-muted)', fontWeight: 500 }}>{s.label}</div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Records list */}
            <div className="glass-card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--zen-dark)', marginBottom: 16 }}>
                Recent Records — {activeProfile?.name}
              </h3>
              {records.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--zen-muted)' }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
                  <p style={{ fontSize: 15 }}>No records yet. Upload your first document!</p>
                </div>
              ) : [...records].reverse().map(r => (
                <div key={r.id} style={{ padding: '16px', borderRadius: 14, background: 'var(--zen-warm)', marginBottom: 12, border: '1px solid var(--zen-sand)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 600, color: 'var(--zen-dark)', fontSize: 14 }}>{r.hospitalName || 'Health Visit'}</span>
                      {r.doctorName && <span style={{ fontSize: 12, color: 'var(--zen-muted)', marginLeft: 8 }}>Dr. {r.doctorName}</span>}
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--zen-muted)' }}>{new Date(r.dateOfVisit).toLocaleDateString('en-IN')}</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--zen-dark)', lineHeight: 1.6 }}>{r.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Delete Account Modal */}
        {showDeleteAccount && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(61,51,40,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
            <div className="glass-card" style={{ padding: 32, maxWidth: 380, width: '100%', margin: 16 }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: 'var(--zen-dark)' }}>Delete Account?</h3>
              <p style={{ color: 'var(--zen-muted)', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>This will permanently erase all your health records, journals, and profiles. This cannot be undone.</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowDeleteAccount(false)}>Cancel</button>
                <button style={{ flex: 1, background: 'var(--zen-rose)', color: 'white', border: 'none', borderRadius: 14, padding: '12px 0', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500 }}
                  onClick={() => { const { deleteAccount } = require('@/lib/store'); deleteAccount(user.id, user.email); router.replace('/auth'); }}>
                  Delete Forever
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
