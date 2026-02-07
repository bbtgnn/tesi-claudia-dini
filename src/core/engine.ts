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

  private _rng?: Context["rng"];
  private _bounds?: Context["bounds"];
  private _lastTime = 0;

  constructor(config: EngineConfig) {
    const { capacity, forces, emitters, onUpdate } = config;
    this.particles = new ParticlePool(capacity);
    this.renderBuffer = new RenderBuffer(capacity);
    this.simulation = new Simulation({ forces, emitters });
    this.onUpdate = onUpdate ?? (() => {});
  }

  setRng(rng: Context["rng"]): void {
    this._rng = rng;
  }

  setBounds(bounds: Context["bounds"]): void {
    this._bounds = bounds;
  }

  /** Call with current time in seconds; dt is computed internally. */
  update(currentTime: number): void {
    if (this._rng === undefined) {
      throw new Error("Engine: setRng() must be called before update()");
    }
    if (this._bounds === undefined) {
      throw new Error("Engine: setBounds() must be called before update()");
    }
    const dt = this._lastTime === 0 ? 0 : currentTime - this._lastTime;
    this._lastTime = currentTime;

    const context: Context = {
      time: { current: currentTime, delta: dt },
      rng: this._rng,
      bounds: this._bounds,
    };

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
