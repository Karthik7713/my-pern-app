import React from 'react';
export default function SettingsIcon({ size = 18, color = 'currentColor' }){
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 1 1 2.1 16.9l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09c.7 0 1.28-.4 1.51-1a1.65 1.65 0 0 0-.33-1.82L4.27 2.1A2 2 0 1 1 7.1.27l.06.06A1.65 1.65 0 0 0 9 1.07c.7.11 1.28.4 1.51 1H12a2 2 0 1 1 4 0v.09c.7 0 1.28.4 1.51 1a1.65 1.65 0 0 0 .33 1.82l.06.06A2 2 0 1 1 21.9 7.1l-.06.06a1.65 1.65 0 0 0-.33 1.82c.11.7.4 1.28 1 1.51H21a2 2 0 1 1 0 4h-.09c-.7 0-1.28.4-1.51 1z" />
    </svg>
  );
}
