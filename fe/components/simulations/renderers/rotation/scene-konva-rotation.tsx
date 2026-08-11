"use client";

import { useEffect, useRef } from "react";
import Konva from "konva";
import type {
  RotationScene,
  RotationState,
} from "../../engines/rotation/types";
import {
  initialRotationState,
  rotationStateAt,
  rotationTorques,
  stepRotation,
} from "../../engines/rotation/physics";
import { useContainerSize } from "../../shared/use-container-size";
import { SceneKonvaSeesaw } from "./scene-konva-seesaw";

const RAD_TO_DEG = 180 / Math.PI;
const BACKGROUND = "#0f172a";
const GRID = "#1f2c45";
const STEEL = "#94a3b8";
const STEEL_DARK = "#334155";
const FORCE_1 = "#38bdf8";
const FORCE_2 = "#fbbf24";

type RotationRendererProps = {
  scene: RotationScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  seekSeconds?: number;
  seekToken?: number;
  markLabel?: string;
  speed?: number;
};

type Point = { x: number; y: number };

function unitVector(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: dx / length, y: dy / length };
}

function addGrid(layer: Konva.Layer, width: number, height: number) {
  layer.add(
    new Konva.Rect({
      x: 0,
      y: 0,
      width,
      height,
      fill: BACKGROUND,
      listening: false,
    }),
  );
  for (let x = 0; x <= width; x += 44) {
    layer.add(
      new Konva.Line({
        points: [x, 0, x, height],
        stroke: GRID,
        strokeWidth: 1,
        listening: false,
      }),
    );
  }
  for (let y = 0; y <= height; y += 44) {
    layer.add(
      new Konva.Line({
        points: [0, y, width, y],
        stroke: GRID,
        strokeWidth: 1,
        listening: false,
      }),
    );
  }
}

function addTag(
  layer: Konva.Layer,
  x: number,
  y: number,
  text: string,
  color: string,
): Konva.Label {
  const label = new Konva.Label({ x, y, listening: false });
  label.add(
    new Konva.Tag({
      fill: "#07111f",
      stroke: color,
      strokeWidth: 1,
      cornerRadius: 7,
      opacity: 0.96,
    }),
    new Konva.Text({
      text,
      fill: color,
      fontFamily: "monospace",
      fontStyle: "bold",
      fontSize: 13,
      padding: 6,
    }),
  );
  layer.add(label);
  return label;
}

function createSingleWeight(
  mass: number,
  color: string,
  label: string,
): { group: Konva.Group; height: number } {
  const width = 42 + mass * 12;
  const height = 42 + mass * 10;
  const group = new Konva.Group({ listening: false });
  group.add(
    new Konva.Circle({
      x: 0,
      y: 5,
      radius: 5,
      fill: "#e2e8f0",
      stroke: STEEL_DARK,
      strokeWidth: 2,
    }),
    new Konva.Line({
      points: [0, 10, 0, 17],
      stroke: "#e2e8f0",
      strokeWidth: 3,
      lineCap: "round",
    }),
    new Konva.Rect({
      x: -width / 2,
      y: 17,
      width,
      height,
      fill: color,
      stroke: "#e2e8f0",
      strokeWidth: 2,
      cornerRadius: 6,
      shadowColor: "#020617",
      shadowBlur: 8,
      shadowOpacity: 0.45,
    }),
    new Konva.Text({
      x: -width / 2,
      y: 30,
      width,
      text: label,
      align: "center",
      fill: "#082f49",
      fontFamily: "monospace",
      fontStyle: "bold",
      fontSize: 13,
    }),
    new Konva.Text({
      x: -width / 2,
      y: 47,
      width,
      text: `${mass.toFixed(1)} kg`,
      align: "center",
      fill: "#082f49",
      fontFamily: "monospace",
      fontStyle: "bold",
      fontSize: 11,
    }),
  );
  return { group, height: height + 17 };
}

