"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getMe,
  loginWithGoogle,
  logout,
  refreshAccessToken,
  type AuthUser,
} from "./client";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

type AuthContextValue = {
  user: AuthUser | null;
  accessToken: string | null;
  status: AuthStatus;
  signIn: (idToken: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function withAuthHeaders(init: RequestInit, token: string | null): RequestInit {
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return {
    ...init,
    credentials: "include",
    headers,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const tokenRef = useRef<string | null>(null);
  const refreshRef = useRef<Promise<string | null> | null>(null);

  const setSession = useCallback((token: string, nextUser: AuthUser | null) => {
    tokenRef.current = token;
    setAccessToken(token);
    setUser(nextUser);
    setStatus("authenticated");
  }, []);

  const clearSession = useCallback(() => {
    tokenRef.current = null;
    setAccessToken(null);
    setUser(null);
    setStatus("anonymous");
  }, []);

  const refreshToken = useCallback(async () => {
    if (refreshRef.current) {
      return refreshRef.current;
    }

    refreshRef.current = (async () => {
      try {
        const refreshed = await refreshAccessToken();
        if (!refreshed.accessToken) {
          clearSession();
          return null;
        }
        const refreshedUser = await getMe(refreshed.accessToken);
        setSession(refreshed.accessToken, refreshedUser);
        return refreshed.accessToken;
      } catch {
        clearSession();
        return null;
      } finally {
        refreshRef.current = null;
      }
    })();

    return refreshRef.current;
  }, [clearSession, setSession]);

  useEffect(() => {
    void refreshToken();
  }, [refreshToken]);

  const signIn = useCallback(
    async (idToken: string) => {
      setStatus("loading");
      try {
        const response = await loginWithGoogle(idToken);
        const nextUser = response.user ?? (await getMe(response.accessToken));
        setSession(response.accessToken, nextUser);
        return nextUser;
      } catch (err) {
        clearSession();
        throw err;
      }
    },
    [clearSession, setSession],
  );

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const authFetch = useCallback(
    async (input: RequestInfo | URL, init: RequestInit = {}) => {
      let token = tokenRef.current;
      if (!token) {
        token = await refreshToken();
      }

      const first = await fetch(input, withAuthHeaders(init, token));
      if (first.status !== 401) {
        return first;
      }

      const freshToken = await refreshToken();
      if (!freshToken || freshToken === token) {
        return first;
      }

      return fetch(input, withAuthHeaders(init, freshToken));
    },
    [refreshToken],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      status,
      signIn,
      signOut,
      refreshToken,
      authFetch,
    }),
    [accessToken, authFetch, refreshToken, signIn, signOut, status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
