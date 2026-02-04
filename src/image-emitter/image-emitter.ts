import P5 from "p5";
import { Emitter, ParticlePool } from "$particles";
import type { Vec2 } from "$particles/types";
import * as Image from "./image";
import type { Polygon } from "./utils";
import type { Frontier } from "./frontier";

export type { Polygon } from "./utils";
export * from "./frontier";

//

interface Config {
  image: P5.Image;
  polygons: Polygon[];
  lifetime: number;
  velocity?: Vec2;
  size?: number;
  frontier: Frontier;
  boundaryDistance?: number;
  scale?: number;
  getTime: () => number;
}

export interface EmittedPixel {
  x: number;
  y: number;
  size: number;
  emissionTime: number;
}

/**
 * Create an image emitter with stateful frontier.
 * The emitter activates pixels over time according to the frontier strategy.
 * Pixels are selected from the polygon regions and emitted based on the frontier's selection.
 * Supports multiple polygons - pixels from all polygons are combined and processed together.
 */
export interface ImageEmitter extends Emitter.Emitter {
  getEmittedPixels(currentTime: number): EmittedPixel[];
}

export function make(config: Config): ImageEmitter {
  const scale = config.scale ?? 1;

  // Clone and resize image for internal processing
  const workingImage = config.image.get();
  if (scale > 1) {
    workingImage.resize(config.image.width / scale, 0);
  }
  workingImage.loadPixels();

  // Convert to internal Image format
  const internalImage = Image.fromP5(workingImage);

  // Scale polygons down to match working image resolution
  const scaledPolygons: Polygon[] = config.polygons.map((polygon) =>
    polygon.map(([x, y]) => [x / scale, y / scale])
  );

  // Scale boundaryDistance down proportionally
  const scaledBoundaryDistance = config.boundaryDistance
    ? config.boundaryDistance / scale
    : undefined;

  // Get pixels from all polygons and combine them
  const chosenPixels: Image.PixelData[] = [];
  for (const scaledPolygon of scaledPolygons) {
    const pixels = Image.getPixelsInPolygon(
      internalImage,
      scaledPolygon,
      scaledBoundaryDistance
    );
    chosenPixels.push(...pixels);
  }

  const emitted = new Set<number>();
  const emissionTimes = new Map<number, number>(); // Map<index, emissionTime>
  const frontier = config.frontier;
  const velocity: Vec2 = config.velocity ?? [0, 0];
  const size = config.size ?? 1;
  const getTime = config.getTime;

  // Current batch to emit (computed in update, used in emit)
  let currentBatch: number[] = [];

  return {
    update() {
      // Get next batch from frontier
      currentBatch = frontier.getNextBatch(chosenPixels, emitted);
    },

    emit(pool) {
      // Store current time for this emission batch
      const currentEmissionTime = getTime();

      // Emit particles for current batch
      for (const index of currentBatch) {
        const pixel = chosenPixels[index];
        // if (!pixel) continue;

        // Scale coordinates back up to original image resolution
        // Position represents the top-left corner of the scale×scale block
        const worldCoords: Vec2 = [
          pixel.coords[0] * scale,
          pixel.coords[1] * scale,
        ];

        // Emit one particle with size = base size * scale
        // This covers the full scale×scale area
        ParticlePool.spawn(pool, {
          position: worldCoords,
          velocity,
          lifetime: config.lifetime,
          color: pixel.color,
          size: size * scale,
        });

        // Mark as emitted and store emission time
        emitted.add(index);
        emissionTimes.set(index, currentEmissionTime);
      }
    },

    // Get all emitted pixel coordinates with their size and emission time
    getEmittedPixels(currentTime: number): EmittedPixel[] {
      const pixels: EmittedPixel[] = [];
      for (const index of emitted) {
        const pixel = chosenPixels[index];
        const emissionTime = emissionTimes.get(index) ?? currentTime;
        if (pixel) {
          // Scale coordinates back up to original image resolution
          // Position represents the top-left corner of the scale×scale block
          pixels.push({
            x: pixel.coords[0] * scale,
            y: pixel.coords[1] * scale,
            size: size * scale,
            emissionTime,
          });
        }
      }
      return pixels;
    },
  };
}
