import P5 from "p5";
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

export function fromP5(image: P5.Image): Image {
  return {
    width: image.width,
    height: image.height,
    pixels: image.pixels,
  };
}

export interface PixelData {
  coords: Vec2;
  color: RGBA;
}

export function getPixelsInPolygon(
  image: Image,
  polygon: readonly Vec2[]
): PixelData[] {
  const { width, height, pixels } = image;

  const coords = generatePixelCoords(width, height);
  const insideFlags = arePointsInPolygon(coords, polygon);

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
