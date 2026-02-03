export type ParticleRenderData = {
  x: number;
  y: number;
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
  trail: Vec2[];
};

export type Vec2 = readonly [x: number, y: number];

export type RGBA = readonly [r: number, g: number, b: number, a: number];
