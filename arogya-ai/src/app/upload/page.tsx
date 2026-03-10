'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useRef, Suspense } from 'react';
import { addRecord } from '@/lib/store';
import Link from 'next/link';

/* ══════════════════════════════════════════════════════
   IMAGE PRE-PROCESSING  (Canvas-based, no API needed)
   Applies Otsu binarization + 2× upscale for max OCR accuracy
   ══════════════════════════════════════════════════════ */

/** Compute Otsu threshold on a greyscale histogram */
function otsuThreshold(hist: number[], total: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * hist[i];
  let sumB = 0, wB = 0, max = 0, thresh = 0;
  for (let i = 0; i < 256; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > max) { max = between; thresh = i; }
  }
  return thresh;
}

function preprocessImageForOCR(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        // Step 1: Upscale to 2× (minimum 2400px on longest side for 300dpi equivalent)
        const SCALE = Math.max(2, 2400 / Math.max(img.width, img.height));
        const w = Math.round(img.width * SCALE);
        const h = Math.round(img.height * SCALE);

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d')!;

        // Smooth upscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(objectUrl);

        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;
        const n = w * h;

        // Step 2: Convert to greyscale
        const grey = new Uint8Array(n);
        const hist = new Array(256).fill(0);
        for (let i = 0; i < n; i++) {
          const g = Math.round(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]);
          grey[i] = g;
          hist[g]++;
        }

        // Step 3: Otsu's global threshold
        const thresh = otsuThreshold(hist, n);

        // Step 4: Apply binarization (white bg, black text)
        for (let i = 0; i < n; i++) {
          const v = grey[i] < thresh ? 0 : 255;
          d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = v;
          d[i * 4 + 3] = 255;
        }

        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not load image')); };
    img.src = objectUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/* ══════════════════════════════════════════════════════
   LOCAL SUMMARIZER  (No API — keyword-based extraction)
   ══════════════════════════════════════════════════════ */
interface SummaryData {
  patientInfo: string;
  doctor: string;
  chiefComplaint: string;
  diagnosis: string;
  investigations: string;
  advice: string;
  rawText: string;
}

function buildSummary(text: string): SummaryData {
  const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 3);
  const findAll = (keywords: string[]) =>
    lines.filter(l => keywords.some(k => l.toLowerCase().includes(k))).join(' | ');
  const find = (keywords: string[]) =>
    lines.find(l => keywords.some(k => l.toLowerCase().includes(k))) || '';

  const dateMatch = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/);
  const nameMatch = find(['name :', 'name:', 'patient']);
  const ageMatch  = find(['age/sex', 'age :', 'age:', 'yr', 'year', '/f', '/m']);
  const drMatch   = findAll(['dr.', 'dr ', 'doctor', 'mbbs', 'ms ', 'md,', 'bds', 'dgo']);
  const ccLines   = findAll(['pain', 'swelling', 'fall', 'c/o', 'complaint', 'fever', 'cough', 'doi']);
  const dxLines   = findAll(['dx', 'diagnosis', 'impression', 'assessment', 'fracture', 'sti ', 'injury', 'infection', 'sprain']);
  const rxLines   = findAll(['rx', 'tab ', 'cap ', 'syp ', 'mg', 'cream', 'lotion', 'advice', 'advised', 'prescribed']);
  const xrayLines = findAll(['x-ray', 'xray', 'x ray', 'mri', 'ct scan', 'usg', 'blood', 'investigation', 'lab', 'test order']);

  return {
    patientInfo: [nameMatch, ageMatch, dateMatch ? `Date: ${dateMatch[0]}` : ''].filter(Boolean).join('  ·  '),
    doctor: drMatch,
    chiefComplaint: ccLines || 'See raw text below',
    diagnosis: dxLines || 'See raw text below',
    investigations: xrayLines,
    advice: rxLines,
    rawText: text,
  };
}

/* ══════════════════════════════════════════════════════
   MAIN UPLOAD COMPONENT
   ══════════════════════════════════════════════════════ */
