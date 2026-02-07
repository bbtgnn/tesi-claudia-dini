import * as ParticlePool from "./particle-pool";
import * as RenderBuffer from "./render-buffer";
import * as Simulation from "./simulation";
import type { Context, StepResult } from "./types";

//

const noopOnUpdate: (
  engine: Engine,
  context: Context,
  stepResult: StepResult
) => void = () => {};

export interface Engine {
  particles: ParticlePool.Pool;
  renderBuffer: RenderBuffer.Buffer;
  simulation: Simulation.Simulation;
  /** Invoked after each update with (engine, context, stepResult). Default is a no-op. */
  onUpdate: (engine: Engine, context: Context, stepResult: StepResult) => void;
}

export interface Config {
  capacity: number;
  forces: Simulation.Force[];
  emitters: Simulation.Emitter[];
  /** Called after each update with (engine, context, stepResult). */
  onUpdate?: (engine: Engine, context: Context, stepResult: StepResult) => void;
}

export function make(config: Config): Engine {
  const { capacity, forces, emitters, onUpdate } = config;
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
    onUpdate: onUpdate ?? noopOnUpdate,
  };
}

export function update(engine: Engine, context: Context): void {
  const stepResult = Simulation.update(
    engine.simulation,
    engine.particles,
    context
  );
  RenderBuffer.update(engine.particles, engine.renderBuffer);
  engine.onUpdate(engine, context, stepResult);
}

export function render(
  engine: Engine,
  particleRenderer: (particle: RenderBuffer.ParticleData) => void
) {
  for (let i = 0; i < engine.particles.count; i++) {
    particleRenderer(engine.renderBuffer[i]);
  }
}
