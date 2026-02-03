import { Emitter, ParticlePool } from "$particles";
import type { Vec2 } from "$particles/types";
import * as Image from "./image";
import type { Polygon } from "./utils";
import type { Frontier } from "./frontier";

export type { Polygon } from "./utils";
export * from "./frontier";

//

interface Config {
  image: Image.Image;
  polygon: Polygon;
  lifetime: number;
  velocity?: Vec2;
  size?: number;
  frontier: Frontier;
  boundaryDistance?: number;
}

/**
 * Create an image emitter with stateful frontier.
 * The emitter activates pixels over time according to the frontier strategy.
 * Pixels are selected from the polygon region and emitted based on the frontier's selection.
 */
export interface ImageEmitter extends Emitter.Emitter {
  getEmittedPixels(): Vec2[];
}

export function make(config: Config): ImageEmitter {
  const chosenPixels = Image.getPixelsInPolygon(
    config.image,
    config.polygon,
    config.boundaryDistance
  );
  const emitted = new Set<number>();
  const frontier = config.frontier;
  const velocity: Vec2 = config.velocity ?? [0, 0];
  const size = config.size ?? 1;

  // Current batch to emit (computed in update, used in emit)
  let currentBatch: number[] = [];

  return {
    update() {
      // Get next batch from frontier
      currentBatch = frontier.getNextBatch(chosenPixels, emitted);
    },

    emit(pool) {
      // Emit particles for current batch
      for (const index of currentBatch) {
        const pixel = chosenPixels[index];
        // if (!pixel) continue;

        ParticlePool.spawn(pool, {
          position: pixel.coords,
          velocity,
          lifetime: config.lifetime,
          color: pixel.color,
          size,
        });

        // Mark as emitted
        emitted.add(index);
      }
    },

    // Get all emitted pixel coordinates
    getEmittedPixels(): Vec2[] {
      const coords: Vec2[] = [];
      for (const index of emitted) {
        const pixel = chosenPixels[index];
        if (pixel) {
          coords.push(pixel.coords);
        }
      }
      return coords;
    },
  };
}
