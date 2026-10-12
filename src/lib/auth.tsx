import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import {
  api,
  hasSavedSession,
  login as apiLogin,
  logout as apiLogout,
  refreshSession,
  SessionExpiredError,
  setSessionExpiredHandler,
} from './api';
import { secureStorage } from './storage';
import type { User } from './types';

interface AuthValue {
  user: User | null;
  /** True until the saved session has been checked on launch. */
  restoring: boolean;
  /** A saved session exists but the server couldn't be reached to check it. */
  offline: boolean;
  /** Why the admin was signed out (session expired or revoked), shown on the login screen. */
  notice: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  retry: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Builds before this one saved a 7-day access token; it's useless now, so remove it. */
function forgetLegacyToken() {
  const key = 'nt_admin_token';
  if (Platform.OS !== 'web') return secureStorage.remove(key).catch(() => undefined);
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [offline, setOffline] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  /** Signs back in with the saved refresh token — no password needed while the session is valid. */
  const restore = useCallback(
    () =>
      hasSavedSession()
        .then(async (saved) => {
          if (saved) setUser((await refreshSession()).user);
          setOffline(false);
        })
        // Expired/revoked → login screen. Unreachable server → keep the session and offer a retry.
        .catch((err: unknown) => setOffline(!(err instanceof SessionExpiredError)))
        .finally(() => setRestoring(false)),
    [],
  );

  useEffect(() => {
    void forgetLegacyToken();
    void restore();
  }, [restore]);

  // The refresh token expired or the session was revoked (signed out remotely, password changed…).
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      setNotice('Your session has ended. Please sign in again.');
      qc.clear();
    });
    return () => setSessionExpiredHandler(null);
  }, [qc]);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiLogin(email, password);
    setNotice(null);
    setOffline(false);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    setNotice(null);
    qc.clear();
  }, [qc]);

  const refreshUser = useCallback(async () => {
    setUser(await api<User>('/auth/me'));
  }, []);

  const value = useMemo(
    () => ({ user, restoring, offline, notice, login, logout, refreshUser, retry: () => void restore() }),
    [user, restoring, offline, notice, login, logout, refreshUser, restore],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
