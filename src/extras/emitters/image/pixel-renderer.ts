import type { EmittedPixel } from "./image-emitter";

//
//

export interface RenderConfig {
  /**
   * Current time in seconds
   */
  currentTime: number;
  /**
   * Duration of the fade-in effect in seconds
   */
  fadeDuration?: number;
  /**
   * Color components (RGB) for the pixels. Defaults to white (255, 255, 255)
   */
  color?: readonly [r: number, g: number, b: number];
  /**
   * Function to set fill color (r, g, b, alpha)
   */
  fill: (r: number, g: number, b: number, alpha: number) => void;
  /**
   * Function to draw a rectangle at (x, y) with given size
   */
  rect: (x: number, y: number, size: number) => void;
  /**
   * Function to disable stroke (optional)
   */
  noStroke?: () => void;
}

/**
 * Render emitted pixels with a fade-in effect.
 * Pixels fade in from transparent to fully opaque over the specified duration.
 */
export function renderWithFadeIn(
  pixels: EmittedPixel[],
  config: RenderConfig
): void {
  const {
    currentTime,
    fadeDuration = 0.5,
    color = [255, 255, 255],
    fill,
    rect,
    noStroke,
  } = config;

  if (noStroke) {
    noStroke();
  }

  const [r, g, b] = color;

  for (const pixel of pixels) {
    const timeSinceEmission = currentTime - pixel.emissionTime;
    const alpha = Math.min(1, Math.max(0, timeSinceEmission / fadeDuration));
    fill(r, g, b, alpha * 255);
    rect(pixel.x, pixel.y, pixel.size);
  }
}
