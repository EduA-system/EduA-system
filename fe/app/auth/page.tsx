"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Client ID là public (không phải secret). Backend chạy ở 8080.
const GOOGLE_CLIENT_ID =
  "98078357098-pknisf1ub7kg5nop658jpeo31clhid2f.apps.googleusercontent.com";
const API = "http://localhost:8080";

interface GoogleIdentityServices {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (resp: { credential: string }) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme: string; size: string },
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

export default function AuthTestPage() {
  const btnRef = useRef<HTMLDivElement>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [log, setLog] = useState<string>("Chưa đăng nhập.");

  const print = useCallback(
    (label: string, data: unknown) =>
      setLog(`${label}\n\n${JSON.stringify(data, null, 2)}`),
    [],
  );

  // Gửi id_token cho backend → nhận access token (refresh nằm trong cookie HttpOnly).
  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const r = await fetch(`${API}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ idToken }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) setAccessToken(data.accessToken);
      print(`POST /api/auth/google → ${r.status}`, data);
    },
    [print],
  );

  // Nạp Google Identity Services + render nút Sign in with Google.
  useEffect(() => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = () => {
      window.google?.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (resp: { credential: string }) => loginWithGoogle(resp.credential),
      });
      if (btnRef.current) {
        window.google?.accounts.id.renderButton(btnRef.current, {
          theme: "outline",
          size: "large",
        });
      }
    };
    document.body.appendChild(s);
    return () => {
      document.body.removeChild(s);
    };
  }, [loginWithGoogle]);

  async function callMe() {
    const r = await fetch(`${API}/api/auth/me`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      credentials: "include",
    });
    print(`GET /api/auth/me → ${r.status}`, await r.json().catch(() => ({})));
  }

  async function refresh() {
    const r = await fetch(`${API}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    const data = await r.json().catch(() => ({}));
    if (r.ok && data.accessToken) setAccessToken(data.accessToken);
    print(`POST /api/auth/refresh → ${r.status}`, data);
  }

  async function logout() {
    const r = await fetch(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setAccessToken(null);
    print(`POST /api/auth/logout → ${r.status}`, "(refresh token revoked)");
  }

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "monospace", padding: 16 }}>
      <h1>Auth test</h1>

      <div ref={btnRef} style={{ margin: "12px 0" }} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "12px 0" }}>
        <button onClick={callMe}>GET /me</button>
        <button onClick={refresh}>POST /refresh</button>
        <button onClick={logout}>POST /logout</button>
      </div>

      <p>access token (memory): {accessToken ? `${accessToken.slice(0, 24)}…` : "—"}</p>

      <pre style={{ background: "#f4f4f4", padding: 12, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
        {log}
      </pre>
    </div>
  );
}
