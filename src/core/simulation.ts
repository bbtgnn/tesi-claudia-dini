import { ParticlePool, type ParticlePoolSnapshot } from "./particle-pool";
import type { ParticleData } from "./render-buffer";
import { RenderBuffer } from "./render-buffer";
import type { Context, ParticleDescriptor, StepResult } from "./types";
import type { SimulationRng } from "./types";

/** Extension: called each step and included in playback snapshot/restore (e.g. Trails). */
export interface SimulationExtension {
  update(payload: OnUpdatePayload): void;
  snapshot(): unknown;
  restore(snap: unknown): void;
}

/** Deterministic seed per step; export so host RNG can implement setState. */
export function seedForStep(base: number, stepIndex: number): number {
  return base + stepIndex * 0x9e3779b9;
}

/** Context for setCtx (e.g. p5 instance): provides bounds and random/noise. */
export interface SimulationCtx {
  width: number;
  height: number;
  randomSeed(seed: number): void;
  noiseSeed(seed: number): void;
  random(): number;
  random(min: number, max: number): number;
  noise(x: number, y?: number, z?: number): number;
}

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

/** One frame in history: state after the step at stepIndex. simTime = stepIndex * fixedDt. */
interface HistorySnapshot {
  stepIndex: number;
  pool: ParticlePoolSnapshot;
  extensionSnapshots: unknown[];
  rngState: { stepIndex: number; seed: number };
}

export interface SimulationConfig {
  capacity: number;
  forces: Force[];
  emitters: Emitter[];
  /** Fixed dt per step (e.g. 1/30). Simulation uses this for every step. */
  fixedDt: number;
  /** Max history length for replay (e.g. 600). */
  maxHistory?: number;
  /** Base seed for deterministic RNG; simulation reseeds with seedForStep(baseSeed, stepIndex). */
  baseSeed?: number;
  /** Extensions: updated each step and included in snapshot/restore. Order is fixed. */
  extensions?: SimulationExtension[];
}

export class Simulation {
  readonly particles: ParticlePool;
  readonly renderBuffer: RenderBuffer;
  readonly forces: Force[];
  readonly emitters: Emitter[];

  private _rng?: SimulationRng;
  private _bounds?: Context["bounds"];
  private _stepIndex = 0;
  private _isPaused = true;
  private readonly _fixedDt: number;
  private readonly _baseSeed: number;
  private readonly _maxHistory: number;
  private readonly _extensions: SimulationExtension[];
  private readonly _history: HistorySnapshot[] = [];
  private _initialSnapshotPushed = false;

  constructor(config: SimulationConfig) {
    const {
      capacity,
      forces,
      emitters,
      fixedDt,
      maxHistory = 600,
      baseSeed = 0,
      extensions = [],
    } = config;
    this.particles = new ParticlePool(capacity);
    this.renderBuffer = new RenderBuffer(capacity);
    this.forces = forces;
    this.emitters = emitters;
    this._fixedDt = fixedDt;
    this._baseSeed = baseSeed;
    this._maxHistory = maxHistory;
    this._extensions = extensions;
  }

  private get rng(): SimulationRng {
    if (this._rng === undefined) {
      throw new Error(
        "Simulation: setRng() or setContext() must be called first"
      );
    }
    return this._rng;
  }

  private get bounds(): Context["bounds"] {
    if (this._bounds === undefined) {
      throw new Error(
        "Simulation: setBounds() or setContext() must be called first"
      );
    }
    return this._bounds;
  }

  /** Context that provides bounds and RNG (e.g. p5 instance). Sets bounds and RNG in one call. */
  setContext(ctx: SimulationCtx): void {
    this._bounds = { width: ctx.width, height: ctx.height };
    this._rng = {
      setSeed(seed: number) {
        ctx.randomSeed(seed);
        ctx.noiseSeed(seed);
      },
      setState(state: { stepIndex: number; seed: number }) {
        ctx.randomSeed(seedForStep(state.seed, state.stepIndex));
      },
      random: () => ctx.random(0, 1),
      noise: (x: number, y?: number, z?: number) =>
        ctx.noise(x, y ?? 0, z ?? 0),
    };
  }

  setRng(rng: SimulationRng): void {
    this._rng = rng;
  }

  setBounds(bounds: Context["bounds"]): void {
    this._bounds = bounds;
  }

