import api from './api';

export async function signup({ name, email, password, secretCode }) {
  const res = await api.post('/auth/signup', { name, email, password, secretCode });
  // Support server envelope { status, data } and legacy direct shape
  return res.data?.data ?? res.data;
}

export async function login({ email, password, secretCode }) {
  const payload = { email, password };
  if (typeof secretCode !== 'undefined') payload.secretCode = secretCode;
  const res = await api.post('/auth/login', payload);
  // Normalize response: return inner data when server uses { status, data }
  return res.data?.data ?? res.data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
