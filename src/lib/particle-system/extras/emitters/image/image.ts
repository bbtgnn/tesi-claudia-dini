import type { IDrawableImage } from "../../../renderer/types";
import type { RGBA, Vec2 } from "$particles/types";
import {
  arePointsInPolygon,
  generatePixelCoords,
  getPixelColor,
} from "./utils";

//

export interface Image {
  width: number;
  height: number;
  pixels: number[];
}

export function fromDrawable(image: IDrawableImage): Image {
  return {
    width: image.width,
    height: image.height,
    pixels: image.getPixels(),
  };
}

export interface PixelData {
  coords: Vec2;
  color: RGBA;
}

export function getPixelsInPolygon(
  image: Image,
  polygon: readonly Vec2[],
  boundaryDistance?: number
): PixelData[] {
  const { width, height, pixels } = image;

  const coords = generatePixelCoords(width, height);
  const insideFlags = arePointsInPolygon(coords, polygon, boundaryDistance);

  const result: PixelData[] = [];
  const totalPixels = width * height;

  for (let i = 0; i < totalPixels; i++) {
    if (insideFlags[i]) {
      result.push({
        coords: coords[i],
        color: getPixelColor(pixels, i),
      });
    }
  }

  return result;
}
