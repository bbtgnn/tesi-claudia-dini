import type { Vec2, RGBA } from "$particles/types";

//

export type Polygon = readonly Vec2[];

export function arePointsInPolygon(
  points: readonly Vec2[],
  polygon: Polygon,
  boundaryDistance?: number
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

    if (boundaryDistance !== undefined && boundaryDistance > 0 && inside) {
      // Filter probabilistically based on distance to boundary
      const distance = distanceToPolygonBoundary(points[pIdx], polygon);
      // Calculate probability: 0 on boundary, 1 if distance >= boundaryDistance
      // Linear gradient between 0 and boundaryDistance
      let probability: number;
      if (distance <= 0) {
        probability = 0;
      } else if (distance >= boundaryDistance) {
        probability = 1;
      } else {
        probability = distance / boundaryDistance;
      }

      // Filter based on probability
      results[pIdx] = Math.random() < probability;
    } else {
      // Return boolean (original behavior)
      results[pIdx] = inside;
    }
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

/**
 * Calculate the distance from a point to a line segment.
 * Returns the perpendicular distance if the projection falls on the segment,
 * otherwise returns the distance to the nearest endpoint.
 */
function distanceToLineSegment(
  point: Vec2,
  lineStart: Vec2,
  lineEnd: Vec2
): number {
  const [px, py] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // Line segment is a point
    const distX = px - x1;
    const distY = py - y1;
    return Math.sqrt(distX * distX + distY * distY);
  }

  // Project point onto line segment
  const t = Math.max(
    0,
    Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSquared)
  );
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  // Distance from point to projection
  const distX = px - projX;
  const distY = py - projY;
  return Math.sqrt(distX * distX + distY * distY);
}

/**
 * Calculate the minimum distance from a point to any edge of the polygon.
 */
export function distanceToPolygonBoundary(
  point: Vec2,
  polygon: Polygon
): number {
  if (polygon.length < 2) {
    return Infinity;
  }

  let minDistance = Infinity;

  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const distance = distanceToLineSegment(point, polygon[i], polygon[j]);
    minDistance = Math.min(minDistance, distance);
  }

  return minDistance;
}
