import type { TimeStep } from "$particles/types";
import type { PixelData } from "./image";

export interface Frontier {
  update(timeStep: TimeStep): void;
  getNextBatch(
    chosenPixels: readonly PixelData[],
    emitted: Set<number>
  ): number[];
}

export interface LineMovingUpConfig {
  startY?: number;
  direction?: -1 | 1;
  rowsPerSecond?: number;
  activationDistance?: number;
}

export function makeLineMovingUp(config: LineMovingUpConfig = {}): Frontier {
  const {
    startY,
    direction = -1,
    rowsPerSecond = 60,
    activationDistance,
  } = config;
  let currentY: number | null = startY ?? null;
  let maxY = -Infinity;
  let minY = Infinity;
  let progress = 0;

  return {
    update(timeStep) {
      progress += timeStep.dt * rowsPerSecond;
    },
    getNextBatch(chosenPixels, emitted) {
      if (currentY === null) {
        for (const pixel of chosenPixels) {
          maxY = Math.max(maxY, pixel.coords[1]);
          minY = Math.min(minY, pixel.coords[1]);
        }
        currentY = startY ?? (direction === -1 ? maxY : minY);
      }

      if (progress < 1) {
        return [];
      }

      const batch: number[] = [];
      const rowsToProcess = Math.floor(progress);
      progress -= rowsToProcess;

      for (let row = 0; row < rowsToProcess; row++) {
        if (direction === -1 && currentY < minY) {
          break;
        }
        if (direction === 1 && currentY > maxY) {
          break;
        }

        if (activationDistance !== undefined && activationDistance > 0) {
          for (let i = 0; i < chosenPixels.length; i++) {
            if (emitted.has(i)) continue;

            const pixel = chosenPixels[i]!;
            const distance = Math.abs(pixel.coords[1] - currentY);

            if (distance > activationDistance) {
              continue;
            }

            const probability = 1 - distance / activationDistance;
            if (Math.random() < probability) {
              batch.push(i);
            }
          }
        } else {
          for (let i = 0; i < chosenPixels.length; i++) {
            if (!emitted.has(i) && chosenPixels[i]!.coords[1] === currentY) {
              batch.push(i);
            }
          }
        }

        currentY += direction;
      }

      return batch;
    },
  };
}
