"use client";

import { useEffect, useRef } from "react";
import Konva from "konva";
import { INDUCTION_VIEW } from "../../engines/electromagnetic-induction/constants";
import {
  inductionMetrics,
  initialInductionState,
  stepInduction,
} from "../../engines/electromagnetic-induction/physics";
import { pauseInduction } from "../../engines/electromagnetic-induction/state-machine";
import type {
  ElectromagneticInductionMetrics,
  ElectromagneticInductionScene,
  InductionState,
} from "../../engines/electromagnetic-induction/types";
import { useContainerSize } from "../../shared/use-container-size";

type Props = {
  scene: ElectromagneticInductionScene;
  running: boolean;
  resetSignal: number;
  onRunningChange: (running: boolean) => void;
  speed?: number;
  showFieldLines?: boolean;
  showLabels?: boolean;
  onData?: (metrics: ElectromagneticInductionMetrics) => void;
};

const {
  width: DESIGN_WIDTH,
  height: DESIGN_HEIGHT,
  coilX,
  coilY,
  pixelsPerUnit,
} = INDUCTION_VIEW;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));

const formatSigned = (value: number, digits: number) => {
  const safeValue = Math.abs(value) < 10 ** -digits / 2 ? 0 : value;
  return `${safeValue >= 0 ? "+" : ""}${safeValue.toFixed(digits)}`;
};

type Point = { x: number; y: number };

const cubicPoint = (
  start: Point,
  controlA: Point,
  controlB: Point,
  end: Point,
  progress: number,
) => {
  const inverse = 1 - progress;
  return {
    x: inverse ** 3 * start.x
      + 3 * inverse ** 2 * progress * controlA.x
      + 3 * inverse * progress ** 2 * controlB.x
      + progress ** 3 * end.x,
    y: inverse ** 3 * start.y
      + 3 * inverse ** 2 * progress * controlA.y
      + 3 * inverse * progress ** 2 * controlB.y
      + progress ** 3 * end.y,
  };
};

const cubicDerivative = (
  start: Point,
  controlA: Point,
  controlB: Point,
  end: Point,
  progress: number,
) => {
  const inverse = 1 - progress;
  return {
    x: 3 * inverse ** 2 * (controlA.x - start.x)
      + 6 * inverse * progress * (controlB.x - controlA.x)
      + 3 * progress ** 2 * (end.x - controlB.x),
    y: 3 * inverse ** 2 * (controlA.y - start.y)
      + 6 * inverse * progress * (controlB.y - controlA.y)
      + 3 * progress ** 2 * (end.y - controlB.y),
  };
};

const cubicPoints = (
  start: Point,
  controlA: Point,
  controlB: Point,
  end: Point,
  segments = 48,
) => {
  const points: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const point = cubicPoint(start, controlA, controlB, end, index / segments);
    points.push(point.x, point.y);
  }
  return points;
};

function panel(
  x: number,
  y: number,
  width: number,
  height: number,
  radius = 18,
) {
  return new Konva.Rect({
    x,
    y,
    width,
    height,
    cornerRadius: radius,
    fill: "rgba(5,13,27,.82)",
    stroke: "rgba(100,116,139,.58)",
    strokeWidth: 1.5,
  });
}

