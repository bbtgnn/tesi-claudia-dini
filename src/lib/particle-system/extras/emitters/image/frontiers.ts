import type { Vec2 } from "$particles/types";
import type { Frontier } from "./frontier";

/** Coordinates in 0–1 (percentage of image width/height). */
export type PercentVec2 = [number, number];

/** (width, height) => Frontier; called by ImageEmitter in init(). */
export type FrontierFactory = (width: number, height: number) => Frontier;

/** Line config: start as percentage 0–1. */
export interface LineConfig {
  start: PercentVec2;
  angle: number;
  speed: number;
  gradientSize?: number;
}

/** Circle config: center as percentage 0–1. */
export interface CircleConfig {
  center: PercentVec2;
  speed: number;
  gradientSize: number;
}

export function line(config: LineConfig): FrontierFactory {
  const { start, angle, speed, gradientSize: activationDistance } = config;
  const angleRad = (angle * Math.PI) / 180;
  const direction: Vec2 = [Math.cos(angleRad), -Math.sin(angleRad)];

  return (width, height) => {
    const startPx: Vec2 = [start[0] * width, start[1] * height];
    return {
      getNextBatch(ctx, chosenPixels, emitted) {
        const currentTime = ctx.time.current;
        const random = ctx.rng.random;
        const linePos: Vec2 = [
          startPx[0] + currentTime * speed * direction[0],
          startPx[1] + currentTime * speed * direction[1],
        ];

        const batch: number[] = [];
        for (let i = 0; i < chosenPixels.length; i++) {
          if (emitted.has(i)) continue;

          const pixel = chosenPixels[i]!;
          const px = pixel.coords[0];
          const py = pixel.coords[1];
          const dx = px - linePos[0];
          const dy = py - linePos[1];
          const projection = dx * direction[0] + dy * direction[1];
          const behind = projection <= 0;

          if (behind) {
            batch.push(i);
            continue;
          }

          if (activationDistance === undefined || activationDistance <= 0)
            continue;

          const distAhead = projection;
          if (distAhead > activationDistance) continue;
          const probability = 1 - distAhead / activationDistance;
          if (random() >= probability) continue;

          batch.push(i);
        }
        return batch;
      },
    };
  };
}

export function circle(config: CircleConfig): FrontierFactory {
  const { center, speed, gradientSize } = config;

  return (width, height) => {
    const centerPx: Vec2 = [center[0] * width, center[1] * height];
    return {
      getNextBatch(ctx, chosenPixels, emitted) {
        const currentTime = ctx.time.current;
        const random = ctx.rng.random;
        const waveRadius = currentTime * speed;

        const batch: number[] = [];
        for (let i = 0; i < chosenPixels.length; i++) {
          if (emitted.has(i)) continue;

          const pixel = chosenPixels[i]!;
          const px = pixel.coords[0];
          const py = pixel.coords[1];
          const dx = px - centerPx[0];
          const dy = py - centerPx[1];
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= waveRadius) {
            batch.push(i);
            continue;
          }

          const distAhead = distance - waveRadius;
          if (distAhead > gradientSize) continue;
          const probability = 1 - distAhead / gradientSize;
          if (random() >= probability) continue;

          batch.push(i);
        }
        return batch;
      },
    };
  };
}
