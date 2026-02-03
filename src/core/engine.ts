import * as ParticlePool from "./particle-pool";
import * as RenderBuffer from "./render-buffer";
import * as Emitter from "./emitter";
import * as Simulation from "./simulation";
import * as Force from "./force";
import type { ParticleRenderData } from "./types";

//

export interface Engine {
  particles: ParticlePool.Pool;
  renderBuffer: RenderBuffer.Buffer;
  simulation: Simulation.Simulation;
}

export interface Config {
  capacity: number;
  forces: Force.Force[];
  emitters: Emitter.Emitter[];
  getTime: () => number;
}

export function make(config: Config): Engine {
  const { capacity, forces, emitters, getTime } = config;
  const pool = ParticlePool.make(capacity);
  const renderBuffer = RenderBuffer.make(capacity);
  const sim = Simulation.make({
    forces,
    emitters,
    getTime,
  });
  return {
    particles: pool,
    renderBuffer,
    simulation: sim,
  };
}

export function update(engine: Engine) {
  Simulation.update(engine.simulation, engine.particles);
  RenderBuffer.update(engine.particles, engine.renderBuffer);
}

export function render(
  engine: Engine,
  particleRenderer: (particle: ParticleRenderData) => void
) {
  for (let i = 0; i < engine.particles.count; i++) {
    particleRenderer(engine.renderBuffer[i]);
  }
}