function createWeightStack(
  mass: number,
  color: string,
  label: string,
): { group: Konva.Group; height: number } {
  const plateCount = Math.max(2, Math.min(5, Math.round(mass * 5)));
  const group = new Konva.Group({ listening: false });
  group.add(
    new Konva.Circle({
      x: 0,
      y: 5,
      radius: 5,
      fill: "#e2e8f0",
      stroke: STEEL_DARK,
      strokeWidth: 2,
    }),
    new Konva.Line({
      points: [0, 10, 0, 19],
      stroke: "#e2e8f0",
      strokeWidth: 3,
      lineCap: "round",
    }),
  );
  for (let index = 0; index < plateCount; index += 1) {
    group.add(
      new Konva.Rect({
        x: -21,
        y: 19 + index * 14,
        width: 42,
        height: 11,
        fill: index % 2 === 0 ? color : "#7dd3fc",
        stroke: "#e0f2fe",
        strokeWidth: 1.5,
        cornerRadius: 3,
      }),
    );
  }
  const textY = 23 + plateCount * 14;
  group.add(
    new Konva.Text({
      x: -40,
      y: textY,
      width: 80,
      text: `${label} · ${mass.toFixed(1)} kg`,
      align: "center",
      fill: color,
      fontFamily: "monospace",
      fontStyle: "bold",
      fontSize: 12,
    }),
  );
  return { group, height: textY + 15 };
}

export function SceneKonvaRotation(props: RotationRendererProps) {
  if (props.scene.variant === "seesaw") {
    return <SceneKonvaSeesaw {...props} />;
  }
  return <SceneKonvaMomentDisk {...props} />;
}

