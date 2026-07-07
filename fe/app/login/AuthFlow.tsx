"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthErrorMessage } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useGoogleSignIn } from "@/lib/auth/useGoogleSignIn";

function AuthPanel() {
  const router = useRouter();
  const { signIn, status } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleCredential = useCallback(
    async (credential: string) => {
      setSubmitting(true);
      setError(null);
      try {
        await signIn(credential);
        router.push("/blog");
      } catch (err) {
        setError(getAuthErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [router, signIn],
  );

  const { buttonRef, loaded, error: googleError } = useGoogleSignIn(handleCredential);
  const disabled = submitting || status === "loading";

  return (
    <div className="grid w-full transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.22,1,.36,1)] [grid-template-rows:1fr]">
      <div className="min-h-0 overflow-visible px-3 pb-4">
        <div
          className="w-full rounded-[20px] border border-[#b9b9b9] bg-gradient-to-br from-[#fbfff8] to-[#f7fbf4] px-6 py-[30px] shadow-[0_3px_4px_rgba(0,0,0,0.25)] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] animate-[authPanelIn_520ms_cubic-bezier(.22,1,.36,1)] sm:px-[38px]"
        >
          <div className="flex min-h-[51px] w-full items-center justify-center rounded-[14px] border border-[#a49d9d] bg-white/30 shadow-[0_3px_4px_rgba(0,0,0,0.18)]">
            {!loaded && <span className="text-sm font-medium text-[#424242]">Đang tải Google...</span>}
            <div
              ref={buttonRef}
              className={disabled ? "pointer-events-none opacity-60" : undefined}
            />
          </div>
          {submitting && <p className="mt-3 text-sm font-medium text-[#424242]">Đang đăng nhập...</p>}
          {(error || googleError) && (
            <p className="mt-3 text-sm font-medium text-red-600" role="alert">
              {error ?? googleError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function GraphicArea() {
  return (
    <section aria-label="Auth graphic area" className="relative hidden min-h-screen lg:block">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[12.1%] transition-colors duration-500" />
      <div
        aria-hidden
        className="absolute left-[14.6%] top-[12.1%] h-[75.8%] w-[71.7%] scale-100 rounded-none bg-[#d9d9d9] opacity-100 transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] translate-x-0"
      />
      <div
        aria-hidden
        className="absolute bottom-0 right-0 size-[109px] scale-100 bg-[#d9d9d9] transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
      />
    </section>
  );
}

export function AuthFlow({ fontClassName }: { fontClassName: string }) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/blog");
    }
  }, [router, status]);

  return (
    <main className={`${fontClassName} min-h-screen overflow-x-hidden bg-[#fbfff8] text-[#191919]`}>
      <style jsx global>{`
        @keyframes authPanelIn {
          0% {
            opacity: 0;
            transform: translateY(18px) scale(0.97);
            filter: blur(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
            filter: blur(0);
          }
        }
      `}</style>
      <div className="mx-auto grid min-h-screen w-full max-w-[2000px] grid-cols-1 lg:grid-cols-[1fr_1fr]">
        <section className="relative flex min-h-screen items-center justify-center px-8 py-12 lg:px-10">
          <div
            aria-hidden
            className="absolute left-[11%] top-[4.5%] hidden size-[104px] bg-[#d9d9d9] transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] md:block"
          />

          <div className="relative z-10 flex w-full max-w-[550px] flex-col items-center">
            <div className="mb-9 max-w-[650px] text-center transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] translate-y-0">
              <h1 className="font-libertine text-[42px] font-normal italic leading-none text-[#191919] md:text-[51px]">
                AI Cognitive
              </h1>
              <p className="mt-1.5 font-libertine text-[22px] font-normal leading-tight text-[#191919] md:text-[26px]">
                Transform lesson ideas into well-structured presentation slides in minutes
              </p>
            </div>

            <AuthPanel />
          </div>
        </section>

        <GraphicArea />
      </div>
    </main>
  );
}
