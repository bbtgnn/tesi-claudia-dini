import type { IRenderer } from "../renderer/types";

export type Vec2 = readonly [x: number, y: number];

export type RGBA = readonly [r: number, g: number, b: number, a: number];

//

export interface StepRng {
  random(): number;
  noise(x: number, y?: number, z?: number): number;
}

export interface Context {
  time: { current: number; delta: number };
  rng: StepRng;
  bounds: { width: number; height: number };
}

export interface ParticleDescriptor {
  position: Vec2;
  velocity: Vec2;
  lifetime: number;
  color: RGBA;
  size: number;
}

export interface ForceContext {
  count: number;
  px: Float32Array;
  py: Float32Array;
  vx: Float32Array;
  vy: Float32Array;
  dt: number;
}

export interface Force {
  update(ctx: Context): void;
  apply(ctx: ForceContext): void;
}

export interface Emitter {
  emit(ctx: Context): ParticleDescriptor[];
  /** Optional: load assets (e.g. images). Called by simulation during renderer setup. */
  init?(renderer: IRenderer): Promise<void>;
  /** Optional: configure simulation (bounds, background). Called after init(renderer). */
  configureSimulation?(simulation: {
    setBounds(width: number, height: number): void;
    setBackground(fn: (renderer: IRenderer) => void): void;
  }): void;
}
