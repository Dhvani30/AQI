export interface AuthResponse {
  token: string;
  username: string;
}

export interface HealthProfile {
  is_asthmatic: boolean;
  is_elderly: boolean;
  has_children: boolean;
  custom_threshold: number | null;
}

export interface UserProfile {
  username: string;
  email: string;
  health_profile: HealthProfile;
  personal_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface Advisory {
  aqi: number;
  personal_threshold: number;
  category: string;
  alert: boolean;
  advisories: string[];
}

export interface Session {
  token: string;
  username: string;
}

const TOKEN_KEY = 'aqi_token';
const USERNAME_KEY = 'aqi_username';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export function getSession(): Session | null {
  const token = localStorage.getItem(TOKEN_KEY);
  const username = localStorage.getItem(USERNAME_KEY);
  return token && username ? { token, username } : null;
}

export function setSession(token: string, username: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USERNAME_KEY, username);
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USERNAME_KEY);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body !== undefined && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const requestUrl = /^https?:\/\//i.test(url) ? url : `${API_BASE_URL}${url}`;
  return fetch(requestUrl, { ...options, headers });
}
