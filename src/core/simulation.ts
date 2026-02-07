import { ParticlePool } from "./particle-pool";
import type { ParticleData } from "./render-buffer";
import { RenderBuffer } from "./render-buffer";
import type { Context, ParticleDescriptor, StepResult } from "./types";

//

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

//

export interface Emitter {
  /** Return descriptors for particles to emit; simulation adds them to the pool. */
  emit(ctx: Context): ParticleDescriptor[];
}

//

export interface OnUpdatePayload {
  particles: ParticlePool;
  context: Context;
  stepResult: StepResult;
}

export interface SimulationConfig {
  capacity: number;
  forces: Force[];
  emitters: Emitter[];
  /** Called after each update with { particles, context, stepResult }. */
  onUpdate?: (payload: OnUpdatePayload) => void;
}

export class Simulation {
  readonly particles: ParticlePool;
  readonly renderBuffer: RenderBuffer;
  readonly forces: Force[];
  readonly emitters: Emitter[];
  onUpdate: (payload: OnUpdatePayload) => void;

  private _rng?: Context["rng"];
  private _bounds?: Context["bounds"];
  private _lastTime = 0;

  constructor(config: SimulationConfig) {
    const { capacity, forces, emitters, onUpdate } = config;
    this.particles = new ParticlePool(capacity);
    this.renderBuffer = new RenderBuffer(capacity);
    this.forces = forces;
    this.emitters = emitters;
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
      throw new Error("Simulation: setRng() must be called before update()");
    }
    if (this._bounds === undefined) {
      throw new Error("Simulation: setBounds() must be called before update()");
    }
    const dt = this._lastTime === 0 ? 0 : currentTime - this._lastTime;
    this._lastTime = currentTime;

    const context: Context = {
      time: { current: currentTime, delta: dt },
      rng: this._rng,
      bounds: this._bounds,
    };

    const stepResult = this.step(context);
    this.renderBuffer.update(this.particles);
    this.onUpdate({ particles: this.particles, context, stepResult });
  }

  private step(context: Context): StepResult {
    const { particles: pool } = this;
    const dt = context.time.delta;
    const added: number[] = [];
    const swaps: [number, number][] = [];

    // Run emitters and add returned particles to the pool
    const countBeforeEmit = pool.count;
    for (const emitter of this.emitters) {
      const descriptors = emitter.emit(context);
      pool.spawnBatch(descriptors);
    }
    for (let i = countBeforeEmit; i < pool.count; i++) {
      added.push(i);
    }

    // Apply forces
    const forceCtx: ForceContext = {
      count: pool.count,
      px: pool.px,
      py: pool.py,
      vx: pool.vx,
      vy: pool.vy,
      dt,
    };
    for (const force of this.forces) {
      force.update(context);
      force.apply(forceCtx);
    }

    // Update particles
    for (let i = 0; i < pool.count; i++) {
      pool.px[i] += pool.vx[i] * dt;
      pool.py[i] += pool.vy[i] * dt;
      pool.age[i] += dt;
    }

    // Kill particles and record swaps
    for (let i = pool.count - 1; i >= 0; ) {
      if (pool.count === 0) break;
      if (pool.age[i] >= pool.lifetime[i]) {
        const last = pool.count - 1;
        if (i !== last) {
          swaps.push([last, i]);
        }
        pool.kill(i);
        if (i >= pool.count) i--;
      } else {
        i--;
      }
    }

    return { added, swaps };
  }

  getParticle(index: number): ParticleData {
    return this.renderBuffer.data[index];
  }

  getParticles(): ParticleData[] {
    return this.renderBuffer.data;
  }
}
