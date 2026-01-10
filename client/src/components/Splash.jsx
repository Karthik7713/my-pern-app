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
    fontFamily: 'Montserrat, Inter, Roboto, system-ui, -apple-system, "Segoe UI", Arial',
    textTransform: 'uppercase',
    fontSize: 'clamp(18px, 3.6vw, 32px)',
    color: 'rgb(255,215,0)'
  };

  const subTitleStyle = {
    marginTop: 6,
    textAlign: 'center',
    fontWeight: 500,
    fontSize: 'clamp(12px, 1.8vw, 14px)',
    color: 'rgb(255,255,255)',
    textTransform: 'none'
  };

  const taglineStyle = {
    marginTop: 12,
    color: 'rgb(180,180,180)',
    fontWeight: 300,
    fontSize: 'clamp(11px, 1.6vw, 13px)',
    textAlign: 'center',
    maxWidth: 520,
    paddingLeft: 16,
    paddingRight: 16,
    lineHeight: 1.4,
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
    width: 'min(360px, 75%)',
    height: 3,
    background: 'rgba(255,255,255,0.03)',
    borderRadius: 999,
    overflow: 'hidden',
    margin: '0 auto'
  };

  const barInner = {
    height: '100%',
    width: '0%',
    background: 'rgb(255,215,0)', // gold accent
    borderRadius: 999,
    transition: 'width 220ms ease',
    boxShadow: '0 0 10px rgba(255,215,0,0.12)'
  };

  // trigger CSS width animation via inline style + small hack: set width to 100% after mount
  const [barWidth, setBarWidth] = useState('0%');
  useEffect(() => {
    // Stepwise progress: 1s -> 20%, 3s -> 70%, end -> 100%
    const timers = [];
    // small initial bump so bar is visible
    timers.push(setTimeout(() => setBarWidth('5%'), 50));
    timers.push(setTimeout(() => setBarWidth('20%'), 1000));
    timers.push(setTimeout(() => setBarWidth('70%'), 3000));
    timers.push(setTimeout(() => setBarWidth('100%'), duration));
    return () => timers.forEach((t) => clearTimeout(t));
  }, [duration]);

  const [imgOk, setImgOk] = useState(true);

  return (
    <div style={containerStyle} aria-hidden={fading}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', transform: 'translateY(-8vh)' }}>
        {imgOk ? (
          <img
            src="/splash-logo.png"
            alt="Bharathi Construction Book"
            onError={() => setImgOk(false)}
            style={{
              width: 'min(320px, 30vw)',
              maxWidth: 360,
              height: 'auto',
              objectFit: 'contain',
              marginTop: '-10px',
              background: 'transparent'
            }}
          />
        ) : (
          <div style={{ width: 'min(200px, 28vw)', height: 'min(200px, 28vw)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M7 8c2-1 4-1 6 0v8c-2-1-4-1-6 0V8z" fill="rgb(255,215,0)" opacity="0.9" />
              <path d="M13 8c2-1 4-1 6 0v8c-2-1-4-1-6 0V8z" fill="rgb(255,215,0)" opacity="0.6" />
            </svg>
          </div>
        )}
        <div style={titleStyle}>BHARATHI CONSTRUCTION</div>
        <div style={subTitleStyle}>Cash Book</div>
        <div style={{
          ...taglineStyle,
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginTop: 18,
          fontFamily: 'Montserrat, Inter, Roboto, system-ui, -apple-system, "Segoe UI", Arial',
        }}>
          <span style={{ opacity: 0.95 }}>Track Expenses</span>
          <span style={{ color: 'rgb(255,215,0)', margin: '0 6px' }}>•</span>
          <span style={{ opacity: 0.95 }}>Manage Transactions</span>
          <span style={{ color: 'rgb(255,215,0)', margin: '0 6px' }}>•</span>
          <span style={{ opacity: 0.95 }}>Reports</span>
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
