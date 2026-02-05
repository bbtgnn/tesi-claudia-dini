import type { ParticleDescriptor, Simulation } from "../../core";
import type { Vec2 } from "../../core/types";
import type { RGBA } from "../../core/types";

interface SimpleEmitterConfig {
  position: Vec2;
  velocity: Vec2;
  lifetime: number;
  color: RGBA;
  size: number;
}

const DEFAULTS: SimpleEmitterConfig = {
  position: [0, 0],
  velocity: [0, 0],
  lifetime: 10,
  color: [1, 1, 1, 1],
  size: 1,
};

export function makeSimple(
  config: Partial<SimpleEmitterConfig> = {}
): Simulation.Emitter {
  const { position, velocity, lifetime, color, size } = {
    ...DEFAULTS,
    ...config,
  };

  const descriptor: ParticleDescriptor = {
    position,
    velocity,
    lifetime,
    color,
    size,
  };

  return {
    update() {},

    emit(): ParticleDescriptor[] {
      return [descriptor];
    },
  };
}
