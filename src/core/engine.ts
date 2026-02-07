import { ParticlePool } from "./particle-pool";
import type { ParticleData } from "./render-buffer";
import { RenderBuffer } from "./render-buffer";
import { Simulation } from "./simulation";
import type { Context, StepResult } from "./types";

//

export interface EngineConfig {
  capacity: number;
  forces: Simulation["forces"];
  emitters: Simulation["emitters"];
  /** Called after each update with (engine, context, stepResult). */
  onUpdate?: (engine: Engine, context: Context, stepResult: StepResult) => void;
}

export class Engine {
  readonly particles: ParticlePool;
  readonly renderBuffer: RenderBuffer;
  readonly simulation: Simulation;
  onUpdate: (engine: Engine, context: Context, stepResult: StepResult) => void;

  constructor(config: EngineConfig) {
    const { capacity, forces, emitters, onUpdate } = config;
    this.particles = new ParticlePool(capacity);
    this.renderBuffer = new RenderBuffer(capacity);
    this.simulation = new Simulation({ forces, emitters });
    this.onUpdate = onUpdate ?? (() => {});
  }

  update(context: Context): void {
    const stepResult = this.simulation.update(this.particles, context);
    this.renderBuffer.update(this.particles);
    this.onUpdate(this, context, stepResult);
  }

  render(particleRenderer: (particle: ParticleData) => void): void {
    for (let i = 0; i < this.particles.count; i++) {
      particleRenderer(this.renderBuffer.data[i]);
    }
  }
}
