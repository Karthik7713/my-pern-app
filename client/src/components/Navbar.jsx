import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import ProfileMenu from './ProfileMenu.jsx';

export default function Navbar(){
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const doLogout = () => { logout(); navigate('/login'); };

  return (
    <header>
      <div className="navbar">
        <div className="navbar-inner">
          <NavLink to="/" className={({isActive}) => isActive ? 'brand active' : 'brand'}>Dashboard</NavLink>

          <nav className="nav-links" aria-label="Main navigation">
            <NavLink to="/transactions" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Transactions</NavLink>
            <NavLink to="/reports" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Reports</NavLink>
            {user && user.role === 'ADMIN' && <NavLink to="/admin" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Admin</NavLink>}
            <NavLink to="/settings" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>Settings</NavLink>
          </nav>

          <div className="nav-profile">
            <ProfileMenu label="Profile" />
          </div>
        </div>
      </div>
      
    </header>
  );
}
