import * as ParticlePool from "./particle-pool";
import * as RenderBuffer from "./render-buffer";
import * as Simulation from "./simulation";
import type { TimeStep } from "./types";

//

export interface Engine {
  particles: ParticlePool.Pool;
  renderBuffer: RenderBuffer.Buffer;
  simulation: Simulation.Simulation;
}

export interface Config {
  capacity: number;
  forces: Simulation.Force[];
  emitters: Simulation.Emitter[];
}

export function make(config: Config): Engine {
  const { capacity, forces, emitters } = config;
  const pool = ParticlePool.make(capacity);
  const renderBuffer = RenderBuffer.make(capacity);
  const sim = Simulation.make({
    forces,
    emitters,
  });
  return {
    particles: pool,
    renderBuffer,
    simulation: sim,
  };
}

export function update(engine: Engine, timeStep: TimeStep): void {
  Simulation.update(engine.simulation, engine.particles, timeStep);
  RenderBuffer.update(engine.particles, engine.renderBuffer);
}

export function render(
  engine: Engine,
  particleRenderer: (particle: RenderBuffer.ParticleData) => void
) {
  for (let i = 0; i < engine.particles.count; i++) {
    particleRenderer(engine.renderBuffer[i]);
  }
}
