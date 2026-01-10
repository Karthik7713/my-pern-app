/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import { login as apiLogin, signup as apiSignup } from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      // Normalize shapes: server/client sometimes store envelope { status, data }
      if (parsed && parsed.data) {
        // If data contains a nested `user` (e.g. login envelope), prefer that
        if (parsed.data.user) return parsed.data.user;
        // If data looks like a user object (has name/email), return it
        if (parsed.data.name || parsed.data.email) return parsed.data;
      }
      return parsed;
    } catch (err) {
      return null;
    }
  });

  useEffect(() => {
    // keep user in sync
    if (user) localStorage.setItem('user', JSON.stringify(user));
    else localStorage.removeItem('user');
  }, [user]);

  const login = async ({ email, password, secretCode } = {}) => {
    const data = await apiLogin({ email, password, secretCode });
    if (data.token) {
      localStorage.setItem('token', data.token);
      setUser(data.user);
    }
    return data;
  };

  const signup = async ({ name, email, password, secretCode }) => {
    const data = await apiSignup({ name, email, password, secretCode });
    if (data.token) {
      localStorage.setItem('token', data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

