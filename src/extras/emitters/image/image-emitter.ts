import type { IDrawableImage, IRenderer } from "../../../renderer/types";
import type { Emitter, ParticleDescriptor, Simulation } from "$particles";
import type { Context, Vec2 } from "$particles/types";
import * as Image from "./image";
import type { Polygon } from "./utils";
import type { Frontier } from "./frontier";
import type { FrontierFactory } from "./frontiers";
import { loadPolygonsFromSVG } from "./polygon";

export type { Polygon } from "./utils";
export * from "./frontier";
export type { FrontierFactory, PercentVec2 } from "./frontiers";

export interface ImageEmitterConfig {
  imageFile: string;
  polygonsFile: string;
  lifetime: number;
  velocity?: Vec2;
  size?: number;
  /** Frontier factories (e.g. Frontiers.circle(...), Frontiers.line(...)); coords 0–1. */
  frontiers: FrontierFactory[];
  boundaryDistance?: number;
  scale?: number;
  /** If set, image is resized to this max height (width auto) before processing. */
  imageMaxHeight?: number;
  /** Options for loading polygons from SVG. */
  loadPolygonsOptions?: {
    convertPaths?: boolean;
    pathSamplePoints?: number;
  };
  /** Override background drawing (default: draw this emitter's image at 0,0). */
  background?: (renderer: IRenderer) => void;
}

export class ImageEmitter implements Emitter {
  private readonly config: ImageEmitterConfig;
  private readonly chosenPixels: Image.PixelData[] = [];
  private readonly emitted = new Set<number>();
  private readonly scale: number;
  private readonly velocity: Vec2;
  private readonly size: number;

  private frontiers: Frontier[] = [];
  private imageRef: IDrawableImage | null = null;

  constructor(config: ImageEmitterConfig) {
    this.config = config;
    this.scale = config.scale ?? 1;
    this.velocity = config.velocity ?? [0, 0];
    this.size = config.size ?? 1;
  }

  /**
   * Load image and polygons from files, then build pixel set and frontiers.
   * Call once after construction, e.g. in renderer onSetup.
   */
  async init(renderer: IRenderer): Promise<void> {
    const img = await renderer.loadImage(this.config.imageFile, {
      maxHeight: this.config.imageMaxHeight,
    });

    const opts = this.config.loadPolygonsOptions ?? {};
    const polygons = await loadPolygonsFromSVG(this.config.polygonsFile, {
      convertPaths: opts.convertPaths ?? true,
      pathSamplePoints: opts.pathSamplePoints ?? 100,
      targetDimensions: { width: img.width, height: img.height },
    });

    const workingImage =
      this.scale > 1
        ? renderer.createResizedCopy(img, Math.floor(img.width / this.scale), 0)
        : img;
    const internalImage = Image.fromDrawable(workingImage);

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

    this.frontiers = this.config.frontiers.map((fn) =>
      fn(img.width, img.height)
    );
    this.imageRef = img;
  }

  get image(): IDrawableImage {
    if (!this.imageRef) throw new Error("Image not loaded");
    return this.imageRef;
  }

  emit(ctx: Context): ParticleDescriptor[] {
    if (this.frontiers.length === 0) return [];

    const batchIndices = new Set<number>();
    for (const frontier of this.frontiers) {
      const batch = frontier.getNextBatch(ctx, this.chosenPixels, this.emitted);
      for (const i of batch) batchIndices.add(i);
    }

    const descriptors: ParticleDescriptor[] = [];
    for (const index of batchIndices) {
      const pixel = this.chosenPixels[index]!;
      const worldCoords: Vec2 = [pixel.coords[0], pixel.coords[1]];

      descriptors.push({
        position: worldCoords,
        velocity: this.velocity,
        lifetime: this.config.lifetime,
        color: pixel.color,
        size: this.size * this.scale,
      });

      this.emitted.add(index);
    }

    return descriptors;
  }

  /**
   * Configure the simulation with this emitter's image size and background.
   * Called by the simulation during setup after init(renderer) has run.
   */
  configureSimulation(simulation: Simulation): void {
    simulation.setBounds(this.image.width, this.image.height);
    const bg = this.config.background ?? ((r) => r.drawImage(this.image, 0, 0));
    simulation.setBackground(bg);
  }
}