export function SceneKonvaElectromagneticInduction({
  scene,
  running,
  resetSignal,
  onRunningChange,
  speed = 1,
  showFieldLines = true,
  showLabels = true,
  onData,
}: Props) {
  const { ref, size } = useContainerSize<HTMLDivElement>();
  const runningRef = useRef(running);
  const speedRef = useRef(speed);
  const visibilityRef = useRef({ showFieldLines, showLabels });
  const callbackRef = useRef(onData);

  useEffect(() => { runningRef.current = running; }, [running]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => {
    visibilityRef.current = { showFieldLines, showLabels };
  }, [showFieldLines, showLabels]);
  useEffect(() => { callbackRef.current = onData; }, [onData]);

  useEffect(() => {
    const container = ref.current;
    if (!container || size.width <= 0 || size.height <= 0) return undefined;

    const stage = new Konva.Stage({
      container,
      width: size.width,
      height: size.height,
    });
    const layer = new Konva.Layer();
    stage.add(layer);

    const scale = Math.min(size.width / DESIGN_WIDTH, size.height / DESIGN_HEIGHT);
    const root = new Konva.Group({
      x: (size.width - DESIGN_WIDTH * scale) / 2,
      y: (size.height - DESIGN_HEIGHT * scale) / 2,
      scaleX: scale,
      scaleY: scale,
    });
    layer.add(root);

    root.add(new Konva.Rect({
      x: 0,
      y: 0,
      width: DESIGN_WIDTH,
      height: DESIGN_HEIGHT,
      fill: "#07111f",
    }));
    for (let x = 20; x < DESIGN_WIDTH; x += 46) {
      root.add(new Konva.Line({
        points: [x, 0, x, DESIGN_HEIGHT],
        stroke: "#1e293b",
        strokeWidth: 1,
        opacity: 0.32,
        listening: false,
      }));
    }
    for (let y = 18; y < DESIGN_HEIGHT; y += 42) {
      root.add(new Konva.Line({
        points: [0, y, DESIGN_WIDTH, y],
        stroke: "#1e293b",
        strokeWidth: 1,
        opacity: 0.32,
        listening: false,
      }));
    }

    root.add(panel(28, 58, 1044, 562));

    const apparatus = new Konva.Group({
      clip: { x: 46, y: 76, width: 720, height: 516 },
    });
    root.add(apparatus);
    apparatus.add(new Konva.Line({
      points: [92, coilY, 748, coilY],
      stroke: "#475569",
      strokeWidth: 2,
      lineCap: "round",
      dash: [7, 11],
      opacity: 0.55,
      listening: false,
    }));

    const fieldLayouts = [
      { side: -1, height: 46, reach: 70 },
      { side: -1, height: 82, reach: 118 },
      { side: -1, height: 124, reach: 172 },
      { side: 1, height: 46, reach: 70 },
      { side: 1, height: 82, reach: 118 },
      { side: 1, height: 124, reach: 172 },
    ] as const;
    const fieldPaths = fieldLayouts.map((layout, index) => {
      const line = new Konva.Line({
        points: [],
        stroke: index % 3 === 2 ? "#38bdf8" : "#60a5fa",
        strokeWidth: index % 3 === 2 ? 2 : 1.6,
        opacity: 0,
        listening: false,
      });
      const marker = new Konva.Arrow({
        points: [-7, 0, 7, 0],
        stroke: "#bae6fd",
        fill: "#bae6fd",
        strokeWidth: 2.2,
        pointerLength: 6,
        pointerWidth: 5,
        opacity: 0,
        listening: false,
      });
      apparatus.add(line, marker);
      return { line, marker, ...layout };
    });

    const visibleTurns = Math.round(clamp(scene.turns / 16, 7, 13));
    const coilSpan = 104;
    const coilRadiusY = 84;
    const coilDepth = 21;
    const totalAngle = visibleTurns * Math.PI * 2;
    const coilPhaseStart = Math.PI / 2;
    const coilBase = new Konva.Group({ listening: false });
    const coilRear = new Konva.Group({ listening: false });
    const coilFront = new Konva.Group({ listening: false });
    const continuousPoints: number[] = [];
    const continuousSamples = visibleTurns * 34;
    for (let sample = 0; sample <= continuousSamples; sample += 1) {
      const angle = coilPhaseStart
        + totalAngle * sample / continuousSamples;
      const axialProgress = clamp(
        (angle - coilPhaseStart) / totalAngle,
        0,
        1,
      );
      continuousPoints.push(
        coilX - coilSpan / 2
          + axialProgress * coilSpan
          + Math.cos(angle) * coilDepth,
        coilY + Math.sin(angle) * coilRadiusY,
      );
    }
    coilBase.add(new Konva.Line({
      points: continuousPoints,
      stroke: "#3f1906",
      strokeWidth: 8,
      lineCap: "round",
      lineJoin: "round",
    }), new Konva.Line({
      points: continuousPoints,
      stroke: "#a16207",
      strokeWidth: 2.2,
      opacity: 0.82,
      lineCap: "round",
      lineJoin: "round",
    }));
    const addHelixSegment = (
      group: Konva.Group,
      startAngle: number,
      endAngle: number,
      color: string,
      opacity: number,
    ) => {
      const segmentPoints: number[] = [];
      const sampleCount = 18;
      for (let sample = 0; sample <= sampleCount; sample += 1) {
        const angle = startAngle
          + (endAngle - startAngle) * sample / sampleCount;
        const axialProgress = clamp(
          (angle - coilPhaseStart) / totalAngle,
          0,
          1,
        );
        segmentPoints.push(
          coilX - coilSpan / 2
            + axialProgress * coilSpan
            + Math.cos(angle) * coilDepth,
          coilY + Math.sin(angle) * coilRadiusY,
        );
      }
      group.add(
        new Konva.Line({
          points: segmentPoints,
          stroke: "#3f1906",
          strokeWidth: 7.5,
          lineCap: "round",
          lineJoin: "round",
        }),
        new Konva.Line({
          points: segmentPoints,
          stroke: color,
          strokeWidth: 3.4,
          opacity,
          lineCap: "round",
          lineJoin: "round",
        }),
      );
    };
    for (let turn = 0; turn < visibleTurns; turn += 1) {
      const base = coilPhaseStart + turn * Math.PI * 2;
      addHelixSegment(
        coilRear,
        base,
        base + Math.PI,
        "#9a3f08",
        0.82,
      );
      addHelixSegment(
        coilFront,
        base + Math.PI,
        base + Math.PI * 2,
        "#fbbf24",
        1,
      );
    }
    apparatus.add(coilBase, coilRear);

    const northOnLeft = scene.poleOrientation !== -1;
    const magnet = new Konva.Group({
      y: coilY,
      draggable: true,
      dragBoundFunc: (position) => {
        const rootPosition = root.absolutePosition();
        const designX = (position.x - rootPosition.x) / scale;
        const boundedX = clamp(designX, 150, 680);
        return {
          x: rootPosition.x + boundedX * scale,
          y: rootPosition.y + coilY * scale,
        };
      },
    });
    magnet.add(
      new Konva.Rect({
        x: -76,
        y: -27,
        width: 152,
        height: 54,
        cornerRadius: 10,
        fill: "#1e3a8a",
        stroke: "#e2e8f0",
        strokeWidth: 2.4,
        shadowColor: "#38bdf8",
        shadowBlur: 12,
        shadowOpacity: 0.24,
      }),
      new Konva.Rect({
        x: -76,
        y: -27,
        width: 76,
        height: 54,
        cornerRadius: [10, 0, 0, 10],
        fill: northOnLeft ? "#dc2626" : "#2563eb",
      }),
      new Konva.Rect({
        x: 0,
        y: -27,
        width: 76,
        height: 54,
        cornerRadius: [0, 10, 10, 0],
        fill: northOnLeft ? "#2563eb" : "#dc2626",
      }),
      new Konva.Line({
        points: [0, -25, 0, 25],
        stroke: "rgba(255,255,255,.8)",
        strokeWidth: 2,
      }),
      new Konva.Text({
        x: -76,
        y: -12,
        width: 76,
        text: northOnLeft ? "N" : "S",
        align: "center",
        fontFamily: "Arial, sans-serif",
        fontSize: 22,
        fontStyle: "bold",
        fill: "#fff",
      }),
      new Konva.Text({
        x: 0,
        y: -12,
        width: 76,
        text: northOnLeft ? "S" : "N",
        align: "center",
        fontFamily: "Arial, sans-serif",
        fontSize: 22,
        fontStyle: "bold",
        fill: "#fff",
      }),
    );
    apparatus.add(magnet, coilFront);

    const coilName = new Konva.Text({
      x: coilX - 120,
      y: 172,
      width: 240,
      align: "center",
      text: `Cuộn dây · N = ${Math.round(scene.turns)} vòng`,
      fontFamily: "Arial, sans-serif",
      fontSize: 12,
      fontStyle: "bold",
      fill: "#fbbf24",
    });
    root.add(coilName);

    const leads = [
      {
        color: "#38bdf8",
        points: [
          coilX - coilSpan / 2,
          coilY + coilRadiusY,
          coilX - coilSpan / 2,
          472,
          746,
          472,
          746,
          214,
          795,
          214,
        ],
      },
      {
        color: "#fb7185",
        points: [
          coilX + coilSpan / 2,
          coilY + coilRadiusY,
          coilX + coilSpan / 2,
          510,
          766,
          510,
          766,
          246,
          795,
          246,
        ],
      },
    ];
    leads.forEach(({ color, points }) => {
      root.add(
        new Konva.Line({
          points,
          stroke: "#020617",
          strokeWidth: 7,
          lineCap: "round",
          lineJoin: "round",
          listening: false,
        }),
        new Konva.Line({
          points,
          stroke: color,
          strokeWidth: 3,
          lineCap: "round",
          lineJoin: "round",
          listening: false,
        }),
      );
    });

    root.add(panel(790, 92, 258, 238, 16));
    root.add(new Konva.Text({
      x: 810,
      y: 107,
      width: 218,
      align: "center",
      text: "\u0110I\u1EC6N K\u1EBE",
      fontFamily: "Arial, sans-serif",
      fontSize: 12,
      fontStyle: "bold",
      fill: "#cbd5e1",
    }));
    root.add(new Konva.Rect({
      x: 812,
      y: 130,
      width: 214,
      height: 142,
      cornerRadius: 10,
      fill: "#edf4f7",
      stroke: "#94a3b8",
      strokeWidth: 2,
      shadowColor: "#020617",
      shadowBlur: 8,
      shadowOpacity: 0.22,
    }));
    root.add(
      new Konva.Circle({
        x: 802,
        y: 214,
        radius: 6,
        fill: "#38bdf8",
        stroke: "#e0f2fe",
        strokeWidth: 2,
      }),
      new Konva.Circle({
        x: 802,
        y: 246,
        radius: 6,
        fill: "#fb7185",
        stroke: "#ffe4e6",
        strokeWidth: 2,
      }),
    );

    const meterCenter = { x: 919, y: 245 };
    root.add(new Konva.Arc({
      x: meterCenter.x,
      y: meterCenter.y,
      innerRadius: 72,
      outerRadius: 76,
      angle: 180,
      rotation: 180,
      fill: "#64748b",
    }));
    for (let index = 0; index <= 10; index += 1) {
      const angle = Math.PI + Math.PI * index / 10;
      root.add(new Konva.Line({
        points: [
          meterCenter.x + Math.cos(angle) * 58,
          meterCenter.y + Math.sin(angle) * 58,
          meterCenter.x + Math.cos(angle) * 71,
          meterCenter.y + Math.sin(angle) * 71,
        ],
        stroke: index === 5 ? "#ea580c" : "#475569",
        strokeWidth: index === 5 ? 2.3 : 1.2,
        listening: false,
      }));
    }
    root.add(
      new Konva.Text({
        x: meterCenter.x - 65,
        y: 154,
        width: 130,
        text: "G",
        align: "center",
        fontFamily: "Arial, sans-serif",
        fontSize: 14,
        fontStyle: "bold",
        fill: "#0f172a",
      }),
      new Konva.Text({
        x: meterCenter.x - 69,
        y: 250,
        width: 138,
        align: "center",
        text: "\u2212             +",
        fontFamily: "Arial, sans-serif",
        fontSize: 10,
        fill: "#475569",
      }),
    );
    const needle = new Konva.Line({
      x: meterCenter.x,
      y: meterCenter.y,
      points: [0, 0, 0, -60],
      stroke: "#e11d48",
      strokeWidth: 3.5,
      lineCap: "round",
    });
    const meterReading = new Konva.Text({
      x: 832,
      y: 290,
      width: 174,
      align: "center",
      text: "I = +0.0000 A",
      fontFamily: "Arial, sans-serif",
      fontSize: 17,
      fontStyle: "bold",
      fill: "#f8fafc",
    });
    root.add(
      needle,
      new Konva.Circle({
        x: meterCenter.x,
        y: meterCenter.y,
        radius: 6,
        fill: "#334155",
        stroke: "#e11d48",
        strokeWidth: 2.5,
      }),
      meterReading,
    );

    root.add(panel(790, 348, 258, 226, 16));
    const graphArea = { x: 808, y: 402, width: 222, height: 142 };
    root.add(new Konva.Text({
      x: 810,
      y: 365,
      width: 218,
      text: "SU\u1EA4T \u0110I\u1EC6N \u0110\u1ED8NG \u03B5(t)",
      align: "center",
      fontFamily: "Arial, sans-serif",
      fontSize: 11,
      fontStyle: "bold",
      fill: "#cbd5e1",
    }));
    const emfReading = new Konva.Text({
      x: 810,
      y: 382,
      width: 218,
      text: "\u03B5 = +0.000 V",
      align: "center",
      fontFamily: "Arial, sans-serif",
      fontSize: 12,
      fill: "#fbbf24",
    });
    root.add(emfReading);
    root.add(new Konva.Rect({
      x: graphArea.x,
      y: graphArea.y,
      width: graphArea.width,
      height: graphArea.height,
      cornerRadius: 8,
      fill: "#071426",
      stroke: "#334155",
      strokeWidth: 1.2,
    }));
    for (let index = 1; index < 4; index += 1) {
      const y = graphArea.y + graphArea.height * index / 4;
      root.add(new Konva.Line({
        points: [graphArea.x, y, graphArea.x + graphArea.width, y],
        stroke: "rgba(148,163,184,.18)",
        strokeWidth: 1,
        listening: false,
      }));
    }
    root.add(new Konva.Line({
      points: [
        graphArea.x,
        graphArea.y + graphArea.height / 2,
        graphArea.x + graphArea.width,
        graphArea.y + graphArea.height / 2,
      ],
      stroke: "rgba(203,213,225,.5)",
      strokeWidth: 1,
      dash: [5, 5],
      listening: false,
    }));
    const emfGraph = new Konva.Line({
      points: [],
      stroke: "#fbbf24",
      strokeWidth: 2.4,
      lineCap: "round",
      lineJoin: "round",
      listening: false,
    });
    const emfDot = new Konva.Circle({
      x: graphArea.x,
      y: graphArea.y + graphArea.height / 2,
      radius: 3.5,
      fill: "#fde68a",
      stroke: "#f59e0b",
      strokeWidth: 1.5,
      visible: false,
      listening: false,
    });
    root.add(emfGraph, emfDot);

    let state: InductionState = initialInductionState(
      scene,
      scene.magnetStartX,
    );
    let dragging = false;
    let fieldPhase = 0;
    let autoPhase = 0;
    let wasRunning = false;
    let manualMode = false;
    let lastDragAt = performance.now();
    let lastEmitAt = -1;
    const amplitude = Math.max(
      0.6,
      scene.motionAmplitude ?? Math.abs(scene.magnetStartX),
    );

    const emitMetrics = (force = false) => {
      if (!callbackRef.current) return;
      if (!force && state.elapsed - lastEmitAt < 0.08) return;
      lastEmitAt = state.elapsed;
      callbackRef.current(inductionMetrics(state));
    };

    const drawGraph = () => {
      const history = state.history.slice(-150);
      if (history.length < 2) {
        emfGraph.points([]);
        emfDot.visible(false);
        return;
      }
      const startTime = history[0]?.time ?? 0;
      const endTime = history.at(-1)?.time ?? startTime + 1;
      const timeSpan = Math.max(0.01, endTime - startTime);
      const maxEmf = Math.max(
        0.005,
        ...history.map((point) => Math.abs(point.emf)),
      );
      const points = history.flatMap((point) => [
        graphArea.x
          + ((point.time - startTime) / timeSpan) * graphArea.width,
        graphArea.y
          + graphArea.height / 2
          - (point.emf / maxEmf) * graphArea.height * 0.42,
      ]);
      emfGraph.points(points);
      const lastX = points.at(-2);
      const lastY = points.at(-1);
      if (lastX !== undefined && lastY !== undefined) {
        emfDot.position({ x: lastX, y: lastY });
        emfDot.visible(true);
      }
    };

    const draw = () => {
      const magnetDesignX = coilX + state.magnetX * pixelsPerUnit;
      magnet.position({ x: magnetDesignX, y: coilY });

      const northDirection = northOnLeft ? -1 : 1;
      const northX = magnetDesignX + northDirection * 74;
      const southX = magnetDesignX - northDirection * 74;
      const fieldOpacity = 0.28
        + clamp(scene.magnetStrength / 2.5, 0, 1) * 0.38;
      fieldPaths.forEach(({ line, marker, side, height, reach }, index) => {
        const northOuterX = northX + northDirection * reach;
        const southOuterX = southX - northDirection * reach;
        const start = { x: northX, y: coilY };
        const controlA = {
          x: northOuterX,
          y: coilY + side * height,
        };
        const controlB = {
          x: southOuterX,
          y: coilY + side * height,
        };
        const end = { x: southX, y: coilY };
        line.points(cubicPoints(start, controlA, controlB, end));
        const progress = (fieldPhase + index * 0.16) % 1;
        const markerPosition = cubicPoint(
          start,
          controlA,
          controlB,
          end,
          progress,
        );
        const tangent = cubicDerivative(
          start,
          controlA,
          controlB,
          end,
          progress,
        );
        marker.position(markerPosition);
        marker.rotation(Math.atan2(tangent.y, tangent.x) * 180 / Math.PI);
        const opacity = visibilityRef.current.showFieldLines
          ? fieldOpacity - (index % 3) * 0.045
          : 0;
        line.opacity(opacity);
        marker.opacity(opacity + 0.18);
      });

      const currentStrength = clamp(
        Math.abs(state.current) / Math.max(0.01, state.peakCurrent),
        0,
        1,
      );
      coilFront.opacity(0.78 + currentStrength * 0.22);
      needle.rotation(state.needle * 58);

      meterReading.text(`I = ${formatSigned(state.current, 4)} A`);
      emfReading.text(`\u03B5 = ${formatSigned(state.emf, 3)} V`);
      drawGraph();

      coilName.visible(visibilityRef.current.showLabels);
      layer.batchDraw();
    };

    magnet.on("mouseenter", () => {
      stage.container().style.cursor = "grab";
    });
    magnet.on("mouseleave", () => {
      stage.container().style.cursor = "default";
    });
    magnet.on("dragstart", () => {
      dragging = true;
      manualMode = true;
      wasRunning = false;
      runningRef.current = false;
      onRunningChange(false);
      lastDragAt = performance.now();
      stage.container().style.cursor = "grabbing";
    });
    magnet.on("dragmove", () => {
      const now = performance.now();
      const dt = clamp((now - lastDragAt) / 1000, 1 / 120, 1 / 30);
      lastDragAt = now;
      const x = (magnet.x() - coilX) / pixelsPerUnit;
      state = stepInduction(scene, state, x, dt);
      fieldPhase = (fieldPhase + dt * 0.7) % 1;
      draw();
      emitMetrics();
    });
    magnet.on("dragend", () => {
      dragging = false;
      stage.container().style.cursor = "grab";
      state = stepInduction(scene, state, state.magnetX, 1 / 60);
      draw();
      emitMetrics(true);
    });

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    draw();
    emitMetrics(true);

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = clamp((now - last) / 1000, 0, 1 / 30) * speedRef.current;
      last = now;
      if (dragging) {
        frame = requestAnimationFrame(loop);
        return;
      }
      if (runningRef.current) {
        manualMode = false;
        if (!wasRunning) {
          autoPhase = Math.acos(clamp(state.magnetX / amplitude, -1, 1));
          wasRunning = true;
        }
        const motionScale = reducedMotion ? 0.4 : 1;
        const angularRate = Math.PI * 2
          * Math.max(0.03, scene.motionFrequency ?? 0.12)
          * motionScale;
        autoPhase += angularRate * dt;
        if (!reducedMotion) fieldPhase = (fieldPhase + dt * 0.7) % 1;
        const magnetX = amplitude * Math.cos(autoPhase);
        state = stepInduction(scene, state, magnetX, dt);
        draw();
        emitMetrics();
      } else if (manualMode) {
        state = stepInduction(scene, state, state.magnetX, dt);
        draw();
        emitMetrics();
      } else if (wasRunning || state.phase !== "paused") {
        wasRunning = false;
        pauseInduction(state);
        draw();
        emitMetrics(true);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      stage.container().style.cursor = "default";
      stage.destroy();
    };
  }, [onRunningChange, ref, resetSignal, scene, size.height, size.width]);

  return (
    <div
      ref={ref}
      className="h-full w-full overflow-hidden bg-[#07111f]"
      role="img"
      aria-label="Nam châm thanh chuyển động qua cuộn dây kín; đường sức từ, điện kế và đồ thị suất điện động cùng cập nhật theo định luật Faraday–Lenz."
    />
  );
}
