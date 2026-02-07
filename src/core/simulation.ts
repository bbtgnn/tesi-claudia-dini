import type { HistorySnapshot } from "./history-store";
import { HistoryStore } from "./history-store";
import { ParticlePool } from "./particle-pool";
import type { ParticleData } from "./render-buffer";
import { RenderBuffer } from "./render-buffer";
import { runStep } from "./simulation.step";
import type { Context, Emitter, Force, StepResult } from "./types";
import type { SimulationRng } from "./types";

import type P5 from "p5";

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

/** Re-export for consumers that import from core. */
export type { Force, ForceContext, Emitter } from "./types";

export interface OnUpdatePayload {
  particles: ParticlePool;
  context: Context;
  stepResult: StepResult;
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
  private readonly _extensions: SimulationExtension[];
  private readonly _history: HistoryStore;
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
    this._extensions = extensions;
    this._history = new HistoryStore(maxHistory);
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

  private buildContext(): Context {
    return {
      time: {
        current: this._stepIndex * this._fixedDt,
        delta: this._fixedDt,
      },
      rng: this.rng,
      bounds: this.bounds,
    };
  }

  loadDependenciesFromP5(p5: P5): void {
    this._bounds = { width: p5.width, height: p5.height };
    this._rng = {
      setSeed(seed: number) {
        p5.randomSeed(seed);
        p5.noiseSeed(seed);
      },
      setState(state: { stepIndex: number; seed: number }) {
        p5.randomSeed(seedForStep(state.seed, state.stepIndex));
      },
      random: () => p5.random(0, 1),
      noise: (x: number, y?: number, z?: number) => p5.noise(x, y ?? 0, z ?? 0),
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

    const context = this.buildContext();
    this.rng.setSeed(seedForStep(this._baseSeed, this._stepIndex));
    const stepResult = runStep(
      context,
      this.particles,
      this.forces,
      this.emitters
    );
    this.renderBuffer.update(this.particles);
    this.notifyExtensions(context, stepResult);
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
      const snap = this._history.find(nextStep);
      if (snap !== undefined) {
        this.restoreSnapshot(snap);
        this._stepIndex = nextStep;
      } else {
        const context = this.buildContext();
        this.rng.setSeed(seedForStep(this._baseSeed, this._stepIndex));
        const stepResult = runStep(
          context,
          this.particles,
          this.forces,
          this.emitters
        );
        this.renderBuffer.update(this.particles);
        this.notifyExtensions(context, stepResult);
        this.pushSnapshot();
        this._stepIndex += 1;
      }
    }
  }

  /** Only when paused. Restore the snapshot n frames back (clamped to 0). */
  stepBackward(n: number): void {
    if (!this._isPaused) return;
    const targetStep = Math.max(0, this._stepIndex - n);
    const snap = this._history.find(targetStep);
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
    this._history.push({
      stepIndex: this._stepIndex,
      pool: this.particles.snapshot(),
      extensionSnapshots: this._extensions.map((e) => e.snapshot()),
      rngState: { stepIndex: this._stepIndex, seed: this._baseSeed },
    });
  }

  /** Restore order: RNG → pool → render buffer → extensions. */
  private restoreSnapshot(snap: HistorySnapshot): void {
    this.rng.setState(snap.rngState);
    this.particles.restore(snap.pool);
    this.renderBuffer.update(this.particles);
    this._extensions.forEach((e, i) => e.restore(snap.extensionSnapshots[i]));
  }

  private notifyExtensions(context: Context, stepResult: StepResult): void {
    const payload: OnUpdatePayload = {
      particles: this.particles,
      context,
      stepResult,
    };
    for (const ext of this._extensions) ext.update(payload);
  }
}
