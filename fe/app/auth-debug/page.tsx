"use client";

import { useCallback, useMemo, useState } from "react";
import { getAuthErrorMessage } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useGoogleSignIn } from "@/lib/auth/useGoogleSignIn";

function copyText(value: string, setMessage: (message: string) => void) {
  void navigator.clipboard.writeText(value).then(
    () => setMessage("Đã sao chép."),
    () => setMessage("Không thể sao chép tự động. Hãy sao chép thủ công."),
  );
}

export default function AuthDebugPage() {
  const { accessToken, signIn, signOut, status, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCredential = useCallback(
    async (credential: string) => {
      setSubmitting(true);
      setError(null);
      setMessage(null);
      try {
        await signIn(credential);
      } catch (err) {
        setError(getAuthErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [signIn],
  );

  const { buttonRef, error: googleError, loaded } = useGoogleSignIn(handleCredential);
  const curlCommand = useMemo(() => {
    if (!accessToken) {
      return null;
    }

    return `curl.exe -i -X PATCH "http://localhost:8080/api/users/me" -H "Authorization: Bearer ${accessToken}" -H "Content-Type: application/json" -d '{"fullName":"Test Profile"}'`;
  }, [accessToken]);

  if (process.env.NODE_ENV === "production") {
    return (
      <main className="mx-auto max-w-2xl p-8">
        <h1 className="text-xl font-semibold">Auth debug chỉ dùng khi phát triển</h1>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-medium text-cyan-300">Development only</p>
          <h1 className="mt-1 text-3xl font-bold">Google login & API access</h1>
          <p className="mt-2 text-slate-300">
            Đăng nhập để lấy access token gọi API backend. Không gửi token này cho người khác.
          </p>
        </header>

        {!accessToken && (
          <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
            <h2 className="font-semibold">Đăng nhập Google</h2>
            <div className="mt-4 min-h-10" ref={buttonRef} />
            {!loaded && <p className="mt-3 text-sm text-slate-400">Đang tải Google Sign-In…</p>}
            {submitting && <p className="mt-3 text-sm text-slate-400">Đang đăng nhập…</p>}
          </section>
        )}

        {(error || googleError) && (
          <p className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-200" role="alert">
            {error ?? googleError}
          </p>
        )}

        <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="font-semibold">Session</h2>
          <p className="mt-2 text-sm text-slate-300">Trạng thái: {status}</p>
          {user && (
            <pre className="mt-4 overflow-x-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-200">
              {JSON.stringify(user, null, 2)}
            </pre>
          )}
        </section>

        {accessToken && (
          <>
            <section className="rounded-xl border border-amber-700 bg-amber-950/50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold text-amber-100">Access token</h2>
                <button
                  type="button"
                  onClick={() => copyText(accessToken, setMessage)}
                  className="rounded-md bg-amber-300 px-3 py-1.5 text-sm font-semibold text-slate-950"
                >
                  Sao chép token
                </button>
              </div>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-slate-950 p-4 text-xs text-amber-100">
                {accessToken}
              </pre>
            </section>

            <section className="rounded-xl border border-slate-700 bg-slate-900 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-semibold">Lệnh test profile</h2>
                {curlCommand && (
                  <button
                    type="button"
                    onClick={() => copyText(curlCommand, setMessage)}
                    className="rounded-md border border-slate-500 px-3 py-1.5 text-sm font-semibold"
                  >
                    Sao chép cURL
                  </button>
                )}
              </div>
              <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-xs text-slate-200">
                {curlCommand}
              </pre>
            </section>

            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-md border border-red-500 px-4 py-2 text-sm font-semibold text-red-200"
            >
              Đăng xuất
            </button>
          </>
        )}

        {message && <p className="text-sm text-cyan-200">{message}</p>}
      </div>
    </main>
  );
}
