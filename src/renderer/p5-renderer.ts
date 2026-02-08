import P5 from "p5";
import type {
  IDrawableImage,
  IDrawContext,
  IRenderer,
  IRenderLayer,
  SimulationRng,
} from "./types";

//

class P5DrawableImage implements IDrawableImage {
  constructor(private readonly p5Image: P5.Image) {}

  get width(): number {
    return this.p5Image.width;
  }
  get height(): number {
    return this.p5Image.height;
  }
  getPixels(): number[] {
    this.p5Image.loadPixels();
    return this.p5Image.pixels;
  }

  /** Internal: used by P5Renderer to draw this image. */
  getNative(): P5.Image {
    return this.p5Image;
  }
}

function drawContextMethods(p5: P5 | P5.Graphics): IDrawContext {
  return {
    setFill(r, g, b, a) {
      p5.noStroke();
      p5.fill(r, g, b, a);
    },
    setStroke(r, g, b, a) {
      p5.stroke(r, g, b, a);
    },
    setStrokeWeight(w) {
      p5.strokeWeight(w);
    },
    noStroke() {
      p5.noStroke();
    },
    drawImage(image, x, y) {
      const img = image as P5DrawableImage;
      p5.image(img.getNative(), x, y);
    },
    drawEllipse(x, y, w, h) {
      p5.ellipse(x, y, w, h);
    },
    drawLine(x1, y1, x2, y2) {
      p5.line(x1, y1, x2, y2);
    },
    drawRect(x, y, w, h) {
      p5.rect(x, y, w, h);
    },
  };
}

class P5RenderLayer implements IRenderLayer {
  readonly width: number;
  readonly height: number;
  private readonly drawCtx: IDrawContext;

  constructor(private readonly graphics: P5.Graphics) {
    this.width = graphics.width;
    this.height = graphics.height;
    this.drawCtx = drawContextMethods(graphics);
  }

  setFill(r: number, g: number, b: number, a: number): void {
    this.drawCtx.setFill(r, g, b, a);
  }
  setStroke(r: number, g: number, b: number, a: number): void {
    this.drawCtx.setStroke(r, g, b, a);
  }
  setStrokeWeight(w: number): void {
    this.drawCtx.setStrokeWeight(w);
  }
  noStroke(): void {
    this.drawCtx.noStroke();
  }
  drawImage(image: IDrawableImage, x: number, y: number): void {
    this.drawCtx.drawImage(image, x, y);
  }
  drawEllipse(x: number, y: number, w: number, h: number): void {
    this.drawCtx.drawEllipse(x, y, w, h);
  }
  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.drawCtx.drawLine(x1, y1, x2, y2);
  }
  drawRect(x: number, y: number, w: number, h: number): void {
    this.drawCtx.drawRect(x, y, w, h);
  }
  clear(): void {
    this.graphics.clear();
  }

  getNative(): P5.Graphics {
    return this.graphics;
  }
}

export interface P5RendererOptions {
  /** Parent element for the canvas; defaults to document.body. */
  parent?: HTMLElement;
  /** Frame rate (default 30). */
  frameRate?: number;
}

/**
 * p5.js-backed renderer. Owns the sketch lifecycle; only this file imports p5.
 */
export class P5Renderer implements IRenderer {
  private p5: P5 | null = null;
  private setupCb: (() => void | Promise<void>)[] = [];
  private drawCb: (() => void)[] = [];
  private keyPressedCb: ((key: string) => void)[] = [];
  private readonly options: Required<P5RendererOptions>;

  constructor(options: P5RendererOptions = {}) {
    this.options = {
      parent: options.parent ?? document.body,
      frameRate: options.frameRate ?? 30,
    };
  }

  get width(): number {
    this.ensureP5();
    return this.p5!.width;
  }
  get height(): number {
    this.ensureP5();
    return this.p5!.height;
  }

