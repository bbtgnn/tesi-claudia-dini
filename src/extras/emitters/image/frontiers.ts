import type { Vec2 } from "$particles/types";
import type { Frontier } from "./frontier";

//

interface LineConfig {
  start: Vec2;
  angle: number;
  speed: number;
  activationDistance?: number;
}

interface CircleConfig {
  center: Vec2;
  speed: number;
  gradientSize: number;
}

export function line(config: LineConfig): Frontier {
  const { start, angle, speed, activationDistance } = config;
  const angleRad = (angle * Math.PI) / 180;
  const direction: Vec2 = [Math.cos(angleRad), -Math.sin(angleRad)];

  return {
    getNextBatch(ctx, chosenPixels, emitted) {
      const currentTime = ctx.time.current;
      const random = ctx.rng.random;
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
}

export function circle(config: CircleConfig): Frontier {
  const { center, speed, gradientSize } = config;

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
        const dx = px - center[0];
        const dy = py - center[1];
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
}
