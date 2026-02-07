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
  /** Base seed for deterministic RNG; passed to the RNG when it is created (e.g. loadDependenciesFromP5). */
  baseSeed?: number;
  /** Extensions: updated each step and included in snapshot/restore. Order is fixed. */
  extensions?: SimulationExtension[];
}

export class Simulation {
  readonly particles: ParticlePool;
  readonly renderBuffer: RenderBuffer;
  readonly forces: Force[];
  readonly emitters: Emitter[];

  private rngRef?: SimulationRng;
  private boundsRef?: Context["bounds"];
  private stepIndex = 0;
  private paused = true;
  private readonly fixedDt: number;
  private readonly baseSeed: number;
  private readonly extensions: SimulationExtension[];
  private readonly history: HistoryStore;
  private initialSnapshotPushed = false;

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
    this.fixedDt = fixedDt;
    this.baseSeed = baseSeed;
    this.extensions = extensions;
    this.history = new HistoryStore(maxHistory);
  }

  private get rng(): SimulationRng {
    if (this.rngRef === undefined) {
      throw new Error(
        "Simulation: setRng() or setContext() must be called first"
      );
    }
    return this.rngRef;
  }

  private get bounds(): Context["bounds"] {
    if (this.boundsRef === undefined) {
      throw new Error(
        "Simulation: setBounds() or setContext() must be called first"
      );
    }
    return this.boundsRef;
  }

  private buildContext(): Context {
    return {
      time: {
        current: this.stepIndex * this.fixedDt,
        delta: this.fixedDt,
      },
      rng: this.rng,
      bounds: this.bounds,
    };
  }

  loadDependenciesFromP5(p5: P5): void {
    const baseSeed = this.baseSeed;
    this.boundsRef = { width: p5.width, height: p5.height };
    this.rngRef = {
      setStepSeed(stepIndex: number) {
        const seed = baseSeed + stepIndex * 0x9e3779b9;
        p5.randomSeed(seed);
        p5.noiseSeed(seed);
      },
      random: () => p5.random(0, 1),
      noise: (x: number, y?: number, z?: number) => p5.noise(x, y ?? 0, z ?? 0),
    };
  }

  setRng(rng: SimulationRng): void {
    this.rngRef = rng;
  }

  setBounds(bounds: Context["bounds"]): void {
    this.boundsRef = bounds;
  }

  update(): void {
    this.ensureInitialSnapshot();

    if (this.paused) {
      return;
    }

    const context = this.buildContext();
    this.rng.setStepSeed(this.stepIndex);
    const stepResult = runStep(
      context,
      this.particles,
      this.forces,
      this.emitters
    );
    this.renderBuffer.update(this.particles);
    this.notifyExtensions(context, stepResult);
    this.pushSnapshot();
    this.stepIndex += 1;
  }

  play(): void {
    this.paused = false;
  }

  pause(): void {
    this.paused = true;
  }

  /** Only when paused. Advance n steps; restore from history when possible, else run step and push. */
  stepForward(n: number): void {
    if (!this.paused) return;
    this.ensureInitialSnapshot();

    for (let i = 0; i < n; i++) {
      const nextStep = this.stepIndex + 1;
      const snap = this.history.find(nextStep);
      if (snap !== undefined) {
        this.restoreSnapshot(snap);
        this.stepIndex = nextStep;
      } else {
        const context = this.buildContext();
        this.rng.setStepSeed(this.stepIndex);
        const stepResult = runStep(
          context,
          this.particles,
          this.forces,
          this.emitters
        );
        this.renderBuffer.update(this.particles);
        this.notifyExtensions(context, stepResult);
        this.pushSnapshot();
        this.stepIndex += 1;
      }
    }
  }

  /** Only when paused. Restore the snapshot n frames back (clamped to 0). */
  stepBackward(n: number): void {
    if (!this.paused) return;
    const targetStep = Math.max(0, this.stepIndex - n);
    const snap = this.history.find(targetStep);
    if (snap !== undefined) {
      this.restoreSnapshot(snap);
      this.stepIndex = snap.stepIndex;
    }
  }

  isPaused(): boolean {
    return this.paused;
  }

  getParticle(index: number): ParticleData {
    return this.renderBuffer.data[index];
  }

  getParticles(): ParticleData[] {
    return this.renderBuffer.data;
  }

  /* Snapshots */

  private ensureInitialSnapshot(): void {
    if (this.initialSnapshotPushed) return;
    this.initialSnapshotPushed = true;
    this.pushSnapshot();
  }

  private pushSnapshot(): void {
    this.history.push({
      stepIndex: this.stepIndex,
      pool: this.particles.snapshot(),
      extensionSnapshots: this.extensions.map((e) => e.snapshot()),
    });
  }

  private restoreSnapshot(snap: HistorySnapshot): void {
    this.rng.setStepSeed(snap.stepIndex);
    this.particles.restore(snap.pool);
    this.renderBuffer.update(this.particles);
    this.extensions.forEach((e, i) => e.restore(snap.extensionSnapshots[i]));
  }

  /* Extensions */

  private notifyExtensions(context: Context, stepResult: StepResult): void {
    const payload: OnUpdatePayload = {
      particles: this.particles,
      context,
      stepResult,
    };
    for (const ext of this.extensions) ext.update(payload);
  }
}
