// ── Portal API Service Layer ────────────────────────────────
import { getToken } from "./auth";

const BASE_URL = "https://itsmbackend.vercel.app";

function headers() {
  const h = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  return h;
}

// ── Auth ────────────────────────────────────────────────────
export async function apiLogin(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function apiRegister(body) {
  const res = await fetch(`${BASE_URL}/api/requesters/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

// ── Dashboard ───────────────────────────────────────────────
export async function fetchDashboard() {
  const res = await fetch(`${BASE_URL}/api/portal/dashboard`, { headers: headers() });
  return res.json();
}

// ── Tickets ─────────────────────────────────────────────────
export async function fetchMyTickets(status) {
  const url = status
    ? `${BASE_URL}/api/portal/tickets?status=${encodeURIComponent(status)}`
    : `${BASE_URL}/api/portal/tickets`;
  const res = await fetch(url, { headers: headers() });
  return res.json();
}

export async function fetchTicketDetail(id) {
  const res = await fetch(`${BASE_URL}/api/portal/tickets/${id}`, { headers: headers() });
  return res.json();
}

export async function submitTicket(body) {
  const res = await fetch(`${BASE_URL}/api/portal/tickets`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function replyToTicket(id, text) {
  const res = await fetch(`${BASE_URL}/api/portal/tickets/${id}/reply`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ text }),
  });
  return res.json();
}

// ── Self-Help ───────────────────────────────────────────────
export async function fetchSelfHelp() {
  const res = await fetch(`${BASE_URL}/api/portal/self-help`, { headers: headers() });
  return res.json();
}

// ── Profile ─────────────────────────────────────────────────
export async function fetchProfile() {
  const res = await fetch(`${BASE_URL}/api/portal/profile`, { headers: headers() });
  return res.json();
}

export async function updateProfile(body) {
  const res = await fetch(`${BASE_URL}/api/portal/profile`, {
    method: "PATCH",
    headers: headers(),
    body: JSON.stringify(body),
  });
  return res.json();
}

export async function changePassword(currentPassword, newPassword) {
  const res = await fetch(`${BASE_URL}/api/portal/change-password`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  return res.json();
}
