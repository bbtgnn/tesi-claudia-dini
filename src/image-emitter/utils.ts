import type { Vec2, RGBA } from "$particles/types";

//

export type Polygon = readonly Vec2[];

export function arePointsInPolygon(
  points: readonly Vec2[],
  polygon: Polygon
): boolean[] {
  if (polygon.length < 3) {
    return new Array(points.length).fill(false);
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const [x, y] of polygon) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const edges: Array<{
    xi: number;
    yi: number;
    xj: number;
    yj: number;
    invDy: number;
  }> = [];
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const dy = yj - yi;
    edges.push({
      xi,
      yi,
      xj,
      yj,
      invDy: dy !== 0 ? 1 / dy : Infinity,
    });
  }

  const results: boolean[] = new Array(points.length);

  for (let pIdx = 0; pIdx < points.length; pIdx++) {
    const [px, py] = points[pIdx];

    if (px < minX || px > maxX || py < minY || py > maxY) {
      results[pIdx] = false;
      continue;
    }

    let inside = false;
    for (const edge of edges) {
      const { xi, yi, xj, yj, invDy } = edge;

      const intersect =
        yi > py !== yj > py && px < (xj - xi) * (py - yi) * invDy + xi;

      if (intersect) {
        inside = !inside;
      }
    }

    results[pIdx] = inside;
  }

  return results;
}

export function generatePixelCoords(width: number, height: number): Vec2[] {
  const coords: Vec2[] = new Array(width * height);
  let idx = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      coords[idx++] = [x, y];
    }
  }
  return coords;
}

export function getPixelColor(
  pixels: readonly number[],
  pixelIndex: number
): RGBA {
  const baseIndex = pixelIndex * 4;
  return [
    pixels[baseIndex],
    pixels[baseIndex + 1],
    pixels[baseIndex + 2],
    pixels[baseIndex + 3],
  ];
}
