import P5 from "p5";
import type { ParticleDescriptor, Simulation } from "$particles";
import type { Context, Vec2 } from "$particles/types";
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
  getEmittedPixels(): EmittedPixel[];
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
  const emittedPixels: EmittedPixel[] = [];
  const frontier = config.frontier;
  const velocity: Vec2 = config.velocity ?? [0, 0];
  const size = config.size ?? 1;

  return {
    emit(ctx: Context): ParticleDescriptor[] {
      const currentEmissionTime = ctx.time.current;
      const currentBatch = frontier.getNextBatch(ctx, chosenPixels, emitted);
      const descriptors: ParticleDescriptor[] = [];

      for (const index of currentBatch) {
        const pixel = chosenPixels[index];
        const worldCoords: Vec2 = [pixel.coords[0], pixel.coords[1]];

        descriptors.push({
          position: worldCoords,
          velocity,
          lifetime: config.lifetime,
          color: pixel.color,
          size: size * scale,
        });

        emitted.add(index);
        emittedPixels.push({
          x: pixel.coords[0],
          y: pixel.coords[1],
          size: size * scale,
          emissionTime: currentEmissionTime,
        });
      }

      return descriptors;
    },

    getEmittedPixels(): EmittedPixel[] {
      return emittedPixels;
    },
  };
}
