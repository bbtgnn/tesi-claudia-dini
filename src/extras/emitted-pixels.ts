import type { IDrawContext, IRenderLayer, IRenderer } from "../renderer/types";
import type { OnUpdatePayload } from "../core/simulation";

//

export interface EmittedPixel {
  id: number;
  x: number;
  y: number;
  size: number;
  emissionTime: number;
}

export interface EmittedPixelsSnapshot {
  nextId: number;
  currentTime: number;
  pixels: EmittedPixel[];
  drawnToLayerIds: number[];
}

/** Called for each pixel: draw on `target` (main canvas or layer) with the given opacity (0–1). */
export type EmittedPixelDrawFn = (
  target: IDrawContext,
  pixel: EmittedPixel,
  opacity: number
) => void;

interface Config {
  maxLength?: number;
  /** Time in seconds for the fade-in; pixels are "completed" and moved to the layer after this. */
  fadeDuration: number;
  /** Used for both completed pixels (on layer, opacity 1) and fading pixels (on main canvas, opacity 0–1). */
  draw: EmittedPixelDrawFn;
  /** If false, this extension is excluded from the simulation. */
  active: boolean;
}

export class EmittedPixels {
  readonly active: boolean;
  private readonly maxLength: number;
  private readonly fadeDuration: number;
  private readonly draw: EmittedPixelDrawFn;
  private nextId = 0;
  private readonly pixels: EmittedPixel[] = [];
  private readonly drawnToLayerIds = new Set<number>();
  private layerInvalidated = false;
  private layer: IRenderLayer | null = null;
  private layerWidth = 0;
  private layerHeight = 0;
  private currentTime = 0;

  constructor(config: Config) {
    this.active = config.active;
    this.maxLength = config.maxLength ?? 10_000;
    this.fadeDuration = config.fadeDuration;
    this.draw = config.draw;
  }

  update(payload: OnUpdatePayload): void {
    const { particles: pool, context, stepResult } = payload;
    const dt = context.time.delta;
    this.currentTime = context.time.current + dt;

    for (const i of stepResult.added) {
      const startX = pool.px[i] - pool.vx[i] * dt;
      const startY = pool.py[i] - pool.vy[i] * dt;
      this.pixels.push({
        id: this.nextId++,
        x: startX,
        y: startY,
        size: pool.size[i],
        emissionTime: pool.emissionTime[i],
      });
    }

    while (this.pixels.length > this.maxLength) {
      const removed = this.pixels.shift()!;
      this.drawnToLayerIds.delete(removed.id);
    }
  }

  snapshot(): EmittedPixelsSnapshot {
    return {
      nextId: this.nextId,
      currentTime: this.currentTime,
      pixels: this.pixels.map((p) => ({
        id: p.id,
        x: p.x,
        y: p.y,
        size: p.size,
        emissionTime: p.emissionTime,
      })),
      drawnToLayerIds: [...this.drawnToLayerIds],
    };
  }

  restore(snap: unknown): void {
    const s = snap as EmittedPixelsSnapshot;
    this.nextId = s.nextId;
    this.currentTime = s.currentTime ?? 0;
    this.pixels.length = 0;
    for (const p of s.pixels) {
      this.pixels.push({
        id: p.id,
        x: p.x,
        y: p.y,
        size: p.size,
        emissionTime: p.emissionTime,
      });
    }
    this.drawnToLayerIds.clear();
    for (const id of s.drawnToLayerIds) {
      this.drawnToLayerIds.add(id);
    }
    this.layerInvalidated = true;
  }

  /**
   * Renders the emitted pixels onto the renderer: draws the accumulated layer
   * (completed pixels) then the fading pixels on top. Call after drawing the
   * background and before drawing particles. Uses the time stored during the
   * last update() call.
   */
  render(renderer: IRenderer): void {
    const currentTime = this.currentTime;
    const fadeDuration = this.fadeDuration;
    const w = renderer.width;
    const h = renderer.height;
    if (
      this.layer === null ||
      this.layerWidth !== w ||
      this.layerHeight !== h
    ) {
      this.layer = renderer.createLayer(w, h);
      this.layerWidth = w;
      this.layerHeight = h;
    }
    const layer = this.layer;

    if (this.layerInvalidated) {
      layer.clear();
      const completed = this.getCompletedPixels(currentTime, fadeDuration);
      for (const pixel of completed) {
        this.draw(layer, pixel, 1);
      }
      this.layerInvalidated = false;
    } else {
      const newlyCompleted = this.getNewlyCompletedPixels(
        currentTime,
        fadeDuration
      );
      for (const pixel of newlyCompleted) {
        this.draw(layer, pixel, 1);
      }
    }

    renderer.drawLayer(layer, 0, 0);

    const fading = this.getFadingPixels(currentTime, fadeDuration);
    for (const pixel of fading) {
      const age = currentTime - pixel.emissionTime;
      const opacity = Math.min(1, Math.max(0, age / fadeDuration));
      this.draw(renderer, pixel, opacity);
    }
  }

  private getFadingPixels(
    currentTime: number,
    fadeDuration: number
  ): EmittedPixel[] {
    const out: EmittedPixel[] = [];
    for (const p of this.pixels) {
      const age = currentTime - p.emissionTime;
      if (age < fadeDuration) out.push(p);
    }
    return out;
  }

  private getNewlyCompletedPixels(
    currentTime: number,
    fadeDuration: number
  ): EmittedPixel[] {
    const out: EmittedPixel[] = [];
    for (const p of this.pixels) {
      const age = currentTime - p.emissionTime;
      if (age >= fadeDuration && !this.drawnToLayerIds.has(p.id)) {
        this.drawnToLayerIds.add(p.id);
        out.push(p);
      }
    }
    return out;
  }

  private getCompletedPixels(
    currentTime: number,
    fadeDuration: number
  ): EmittedPixel[] {
    const out: EmittedPixel[] = [];
    for (const p of this.pixels) {
      const age = currentTime - p.emissionTime;
      if (age >= fadeDuration) out.push(p);
    }
    return out;
  }
}
