import * as ParticlePool from "./particle-pool";
import * as RenderBuffer from "./render-buffer";
import * as Emitter from "./emitter";
import * as Simulation from "./simulation";
import * as Force from "./force";
import type { ParticleRenderData } from "../other/types";

//

export interface Engine {
  pool: ParticlePool.Pool;
  renderBuffer: RenderBuffer.Buffer;
  emitter: Emitter.Emitter;
  simulation: Simulation.Simulation;
  getTime: () => number;
}

export interface Config {
  capacity: number;
  forces: Force.Force[];
  emitter: Emitter.Emitter;
  getTime: () => number;
}

export function make(config: Config): Engine {
  const pool = ParticlePool.make(config.capacity);
  const renderBuffer = RenderBuffer.make(config.capacity);
  const sim = Simulation.make(config.forces);
  return {
    pool,
    renderBuffer,
    emitter: config.emitter,
    simulation: sim,
    getTime: config.getTime,
  };
}

export function update(engine: Engine) {
  engine.emitter.emit(engine.pool);
  Simulation.update(engine.simulation, engine.pool, engine.getTime);
  RenderBuffer.update(engine.pool, engine.renderBuffer);
}

export function render(
  engine: Engine,
  particleRenderer: (particle: ParticleRenderData) => void
) {
  for (let i = 0; i < engine.pool.count; i++) {
    particleRenderer(engine.renderBuffer[i]);
  }
}
