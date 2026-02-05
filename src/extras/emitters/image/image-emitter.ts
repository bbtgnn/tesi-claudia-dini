import P5 from "p5";
import { ParticlePool } from "$particles";
import type { Simulation } from "$particles";
import type { Vec2 } from "$particles/types";
import * as Image from "./image";
import type { Polygon } from "./utils";
import type { Frontier } from "./frontier";

export type { Polygon } from "./utils";
export * from "./frontier";

interface Config {
  image: P5.Image;
  polygons: Polygon[];
  lifetime: number;
  velocity?: Vec2;
  size?: number;
  frontier: Frontier;
  boundaryDistance?: number;
  scale?: number;
}

export interface EmittedPixel {
  x: number;
  y: number;
  size: number;
  emissionTime: number;
}

export interface ImageEmitter extends Simulation.Emitter {
  getEmittedPixels(currentTime: number): EmittedPixel[];
}

export function make(config: Config): ImageEmitter {
  const scale = config.scale ?? 1;

  const workingImage = config.image.get();
  if (scale > 1) {
    workingImage.resize(config.image.width / scale, 0);
  }
  workingImage.loadPixels();

  const internalImage = Image.fromP5(workingImage);

  const scaledPolygons: Polygon[] = config.polygons.map((polygon) =>
    polygon.map(([x, y]) => [x / scale, y / scale])
  );

  const scaledBoundaryDistance = config.boundaryDistance
    ? config.boundaryDistance / scale
    : undefined;

  const chosenPixels: Image.PixelData[] = [];
  for (const scaledPolygon of scaledPolygons) {
    const pixels = Image.getPixelsInPolygon(
      internalImage,
      scaledPolygon,
      scaledBoundaryDistance
    );
    for (const p of pixels) {
      chosenPixels.push({
        coords: [p.coords[0] * scale, p.coords[1] * scale],
        color: p.color,
      });
    }
  }

  const emitted = new Set<number>();
  const emissionTimes = new Map<number, number>();
  const frontier = config.frontier;
  const velocity: Vec2 = config.velocity ?? [0, 0];
  const size = config.size ?? 1;

  let currentBatch: number[] = [];
  let currentTime = 0;

  return {
    update(timeStep) {
      currentTime = timeStep.time;
      frontier.update(timeStep);
      currentBatch = frontier.getNextBatch(chosenPixels, emitted);
    },

    emit(pool) {
      const currentEmissionTime = currentTime;

      for (const index of currentBatch) {
        const pixel = chosenPixels[index];

        const worldCoords: Vec2 = [pixel.coords[0], pixel.coords[1]];

        ParticlePool.spawn(pool, {
          position: worldCoords,
          velocity,
          lifetime: config.lifetime,
          color: pixel.color,
          size: size * scale,
        });

        emitted.add(index);
        emissionTimes.set(index, currentEmissionTime);
      }
    },

    getEmittedPixels(currentTime: number): EmittedPixel[] {
      const pixels: EmittedPixel[] = [];
      for (const index of emitted) {
        const pixel = chosenPixels[index];
        const emissionTime = emissionTimes.get(index) ?? currentTime;
        if (pixel) {
          pixels.push({
            x: pixel.coords[0],
            y: pixel.coords[1],
            size: size * scale,
            emissionTime,
          });
        }
      }
      return pixels;
    },
  };
}
