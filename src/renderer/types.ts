/**
 * Image that can be drawn and read (pixels). Abstraction over p5.Image or other backends.
 */
export interface IDrawableImage {
  readonly width: number;
  readonly height: number;
  /** RGBA values; call after loadPixels() if the backend requires it. */
  getPixels(): number[];
}

/** Mode for ellipse(): center (x,y), radius (w,h = radii), corner/corners. */
export type EllipseMode = "center" | "radius" | "corner" | "corners";
/** Mode for rect(): center (x,y), radius (w,h = half), corner/corners. */
export type RectMode = "center" | "radius" | "corner" | "corners";

/**
 * Draw target: main canvas or an offscreen layer. Same drawing API for both.
 * Includes p5-style transform stack and RNG for drawing code.
 */
export interface IDrawContext {
  setFill(r: number, g: number, b: number, a: number): void;
  setStroke(r: number, g: number, b: number, a: number): void;
  setStrokeWeight(w: number): void;
  noStroke(): void;
  drawImage(image: IDrawableImage, x: number, y: number): void;
  drawEllipse(x: number, y: number, w: number, h: number): void;
  /** How ellipse(x,y,w,h) is interpreted (default "center"). */
  ellipseMode(mode: EllipseMode): void;
  drawLine(x1: number, y1: number, x2: number, y2: number): void;
  /** Alias for drawLine (p5-style naming). */
  line(x1: number, y1: number, x2: number, y2: number): void;
  drawRect(x: number, y: number, w: number, h: number): void;
  /** How rect(x,y,w,h) is interpreted (default "corner"). */
  rectMode(mode: RectMode): void;

  /** Save current transform and style state (p5 push). */
  push(): void;
  /** Restore transform and style state (p5 pop). */
  pop(): void;
  /** Rotate by angle in radians. */
  rotate(angle: number): void;
  /** Translate drawing origin by (x, y). */
  translate(x: number, y: number): void;

  /** Random in [0, 1]. */
  random(): number;
  /** Random in [0, max]. */
  random(max: number): number;
  /** Random in [min, max]. */
  random(min: number, max: number): number;
  /** Set seed for random(). */
  randomSeed(seed: number): void;
  /** Perlin noise (x, optional y, z). Returns [0, 1]. */
  noise(x: number, y?: number, z?: number): number;
  /** Set seed for noise(). */
  noiseSeed(seed: number): void;
}

/**
 * Offscreen layer with the same drawing API. Created by IRenderer.createLayer().
 */
export interface IRenderLayer extends IDrawContext {
  /** Width of this layer. */
  readonly width: number;
  /** Height of this layer. */
  readonly height: number;
  /** Clear the layer (transparent). */
  clear(): void;
}

/**
 * RNG provided by the renderer for the simulation (e.g. p5 random/noise).
 * Simulation uses this; only the renderer implementation is p5-specific.
 */
export interface SimulationRng {
  setStepSeed(stepIndex: number): void;
  random(): number;
  noise(x: number, y?: number, z?: number): number;
}

/**
 * Main renderer: draw context + canvas size + layers + asset loading + lifecycle.
 */
export interface IRenderer extends IDrawContext {
  readonly width: number;
  readonly height: number;

  /** Create an offscreen layer to draw on; then use drawLayer() to blit it. */
  createLayer(width: number, height: number): IRenderLayer;
  /** Draw a layer onto the main canvas at (x, y). */
  drawLayer(layer: IRenderLayer, x: number, y: number): void;

  /** Load an image from URL; optional resize before returning. */
  loadImage(
    url: string,
    options?: { maxHeight?: number }
  ): Promise<IDrawableImage>;

  /**
   * Create a resized copy of an image (e.g. for faster pixel processing).
   * If height is omitted, it is computed to keep aspect ratio.
   */
  createResizedCopy(
    image: IDrawableImage,
    width: number,
    height?: number
  ): IDrawableImage;

  /**
   * Create the canvas. Call once from within onSetup (e.g. after loading assets
   * so you have dimensions). Must be called before draw runs.
   */
  createCanvas(width: number, height: number): void;

  /** Register setup callback (async). Called once; call createCanvas in it. */
  onSetup(cb: () => void | Promise<void>): void;
  /** Register draw callback. Called every frame. */
  onDraw(cb: () => void): void;
  /** Register key pressed callback. Receives key string (e.g. " ", "ArrowRight"). */
  onKeyPressed(cb: (key: string) => void): void;

  /** Current canvas bounds (width, height). Valid after setup. */
  getBounds(): { width: number; height: number };
  /** Create RNG for the simulation (e.g. p5 random/noise). */
  createRng(baseSeed: number): SimulationRng;

  /** Start the render loop. Call after registering callbacks. */
  run(): void;
}