  /** One step per call when playing; no-op when paused. Host calls every frame with current time. */
  update(_currentTime: number): void {
    this.ensureInitialSnapshot();

    if (this._isPaused) {
      return;
    }

    const context: Context = {
      time: {
        current: this._stepIndex * this._fixedDt,
        delta: this._fixedDt,
      },
      rng: this.rng,
      bounds: this.bounds,
    };

    this.rng.setSeed(seedForStep(this._baseSeed, this._stepIndex));
    const stepResult = this.step(context);
    this.renderBuffer.update(this.particles);
    const payload: OnUpdatePayload = {
      particles: this.particles,
      context,
      stepResult,
    };
    for (const ext of this._extensions) ext.update(payload);

    this.pushSnapshot();
    this._stepIndex += 1;
  }

  play(): void {
    this._isPaused = false;
  }

  pause(): void {
    this._isPaused = true;
  }

  /** Only when paused. Advance n steps; restore from history when possible, else run step and push. */
  stepForward(n: number): void {
    if (!this._isPaused) return;
    this.ensureInitialSnapshot();

    for (let i = 0; i < n; i++) {
      const nextStep = this._stepIndex + 1;
      const snap = this.findSnapshot(nextStep);
      if (snap !== undefined) {
        this.restoreSnapshot(snap);
        this._stepIndex = nextStep;
      } else {
        const context: Context = {
          time: {
            current: this._stepIndex * this._fixedDt,
            delta: this._fixedDt,
          },
          rng: this.rng,
          bounds: this.bounds,
        };
        this.rng.setSeed(seedForStep(this._baseSeed, this._stepIndex));
        const stepResult = this.step(context);
        this.renderBuffer.update(this.particles);
        const payload: OnUpdatePayload = {
          particles: this.particles,
          context,
          stepResult,
        };
        for (const ext of this._extensions) ext.update(payload);
        this.pushSnapshot();
        this._stepIndex += 1;
      }
    }
  }

  /** Only when paused. Restore the snapshot n frames back (clamped to 0). */
  stepBackward(n: number): void {
    if (!this._isPaused) return;
    const targetStep = Math.max(0, this._stepIndex - n);
    const snap = this.findSnapshot(targetStep);
    if (snap !== undefined) {
      this.restoreSnapshot(snap);
      this._stepIndex = snap.stepIndex;
    }
  }

  getSimTime(): number {
    return this._stepIndex * this._fixedDt;
  }

  isPaused(): boolean {
    return this._isPaused;
  }

  getParticle(index: number): ParticleData {
    return this.renderBuffer.data[index];
  }

  getParticles(): ParticleData[] {
    return this.renderBuffer.data;
  }

  private ensureInitialSnapshot(): void {
    if (this._initialSnapshotPushed) return;
    this._initialSnapshotPushed = true;
    this.pushSnapshot();
  }

  private pushSnapshot(): void {
    const snap: HistorySnapshot = {
      stepIndex: this._stepIndex,
      pool: this.particles.snapshot(),
      extensionSnapshots: this._extensions.map((e) => e.snapshot()),
      rngState: { stepIndex: this._stepIndex, seed: this._baseSeed },
    };
    this._history.push(snap);
    if (this._history.length > this._maxHistory) {
      this._history.shift();
    }
  }

  private findSnapshot(stepIndex: number): HistorySnapshot | undefined {
    return this._history.find((s) => s.stepIndex === stepIndex);
  }

  /** Restore order: RNG → pool → render buffer → extensions. */
  private restoreSnapshot(snap: HistorySnapshot): void {
    this.rng.setState(snap.rngState);
    this.particles.restore(snap.pool);
    this.renderBuffer.update(this.particles);
    this._extensions.forEach((e, i) => e.restore(snap.extensionSnapshots[i]));
  }

  private step(context: Context): StepResult {
    const { particles: pool } = this;
    const dt = context.time.delta;

    const added: number[] = [];
    const swaps: [number, number][] = [];

    const countBeforeEmit = pool.count;
    for (const emitter of this.emitters) {
      const descriptors = emitter.emit(context);
      pool.spawnBatch(descriptors);
    }
    for (let i = countBeforeEmit; i < pool.count; i++) {
      added.push(i);
    }

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

    for (let i = 0; i < pool.count; i++) {
      pool.px[i] += pool.vx[i] * dt;
      pool.py[i] += pool.vy[i] * dt;
      pool.age[i] += dt;
    }

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
}
