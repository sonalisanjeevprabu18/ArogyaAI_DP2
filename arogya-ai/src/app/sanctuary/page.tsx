'use client';
import { useState, useEffect } from 'react';
import { getCurrentUser, getJournalEntries, addJournalEntry, deleteJournalEntry, setJournalPin, checkJournalPin, hasJournalPin, JournalEntry } from '@/lib/store';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const REMINDERS = [
  { icon: '🌳', text: "You don't have to be perfect to be worthy of love and health." },
  { icon: '🌊', text: "Like waves, emotions rise and fall. Let them move through you." },
  { icon: '☀️', text: "Each morning is a fresh canvas. Paint it gently." },
  { icon: '🌸', text: "Rest is not laziness. It is the soil from which strength grows." },
  { icon: '🍃', text: "Your feelings are valid. All of them. Always." },
  { icon: '💙', text: "You are not alone in this. Many feel what you feel." },
];

const QUIZ_QUESTIONS = [
  { q: 'When you face a challenge, you usually...', o: ['Face it head-on', 'Seek support from others', 'Take time to reflect', 'Look for creative solutions'] },
  { q: 'What energizes you most?', o: ['Being around people', 'Quiet time alone', 'Learning something new', 'Creating or building things'] },
  { q: 'You handle stress best by...', o: ['Exercise or movement', 'Talking it out', 'Journaling or writing', 'Creative expression'] },
  { q: 'Your inner self is most like...', o: ['A roaring fire 🔥', 'A flowing river 🌊', 'A tall mountain ⛰️', 'A clear sky ☁️'] },
  { q: 'What matters most to you?', o: ['Harmony in relationships', 'Growth and learning', 'Health and stability', 'Purpose and meaning'] },
];

const RESULTS = [
  { type: 'The Grounded Guardian', desc: 'You have deep roots and a steady heart. You are the person others turn to for strength, and that strength begins with how you care for yourself.', icon: '🌳' },
  { type: 'The Flowing Spirit', desc: 'You move through life with beautiful adaptability. Your emotions are your superpower — feel them fully, then let them flow.', icon: '🌊' },
  { type: 'The Radiant Creator', desc: 'Your inner world is rich and vibrant. Channel that creative energy into healing, and watch yourself bloom.', icon: '🌸' },
  { type: 'The Clear Mind', desc: 'You carry wisdom and clarity with you. Trust your inner knowing — it will always guide you home.', icon: '✨' },
];

