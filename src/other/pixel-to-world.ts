/**
 * Pixel-to-world mapping. Library-agnostic; used by emission only.
 */

import type { PixelToWorldConfig } from "./types.js";
import { pixelCoords } from "./image.js";

export interface PixelToWorld {
  (pixelIndex: number): { x: number; y: number };
}

/**
 * Create pixel-to-world mapper from config.
 * Uses linear indexing; origin selects where (0,0) lands.
 */
export function createPixelToWorld(cfg: PixelToWorldConfig): PixelToWorld {
  const { imageWidth, imageHeight, worldWidth, worldHeight, origin } = cfg;
  const scaleX = worldWidth / imageWidth;
  const scaleY = worldHeight / imageHeight;

  let ox: number;
  let oy: number;
  switch (origin) {
    case "topLeft":
      ox = 0;
      oy = 0;
      break;
    case "center":
      ox = worldWidth / 2;
      oy = worldHeight / 2;
      break;
    case "bottomLeft":
      ox = 0;
      oy = worldHeight;
      break;
    default:
      ox = 0;
      oy = 0;
  }

  return (pixelIndex: number) => {
    const { x, y } = pixelCoords(pixelIndex, imageWidth);
    let wx: number;
    let wy: number;
    switch (origin) {
      case "topLeft":
        wx = x * scaleX;
        wy = y * scaleY;
        break;
      case "center":
        wx = (x - imageWidth / 2) * scaleX + ox;
        wy = (y - imageHeight / 2) * scaleY + oy;
        break;
      case "bottomLeft":
        wx = x * scaleX;
        wy = (imageHeight - 1 - y) * scaleY;
        break;
      default:
        wx = x * scaleX;
        wy = y * scaleY;
    }
    return { x: wx, y: wy };
  };
}
