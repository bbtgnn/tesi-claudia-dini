import type { Polygon } from "./utils";
import type { Vec2 } from "$particles/types";

//

/**
 * Load polygons from an SVG file.
 * Extracts <polygon> elements and optionally converts <path> elements to polygons.
 */
export async function loadPolygonsFromSVG(
  svgUrl: string,
  options?: {
    /** Convert <path> elements to polygons by sampling points along the path. Default: false */
    convertPaths?: boolean;
    /** Number of points to sample along each path. Only used if convertPaths is true. Default: 100 */
    pathSamplePoints?: number;
    /** Scale factor to apply to all coordinates. Default: 1 */
    scale?: number;
    /** Target image dimensions. If provided, polygons will be scaled to match these dimensions. */
    targetDimensions?: { width: number; height: number };
  }
): Promise<Polygon[]> {
  const {
    convertPaths = false,
    pathSamplePoints = 100,
    scale = 1,
    targetDimensions,
  } = options ?? {};

  // Fetch SVG file
  const response = await fetch(svgUrl);
  const svgText = await response.text();

  // Parse SVG
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgText, "image/svg+xml");

  // Check for parsing errors
  const parserError = svgDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error(`Failed to parse SVG: ${parserError.textContent}`);
  }

  const svgElement = svgDoc.documentElement as unknown as SVGElement;
  if (!svgElement || svgElement.tagName !== "svg") {
    throw new Error("SVG file does not contain a valid <svg> element");
  }

  // Get SVG viewBox and dimensions for coordinate transformation
  const viewBox = parseViewBox(svgElement);
  const svgWidth =
    parseFloat(svgElement.getAttribute("width") || "0") || viewBox.width;
  const svgHeight =
    parseFloat(svgElement.getAttribute("height") || "0") || viewBox.height;

  // Calculate scale factors if target dimensions are provided
  // After viewBox transformation, coordinates will be in SVG element space (svgWidth x svgHeight)
  // We need to scale from SVG space to target image space
  let scaleX = scale;
  let scaleY = scale;

  if (targetDimensions) {
    // Calculate scale factors to map from SVG dimensions to target image dimensions
    scaleX = scale * (targetDimensions.width / svgWidth);
    scaleY = scale * (targetDimensions.height / svgHeight);
  }

  const polygons: Polygon[] = [];

  // Extract <polygon> elements
  const polygonElements = Array.from(svgElement.querySelectorAll("polygon"));
  for (const polyEl of polygonElements) {
    const points = parsePolygonPoints(polyEl);
    if (points.length > 0) {
      const transformed = transformPoints(
        points,
        viewBox,
        svgWidth,
        svgHeight,
        scaleX,
        scaleY
      );
      polygons.push(transformed);
    }
  }

  // Extract <polyline> elements (treat as polygons)
  const polylineElements = Array.from(svgElement.querySelectorAll("polyline"));
  for (const polylineEl of polylineElements) {
    const points = parsePolygonPoints(polylineEl);
    if (points.length > 0) {
      const transformed = transformPoints(
        points,
        viewBox,
        svgWidth,
        svgHeight,
        scaleX,
        scaleY
      );
      polygons.push(transformed);
    }
  }

  // Optionally convert <path> elements to polygons
  if (convertPaths) {
    const pathElements = Array.from(svgElement.querySelectorAll("path"));
    for (const pathEl of pathElements) {
      const pathPolygon = pathToPolygon(
        pathEl,
        pathSamplePoints,
        viewBox,
        svgWidth,
        svgHeight,
        scaleX,
        scaleY
      );
      if (pathPolygon.length > 0) {
        polygons.push(pathPolygon);
      }
    }
  }

  return polygons;
}

//

interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function parseViewBox(svgElement: SVGElement): ViewBox {
  const viewBoxAttr = svgElement.getAttribute("viewBox");
  if (!viewBoxAttr) {
    // No viewBox, use element dimensions
    const width = parseFloat(svgElement.getAttribute("width") || "0") || 0;
    const height = parseFloat(svgElement.getAttribute("height") || "0") || 0;
    return { x: 0, y: 0, width, height };
  }

  const parts = viewBoxAttr.trim().split(/\s+/).map(parseFloat);
  if (parts.length !== 4) {
    const width = parseFloat(svgElement.getAttribute("width") || "0") || 0;
    const height = parseFloat(svgElement.getAttribute("height") || "0") || 0;
    return { x: 0, y: 0, width, height };
  }

  return {
    x: parts[0],
    y: parts[1],
    width: parts[2],
    height: parts[3],
  };
}

function parsePolygonPoints(element: SVGElement): Vec2[] {
  const pointsAttr = element.getAttribute("points");
  if (!pointsAttr) return [];

  const points: Vec2[] = [];
  // SVG points can be separated by spaces or commas
  const coords = pointsAttr
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);

  for (let i = 0; i < coords.length; i += 2) {
    const x = parseFloat(coords[i]);
    const y = parseFloat(coords[i + 1]);
    if (!isNaN(x) && !isNaN(y)) {
      points.push([x, y]);
    }
  }

  return points;
}

function transformPoints(
  points: Vec2[],
  viewBox: ViewBox,
  svgWidth: number,
  svgHeight: number,
  scaleX: number,
  scaleY: number
): Vec2[] {
  // Handle SVG transforms (simplified - only handles translate/scale for now)
  // For full transform support, you'd need to use SVGMatrix or a transform library

  // If viewBox exists, transform coordinates from viewBox space to SVG element space
  let transformed: Vec2[] = points;

  if (
    viewBox.width > 0 &&
    viewBox.height > 0 &&
    svgWidth > 0 &&
    svgHeight > 0
  ) {
    // Calculate scale factors to transform from viewBox space to SVG element space
    const viewBoxScaleX = svgWidth / viewBox.width;
    const viewBoxScaleY = svgHeight / viewBox.height;

    transformed = points.map(([x, y]) => [
      (x - viewBox.x) * viewBoxScaleX,
      (y - viewBox.y) * viewBoxScaleY,
    ]);
  }

  // Apply scale factors to transform from SVG element space to target image space
  transformed = transformed.map(([x, y]) => [x * scaleX, y * scaleY]);

  return transformed;
}

function pathToPolygon(
  pathElement: SVGPathElement,
  samplePoints: number,
  viewBox: ViewBox,
  svgWidth: number,
  svgHeight: number,
  scaleX: number,
  scaleY: number
): Vec2[] {
  const pathLength = pathElement.getTotalLength();
  if (pathLength === 0) return [];

  const points: Vec2[] = [];
  const step = pathLength / (samplePoints - 1);

  for (let i = 0; i < samplePoints; i++) {
    const distance = i * step;
    const point = pathElement.getPointAtLength(distance);
    points.push([point.x, point.y]);
  }

  // Transform points using the same logic as polygon points
  return transformPoints(points, viewBox, svgWidth, svgHeight, scaleX, scaleY);
}
