import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { useTheme } from '../hooks/useTheme.jsx';

export default function ProfileMenu({ icon: IconComponent, label = 'Profile' }){
  const { logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    function onDoc(e){
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e){ if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('click', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('click', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  const doLogout = () => { logout(); setOpen(false); };

  return (
    <div className="profile-menu" ref={ref}>
      <button
        type="button"
        className="profile-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen(v => !v)}
        onKeyDown={(e)=>{
          if (e.key === 'ArrowDown') { e.preventDefault(); const first = ref.current.querySelector('[role=menuitem]'); first && first.focus(); }
          if (e.key === 'Escape') { setOpen(false); }
        }}
        style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'transparent', color: colors.text }}
      >
        {IconComponent ? (
          <IconComponent size={18} aria-hidden />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5z" fill="currentColor" />
            <path d="M3 20c0-3.866 3.582-7 9-7s9 3.134 9 7v1H3v-1z" fill="currentColor" opacity="0.9"/>
          </svg>
        )}
      </button>

      {open && (
        <div
          className="profile-pop"
          role="menu"
          aria-label="Profile menu"
          style={{ background: isDark ? '#0b1220' : '#fff', border: isDark ? 'none' : '1px solid rgba(0,0,0,0.06)' }}
        >
          <Link
            to={location.pathname.startsWith('/cashbook') ? '/cashbook/profile' : '/profile'}
            role="menuitem"
            tabIndex={0}
            className="profile-item"
            style={{ color: isDark ? '#fff' : colors.text }}
          >
            View profile
          </Link>
          <button type="button" role="menuitem" className="profile-item" onClick={doLogout} style={{ color: isDark ? '#fff' : colors.text }}>Logout</button>
        </div>
      )}
    </div>
  );
}

