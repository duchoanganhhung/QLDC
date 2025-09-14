const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:5000';

export function getToken() {
  return localStorage.getItem('token') || '';
}
export function setToken(t) {
  if (t) localStorage.setItem('token', t);
}
export function getUserStorage() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); }
  catch { return null; }
}
export function setUserStorage(u) {
  localStorage.setItem('user', JSON.stringify(u || null));
}

export async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Authorization': 'Bearer ' + getToken() }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type':'application/json',
      'Authorization':'Bearer ' + getToken()
    },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}

export async function apiDelete(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + getToken() }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
}
