import type { TimeStep, Vec2 } from "$particles/types";
import type { PixelData } from "./image";

export interface Frontier {
  update(timeStep: TimeStep): void;
  getNextBatch(
    chosenPixels: readonly PixelData[],
    emitted: Set<number>
  ): number[];
}

export interface LineFrontierConfig {
  start: Vec2;
  angle: number;
  speed: number;
}

export function makeLineFrontier(config: LineFrontierConfig): Frontier {
  const { start, angle, speed } = config;
  const angleRad = (angle * Math.PI) / 180;
  const direction: Vec2 = [Math.cos(angleRad), -Math.sin(angleRad)];
  let currentTime = 0;

  return {
    update(timeStep) {
      currentTime = timeStep.time;
    },
    getNextBatch(chosenPixels, emitted) {
      const linePos: Vec2 = [
        start[0] + currentTime * speed * direction[0],
        start[1] + currentTime * speed * direction[1],
      ];

      const batch: number[] = [];
      for (let i = 0; i < chosenPixels.length; i++) {
        if (emitted.has(i)) continue;

        const pixel = chosenPixels[i]!;
        const px = pixel.coords[0];
        const py = pixel.coords[1];
        const dx = px - linePos[0];
        const dy = py - linePos[1];
        const behind = dx * direction[0] + dy * direction[1] <= 0;

        if (behind) {
          batch.push(i);
        }
      }
      return batch;
    },
  };
}
