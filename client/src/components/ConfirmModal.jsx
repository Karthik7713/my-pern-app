import React from 'react';
import { useTheme } from '../hooks/useTheme.jsx';

export default function ConfirmModal({ open, title = 'Confirm', children, onCancel, onConfirm, confirmLabel = 'Confirm' }) {
  const { colors } = useTheme();
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'rgba(0,0,0,0.25)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width: 'min(640px,95%)', background: colors.bgSecondary, color: colors.text, borderRadius: 8, padding: 18 }}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>

        <div style={{ marginTop: 8 }}>{children}</div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} style={{ padding: '8px 12px', background: 'transparent', color: colors.text, border: `1px solid ${colors.border}`, borderRadius: 6 }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: '8px 12px', background: colors.buttonPrimary, color: '#fff', border: 'none', borderRadius: 6 }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
