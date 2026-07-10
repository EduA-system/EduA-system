"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const DEFAULT_CLIENT_ID =
  "98078357098-pknisf1ub7kg5nop658jpeo31clhid2f.apps.googleusercontent.com";

type GoogleCredentialResponse = {
  credential: string;
};

type GoogleButtonOptions = {
  theme?: "outline" | "filled_blue" | "filled_black";
  size?: "large" | "medium" | "small";
  type?: "standard" | "icon";
  shape?: "rectangular" | "pill" | "circle" | "square";
  text?: "signin_with" | "signup_with" | "continue_with" | "signin";
  width?: number | string;
};

type GoogleIdentityServices = {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (parent: HTMLElement, options: GoogleButtonOptions) => void;
      prompt: () => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentityServices;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_SRC}"]`,
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject();
    document.body.appendChild(script);
  });

  return scriptPromise;
}

export function getGoogleClientId() {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || DEFAULT_CLIENT_ID;
}

export function useGoogleSignIn(onCredential: (credential: string) => void) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const callbackRef = useRef(onCredential);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let active = true;
    loadGoogleScript()
      .then(() => {
        if (!active) return;
        const clientId = getGoogleClientId();
        if (!clientId) {
          setError("Thiếu cấu hình Google Client ID.");
          return;
        }
        window.google?.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callbackRef.current(response.credential),
        });
        setLoaded(true);
      })
      .catch(() => {
        if (active) {
          setError("Không thể tải Google Sign-In. Vui lòng thử lại.");
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const renderButton = useCallback((options: GoogleButtonOptions = {}) => {
    if (!buttonRef.current || !window.google?.accounts?.id) {
      return;
    }
    buttonRef.current.innerHTML = "";
    window.google.accounts.id.renderButton(buttonRef.current, {
      theme: "outline",
      size: "large",
      text: "continue_with",
      width: 320,
      ...options,
    });
  }, []);

  useEffect(() => {
    if (loaded) {
      renderButton();
    }
  }, [loaded, renderButton]);

  return {
    buttonRef,
    loaded,
    error,
    prompt: () => window.google?.accounts.id.prompt(),
    renderButton,
  };
}
