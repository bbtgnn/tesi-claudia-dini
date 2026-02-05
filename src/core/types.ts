export type Vec2 = readonly [x: number, y: number];

export type RGBA = readonly [r: number, g: number, b: number, a: number];

export type TimeStep = {
  time: number;
  dt: number;
};

/** Descriptor for a single particle; emitters return these and the engine adds them to the pool. */
export interface ParticleDescriptor {
  position: Vec2;
  velocity: Vec2;
  lifetime: number;
  color: RGBA;
  size: number;
}
