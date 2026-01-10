import React, { useEffect, useState } from 'react';

// Splash screen component
// Expects an image at /splash-logo.png (place your provided logo in the project's `client/public` folder)
export default function Splash({ duration = 5000, onFinish = () => {} }) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // start fade a bit before the end so we get a smooth fade-out (400ms fade)
    const fadeStart = Math.max(0, duration - 400);
    const t1 = setTimeout(() => setFading(true), fadeStart);
    const t2 = setTimeout(() => onFinish(), duration);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [duration, onFinish]);

  const containerStyle = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgb(11,19,32)', // dark navy background
    color: 'rgb(255,255,255)',
    zIndex: 9999,
    flexDirection: 'column',
    paddingTop: 'env(safe-area-inset-top)',
    paddingRight: 'env(safe-area-inset-right)',
    paddingBottom: 'env(safe-area-inset-bottom)',
    paddingLeft: 'env(safe-area-inset-left)',
    transition: 'opacity 400ms ease',
    opacity: fading ? 0 : 1,
  };

  const titleStyle = {
    marginTop: 18,
    textAlign: 'center',
    fontWeight: 800,
    letterSpacing: 1,
    fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
    textTransform: 'uppercase',
    fontSize: 'clamp(18px, 3.6vw, 32px)',
    color: 'rgb(255,215,0)'
  };

  const subTitleStyle = {
    marginTop: 6,
    textAlign: 'center',
    fontWeight: 700,
    fontSize: 'clamp(14px, 2.4vw, 18px)',
    color: 'rgb(255,215,0)'
  };

  const taglineStyle = {
    marginTop: 12,
    color: 'rgb(224,224,224)',
    fontWeight: 400,
    fontSize: 'clamp(12px, 1.8vw, 14px)',
    textAlign: 'center',
    maxWidth: 520,
    paddingLeft: 16,
    paddingRight: 16,
    lineHeight: 1.2,
  };

  const progressWrap = {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: '8%',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  };

  const barOuter = {
    flex: 1,
    height: 8,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 999,
    overflow: 'hidden',
  };

  const barInner = {
    height: '100%',
    width: '0%',
    background: 'rgb(255,215,0)', // gold accent
    borderRadius: 999,
    transition: `width ${duration}ms linear`,
  };

  // trigger CSS width animation via inline style + small hack: set width to 100% after mount
  const [barWidth, setBarWidth] = useState('0%');
  useEffect(() => {
    // allow rendering first frame, then expand
    const t = setTimeout(() => setBarWidth('100%'), 50);
    return () => clearTimeout(t);
  }, []);

  const [imgOk, setImgOk] = useState(true);

  return (
    <div style={containerStyle} aria-hidden={fading}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        {imgOk ? (
          <img src="/splash-logo.png" alt="Bharathi Construction Book" onError={() => setImgOk(false)} style={{ width: 'min(220px, 40vw)', height: 'auto', objectFit: 'contain' }} />
        ) : (
          <div style={{ width: 'min(220px, 40vw)', height: 'min(220px, 40vw)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20, background: 'linear-gradient(135deg, rgba(255,215,0,0.06), rgba(255,215,0,0.02))' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <circle cx="12" cy="12" r="11" stroke="rgb(255,215,0)" strokeWidth="1.2" fill="none" />
              <path d="M7 8c2-1 4-1 6 0v8c-2-1-4-1-6 0V8z" fill="rgb(255,215,0)" opacity="0.9" />
              <path d="M13 8c2-1 4-1 6 0v8c-2-1-4-1-6 0V8z" fill="rgb(255,215,0)" opacity="0.6" />
            </svg>
          </div>
        )}
        <div style={titleStyle}>BHARATHI CONSTRUCTION</div>
        <div style={subTitleStyle}>CASH BOOK</div>
        <div style={{ ...taglineStyle, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div>TRACK EXPENSES</div>
          <div>MANAGE TRANSACTIONS</div>
          <div>GENERATE REPORTS</div>
        </div>
      </div>

      <div style={progressWrap}>
        <div style={barOuter}>
          <div style={{ ...barInner, width: barWidth }} />
        </div>
        <div style={{ color: 'rgb(255,215,0)', fontSize: 13 }}>Loading...</div>
      </div>
    </div>
  );
}
