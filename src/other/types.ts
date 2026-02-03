export type ParticleRenderingData = {
  x: number;
  y: number;
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
};

/** Logical pixel state. Authoritative for activation eligibility. */
export const enum PixelState {
  Available = 0,
  Consumed = 1,
}

/** RGBA color as four floats in [0, 1]. */
export type RGBA = readonly [r: number, g: number, b: number, a: number];

/** 2D vector (x, y). */
export type Vec2 = readonly [x: number, y: number];

/** Burn seed: origin of erosion expansion. */
export interface BurnSeed {
  /** Center in pixel space (x, y). */
  centerX: number;
  centerY: number;
  /** Pixels per second expansion speed. */
  speed: number;
  /** Current radius (expansion depth) in pixels. */
  radius: number;
  /** Optional delay before this seed starts (seconds). */
  delay: number;
  /** Optional max range in pixels; 0 = unlimited. */
  maxRange: number;
}

/** Pixel-to-world mapping configuration. */
export interface PixelToWorldConfig {
  /** Image width in pixels. */
  imageWidth: number;
  /** Image height in pixels. */
  imageHeight: number;
  /** Output width in world units. */
  worldWidth: number;
  /** Output height in world units. */
  worldHeight: number;
  /** Origin: "topLeft" | "center" | "bottomLeft". */
  origin: "topLeft" | "center" | "bottomLeft";
}
