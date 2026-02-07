import { ParticlePool } from "./particle-pool";
import type { ParticleData } from "./render-buffer";
import { RenderBuffer } from "./render-buffer";
import { Simulation } from "./simulation";
import type { Context, StepResult } from "./types";

//

export interface OnUpdatePayload {
  particles: ParticlePool;
  context: Context;
  stepResult: StepResult;
}

export interface EngineConfig {
  capacity: number;
  forces: Simulation["forces"];
  emitters: Simulation["emitters"];
  /** Called after each update with { particles, context, stepResult }. */
  onUpdate?: (payload: OnUpdatePayload) => void;
}

export class Engine {
  readonly particles: ParticlePool;
  readonly renderBuffer: RenderBuffer;
  readonly simulation: Simulation;
  onUpdate: (payload: OnUpdatePayload) => void;

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
    this.onUpdate({ particles: this.particles, context, stepResult });
  }

  getParticle(index: number): ParticleData {
    return this.renderBuffer.data[index];
  }

  getParticles(): ParticleData[] {
    return this.renderBuffer.data;
  }
}