function SceneKonvaMomentDisk({
  scene,
  running,
  resetSignal,
  onRunningChange,
  seekSeconds,
  seekToken,
  markLabel,
  speed = 1,
}: RotationRendererProps) {
  const { ref: containerRef, size } = useContainerSize<HTMLDivElement>();
  const runningRef = useRef(running);
  const speedRef = useRef(speed);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const container = containerRef.current;
    const { width: width, height } = size;
    if (!container || width === 0 || height === 0) return;

    const stage = new Konva.Stage({ container, width, height });
    const layer = new Konva.Layer();
    stage.add(layer);
    addGrid(layer, width, height);

    const center: Point = { x: width * 0.4, y: height * 0.36 };
    const diskPx = Math.min(width * 0.21, height * 0.232);
    const scale = diskPx / scene.diskRadius;
    const baseY = height - 46;
    const rulerY = Math.min(baseY - 118, center.y + diskPx + 28);

    // Khung và giá đỡ được vẽ trước đĩa để trục O luôn nằm ở lớp trên cùng.
    layer.add(
      new Konva.Rect({
        x: 24,
        y: baseY,
        width: width - 48,
        height: 15,
        fill: STEEL_DARK,
        stroke: STEEL,
        strokeWidth: 2,
        cornerRadius: 5,
        listening: false,
      }),
      new Konva.Rect({
        x: 40,
        y: baseY + 15,
        width: width - 80,
        height: 8,
        fill: "#07101d",
        cornerRadius: 4,
        opacity: 0.8,
        listening: false,
      }),
      new Konva.Line({
        points: [center.x, baseY, center.x, center.y + diskPx + 8],
        stroke: "#1e293b",
        strokeWidth: 16,
        lineCap: "round",
        listening: false,
      }),
      new Konva.Line({
        points: [center.x, baseY, center.x, center.y + diskPx + 8],
        stroke: STEEL,
        strokeWidth: 8,
        lineCap: "round",
        listening: false,
      }),
      new Konva.Rect({
        x: center.x - 54,
        y: baseY - 5,
        width: 108,
        height: 10,
        fill: STEEL,
        stroke: "#cbd5e1",
        strokeWidth: 1.5,
        cornerRadius: 4,
        listening: false,
      }),
    );

    const wheel = new Konva.Group({
      x: center.x,
      y: center.y,
      listening: false,
    });
    layer.add(wheel);
    wheel.add(
      new Konva.Circle({
        radius: diskPx,
        fill: "#153047",
        stroke: "#7dd3fc",
        strokeWidth: 4,
        shadowColor: "#020617",
        shadowBlur: 16,
        shadowOpacity: 0.52,
      }),
    );
    for (let radius = 0.2; radius <= scene.diskRadius + 0.001; radius += 0.2) {
      wheel.add(
        new Konva.Circle({
          radius: radius * scale,
          fill: radius === 0.2 ? "#e0f2fe" : undefined,
          stroke: radius === scene.diskRadius ? "#38bdf8" : "#49bde7",
          strokeWidth: radius === scene.diskRadius ? 3 : 1.5,
          opacity: radius === scene.diskRadius ? 1 : 0.82,
        }),
      );
    }
    wheel.add(
      new Konva.Line({
        points: [16, 0, diskPx - 13, 0],
        stroke: "#f8fafc",
        strokeWidth: 2,
        dash: [7, 6],
        opacity: 0.72,
      }),
      ...Array.from({ length: 8 }, (_, index) => {
        const angle = (index * Math.PI) / 4;
        return new Konva.Circle({
          x: Math.cos(angle) * (diskPx - 11),
          y: Math.sin(angle) * (diskPx - 11),
          radius: 3,
          fill: index === 0 ? "#fb7185" : "#bae6fd",
          opacity: 0.9,
        });
      }),
    );

    // Thước đo bán kính đặt dưới đĩa, cùng màu dụng cụ nhưng tách rõ khỏi lưới.
    const rulerX = center.x - diskPx;
    const rulerWidth = diskPx * 2;
    layer.add(
      new Konva.Rect({
        x: rulerX,
        y: rulerY,
        width: rulerWidth,
        height: 28,
        fill: "#d1fae5",
        stroke: "#34d399",
        strokeWidth: 2,
        cornerRadius: 3,
        listening: false,
      }),
    );
    for (let index = 0; index <= 18; index += 1) {
      const x = rulerX + (rulerWidth * index) / 18;
      const tickHeight = index % 3 === 0 ? 13 : 8;
      layer.add(
        new Konva.Line({
          points: [x, rulerY + 28, x, rulerY + 28 - tickHeight],
          stroke: "#0f766e",
          strokeWidth: index % 3 === 0 ? 2 : 1.2,
          listening: false,
        }),
      );
    }
    layer.add(
      new Konva.Text({
        x: rulerX,
        y: rulerY + 34,
        width: rulerWidth,
        text: "THƯỚC ĐO BÁN KÍNH",
        align: "center",
        fill: "#6ee7b7",
        fontSize: 11,
        fontFamily: "monospace",
        fontStyle: "bold",
        listening: false,
      }),
    );

    const leftAnchor: Point = {
      x: center.x - scene.left.radius * scale,
      y: center.y,
    };
    const rightAngle = -Math.PI / 3.6;
    const rightAnchor: Point = {
      x: center.x + Math.cos(rightAngle) * scene.right.radius * scale,
      y: center.y + Math.sin(rightAngle) * scene.right.radius * scale,
    };
    const tangentAngle = rightAngle + Math.PI / 2;
    const tangent = {
      x: Math.cos(tangentAngle),
      y: Math.sin(tangentAngle),
    };
    const guideLength = Math.min(250, width * 0.2);
    const pulley: Point = {
      x: rightAnchor.x + tangent.x * guideLength,
      y: rightAnchor.y + tangent.y * guideLength,
    };
    const supportX = Math.min(width - 66, pulley.x + 112);

    // Giá phải, ngàm trượt và puly đổi vị trí theo d₁ để dây luôn tiếp tuyến.
    layer.add(
      new Konva.Line({
        points: [supportX, 58, supportX, baseY],
        stroke: "#1e293b",
        strokeWidth: 16,
        lineCap: "round",
        listening: false,
      }),
      new Konva.Line({
        points: [supportX, 58, supportX, baseY],
        stroke: STEEL,
        strokeWidth: 8,
        lineCap: "round",
        listening: false,
      }),
      new Konva.Rect({
        x: supportX - 35,
        y: pulley.y - 19,
        width: 70,
        height: 38,
        fill: STEEL_DARK,
        stroke: "#cbd5e1",
        strokeWidth: 2,
        cornerRadius: 5,
        listening: false,
      }),
      new Konva.Line({
        points: [pulley.x + 21, pulley.y, supportX - 35, pulley.y],
        stroke: "#cbd5e1",
        strokeWidth: 7,
        lineCap: "round",
        listening: false,
      }),
      new Konva.Rect({
        x: supportX - 45,
        y: baseY - 5,
        width: 90,
        height: 10,
        fill: STEEL,
        cornerRadius: 4,
        listening: false,
      }),
    );

    const leftRope = new Konva.Line({
      stroke: "#e2e8f0",
      strokeWidth: 3,
      lineCap: "round",
      listening: false,
    });
    const rightRope = new Konva.Line({
      stroke: "#e2e8f0",
      strokeWidth: 3,
      lineCap: "round",
      lineJoin: "round",
      listening: false,
    });
    layer.add(leftRope, rightRope);

    layer.add(
      new Konva.Circle({
        x: pulley.x,
        y: pulley.y,
        radius: 24,
        fill: "#e0f2fe",
        stroke: FORCE_1,
        strokeWidth: 3,
        shadowColor: "#020617",
        shadowBlur: 8,
        shadowOpacity: 0.4,
        listening: false,
      }),
      new Konva.Circle({
        x: pulley.x,
        y: pulley.y,
        radius: 6,
        fill: FORCE_1,
        stroke: "#0c4a6e",
        strokeWidth: 2,
        listening: false,
      }),
    );

    const leftWeight = createSingleWeight(
      scene.left.mass,
      FORCE_2,
      "m₂",
    );
    const rightWeight = createWeightStack(
      scene.right.mass,
      FORCE_1,
      "m₁",
    );
    layer.add(leftWeight.group, rightWeight.group);

    // Các vectơ và điểm móc được cập nhật theo góc quay trong `draw`.
    const leftLeverArrow = new Konva.Arrow({
        points: [],
        stroke: FORCE_2,
        fill: FORCE_2,
        strokeWidth: 2.5,
        pointerAtBeginning: true,
        pointerLength: 8,
        pointerWidth: 8,
        listening: false,
      });
    const rightLeverArrow = new Konva.Arrow({
        points: [],
        stroke: FORCE_1,
        fill: FORCE_1,
        strokeWidth: 2.5,
        pointerAtBeginning: true,
        pointerLength: 8,
        pointerWidth: 8,
        listening: false,
      });
    const leftForceArrow = new Konva.Arrow({
        points: [],
        stroke: FORCE_2,
        fill: FORCE_2,
        strokeWidth: 3,
        pointerLength: 10,
        pointerWidth: 10,
        listening: false,
      });
    const rightForceArrow = new Konva.Arrow({
        points: [],
        stroke: FORCE_1,
        fill: FORCE_1,
        strokeWidth: 3,
        pointerLength: 10,
        pointerWidth: 10,
        listening: false,
      });
    const leftAnchorDot = new Konva.Circle({
        x: leftAnchor.x,
        y: leftAnchor.y,
        radius: 5,
        fill: FORCE_2,
        stroke: "#fff7ed",
        strokeWidth: 2,
        listening: false,
      });
    const rightAnchorDot = new Konva.Circle({
        x: rightAnchor.x,
        y: rightAnchor.y,
        radius: 5,
        fill: FORCE_1,
        stroke: "#e0f2fe",
        strokeWidth: 2,
        listening: false,
      });
    layer.add(
      leftLeverArrow,
      rightLeverArrow,
      leftForceArrow,
      rightForceArrow,
      leftAnchorDot,
      rightAnchorDot,
    );
    const leftDistanceTag = addTag(
      layer,
      (center.x + leftAnchor.x) / 2 - 22,
      center.y - 35,
      `d₂ = ${scene.left.radius.toFixed(1)} m`,
      FORCE_2,
    );
    const rightDistanceTag = addTag(
      layer,
      (center.x + rightAnchor.x) / 2 + 8,
      (center.y + rightAnchor.y) / 2 - 34,
      `d₁ = ${scene.right.radius.toFixed(1)} m`,
      FORCE_1,
    );
    const leftForceLabel = new Konva.Text({
        x: leftAnchor.x - 58,
        y: leftAnchor.y + 92,
        text: "F₂",
        fill: FORCE_2,
        fontSize: 19,
        fontStyle: "bold",
        fontFamily: "monospace",
        listening: false,
      });
    const rightForceLabel = new Konva.Text({
        x: rightAnchor.x + tangent.x * 104 + 7,
        y: rightAnchor.y + tangent.y * 104 - 13,
        text: "F₁",
        fill: FORCE_1,
        fontSize: 19,
        fontStyle: "bold",
        fontFamily: "monospace",
        listening: false,
      });
    layer.add(
      leftForceLabel,
      rightForceLabel,
      new Konva.Circle({
        x: center.x,
        y: center.y,
        radius: 12,
        fill: "#f8fafc",
        stroke: "#475569",
        strokeWidth: 3,
        listening: false,
      }),
      new Konva.Circle({
        x: center.x,
        y: center.y,
        radius: 4,
        fill: "#0f172a",
        listening: false,
      }),
      new Konva.Text({
        x: center.x - 8,
        y: center.y + 16,
        text: "O",
        fill: "#f8fafc",
        fontSize: 16,
        fontStyle: "bold",
        fontFamily: "monospace",
        listening: false,
      }),
    );

    // Bảng công thức dùng cùng mã màu với dây và lực, không che dụng cụ.
    const cardX = 20;
    const cardY = 18;
    const cardWidth = Math.min(286, width * 0.25);
    layer.add(
      new Konva.Rect({
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: 132,
        fill: "#07111f",
        opacity: 0.96,
        stroke: "#334155",
        strokeWidth: 1.5,
        cornerRadius: 12,
        shadowColor: "#020617",
        shadowBlur: 12,
        shadowOpacity: 0.38,
        listening: false,
      }),
      new Konva.Text({
        x: cardX + 15,
        y: cardY + 13,
        width: cardWidth - 30,
        text: "MOMENT QUANH TRỤC O",
        fill: "#f8fafc",
        fontSize: 13,
        fontStyle: "bold",
        fontFamily: "monospace",
        listening: false,
      }),
    );
    const moment1Text = new Konva.Text({
      x: cardX + 15,
      y: cardY + 40,
      width: cardWidth - 30,
      fill: FORCE_1,
      fontSize: 12,
      fontStyle: "bold",
      fontFamily: "monospace",
      listening: false,
    });
    const moment2Text = new Konva.Text({
      x: cardX + 15,
      y: cardY + 62,
      width: cardWidth - 30,
      fill: FORCE_2,
      fontSize: 12,
      fontStyle: "bold",
      fontFamily: "monospace",
      listening: false,
    });
    const netText = new Konva.Text({
      x: cardX + 15,
      y: cardY + 84,
      width: cardWidth - 30,
      fill: "#e2e8f0",
      fontSize: 12,
      fontFamily: "monospace",
      listening: false,
    });
    const statusText = new Konva.Text({
      x: cardX + 15,
      y: cardY + 106,
      width: cardWidth - 30,
      fill: "#6ee7b7",
      fontSize: 12,
      fontStyle: "bold",
      fontFamily: "monospace",
      listening: false,
    });
    layer.add(moment1Text, moment2Text, netText, statusText);

    const leftWeightRestY = rulerY + 48;
    const leftRopeLength = leftWeightRestY - leftAnchor.y;
    const rightWeightRestY = pulley.y + 52;
    const rightRopeLength =
      Math.hypot(pulley.x - rightAnchor.x, pulley.y - rightAnchor.y) +
      (rightWeightRestY - pulley.y);

    const draw = (state: RotationState) => {
      wheel.rotation(-state.theta * RAD_TO_DEG);

      const currentLeftAngle = Math.PI - state.theta;
      const currentRightAngle = rightAngle - state.theta;
      const currentLeftAnchor = {
        x: center.x + Math.cos(currentLeftAngle) * scene.left.radius * scale,
        y: center.y + Math.sin(currentLeftAngle) * scene.left.radius * scale,
      };
      const currentRightAnchor = {
        x: center.x + Math.cos(currentRightAngle) * scene.right.radius * scale,
        y: center.y + Math.sin(currentRightAngle) * scene.right.radius * scale,
      };

      // m₂ luôn nằm thẳng dưới điểm móc: cả vật và đầu dây cùng dịch ngang với
      // điểm móc, còn khoảng cách treo theo phương đứng không đổi.
      const leftWeightX = currentLeftAnchor.x;
      const leftWeightY = currentLeftAnchor.y + leftRopeLength;
      const rightGuideLength = Math.hypot(
        pulley.x - currentRightAnchor.x,
        pulley.y - currentRightAnchor.y,
      );
      const rightWeightY =
        pulley.y + Math.max(30, rightRopeLength - rightGuideLength);
      const leftForceDirection = unitVector(currentLeftAnchor, {
        x: leftWeightX,
        y: leftWeightY,
      });
      const rightForceDirection = unitVector(currentRightAnchor, pulley);

      leftWeight.group.position({ x: leftWeightX, y: leftWeightY });
      rightWeight.group.position({ x: pulley.x, y: rightWeightY });
      leftRope.points([
        currentLeftAnchor.x,
        currentLeftAnchor.y,
        leftWeightX,
        leftWeightY,
      ]);
      rightRope.points([
        currentRightAnchor.x,
        currentRightAnchor.y,
        pulley.x,
        pulley.y,
        pulley.x,
        rightWeightY,
      ]);
      leftLeverArrow.points([
        center.x,
        center.y,
        currentLeftAnchor.x,
        currentLeftAnchor.y,
      ]);
      rightLeverArrow.points([
        center.x,
        center.y,
        currentRightAnchor.x,
        currentRightAnchor.y,
      ]);
      leftForceArrow.points([
        currentLeftAnchor.x + leftForceDirection.x * 12,
        currentLeftAnchor.y + leftForceDirection.y * 12,
        currentLeftAnchor.x + leftForceDirection.x * 92,
        currentLeftAnchor.y + leftForceDirection.y * 92,
      ]);
      rightForceArrow.points([
        currentRightAnchor.x + rightForceDirection.x * 12,
        currentRightAnchor.y + rightForceDirection.y * 12,
        currentRightAnchor.x + rightForceDirection.x * 98,
        currentRightAnchor.y + rightForceDirection.y * 98,
      ]);
      leftAnchorDot.position(currentLeftAnchor);
      rightAnchorDot.position(currentRightAnchor);
      leftDistanceTag.position({
        x: (center.x + currentLeftAnchor.x) / 2 - 22,
        y: (center.y + currentLeftAnchor.y) / 2 - 35,
      });
      rightDistanceTag.position({
        x: (center.x + currentRightAnchor.x) / 2 + 8,
        y: (center.y + currentRightAnchor.y) / 2 - 34,
      });
      leftForceLabel.position({
        x: currentLeftAnchor.x + leftForceDirection.x * 98 - 30,
        y: currentLeftAnchor.y + leftForceDirection.y * 98 + 5,
      });
      rightForceLabel.position({
        x: currentRightAnchor.x + rightForceDirection.x * 104 + 7,
        y: currentRightAnchor.y + rightForceDirection.y * 104 - 13,
      });

      const torques = rotationTorques(scene, state.theta);
      const force1 = scene.right.mass * scene.gravity;
      const force2 = scene.left.mass * scene.gravity;
      const balanced = Math.abs(torques.net) < 0.01;
      const direction =
        torques.net > 0
          ? "F₂ thắng · quay ngược chiều kim đồng hồ"
          : "F₁ thắng · quay theo chiều kim đồng hồ";
      moment1Text.text(
        `F₁ = ${force1.toFixed(2)} N · M₁ = ${torques.right.toFixed(2)} N·m`,
      );
      moment2Text.text(
        `F₂ = ${force2.toFixed(2)} N · M₂ = ${torques.left.toFixed(2)} N·m`,
      );
      netText.text(
        `ΣM = M₂ − M₁ = ${torques.net.toFixed(2)} N·m`,
      );
      statusText
        .text(
          balanced ? "CÂN BẰNG · M₁ = M₂" : direction,
        )
        .fill(balanced ? "#6ee7b7" : "#fda4af");

      layer.batchDraw();
    };

    let simulationState =
      seekToken && seekSeconds != null && seekSeconds >= 0
        ? rotationStateAt(scene, seekSeconds)
        : initialRotationState(scene);
    if (seekToken && seekSeconds != null && seekSeconds >= 0) {
      runningRef.current = false;
      onRunningChange(false);
    }
    draw(simulationState);

    let animationFrame = 0;
    let previousTime = performance.now();
    const animate = (now: number) => {
      const dt = Math.min((now - previousTime) / 1000, 1 / 30);
      previousTime = now;
      if (runningRef.current) {
        simulationState = stepRotation(
          scene,
          simulationState,
          dt * speedRef.current,
        );
        draw(simulationState);
      }
      animationFrame = requestAnimationFrame(animate);
    };
    animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrame);
      stage.destroy();
    };
  }, [
    scene,
    size,
    resetSignal,
    seekToken,
    seekSeconds,
    markLabel,
    onRunningChange,
    containerRef,
  ]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-hidden rounded-lg bg-[#0f172a]"
    />
  );
}
