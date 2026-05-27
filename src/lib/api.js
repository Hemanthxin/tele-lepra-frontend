import { auth } from './firebase';

const BASE = import.meta.env.VITE_API_BASE || '/api';

async function authHeaders() {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function api(path, opts = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(await authHeaders()),
    ...(opts.headers || {}),
  };
  const res = await fetch(`${BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/uploads/image`, {
    method: 'POST',
    headers: await authHeaders(),
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}
