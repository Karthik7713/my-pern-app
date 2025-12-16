import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function NavAction({ icon: Icon, label, to, onClick, active=false }){
  const navigate = useNavigate();
  const handle = (e) => {
    if (onClick) return onClick(e);
    if (to) navigate(to);
  };

  return (
    <button
      type="button"
      className={`nav-action ${active ? 'active' : ''}`}
      onClick={handle}
      aria-label={label}
    >
      <Icon size={18} aria-hidden />
      <span className="nav-action-label">{label}</span>
    </button>
  );
}