  private ensureP5(): void {
    if (!this.p5) {
      throw new Error("Renderer not ready (p5 sketch not created yet)");
    }
  }

  private drawCtx(): IDrawContext {
    this.ensureP5();
    return drawContextMethods(this.p5!);
  }

  setFill(r: number, g: number, b: number, a: number): void {
    this.drawCtx().setFill(r, g, b, a);
  }
  setStroke(r: number, g: number, b: number, a: number): void {
    this.drawCtx().setStroke(r, g, b, a);
  }
  setStrokeWeight(w: number): void {
    this.drawCtx().setStrokeWeight(w);
  }
  noStroke(): void {
    this.drawCtx().noStroke();
  }
  drawImage(image: IDrawableImage, x: number, y: number): void {
    this.drawCtx().drawImage(image, x, y);
  }
  drawEllipse(x: number, y: number, w: number, h: number): void {
    this.drawCtx().drawEllipse(x, y, w, h);
  }
  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    this.drawCtx().drawLine(x1, y1, x2, y2);
  }
  drawRect(x: number, y: number, w: number, h: number): void {
    this.drawCtx().drawRect(x, y, w, h);
  }

  createLayer(width: number, height: number): IRenderLayer {
    this.ensureP5();
    const graphics = this.p5!.createGraphics(width, height);
    return new P5RenderLayer(graphics);
  }

  drawLayer(layer: IRenderLayer, x: number, y: number): void {
    this.ensureP5();
    const pl = layer as P5RenderLayer;
    this.p5!.image(pl.getNative(), x, y);
  }

  async loadImage(
    url: string,
    options?: { maxHeight?: number }
  ): Promise<IDrawableImage> {
    this.ensureP5();
    const img = await this.p5!.loadImage(url);
    if (options?.maxHeight != null && options.maxHeight > 0) {
      img.resize(0, options.maxHeight);
    }
    img.loadPixels();
    return new P5DrawableImage(img);
  }

  createResizedCopy(
    image: IDrawableImage,
    width: number,
    height?: number
  ): IDrawableImage {
    this.ensureP5();
    const wrapper = image as P5DrawableImage;
    const copy = wrapper.getNative().get();
    if (height !== undefined) {
      copy.resize(width, height);
    } else {
      copy.resize(width, 0);
    }
    copy.loadPixels();
    return new P5DrawableImage(copy);
  }

  onSetup(cb: () => void | Promise<void>): void {
    this.setupCb.push(cb);
  }
  onDraw(cb: () => void): void {
    this.drawCb.push(cb);
  }
  onKeyPressed(cb: (key: string) => void): void {
    this.keyPressedCb.push(cb);
  }

  getBounds(): { width: number; height: number } {
    this.ensureP5();
    return { width: this.p5!.width, height: this.p5!.height };
  }

  createRng(baseSeed: number): SimulationRng {
    this.ensureP5();
    const p5 = this.p5!;
    return {
      setStepSeed(stepIndex: number) {
        const seed = baseSeed + stepIndex * 0x9e3779b9;
        p5.randomSeed(seed);
        p5.noiseSeed(seed);
      },
      random: () => p5.random(0, 1),
      noise: (x: number, y?: number, z?: number) => p5.noise(x, y ?? 0, z ?? 0),
    };
  }

  createCanvas(width: number, height: number): void {
    if (!this.p5) throw new Error("createCanvas only valid inside onSetup");
    this.p5.createCanvas(width, height);
    this.p5.frameRate(this.options.frameRate);
  }

  run(): void {
    const parent = this.options.parent;

    new P5((p5: P5) => {
      this.p5 = p5;

      p5.setup = async () => {
        for (const cb of this.setupCb) {
          await cb();
        }
      };

      p5.draw = () => {
        for (const cb of this.drawCb) {
          cb();
        }
      };

      p5.keyPressed = () => {
        for (const cb of this.keyPressedCb) {
          cb(p5.key);
        }
      };
    }, parent);
  }
}
