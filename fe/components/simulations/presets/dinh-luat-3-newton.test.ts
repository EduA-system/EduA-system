import { describe, expect, it } from "vitest";
import type { Scene } from "../engines/mechanics/types";
import { collisionOutcome, collisionParams, motionWithWall } from "../newton-third-law/collision-physics";
import { stateAt } from "../newton-third-law/NewtonThirdLawScene";
import { dinhLuat3Newton } from "./dinh-luat-3-newton";

describe("Định luật III Newton — va chạm một chiều", () => {
  it("khởi tạo hai vật cách xa nhau và không có lò xo", () => {
    const scene = dinhLuat3Newton.applyParams({ mA: 1, mB: 2, speedA: 2.2, speedB: 1.6 }) as Scene;
    expect(scene.bodies).toHaveLength(2);
    expect(scene.bodies[0]!.x).toBeLessThan(scene.bodies[1]!.x);
    expect(scene.bodies[0]!.vx).toBeGreaterThan(0);
    expect(scene.bodies[1]!.vx).toBeLessThan(0);
    expect(scene.forces).toEqual([]);
  });

  it("tính vận tốc sau va chạm và bảo toàn động lượng", () => {
    const outcome = collisionOutcome(collisionParams({ mA: 1, mB: 2, speedA: 2.2, speedB: 1.6 }));
    expect(outcome.vA).toBeLessThan(0);
    expect(outcome.vB).toBeGreaterThan(0);
    expect(Math.abs(outcome.vB - outcome.vA)).toBeLessThan(Math.abs(outcome.uB - outcome.uA));
    expect(outcome.momentumAfter).toBeCloseTo(outcome.momentumBefore, 10);
  });

  it("xung lượng tác dụng lên hai vật có cùng độ lớn", () => {
    const params = collisionParams({ mA: 1, mB: 3, speedA: 3, speedB: 1 });
    const outcome = collisionOutcome(params);
    expect(Math.abs(params.mA * (outcome.vA - outcome.uA))).toBeCloseTo(
      Math.abs(params.mB * (outcome.vB - outcome.uB)),
      10,
    );
  });

  it("đặt hai xe cách xa và cho hai mép chạm đúng tại thời điểm va chạm", () => {
    const values = { mA: 1, mB: 2, speedA: 2.2, speedB: 1.6 };
    const initial = stateAt(values, 0);
    const impact = stateAt(values, initial.collisionTime);
    const after = stateAt(values, initial.collisionTime + 0.8);

    expect(initial.xB - initial.xA).toBeGreaterThan(400);
    expect(impact.xA + 43).toBeCloseTo(impact.xB - 43, 8);
    expect(after.xA).toBeLessThan(impact.xA);
    expect(after.xB).toBeGreaterThan(impact.xB);
  });

  it("cho xe nảy ngược hướng sau khi chạm tường", () => {
    const beforeWall = motionWithWall(557, -2, 2, 153, 1047, 52);
    const afterWall = motionWithWall(557, -2, 5, 153, 1047, 52);
    expect(beforeWall.velocity).toBeLessThan(0);
    expect(afterWall.hit).toBe(true);
    expect(afterWall.velocity).toBeGreaterThan(0);
    expect(Math.abs(afterWall.velocity)).toBeLessThan(Math.abs(beforeWall.velocity));
    expect(afterWall.position).toBeGreaterThanOrEqual(153);
  });

  it("cập nhật gia tốc đúng hướng trong từng pha va chạm", () => {
    const values = { mA: 1, mB: 1, speedA: 2.2, speedB: 2.2 };
    const initial = stateAt(values, 0);
    const impact = stateAt(values, initial.collisionTime + 0.09);
    const wallImpact = stateAt(values, 8.4);

    expect(initial.accelerationA).toBe(0);
    expect(initial.accelerationB).toBe(0);
    expect(impact.accelerationA).toBeLessThan(0);
    expect(impact.accelerationB).toBeGreaterThan(0);
    expect(wallImpact.accelerationA).toBeGreaterThan(0);
    expect(wallImpact.accelerationB).toBeLessThan(0);
  });

  it("xử lý va chạm lặp lại và chỉ kết thúc khi cả hai xe đứng yên", () => {
    const values = { mA: 1, mB: 1, speedA: 5, speedB: 5 };
    const repeatedImpact = stateAt(values, 10);
    const finalState = stateAt(values, 20);

    expect(repeatedImpact.cartCollisionCount).toBeGreaterThanOrEqual(2);
    expect(finalState.settled).toBe(true);
    expect(finalState.velocityA).toBe(0);
    expect(finalState.velocityB).toBe(0);
  });
});
