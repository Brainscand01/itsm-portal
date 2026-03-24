// ── Portal Authentication Utilities ─────────────────────────
const STORAGE_KEY = "itsm_portal_auth";

export function saveAuth(token, user) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getToken() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored?.token || null;
  } catch { return null; }
}

export function getUser() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return stored?.user || null;
  } catch { return null; }
}

export function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch { return false; }
}

export function logout() {
  clearAuth();
  window.location.reload();
}
