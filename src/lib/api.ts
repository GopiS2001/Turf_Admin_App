import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { secureStorage } from './storage';
import type { User } from './types';

/**
 * Where the NestJS API lives.
 * - EXPO_PUBLIC_API_URL wins when set.
 * - Web: same machine as the page, port 4000.
 * - Phone (Expo Go): the computer running `expo start` — its LAN IP comes from the
 *   dev server address, so no IP needs typing in. The phone must be on the same Wi-Fi.
 */
function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host ?? 'localhost'}:4000/api`;
}

export const API_URL = resolveApiUrl();
export const API_ORIGIN = API_URL.replace(/\/api$/, '');

export const fileUrl = (path: string | null | undefined) =>
  path ? (path.startsWith('http') ? path : `${API_ORIGIN}${path}`) : null;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** The refresh token is no longer valid (expired, revoked or reused) — the admin must sign in again. */
export class SessionExpiredError extends ApiError {
  constructor() {
    super('Your session has ended. Please sign in again.', 401);
  }
}

export interface Session {
  accessToken: string;
  expiresIn: number;
  /** Native only. On web the server keeps it in an httpOnly cookie instead. */
  refreshToken?: string;
  user: User;
}

/**
 * Tokens:
 * - Access token (15 min): memory only.
 * - Refresh token (7 days, rotated on every use): SecureStore on the phone; an httpOnly
 *   cookie on web. It's what keeps the admin signed in after the app is closed.
 */
const NATIVE = Platform.OS !== 'web';
const REFRESH_KEY = 'nt_refresh_token';
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export const setSessionExpiredHandler = (fn: (() => void) | null) => {
  onSessionExpired = fn;
};

/** Native: is there a saved refresh token? (Web can't tell — the cookie is invisible to scripts.) */
export const hasSavedSession = async () => !NATIVE || !!(await secureStorage.get(REFRESH_KEY).catch(() => null));

export async function saveSession(session: Session) {
  accessToken = session.accessToken;
  if (NATIVE && session.refreshToken) await secureStorage.set(REFRESH_KEY, session.refreshToken);
}

export async function clearSession() {
  accessToken = null;
  if (NATIVE) await secureStorage.remove(REFRESH_KEY).catch(() => undefined);
}

type Query = Record<string, string | number | undefined | null>;
type Options = { method?: string; body?: unknown; query?: Query };

const isAuthPath = (path: string) => /^\/auth\/(login|refresh|logout)\b/.test(path);

async function send(path: string, options: Options, token: string | null) {
  const qs = options.query
    ? Object.entries(options.query)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  const url = `${API_URL}${path}${qs ? `?${qs}` : ''}`;
  try {
    return await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        ...(options.body !== undefined && { 'Content-Type': 'application/json' }),
        ...(token && { Authorization: `Bearer ${token}` }),
        // Tells the API to exchange the refresh token in JSON rather than a cookie.
        ...(NATIVE && { 'X-Client': 'mobile' }),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      // Web: lets the browser send/receive the refresh cookie (scoped to /api/auth).
      credentials: 'include',
    });
  } catch {
    throw new ApiError(
      `Can't reach the server at ${API_ORIGIN}. Check that the backend is running and this device is on the same Wi-Fi.`,
      0,
    );
  }
}

async function toError(res: Response) {
  const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  const msg = Array.isArray(data?.message) ? data.message[0] : data?.message;
  return new ApiError(msg ?? `Request failed (${res.status})`, res.status);
}

let refreshing: Promise<Session> | null = null;

/**
 * Trades the refresh token for a new access token (and a new refresh token). Concurrent
 * callers share one request, so the rotated token is never used twice. Rejects with
 * SessionExpiredError only when the server refuses the token; a network failure keeps the
 * saved session so the admin isn't signed out by a bad connection.
 */
export function refreshSession(): Promise<Session> {
  refreshing ??= (async () => {
    let body: { refreshToken: string } | undefined;
    if (NATIVE) {
      const saved = await secureStorage.get(REFRESH_KEY).catch(() => null);
      if (!saved) throw new SessionExpiredError();
      body = { refreshToken: saved };
    }
    const res = await send('/auth/refresh', { method: 'POST', body }, null);
    if (res.status === 401 || res.status === 403) {
      await clearSession();
      throw new SessionExpiredError();
    }
    if (!res.ok) throw await toError(res);
    const session = (await res.json()) as Session;
    // Persist the rotated token before anything else can use the old one.
    await saveSession(session);
    return session;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Seconds until the token's `exp` (Infinity if it can't be read). */
function secondsLeft(token: string) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const { exp } = JSON.parse(atob(part)) as { exp?: number };
    return exp ? exp - Date.now() / 1000 : Infinity;
  } catch {
    return Infinity;
  }
}

async function renew() {
  try {
    await refreshSession();
  } catch (err) {
    if (err instanceof SessionExpiredError) onSessionExpired?.();
    throw err;
  }
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const auth = isAuthPath(path);
  // Renew a little early rather than send a token that's about to be rejected.
  if (!auth && accessToken && secondsLeft(accessToken) < 30) await renew();

  let res = await send(path, options, auth ? null : accessToken);
  if (res.status === 401 && !auth) {
    // Access token expired or its session was revoked: renew once and replay.
    await renew();
    res = await send(path, options, accessToken);
    if (res.status === 401) {
      await clearSession();
      onSessionExpired?.();
    }
  }

  if (!res.ok) throw await toError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export async function login(email: string, password: string) {
  const session = await api<Session>('/auth/login', { method: 'POST', body: { email: email.trim(), password } });
  if (session.user.role !== 'ADMIN') throw new Error('Only admin accounts can sign in.');
  await saveSession(session);
  return session;
}

/** Revokes this device's session on the server (best effort) and forgets the tokens. */
export async function logout() {
  try {
    const refreshToken = NATIVE ? await secureStorage.get(REFRESH_KEY) : null;
    await send('/auth/logout', { method: 'POST', body: refreshToken ? { refreshToken } : undefined }, null);
  } catch {
    /* offline — the local sign-out still happens */
  }
  await clearSession();
}

export const errorMessage = (err: unknown) =>
  err instanceof Error ? err.message : 'Something went wrong';
