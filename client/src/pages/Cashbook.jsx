import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import ProfileMenu from '../components/ProfileMenu.jsx';
import AddBookButton from '../components/AddBookButton.jsx';
import { useEffect } from 'react';
import { useTheme } from '../hooks/useTheme.jsx';

export default function Cashbook() {
  const { colors } = useTheme();
  const location = useLocation();

  const isNoScroll = location.pathname.startsWith('/cashbook/settings') || location.pathname.startsWith('/cashbook/profile');

  useEffect(() => {
    // no longer change document.body overflow here; allow the cashbook
    // container to handle internal scrolling so Settings/Profile can scroll.
  }, [isNoScroll]);

  const navLinkStyle = (isActive) => ({
    padding: '8px 12px',
    borderRadius: 6,
    textDecoration: 'none',
    color: '#fff',
    background: isActive ? colors.buttonPrimary : 'transparent',
    fontWeight: isActive ? 700 : 600,
    marginRight: 8,
  });

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, color: colors.text }}>
      <div className="cashbook-top" style={{ maxWidth: 1100, margin: '18px auto 0', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <NavLink to="/cashbook" end style={({isActive}) => navLinkStyle(isActive)}>Cashbook</NavLink>
          <NavLink to="/cashbook/settings" style={({isActive}) => navLinkStyle(isActive)}>Settings</NavLink>
          <div style={{ display: 'inline-block' }}>
            <ProfileMenu label="Profile" />
          </div>
        </div>

        <div />
      </div>

      {/* visual partition between fixed nav and body */}
      <div className="cashbook-divider" />

      <main className={"cashbook-main" + (isNoScroll ? ' no-scroll' : '')} style={{ maxWidth: 1100, margin: '18px auto' }}>
        <Outlet />
      </main>
      <AddBookButton />
    </div>
  );
}
