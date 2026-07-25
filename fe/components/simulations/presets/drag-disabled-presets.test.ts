import { describe, expect, it } from "vitest";
import type { Scene } from "../engines/mechanics/types";
import { doPTBangLucKe } from "./do-p-t-bang-luc-ke";
import { vaChamDanHoi } from "./va-cham-dan-hoi";
import { vaChamMem } from "./va-cham-mem";
import { tongHopHaiLucCungPhuong } from "./tong-hop-hai-luc-cung-phuong";
import { lucHuongTam } from "./luc-huong-tam";

describe("presets with calibrated, non-draggable apparatus", () => {
  it.each([
    ["soft collision", vaChamMem, { m1: 1, m2: 2, v1: 4 }],
    ["elastic collision", vaChamDanHoi, { m1: 1, m2: 2, v1: 4 }],
    ["force meter", doPTBangLucKe, { mass: 1 }],
    ["force synthesis", tongHopHaiLucCungPhuong, { F1: 10, F2: 14, m: 4 }],
    ["centripetal force", lucHuongTam, { r: 1.2, omega: 2.5, m: 0.5 }],
  ])("disables dragging in %s", (_name, preset, params) => {
    const scene = preset.applyParams(params) as Scene;

    expect(scene.disableDragging).toBe(true);
  });
});
