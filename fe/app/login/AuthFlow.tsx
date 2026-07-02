"use client";

import { useMemo, useState } from "react";

type AuthMode = "signIn" | "signUp" | "reset";

type FieldConfig = {
  id: string;
  label?: string;
  placeholder: string;
  type?: string;
  centered?: boolean;
  showPasswordIcon?: boolean;
};

type ModeConfig = {
  eyebrow?: string;
  fields: FieldConfig[];
  buttonLabel: string;
  footerText?: string;
  footerAction?: string;
  footerMode?: AuthMode;
  showGoogle?: boolean;
  showForgot?: boolean;
  cardTone: string;
};

const modeConfig: Record<AuthMode, ModeConfig> = {
  signIn: {
    showGoogle: true,
    showForgot: true,
    fields: [
      { id: "email", label: "Email", placeholder: "Enter your email", type: "email" },
      {
        id: "password",
        label: "Password",
        placeholder: "Enter password",
        type: "password",
        showPasswordIcon: true,
      },
    ],
    buttonLabel: "Login in",
    footerText: "Don't have an account?",
    footerAction: "SIGN UP",
    footerMode: "signUp",
    cardTone: "from-[#fbfff8] to-[#f7fbf4]",
  },
  signUp: {
    fields: [
      { id: "signup-email", label: "Email", placeholder: "Enter your email", type: "email" },
      {
        id: "signup-password",
        label: "Password",
        placeholder: "Enter password",
        type: "password",
        showPasswordIcon: true,
      },
      {
        id: "signup-confirm",
        label: "Confirm password",
        placeholder: "Enter again password",
        type: "password",
        showPasswordIcon: true,
      },
    ],
    buttonLabel: "Sign up",
    footerText: "Already sign up ?",
    footerAction: "SIGN IN",
    footerMode: "signIn",
    cardTone: "from-[#fbfff8] to-[#fffaf8]",
  },
  reset: {
    eyebrow: "Find your account.",
    fields: [
      { id: "reset-email", placeholder: "Enter your email", type: "email", centered: true },
      { id: "reset-code", placeholder: "Enter verification code", centered: true },
      {
        id: "reset-password",
        placeholder: "Enter password",
        type: "password",
        showPasswordIcon: true,
      },
      {
        id: "reset-confirm",
        placeholder: "Enter again password",
        type: "password",
        showPasswordIcon: true,
      },
    ],
    buttonLabel: "Reset password",
    footerText: "Remember your password?",
    footerAction: "SIGN IN",
    footerMode: "signIn",
    cardTone: "from-[#fbfff8] to-[#f8fbff]",
  },
};

function GoogleMark() {
  return (
    <svg aria-hidden className="size-6 shrink-0" viewBox="0 0 30 31" fill="none">
      <path d="M29.42 15.86c0-1.08-.1-2.12-.28-3.13H15v5.92h8.08a6.9 6.9 0 0 1-2.99 4.52v3.84h4.85c2.84-2.66 4.48-6.57 4.48-11.15Z" fill="#448AFF" />
      <path d="M15 30.5c4.05 0 7.45-1.37 9.94-3.7l-4.85-3.84c-1.35.92-3.07 1.47-5.09 1.47-3.91 0-7.22-2.69-8.4-6.3H1.59v3.97A14.99 14.99 0 0 0 15 30.5Z" fill="#43A047" />
      <path d="M6.6 18.13a9.18 9.18 0 0 1 0-5.76V8.4H1.59a15.18 15.18 0 0 0 0 13.7l5.01-3.97Z" fill="#FFC107" />
      <path d="M15 6.08c2.2 0 4.18.77 5.74 2.28l4.31-4.39C22.45 1.5 19.05 0 15 0A14.99 14.99 0 0 0 1.59 8.4l5.01 3.97c1.18-3.61 4.49-6.29 8.4-6.29Z" fill="#F44336" />
    </svg>
  );
}

