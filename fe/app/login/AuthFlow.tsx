"use client";

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

function AuthPanel() {
  return (
    <div className="grid w-full transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.22,1,.36,1)] [grid-template-rows:1fr]">
      <div className="min-h-0 overflow-visible px-3 pb-4">
        <div
          className="w-full rounded-[20px] border border-[#b9b9b9] bg-gradient-to-br from-[#fbfff8] to-[#f7fbf4] px-6 py-[30px] shadow-[0_3px_4px_rgba(0,0,0,0.25)] transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)] animate-[authPanelIn_520ms_cubic-bezier(.22,1,.36,1)] sm:px-[38px]"
        >
          <button
            type="button"
            className="flex h-[51px] w-full items-center justify-center gap-2.5 rounded-[14px] border border-[#a49d9d] text-base font-medium text-[#424242] shadow-[0_3px_4px_rgba(0,0,0,0.18)] transition duration-300 hover:bg-white/70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#272727]"
          >
            <GoogleMark />
            <span>Continue with Google</span>
          </button>
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
