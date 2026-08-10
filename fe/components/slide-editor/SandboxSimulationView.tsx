"use client";

/**
 * Chạy một thí nghiệm vật lý bên trong khung slide.
 *
 * Khác `components/sandbox/SandboxWorkbench.tsx` ở chỗ đây là bản CHỈ XEM:
 * không editor, không console, không thanh công cụ — toàn bộ khung dành cho
 * thí nghiệm, vì slide dùng để trình chiếu chứ không phải để sửa code.
 *
 * Chỉ được mount khi người dùng đã chủ động kích hoạt element (xem
 * `SimulationBlock` trong ElementView). Sandpack bundle bằng create-react-app
 * trong iframe tải từ codesandbox.io, nên mount sớm là vừa tốn mạng vừa tốn
 * vài giây chờ cho một element có thể không ai xem tới.
 */

import { useEffect, useState } from "react";
import { SandpackProvider, SandpackPreview } from "@codesandbox/sandpack-react";
import { loadSandboxExperiment, type SandboxExperiment } from "@/lib/api/sandbox-experiments";
import { SANDPACK_DEPENDENCIES, buildSandpackFiles } from "@/lib/sandbox/sandpack-project";

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full w-full items-center justify-center px-4 text-center text-xs text-white/70">
      {children}
    </div>
  );
}

export function SandboxSimulationView({ experimentId }: { experimentId: string }) {
  const [experiment, setExperiment] = useState<SandboxExperiment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Không reset state ở đầu effect: call site truyền `key={experimentId}` nên
  // đổi thí nghiệm là remount, effect này chỉ chạy đúng một lần khi mount.
  useEffect(() => {
    let cancelled = false;
    loadSandboxExperiment(experimentId)
      .then((loaded) => { if (!cancelled) setExperiment(loaded); })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Không tải được thí nghiệm.");
      });
    return () => { cancelled = true; };
  }, [experimentId]);

  if (error) return <Notice>{error}</Notice>;
  if (!experiment) return <Notice>Đang nạp thí nghiệm…</Notice>;

  return (
    <SandpackProvider
      key={experiment.id}
      template="react-ts"
      files={buildSandpackFiles(experiment.files, experiment.tailwindCss)}
      theme="dark"
      customSetup={{ dependencies: SANDPACK_DEPENDENCIES }}
      options={{ activeFile: experiment.focusPath, recompileMode: "delayed", recompileDelay: 700 }}
      style={{ height: "100%" }}
    >
      <SandpackPreview
        showNavigator={false}
        showOpenInCodeSandbox={false}
        showRefreshButton={false}
        style={{ height: "100%" }}
      />
    </SandpackProvider>
  );
}
