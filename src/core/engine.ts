import * as ParticlePool from "./particle-pool";
import * as RenderBuffer from "./render-buffer";
import * as Simulation from "./simulation";
import type { StepResult, TimeStep } from "./types";

//

const noopOnUpdate: (
  engine: Engine,
  timeStep: TimeStep,
  stepResult: StepResult
) => void = () => {};

export interface Engine {
  particles: ParticlePool.Pool;
  renderBuffer: RenderBuffer.Buffer;
  simulation: Simulation.Simulation;
  /** Invoked after each update with (engine, timeStep, stepResult). Default is a no-op. */
  onUpdate: (
    engine: Engine,
    timeStep: TimeStep,
    stepResult: StepResult
  ) => void;
}

export interface Config {
  capacity: number;
  forces: Simulation.Force[];
  emitters: Simulation.Emitter[];
  /** Called after each update with (engine, timeStep, stepResult). */
  onUpdate?: (
    engine: Engine,
    timeStep: TimeStep,
    stepResult: StepResult
  ) => void;
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

export function update(engine: Engine, timeStep: TimeStep): void {
  const stepResult = Simulation.update(
    engine.simulation,
    engine.particles,
    timeStep
  );
  RenderBuffer.update(engine.particles, engine.renderBuffer);
  engine.onUpdate(engine, timeStep, stepResult);
}

export function render(
  engine: Engine,
  particleRenderer: (particle: RenderBuffer.ParticleData) => void
) {
  for (let i = 0; i < engine.particles.count; i++) {
    particleRenderer(engine.renderBuffer[i]);
  }
}