function PasswordIcon() {
  return (
    <svg aria-hidden className="size-[18px]" viewBox="0 0 24 24" fill="none">
      <path
        d="M2.5 12s3.25-6 9.5-6 9.5 6 9.5 6-3.25 6-9.5 6-9.5-6-9.5-6Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 15.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function AuthInput({ field }: { field: FieldConfig }) {
  return (
    <label className="block">
      {field.label ? (
        <span className="mb-2 ml-1 block text-base font-medium leading-none text-[#4b4b4b]">
          {field.label}
        </span>
      ) : null}
      <span className="relative block">
        <input
          type={field.type ?? "text"}
          placeholder={field.placeholder}
          className={`h-[51px] w-full rounded-[14px] border border-[#a49d9d] bg-white px-4 pr-12 text-base font-normal text-[#424242] shadow-[0_2px_4px_rgba(0,0,0,0.18)] outline-none transition duration-300 placeholder:text-[#bdbdbd] focus:border-[#272727] focus:shadow-[0_3px_6px_rgba(0,0,0,0.18)] ${field.centered ? "text-center placeholder:text-center" : ""}`}
        />
        {field.showPasswordIcon ? (
          <span className="pointer-events-none absolute right-4 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-[#6d6d6d]">
            <PasswordIcon />
          </span>
        ) : null}
      </span>
    </label>
  );
}

function AuthPanel({ mode, onModeChange }: { mode: AuthMode; onModeChange: (mode: AuthMode) => void }) {
  const config = modeConfig[mode];

  return (
    <div className="grid w-full transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.22,1,.36,1)] [grid-template-rows:1fr]">
      <div className="min-h-0 overflow-visible px-3 pb-4">
        <div
          key={mode}
          className={`w-full rounded-[20px] border border-[#b9b9b9] bg-gradient-to-br ${config.cardTone} px-6 py-[30px] shadow-[0_3px_4px_rgba(0,0,0,0.25)] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] animate-[authPanelIn_520ms_cubic-bezier(.22,1,.36,1)] sm:px-[38px]`}
        >
          {config.eyebrow ? (
            <div className="mb-6 text-center text-base font-semibold leading-tight text-[#4b4b4b]">
              {config.eyebrow}
            </div>
          ) : null}

          {config.showGoogle ? (
            <>
              <button
                type="button"
                className="flex h-[51px] w-full items-center justify-center gap-2.5 rounded-[14px] border border-[#a49d9d] text-base font-medium text-[#424242] shadow-[0_3px_4px_rgba(0,0,0,0.18)] transition duration-300 hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#272727]"
              >
                <GoogleMark />
                <span>Continue with Google</span>
              </button>
              <div className="my-6 text-center text-base font-normal leading-none text-[#a3a3a3]">
                OR
              </div>
            </>
          ) : null}

          <form className="space-y-5">
            {config.fields.map((field) => (
              <AuthInput key={field.id} field={field} />
            ))}

            {config.showForgot ? (
              <button
                type="button"
                onClick={() => onModeChange("reset")}
                className="block text-base italic leading-none text-[#4b4b4b] transition hover:text-[#272727]"
              >
                Forgot password?
              </button>
            ) : null}

            <div className="flex justify-center pt-1">
              <button
                type="submit"
                className={`${mode === "reset" ? "w-full" : "w-[210px]"} h-[51px] rounded-[14px] border border-[#a49d9d] bg-[#272727] text-base font-semibold text-white shadow-[0_3px_4px_rgba(0,0,0,0.25)] transition duration-300 hover:bg-[#111111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#272727]`}
              >
                {config.buttonLabel}
              </button>
            </div>
          </form>

          {config.footerText && config.footerAction && config.footerMode ? (
            <p className="mt-6 text-center text-base leading-none text-[#4b4b4b]">
              {config.footerText}{" "}
              <button
                type="button"
                onClick={() => onModeChange(config.footerMode!)}
                className="font-semibold transition hover:text-[#272727]"
              >
                {config.footerAction}
              </button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function GraphicArea({ mode }: { mode: AuthMode }) {
  const offset = mode === "signIn" ? "translate-x-0" : mode === "signUp" ? "translate-x-5" : "-translate-x-5";
  const accent = mode === "reset" ? "bg-[#d9e6ff]" : mode === "signUp" ? "bg-[#ffe1d7]" : "bg-[#d9d9d9]";

  return (
    <section aria-label="Auth graphic area" className="relative hidden min-h-screen lg:block">
      <div aria-hidden className="absolute inset-x-0 top-0 h-[12.1%] transition-colors duration-500" />
      <div
        aria-hidden
        className={`absolute left-[14.6%] top-[12.1%] h-[75.8%] w-[71.7%] ${accent} opacity-100 transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${offset} ${mode === "reset" ? "scale-[.96] rounded-[32px]" : "scale-100 rounded-none"}`}
      />
      <div
        aria-hidden
        className={`absolute bottom-0 right-0 size-[109px] ${accent} transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)] ${mode === "signUp" ? "scale-110" : "scale-100"}`}
      />
    </section>
  );
}

export function AuthFlow({ fontClassName }: { fontClassName: string }) {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const headlineOffset = useMemo(() => {
    if (mode === "signUp") return "translate-y-2";
    if (mode === "reset") return "-translate-y-1";
    return "translate-y-0";
  }, [mode]);

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
            <div className={`mb-9 max-w-[650px] text-center transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] ${headlineOffset}`}>
              <h1 className="font-libertine text-[42px] font-normal italic leading-none text-[#191919] md:text-[51px]">
                AI Cognitive
              </h1>
              <p className="mt-1.5 font-libertine text-[22px] font-normal leading-tight text-[#191919] md:text-[26px]">
                Transform lesson ideas into well-structured presentation slides in minutes
              </p>
            </div>

            <AuthPanel mode={mode} onModeChange={setMode} />
          </div>
        </section>

        <GraphicArea mode={mode} />
      </div>
    </main>
  );
}