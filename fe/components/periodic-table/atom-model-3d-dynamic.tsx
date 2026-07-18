"use client";

import dynamic from 'next/dynamic';
import type { AtomModel3DProps } from './atom-model-3d';

const AtomModel3D = dynamic<AtomModel3DProps>(() => import('./atom-model-3d'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#fffdfb] text-xs text-[#8a8179]">
      Đang tải mô hình...
    </div>
  ),
});

export default AtomModel3D;
export {
  SUBSHELL_COLORS, SHELL_COLORS, SHELL_NAMES, getShellDistribution,
} from './atom-model-3d';
export { getEnergySubshells } from './orbital-data';
export type { Subshell } from './orbital-data';
