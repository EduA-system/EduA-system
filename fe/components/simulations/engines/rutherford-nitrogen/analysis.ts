import { GAS_ORDER } from "./constants";
import type { GasType, RutherfordMetrics } from "./types";

export type GasComparisonRow = {
  gas: GasType;
  emitted: number;
  absorbed: number;
  collisions: number;
  protonsReached: number;
  flashes: number;
  reactionRate: number;
};

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function gasComparison(metrics: RutherfordMetrics): GasComparisonRow[] {
  return GAS_ORDER.map((gas) => {
    const stats = metrics.gasStats[gas];
    return {
      gas,
      ...stats,
      reactionRate: stats.emitted > 0 ? stats.collisions / stats.emitted : 0,
    };
  });
}

export function rutherfordConclusion(metrics: RutherfordMetrics): string {
  const current = metrics.gasStats[metrics.currentGas];
  if (current.emitted === 0) {
    return "Chưa có đủ dữ liệu. Hãy phát hạt α để so sánh số proton tới màn và số chớp ZnS.";
  }
  return `Với khí hiện tại, mô phỏng ghi nhận ${current.protonsReached} proton tới màn trên ${current.emitted} hạt α đã phát; ${current.absorbed} hạt α bị lớp chắn chặn.`;
}
