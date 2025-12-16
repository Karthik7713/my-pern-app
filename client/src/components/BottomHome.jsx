import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme.jsx';

export default function BottomHome() {
  const navigate = useNavigate();
  const { colors } = useTheme();

  const style = {
    position: 'fixed',
    left: 18,
    bottom: 18,
    width: 52,
    height: 52,
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 6px 16px rgba(2,6,23,0.3)',
    border: 'none',
    cursor: 'pointer',
    zIndex: 2000,
    background: colors.buttonPrimary,
    color: '#fff'
  };

  return (
    <button
      aria-label="Home"
      title="Go to Cashbook"
      onClick={() => navigate('/cashbook')}
      style={style}
      className="bottom-home"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <path d="M3 10.5L12 4l9 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 10.5v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
