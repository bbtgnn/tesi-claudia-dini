import P5 from "p5";
import type { Emitter, ParticleDescriptor } from "$particles";
import type { Context, Vec2 } from "$particles/types";
import * as Image from "./image";
import type { Polygon } from "./utils";
import type { Frontier } from "./frontier";
import { loadPolygonsFromSVG } from "./polygon";

export type { Polygon } from "./utils";
export * from "./frontier";

export interface ImageEmitterConfig {
  imageFile: string;
  polygonsFile: string;
  lifetime: number;
  velocity?: Vec2;
  size?: number;
  /** Called in init() with loaded image dimensions. */
  frontier: (width: number, height: number) => Frontier;
  boundaryDistance?: number;
  scale?: number;
  /** If set, image is resized to this max height (width auto) before processing. */
  imageMaxHeight?: number;
  /** Options for loading polygons from SVG. */
  loadPolygonsOptions?: {
    convertPaths?: boolean;
    pathSamplePoints?: number;
  };
  /** Fallback polygon when SVG returns none. Receives image width and height. */
  fallbackPolygon?: (width: number, height: number) => Polygon;
}

export interface EmittedPixel {
  x: number;
  y: number;
  size: number;
  emissionTime: number;
}

function defaultFallbackPolygon(width: number, height: number): Polygon {
  const x = 0.2 * width;
  const y = 0.2 * height;
  const w = 0.3 * width;
  const h = 0.3 * height;
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

export class ImageEmitter implements Emitter {
  private readonly config: ImageEmitterConfig;
  private readonly chosenPixels: Image.PixelData[] = [];
  private readonly emitted = new Set<number>();
  private readonly emittedPixels: EmittedPixel[] = [];
  private readonly scale: number;
  private readonly velocity: Vec2;
  private readonly size: number;

  private frontier: Frontier | null = null;
  private image: P5.Image | null = null;
  private width = 0;
  private height = 0;

  constructor(config: ImageEmitterConfig) {
    this.config = config;
    this.scale = config.scale ?? 1;
    this.velocity = config.velocity ?? [0, 0];
    this.size = config.size ?? 1;
  }

  /**
   * Load image and polygons from files, then build pixel set and frontier.
   * Call once after construction, e.g. in p5 setup.
   */
  async init(p5: P5): Promise<void> {
    const img = await p5.loadImage(this.config.imageFile);
    if (this.config.imageMaxHeight != null && this.config.imageMaxHeight > 0) {
      img.resize(0, this.config.imageMaxHeight);
    }
    img.loadPixels();

    const opts = this.config.loadPolygonsOptions ?? {};
    const svgPolygons = await loadPolygonsFromSVG(this.config.polygonsFile, {
      convertPaths: opts.convertPaths ?? true,
      pathSamplePoints: opts.pathSamplePoints ?? 100,
      targetDimensions: { width: img.width, height: img.height },
    });

    const polygons =
      svgPolygons.length > 0
        ? svgPolygons
        : [
            (this.config.fallbackPolygon ?? defaultFallbackPolygon)(
              img.width,
              img.height
            ),
          ];

    const workingImage = img.get();
    if (this.scale > 1) {
      workingImage.resize(img.width / this.scale, 0);
    }
    workingImage.loadPixels();

    const internalImage = Image.fromP5(workingImage);

    const scaledPolygons: Polygon[] = polygons.map((polygon) =>
      polygon.map(([x, y]) => [x / this.scale, y / this.scale])
    );

    const scaledBoundaryDistance = this.config.boundaryDistance
      ? this.config.boundaryDistance / this.scale
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

    this.frontier = this.config.frontier(img.width, img.height);
    this.image = img;
    this.width = img.width;
    this.height = img.height;
  }

  getImage(): P5.Image | null {
    return this.image;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  emit(ctx: Context): ParticleDescriptor[] {
    if (!this.frontier) return [];

    const currentEmissionTime = ctx.time.current;
    const currentBatch = this.frontier.getNextBatch(
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
