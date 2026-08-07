"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthErrorMessage } from "@/lib/auth/client";
import { useAuth } from "@/lib/auth/AuthContext";
import { useGoogleSignIn } from "@/lib/auth/useGoogleSignIn";

function getPostLoginHref(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/login")) {
    return "/dashboard";
  }
  return next;
}

function AuthPanel({ postLoginHref }: { postLoginHref: string }) {
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
        router.replace(postLoginHref);
      } catch (err) {
        setError(getAuthErrorMessage(err));
      } finally {
        setSubmitting(false);
      }
    },
    [postLoginHref, router, signIn],
  );

  const { buttonRef, loaded, error: googleError } = useGoogleSignIn(handleCredential, { renderButton: true });
  const disabled = submitting || status === "loading";

  return (
    <div className="grid w-full transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.22,1,.36,1)] [grid-template-rows:1fr]">
      <div className="min-h-0 overflow-visible px-3 pb-4">
        <div
          className="w-full rounded-[20px] border border-[#b9b9b9] bg-gradient-to-br from-[#fbfff8] to-[#f7fbf4] px-6 py-[30px] shadow-[0_3px_4px_rgba(0,0,0,0.25)] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] animate-[authPanelIn_520ms_cubic-bezier(.22,1,.36,1)] sm:px-[38px]"
        >
          <div
            ref={buttonRef}
            aria-label="Google sign-in"
            className={`flex min-h-[48px] w-full items-center justify-center overflow-hidden rounded-xl ${!loaded || disabled ? "pointer-events-none opacity-60" : ""}`}
          >
          {/* Google GIS renders its official button here; clicking it uses the OAuth popup flow. */}
          {/* The old custom button called id.prompt(), which triggered FedCM/One Tap. */}
          </div>
          {/*
            type="button"
            onClick={prompt}
            disabled={!loaded || disabled}
            className="flex min-h-[48px] w-full items-center justify-center gap-3 rounded-xl bg-[#1f1f1f] px-5 text-sm font-semibold text-white transition hover:bg-[#353535] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-5" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.52h3.24c1.9-1.75 2.98-4.34 2.98-7.37Z" />
              <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.4l-3.24-2.52c-.9.6-2.05.96-3.38.96-2.6 0-4.8-1.75-5.58-4.1H3.08v2.6A10 10 0 0 0 12 22Z" />
              <path fill="#FBBC05" d="M6.42 13.94A6 6 0 0 1 6.1 12c0-.67.12-1.32.32-1.94v-2.6H3.08A10 10 0 0 0 2 12c0 1.62.39 3.15 1.08 4.54l3.34-2.6Z" />
              <path fill="#EA4335" d="M12 5.96c1.47 0 2.8.51 3.84 1.51l2.88-2.88C16.95 2.94 14.7 2 12 2a10 10 0 0 0-8.92 5.46l3.34 2.6C7.2 7.71 9.4 5.96 12 5.96Z" />
            </svg>
            {loaded ? "Đăng nhập với Google" : "Đang tải Google..."}
          </button>*/}
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
    <section aria-label="Khu vực minh hoạ đăng nhập" className="relative hidden min-h-screen lg:block">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[12.1%] transition-colors duration-500" />
      <div
        aria-hidden
        className="absolute left-[14.6%] top-[12.1%] h-[75.8%] w-[71.7%] scale-100 overflow-visible bg-transparent opacity-100 transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] translate-x-0"
      >
        <Image src="/edua-logo.png" alt="Logo EDUA" width={367} height={441} className="absolute inset-0 h-full w-full max-w-none rounded-[28px] border border-[#9ec8d5] object-contain mix-blend-multiply" />
      </div>
      <div
        aria-hidden
        className="absolute bottom-0 right-0 size-[109px] scale-100 overflow-hidden bg-transparent transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
      >
        <Image src="/home/chem/Asset 4.svg" alt="" fill sizes="109px" className="object-contain p-3 opacity-60 mix-blend-multiply" />
        <Image src="/slide-assets/icons/light-bulb.svg" alt="" width={46} height={46} className="absolute bottom-2 right-2 opacity-60" />
      </div>
    </section>
  );
}

export function AuthFlow({ fontClassName }: { fontClassName: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useAuth();
  const postLoginHref = getPostLoginHref(searchParams.get("next"));

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(postLoginHref);
    }
  }, [postLoginHref, router, status]);

  return (
    <main className={`${fontClassName} relative min-h-screen overflow-x-hidden bg-[#fbfff8] text-[#191919]`}>
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
      <Image src="/slide-assets/icons/abacus.svg" alt="" width={116} height={116} className="pointer-events-none absolute left-[42%] top-[16%] z-20 hidden opacity-50 mix-blend-multiply lg:block" />
      <Image src="/slide-assets/icons/telescope.svg" alt="" width={98} height={98} className="pointer-events-none absolute right-[3%] top-[7%] z-20 hidden opacity-50 mix-blend-multiply lg:block" />
      <Image src="/slide-assets/icons/atom.svg" alt="" width={110} height={110} className="pointer-events-none absolute bottom-[16%] left-[39%] z-20 hidden opacity-50 mix-blend-multiply lg:block" />
      <Image src="/slide-assets/icons/graduation-cap.svg" alt="" width={144} height={144} className="pointer-events-none absolute bottom-[3%] left-[9%] z-20 hidden opacity-50 mix-blend-multiply lg:block" />
      <div className="mx-auto grid min-h-screen w-full max-w-[2000px] grid-cols-1 lg:grid-cols-[1fr_1fr]">
        <section className="relative flex min-h-screen items-center justify-center px-8 py-12 lg:px-10">
          <div
            aria-hidden
            className="absolute left-[11%] top-[4.5%] hidden size-[104px] overflow-hidden bg-transparent transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] md:block"
          >
            <Image src="/home/Asset 5.svg" alt="" fill sizes="104px" className="object-contain p-3 opacity-60 mix-blend-multiply" />
            <Image src="/slide-assets/icons/abacus.svg" alt="" width={46} height={46} className="absolute right-2 top-2 opacity-60" />
          </div>

          <div className="relative z-10 flex w-full max-w-[550px] flex-col items-center">
            <div className="mb-9 max-w-[650px] text-center transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] translate-y-0">
              <h1 className="font-libertine text-[42px] font-normal italic leading-none text-[#191919] md:text-[51px]">
                EDUA
              </h1>
              <p className="mt-1.5 font-libertine text-[22px] font-normal leading-tight text-[#191919] md:text-[26px]">
                Biến ý tưởng bài dạy thành giáo án và slide chỉ trong vài phút
              </p>
            </div>

            <AuthPanel postLoginHref={postLoginHref} />
          </div>
        </section>

        <GraphicArea />
      </div>
    </main>
  );
}
