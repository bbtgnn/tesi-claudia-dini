import P5 from "p5";
import type { Emitter, ParticleDescriptor } from "$particles";
import type { Context, Vec2 } from "$particles/types";
import * as Image from "./image";
import type { Polygon } from "./utils";
import type { Frontier } from "./frontier";

export type { Polygon } from "./utils";
export * from "./frontier";

export interface ImageEmitterConfig {
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

export class ImageEmitter implements Emitter {
  private readonly config: ImageEmitterConfig;
  private readonly chosenPixels: Image.PixelData[] = [];
  private readonly emitted = new Set<number>();
  private readonly emittedPixels: EmittedPixel[] = [];
  private readonly scale: number;
  private readonly velocity: Vec2;
  private readonly size: number;

  constructor(config: ImageEmitterConfig) {
    this.config = config;
    this.scale = config.scale ?? 1;

    const workingImage = config.image.get();
    if (this.scale > 1) {
      workingImage.resize(config.image.width / this.scale, 0);
    }
    workingImage.loadPixels();

    const internalImage = Image.fromP5(workingImage);

    const scaledPolygons: Polygon[] = config.polygons.map((polygon) =>
      polygon.map(([x, y]) => [x / this.scale, y / this.scale])
    );

    const scaledBoundaryDistance = config.boundaryDistance
      ? config.boundaryDistance / this.scale
      : undefined;

    for (const scaledPolygon of scaledPolygons) {
      const pixels = Image.getPixelsInPolygon(
        internalImage,
        scaledPolygon,
        scaledBoundaryDistance
      );
      for (const p of pixels) {
        this.chosenPixels.push({
          coords: [p.coords[0] * this.scale, p.coords[1] * this.scale],
          color: p.color,
        });
      }
    }

    this.velocity = config.velocity ?? [0, 0];
    this.size = config.size ?? 1;
  }

  emit(ctx: Context): ParticleDescriptor[] {
    const currentEmissionTime = ctx.time.current;
    const currentBatch = this.config.frontier.getNextBatch(
      ctx,
      this.chosenPixels,
      this.emitted
    );
    const descriptors: ParticleDescriptor[] = [];

    for (const index of currentBatch) {
      const pixel = this.chosenPixels[index];
      const worldCoords: Vec2 = [pixel.coords[0], pixel.coords[1]];

      descriptors.push({
        position: worldCoords,
        velocity: this.velocity,
        lifetime: this.config.lifetime,
        color: pixel.color,
        size: this.size * this.scale,
      });

      this.emitted.add(index);
      this.emittedPixels.push({
        x: pixel.coords[0],
        y: pixel.coords[1],
        size: this.size * this.scale,
        emissionTime: currentEmissionTime,
      });
    }

    return descriptors;
  }

  getEmittedPixels(): EmittedPixel[] {
    return this.emittedPixels;
  }
}