export default function SanctuaryPage() {
  const router = useRouter();
  const [user, setUser] = useState<ReturnType<typeof getCurrentUser>>(null);
  const [tab, setTab] = useState<'reminders' | 'quiz' | 'journal'>('reminders');
  
  // Quiz state
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizResult, setQuizResult] = useState<null | typeof RESULTS[0]>(null);
  
  // Journal state
  const [journalUnlocked, setJournalUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ title: '', content: '', mood: '😊' });
  const [showNewEntry, setShowNewEntry] = useState(false);

  useEffect(() => {
    const u = getCurrentUser();
    if (!u) { router.replace('/auth'); return; }
    setUser(u);
  }, [router]);

  const handleQuizAnswer = (idx: number) => {
    const newAnswers = [...quizAnswers, idx];
    setQuizAnswers(newAnswers);
    if (quizStep + 1 >= QUIZ_QUESTIONS.length) {
      const sum = newAnswers.reduce((a, b) => a + b, 0);
      const resultIdx = sum % RESULTS.length;
      setQuizResult(RESULTS[resultIdx]);
    } else {
      setQuizStep(s => s + 1);
    }
  };

  const handleJournalUnlock = () => {
    if (!user) return;
    if (!hasJournalPin(user.id)) {
      if (newPin.length < 4) { setPinError('PIN must be at least 4 characters'); return; }
      if (newPin !== confirmPin) { setPinError('PINs do not match'); return; }
      setJournalPin(user.id, newPin);
      setEntries(getJournalEntries(user.id));
      setJournalUnlocked(true);
    } else {
      if (!checkJournalPin(user.id, pinInput)) { setPinError('Incorrect PIN'); return; }
      setEntries(getJournalEntries(user.id));
      setJournalUnlocked(true);
    }
    setPinError('');
  };

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newEntry.title || !newEntry.content) return;
    addJournalEntry(user.id, newEntry.title, newEntry.content, newEntry.mood);
    setEntries(getJournalEntries(user.id));
    setNewEntry({ title: '', content: '', mood: '😊' });
    setShowNewEntry(false);
  };

  const handleDeleteEntry = (id: string) => {
    if (!user) return;
    deleteJournalEntry(user.id, id);
    setEntries(getJournalEntries(user.id));
  };

  if (!user) return null;

  const MOODS = ['😊', '😌', '😔', '😤', '🥺', '😴', '💪', '🌈'];

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      <div className="zen-bg">
        <div className="zen-orb" style={{ width: 450, height: 450, background: 'var(--zen-sage-light)', top: '-10%', right: '-8%', opacity: 0.2, animationDuration: '16s' }} />
        <div className="zen-orb" style={{ width: 350, height: 350, background: 'var(--zen-rose)', bottom: '-5%', left: '-5%', opacity: 0.18, animationDuration: '12s', animationDelay: '3s' }} />
      </div>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(245,240,232,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(212,201,176,0.4)', padding: '0 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/dashboard" style={{ color: 'var(--zen-muted)', fontSize: 14, textDecoration: 'none' }}>← Dashboard</Link>
            <span style={{ color: 'var(--zen-sand)' }}>|</span>
            <span style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, color: 'var(--zen-dark)' }}>🧘 Sanctuary</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px', position: 'relative', zIndex: 1 }}>
        <div className="fade-in" style={{ marginBottom: 28, textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: 'var(--zen-dark)', marginBottom: 8 }}>Your Mental Sanctuary</h1>
          <p style={{ color: 'var(--zen-muted)', fontSize: 16 }}>A private space for reflection, growth, and radical self-acceptance.</p>
        </div>

        {/* Tabs */}
        <div className="glass-card fade-in-delay" style={{ display: 'flex', padding: 6, marginBottom: 28, gap: 4 }}>
          {([['reminders', '🌿 Reminders'], ['quiz', '✨ Self-Discovery'], ['journal', '📔 Vault Journal']] as const).map(([t, label]) => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '11px 0', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, transition: 'all 0.25s', background: tab === t ? 'linear-gradient(135deg, var(--zen-sage), #5a8060)' : 'transparent', color: tab === t ? 'white' : 'var(--zen-muted)', boxShadow: tab === t ? '0 4px 16px rgba(124,154,126,0.3)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Reminders */}
        {tab === 'reminders' && (
          <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {REMINDERS.map((r, i) => (
              <div key={i} className="glass-card" style={{ padding: '24px 22px', borderLeft: '4px solid var(--zen-sage)' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{r.icon}</div>
                <p style={{ fontSize: 15, color: 'var(--zen-dark)', lineHeight: 1.7, fontFamily: 'Playfair Display, serif', fontStyle: 'italic' }}>{r.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quiz */}
        {tab === 'quiz' && (
          <div className="fade-in glass-card" style={{ padding: '36px 32px', maxWidth: 580, margin: '0 auto' }}>
            {quizResult ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 64, marginBottom: 16 }}>{quizResult.icon}</div>
                <h2 style={{ fontSize: 26, fontWeight: 700, color: 'var(--zen-dark)', marginBottom: 12 }}>You are: {quizResult.type}</h2>
                <p style={{ fontSize: 16, color: 'var(--zen-muted)', lineHeight: 1.8, fontStyle: 'italic', marginBottom: 28 }}>{quizResult.desc}</p>
                <button className="btn-primary" onClick={() => { setQuizStep(0); setQuizAnswers([]); setQuizResult(null); }}>
                  Explore Again 🔄
                </button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                  <span style={{ fontSize: 13, color: 'var(--zen-muted)' }}>Question {quizStep + 1} of {QUIZ_QUESTIONS.length}</span>
                  <div style={{ height: 6, flex: 1, margin: '0 16px', background: 'var(--zen-warm)', borderRadius: 3, alignSelf: 'center' }}>
                    <div style={{ height: '100%', background: 'var(--zen-sage)', borderRadius: 3, width: `${((quizStep + 1) / QUIZ_QUESTIONS.length) * 100}%`, transition: 'width 0.4s' }} />
                  </div>
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 600, color: 'var(--zen-dark)', marginBottom: 24, lineHeight: 1.5 }}>
                  {QUIZ_QUESTIONS[quizStep].q}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {QUIZ_QUESTIONS[quizStep].o.map((opt, i) => (
                    <button key={i} onClick={() => handleQuizAnswer(i)}
                      style={{ padding: '14px 20px', borderRadius: 14, border: '1.5px solid var(--zen-sand)', background: 'var(--zen-warm)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--zen-dark)', textAlign: 'left', transition: 'all 0.2s' }}
                      onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--zen-sage)'; (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124,154,126,0.1)'; }}
                      onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--zen-sand)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--zen-warm)'; }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Journal */}
        {tab === 'journal' && (
          <div className="fade-in" id="journal">
            {!journalUnlocked ? (
              <div className="glass-card" style={{ maxWidth: 440, margin: '0 auto', padding: '40px 36px', textAlign: 'center' }}>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🔒</div>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--zen-dark)', marginBottom: 8 }}>
                  {hasJournalPin(user.id) ? 'Enter your journal PIN' : 'Create your vault PIN'}
                </h3>
                <p style={{ color: 'var(--zen-muted)', fontSize: 14, marginBottom: 24 }}>
                  {hasJournalPin(user.id) ? 'Your journal is protected and private.' : 'Set a PIN to secure your personal journal.'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {!hasJournalPin(user.id) ? (
                    <>
                      <input className="zen-input" type="password" placeholder="Create PIN (min 4 chars)" value={newPin}
                        onChange={e => { setNewPin(e.target.value); setPinError(''); }} style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18 }} />
                      <input className="zen-input" type="password" placeholder="Confirm PIN" value={confirmPin}
                        onChange={e => { setConfirmPin(e.target.value); setPinError(''); }} style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18 }} />
                    </>
                  ) : (
                    <input className="zen-input" type="password" placeholder="Enter PIN" value={pinInput}
                      onChange={e => { setPinInput(e.target.value); setPinError(''); }} style={{ textAlign: 'center', letterSpacing: 6, fontSize: 18 }} />
                  )}
                  {pinError && <p style={{ color: 'var(--zen-rose)', fontSize: 13 }}>{pinError}</p>}
                  <button className="btn-primary" onClick={handleJournalUnlock}>
                    {hasJournalPin(user.id) ? 'Open Vault 🔓' : 'Create Vault 🔐'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <h3 style={{ fontSize: 22, fontWeight: 600, color: 'var(--zen-dark)' }}>My Private Journal 📔</h3>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn-ghost" onClick={() => setJournalUnlocked(false)} style={{ fontSize: 13, padding: '8px 16px' }}>🔒 Lock</button>
                    <button className="btn-primary" onClick={() => setShowNewEntry(true)} style={{ fontSize: 13, padding: '8px 18px' }}>+ New Entry</button>
                  </div>
                </div>

                {showNewEntry && (
                  <form onSubmit={handleAddEntry} className="glass-card" style={{ padding: '24px', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <input className="zen-input" placeholder="Entry title..." required value={newEntry.title}
                      onChange={e => setNewEntry(p => ({ ...p, title: e.target.value }))} />
                    <div>
                      <label style={{ display: 'block', fontSize: 13, color: 'var(--zen-muted)', marginBottom: 8 }}>How are you feeling?</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {MOODS.map(m => (
                          <button type="button" key={m} onClick={() => setNewEntry(p => ({ ...p, mood: m }))}
                            style={{ fontSize: 24, padding: 6, borderRadius: 10, border: newEntry.mood === m ? '2px solid var(--zen-sage)' : '2px solid transparent', background: newEntry.mood === m ? 'rgba(124,154,126,0.15)' : 'transparent', cursor: 'pointer' }}>
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    <textarea className="zen-input" placeholder="Write freely, without judgment. This is your safe space..." required value={newEntry.content}
                      onChange={e => setNewEntry(p => ({ ...p, content: e.target.value }))}
                      style={{ minHeight: 140, resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }} />
                    <div style={{ display: 'flex', gap: 10 }}>
                      <button type="submit" className="btn-primary" style={{ flex: 1 }}>Save Entry 💚</button>
                      <button type="button" className="btn-ghost" onClick={() => setShowNewEntry(false)} style={{ flex: 1 }}>Cancel</button>
                    </div>
                  </form>
                )}

                {entries.length === 0 ? (
                  <div className="glass-card" style={{ padding: '48px', textAlign: 'center', color: 'var(--zen-muted)' }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🌱</div>
                    <p>Your journal is empty. Start writing your first entry!</p>
                  </div>
                ) : entries.map(e => (
                  <div key={e.id} className="glass-card" style={{ padding: '20px 24px', marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div>
                        <span style={{ fontSize: 24, marginRight: 8 }}>{e.mood}</span>
                        <span style={{ fontWeight: 600, fontSize: 16, color: 'var(--zen-dark)' }}>{e.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--zen-muted)' }}>
                          {new Date(e.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <button onClick={() => handleDeleteEntry(e.id)} style={{ background: 'none', border: 'none', color: 'var(--zen-muted)', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--zen-dark)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{e.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