function UploadContent() {
  const params = useSearchParams();
  useRouter();
  const profileId = params.get('profileId') || '';

  const [form,       setForm]       = useState({ hospitalName: '', doctorName: '', dateOfVisit: '' });
  const [file,       setFile]       = useState<File | null>(null);
  const [preview,    setPreview]    = useState<string | null>(null);
  const [processed,  setProcessed]  = useState<string | null>(null); // pre-processed canvas image
  const [status,     setStatus]     = useState<'idle' | 'preprocessing' | 'ocr' | 'editing' | 'done' | 'error'>('idle');
  const [progress,   setProgress]   = useState(0);
  const [progressMsg,setProgressMsg]= useState('');
  const [ocrText,    setOcrText]    = useState('');    // raw OCR
  const [editedText, setEditedText] = useState('');   // user-corrected
  const [confidence, setConfidence] = useState(0);
  const [summary,    setSummary]    = useState<SummaryData | null>(null);
  const [error,      setError]      = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const setFileAndPreview = (f: File) => {
    setFile(f);
    setError('');
    setStatus('idle');
    setOcrText('');
    setEditedText('');
    setProcessed(null);
    if (f.type.startsWith('image/')) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  };

  /* ── Step 1: Pre-process + OCR ── */
  const runOCR = async () => {
    if (!file || !form.dateOfVisit) { setError('Date of Visit is required.'); return; }
    setError('');
    setStatus('preprocessing');
    setProgress(5);

    try {
      let imageData: string;
      if (file.type.startsWith('image/')) {
        setProgressMsg('Enhancing image (Otsu binarization + 2× upscale)…');
        imageData = await preprocessImageForOCR(file);
        setProcessed(imageData);  // show the processed image
      } else {
        setProgressMsg('Reading PDF…');
        imageData = await fileToDataUrl(file);
      }
      setProgress(25);

      setStatus('ocr');
      setProgressMsg('Running Tesseract LSTM OCR engine…');

      const { createWorker, OEM, PSM } = await import('tesseract.js');

      const worker = await createWorker('eng', OEM.LSTM_ONLY, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text')
            setProgress(25 + Math.round(m.progress * 65));
        },
      });

      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: '1',
        tessedit_char_whitelist:
          'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,;:\'"-/\\()[]%@+&# \n\r',
      });

      const result = await worker.recognize(imageData);
      await worker.terminate();

      const raw = result.data.text || '';
      const conf = Math.round(result.data.confidence) || 0;

      setProgress(100);
      setOcrText(raw);
      setEditedText(raw);
      setConfidence(conf);
      setStatus('editing'); // go to correction step
    } catch (err) {
      console.error('OCR Error:', err);
      setError('Could not process this file. Try a clearer, well-lit photo.');
      setStatus('error');
    }
  };

  /* ── Step 2: Save with corrected text ── */
  const handleSave = () => {
    const finalText = editedText.trim();
    const data = buildSummary(finalText);
    setSummary(data);
    addRecord(profileId, {
      profileId,
      hospitalName: form.hospitalName || data.doctor.split('|')[0]?.trim() || '',
      doctorName: form.doctorName || data.doctor.split('|')[0]?.trim() || '',
      dateOfVisit: form.dateOfVisit,
      rawOcrText: finalText,
      summary: Object.entries(data)
        .filter(([k]) => k !== 'rawText')
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n'),
    });
    setStatus('done');
  };

  /* ══ DONE STATE ══ */
  if (status === 'done' && summary) {
    const s = summary;
    type Card = { icon: string; label: string; value: string; accent: string };
    const cards: Card[] = [
      { icon: '🧑‍⚕️', label: 'Patient Info',     value: s.patientInfo,     accent: '#7c9a7e' },
      { icon: '👨‍⚕️', label: 'Doctor / Clinic',  value: s.doctor || form.doctorName || form.hospitalName || '—', accent: '#8b7355' },
      { icon: '🤕', label: 'Chief Complaint',  value: s.chiefComplaint,  accent: '#c4917a' },
      { icon: '🩺', label: 'Diagnosis',         value: s.diagnosis,       accent: '#7c9a7e' },
      { icon: '🔬', label: 'Investigations',    value: s.investigations || '—', accent: '#9e9185' },
      { icon: '💊', label: 'Advice / Rx',       value: s.advice || '—',   accent: '#7c9a7e' },
    ].filter(c => c.value && c.value !== '—');

    return (
      <div style={{ minHeight: '100vh', padding: '32px 24px', position: 'relative' }}>
        <div className="zen-bg">
          <div className="zen-orb" style={{ width: 450, height: 450, background: 'var(--zen-sage-light)', top: '-10%', right: '-5%', opacity: 0.2 }} />
          <div className="zen-orb" style={{ width: 300, height: 300, background: 'var(--zen-rose)', bottom: '-5%', left: '5%', opacity: 0.15, animationDuration: '14s' }} />
        </div>
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--zen-muted)', fontSize: 14, textDecoration: 'none', marginBottom: 24 }}>← Dashboard</Link>

          {/* Header */}
          <div className="fade-in" style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 24px', background: 'linear-gradient(135deg, var(--zen-sage) 0%, #4a7050 100%)', borderRadius: 20, boxShadow: '0 8px 32px rgba(124,154,126,0.3)' }}>
              <div style={{ fontSize: 44 }}>✅</div>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'white', marginBottom: 4 }}>Health Record Saved!</h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Visit: {form.dateOfVisit ? new Date(form.dateOfVisit).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'} {form.hospitalName ? `· ${form.hospitalName}` : ''}</p>
              </div>
              {confidence > 0 && (
                <div style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', fontSize: 12, color: 'white', fontWeight: 600, flexShrink: 0 }}>
                  OCR {confidence}%
                </div>
              )}
            </div>
          </div>

          {/* Section Cards Grid */}
          <div className="fade-in-delay" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14, marginBottom: 20 }}>
            {cards.map((card, i) => (
              <div key={i} style={{ background: 'rgba(253,252,249,0.9)', backdropFilter: 'blur(12px)', border: '1px solid rgba(212,201,176,0.4)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 16px rgba(61,51,40,0.06)' }}>
                <div style={{ height: 4, background: `linear-gradient(90deg, ${card.accent}, ${card.accent}88)` }} />
                <div style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 20 }}>{card.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: card.accent, textTransform: 'uppercase', letterSpacing: '0.8px' }}>{card.label}</span>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--zen-dark)', lineHeight: 1.7, fontWeight: 400 }}>{card.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Raw text collapsible */}
          {s.rawText && (
            <details className="glass-card fade-in-delay" style={{ padding: '14px 20px', marginBottom: 16 }}>
              <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--zen-muted)', fontWeight: 500, userSelect: 'none' }}>📋 View full extracted text</summary>
              <pre style={{ marginTop: 12, fontSize: 12, color: 'var(--zen-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 200, overflow: 'auto' }}>{s.rawText}</pre>
            </details>
          )}

          {/* Safety */}
          <div className="fade-in-delay-2" style={{ padding: '14px 18px', background: 'rgba(124,154,126,0.1)', borderRadius: 14, border: '1px solid rgba(124,154,126,0.2)', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: 'var(--zen-sage)', lineHeight: 1.6 }}>🛡️ <strong>Safety First</strong>: This is informational only — never a medical diagnosis. Always consult your doctor. 💚</p>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/dashboard" style={{ flex: 1, textDecoration: 'none' }}><button className="btn-primary" style={{ width: '100%' }}>← Back to Dashboard</button></Link>
            <button className="btn-ghost" onClick={() => { setStatus('idle'); setFile(null); setPreview(null); }} style={{ flex: 1 }}>Upload Another 📄</button>
          </div>
        </div>
      </div>
    );
  }

  /* ══ EDITING STATE (OCR done, user corrects) ══ */
  if (status === 'editing') {
    return (
      <div style={{ minHeight: '100vh', padding: '32px 24px', position: 'relative' }}>
        <div className="zen-bg">
          <div className="zen-orb" style={{ width: 400, height: 400, background: 'var(--zen-sage-light)', top: '-10%', left: '-5%', opacity: 0.2 }} />
        </div>
        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--zen-muted)', fontSize: 14, textDecoration: 'none', marginBottom: 24 }}>← Dashboard</Link>
          <div className="fade-in" style={{ marginBottom: 20 }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--zen-dark)', marginBottom: 4 }}>Review &amp; Correct OCR Result ✏️</h2>
            <p style={{ color: 'var(--zen-muted)', fontSize: 14 }}>OCR extracted the text below. Fix any mistakes, then click Save.</p>
            {confidence > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, padding: '4px 14px', borderRadius: 20, background: confidence >= 70 ? 'rgba(124,154,126,0.15)' : 'rgba(196,145,122,0.15)', fontSize: 12, color: confidence >= 70 ? 'var(--zen-sage)' : 'var(--zen-rose)', fontWeight: 500 }}>
                🔍 Tesseract Confidence: {confidence}%
                {confidence < 70 && ' — please review carefully'}
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: preview || processed ? '1fr 1fr' : '1fr', gap: 20 }}>
            {/* Processed image preview */}
            {(processed || preview) && (
              <div className="glass-card fade-in" style={{ padding: 16 }}>
                <p style={{ fontSize: 12, color: 'var(--zen-muted)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {processed ? 'Binarised Image (sent to OCR)' : 'Document'}
                </p>
                <img src={processed || preview || ''} alt="processed" style={{ width: '100%', borderRadius: 10, maxHeight: 400, objectFit: 'contain', background: '#fff' }} />
              </div>
            )}

            {/* Editable OCR text */}
            <div className="glass-card fade-in-delay" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
              <p style={{ fontSize: 12, color: 'var(--zen-muted)', fontWeight: 600, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Extracted Text — Click to Edit</p>
              <textarea
                value={editedText}
                onChange={e => setEditedText(e.target.value)}
                style={{ flex: 1, minHeight: 360, padding: '12px 14px', fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.8, color: 'var(--zen-dark)', background: 'var(--zen-warm)', border: '1.5px solid var(--zen-sand)', borderRadius: 12, resize: 'vertical', outline: 'none' }}
                placeholder="OCR text will appear here — edit as needed…"
              />
              <p style={{ fontSize: 12, color: 'var(--zen-muted)', marginTop: 8 }}>
                💡 Tip: Fix misspelled words, add missing lines, then hit Save.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="btn-primary" onClick={handleSave} style={{ flex: 2 }}>
              ✅ Save Record
            </button>
            <button className="btn-ghost" onClick={() => { setStatus('idle'); }} style={{ flex: 1 }}>
              ↩ Re-upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ══ UPLOAD FORM STATE ══ */
  return (
    <div style={{ minHeight: '100vh', padding: '32px 24px', position: 'relative' }}>
      <div className="zen-bg">
        <div className="zen-orb" style={{ width: 400, height: 400, background: 'var(--zen-sage-light)', top: '-10%', left: '-5%', opacity: 0.2 }} />
        <div className="zen-orb" style={{ width: 300, height: 300, background: 'var(--zen-rose)', bottom: '-5%', right: '5%', opacity: 0.2 }} />
      </div>
      <div style={{ maxWidth: 600, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--zen-muted)', fontSize: 14, textDecoration: 'none', marginBottom: 24 }}>← Dashboard</Link>

        <div className="fade-in" style={{ marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,154,126,0.12)', borderRadius: 20, padding: '5px 14px', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--zen-sage)', fontWeight: 600 }}>🔬 Tesseract LSTM OCR — 100% Local, No API</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'var(--zen-dark)', marginBottom: 6 }}>Upload Health Record 📄</h1>
          <p style={{ color: 'var(--zen-muted)', fontSize: 14, lineHeight: 1.6 }}>
            We pre-process your image with <strong>Otsu binarization</strong> and run <strong>Tesseract LSTM</strong> for best local accuracy. You can review &amp; correct the text before saving.
          </p>
        </div>

        <div className="glass-card fade-in-delay" style={{ padding: '32px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* File drop zone */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--zen-brown)', marginBottom: 8 }}>Health Document</label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) setFileAndPreview(f); }}
              style={{ border: `2px dashed ${file ? 'var(--zen-sage)' : 'var(--zen-sand)'}`, borderRadius: 16, padding: '28px 20px', textAlign: 'center', cursor: 'pointer', background: file ? 'rgba(124,154,126,0.06)' : 'var(--zen-warm)', transition: 'all 0.25s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--zen-sage)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.borderColor = file ? 'var(--zen-sage)' : 'var(--zen-sand)'}>
              {preview
                ? <img src={preview} alt="preview" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 10, objectFit: 'contain' }} />
                : <><div style={{ fontSize: 40, marginBottom: 10 }}>📁</div><p style={{ color: 'var(--zen-muted)', fontSize: 14 }}>{file ? file.name : 'Click or drag & drop image / PDF'}</p><p style={{ color: 'var(--zen-sand)', fontSize: 12, marginTop: 4 }}>JPG · PNG · TIFF · PDF</p></>
              }
              <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) setFileAndPreview(f); }} />
            </div>
            {file && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--zen-muted)' }}>📎 {file.name} · {(file.size / 1024).toFixed(0)} KB</span>
                <button type="button" onClick={() => { setFile(null); setPreview(null); }} style={{ background: 'none', border: 'none', color: 'var(--zen-rose)', cursor: 'pointer', fontSize: 13 }}>✕ Remove</button>
              </div>
            )}
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(124,154,126,0.08)', borderRadius: 10, fontSize: 12, color: 'var(--zen-sage)', lineHeight: 1.6 }}>
              📸 <strong>For best results:</strong> Use a well-lit, flat photo — no shadows. Hold the camera directly above the paper. Printed text gives higher accuracy than handwriting.
            </div>
          </div>

          {/* Date of Visit - MANDATORY */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--zen-brown)', marginBottom: 6 }}>Date of Visit <span style={{ color: 'var(--zen-rose)' }}>* Required</span></label>
            <input className="zen-input" type="date" required value={form.dateOfVisit}
              onChange={e => setForm(p => ({ ...p, dateOfVisit: e.target.value }))} />
          </div>

          {/* Hospital Optional */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--zen-brown)', marginBottom: 6 }}>Hospital / Clinic <span style={{ color: 'var(--zen-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input className="zen-input" placeholder="e.g. Allure Skin & Multi Speciality Clinic" value={form.hospitalName}
              onChange={e => setForm(p => ({ ...p, hospitalName: e.target.value }))} />
          </div>

          {/* Doctor Optional */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--zen-brown)', marginBottom: 6 }}>Doctor's Name <span style={{ color: 'var(--zen-muted)', fontWeight: 400 }}>(optional)</span></label>
            <input className="zen-input" placeholder="e.g. Dr. Harish M" value={form.doctorName}
              onChange={e => setForm(p => ({ ...p, doctorName: e.target.value }))} />
          </div>

          {error && <div style={{ background: 'rgba(196,145,122,0.15)', border: '1px solid var(--zen-rose)', borderRadius: 10, padding: '10px 14px', color: 'var(--zen-rose)', fontSize: 13 }}>{error}</div>}

          {(status === 'preprocessing' || status === 'ocr') && (
            <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--zen-sage)' }}>
              <div style={{ fontSize: 32, marginBottom: 8, animation: 'float 1.5s ease-in-out infinite' }}>🔬</div>
              <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{status === 'preprocessing' ? 'Pre-processing image…' : 'Running OCR…'}</p>
              <p style={{ fontSize: 13, color: 'var(--zen-muted)' }}>{progressMsg}</p>
              <div style={{ margin: '14px auto 0', maxWidth: 300, height: 6, background: 'var(--zen-warm)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--zen-sage), var(--zen-sage-light))', borderRadius: 3, width: `${progress}%`, transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--zen-muted)', marginTop: 6 }}>{progress}%</p>
            </div>
          )}

          {status !== 'preprocessing' && status !== 'ocr' && (
            <button
              className="btn-primary"
              onClick={runOCR}
              disabled={!file || !form.dateOfVisit}
              style={{ width: '100%', opacity: (!file || !form.dateOfVisit) ? 0.5 : 1 }}>
              🔬 Extract Text (Tesseract OCR) →
            </button>
          )}
        </div>

        <div className="fade-in-delay-2" style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(124,154,126,0.1)', borderRadius: 14, border: '1px solid rgba(124,154,126,0.2)' }}>
          <p style={{ fontSize: 13, color: 'var(--zen-sage)', lineHeight: 1.6 }}>
            🛡️ <strong>Safety First</strong>: ArogyaAI summaries are informational only — never a medical diagnosis. Always consult your doctor.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 32 }}>🌿</span></div>}>
      <UploadContent />
    </Suspense>
  );
}
