import type { HistorySnapshot } from "./history-store";
import { HistoryStore } from "./history-store";
import { ParticlePool } from "./particle-pool";
import * as Step from "./simulation.step";
import type { Context, Emitter, Force, StepRng } from "./types";

import type P5 from "p5";

//

/** Read-only view of one particle (e.g. for drawing). Do not hold across frames. */
export interface ParticleData {
  x: number;
  y: number;
  size: number;
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Extension {
  update(payload: OnUpdatePayload): void;
  snapshot(): unknown;
  restore(snap: unknown): void;
  /** If false, this extension is excluded from the simulation. */
  active: boolean;
}

export interface OnUpdatePayload {
  particles: ParticlePool;
  context: Context;
  stepResult: Step.Result;
  /**
   * Simulation step index for the step that just completed (same value
   * stored in history when pushSnapshot runs immediately after extensions update).
   */
  frame: number;
}

interface Config {
  capacity: number;
  forces: Force[];
  emitters: Emitter[];
  fixedDt: number;
  maxHistory?: number;
  /** Store a snapshot every N simulation steps (default 1). Use 5–10 to reduce GC and stutter. */
  historyInterval?: number;
  baseSeed?: number;
  extensions?: Extension[];
}

interface Rng extends StepRng {
  setStepSeed(stepIndex: number): void;
}

export class Simulation {
  readonly particles: ParticlePool;
  readonly forces: Force[];
  readonly emitters: Emitter[];

  private readonly extensions: Extension[];
  private readonly history: HistoryStore;
  private readonly particleView: ParticleData = {
    x: 0,
    y: 0,
    size: 0,
    r: 0,
    g: 0,
    b: 0,
    a: 0,
  };

  private readonly baseSeed: number;
  private rngRef?: Rng;
  private boundsRef?: Context["bounds"];

  private stepIndex = 0;
  private paused = true;
  private readonly fixedDt: number;
  private readonly historyInterval: number;

  constructor(config: Config) {
    const {
      capacity,
      forces,
      emitters,
      fixedDt,
      maxHistory = 600,
      historyInterval = 1,
      baseSeed = 0,
      extensions = [],
    } = config;
    this.particles = new ParticlePool(capacity);
    this.forces = forces;
    this.emitters = emitters;
    this.extensions = extensions.filter((e) => e.active);
    this.history = new HistoryStore(maxHistory, capacity);
    this.fixedDt = fixedDt;
    this.baseSeed = baseSeed;
    this.historyInterval = historyInterval;
  }

  setRng(rng: Rng): void {
    this.rngRef = rng;
  }

  setBounds(bounds: Context["bounds"]): void {
    this.boundsRef = bounds;
  }

  loadDependenciesFromP5(p5: P5): void {
    const baseSeed = this.baseSeed;
    this.setBounds({ width: p5.width, height: p5.height });
    this.setRng({
      setStepSeed(stepIndex: number) {
        const seed = baseSeed + stepIndex * 0x9e3779b9;
        p5.randomSeed(seed);
        p5.noiseSeed(seed);
      },
      random: () => p5.random(0, 1),
      noise: (x: number, y?: number, z?: number) => p5.noise(x, y ?? 0, z ?? 0),
    });
  }

  /* Getters */

  /** Single-particle view (use immediately; do not store). For many particles use forEachParticle(). */
  getParticle(index: number): ParticleData {
    const p = this.particles;
    const v = this.particleView;
    v.x = p.px[index];
    v.y = p.py[index];
    v.size = p.size[index];
    v.r = p.r[index];
    v.g = p.g[index];
    v.b = p.b[index];
    v.a = p.a[index];
    return v;
  }

  /** Zero-allocation iteration for drawing. Callback receives (index, x, y, size, r, g, b, a). */
  forEachParticle(
    cb: (
      i: number,
      x: number,
      y: number,
      size: number,
      r: number,
      g: number,
      b: number,
      a: number
    ) => void
  ): void {
    const pool = this.particles;
    const n = pool.count;
    for (let i = 0; i < n; i++) {
      cb(
        i,
        pool.px[i],
        pool.py[i],
        pool.size[i],
        pool.r[i],
        pool.g[i],
        pool.b[i],
        pool.a[i]
      );
    }
  }

  /** Number of active particles. */
  getActiveCount(): number {
    return this.particles.count;
  }

  getTime(): number {
    return this.stepIndex * this.fixedDt;
  }

  private get rng(): Rng {
    if (this.rngRef === undefined) {
      throw new Error(
        "Simulation: setRng() or setContext() must be called first"
      );
    }
    return this.rngRef;
  }

  private get context(): Context {
    if (this.boundsRef === undefined) {
      throw new Error(
        "Simulation: setBounds() or setContext() must be called first"
      );
    }

    return {
      time: {
        current: this.getTime(),
        delta: this.fixedDt,
      },
      rng: this.rng,
      bounds: this.boundsRef,
    };
  }

  /* Execution methods (tick, update, stepForward, stepBackward) */

  play(): void {
    this.paused = false;
  }

  pause(): void {
    this.paused = true;
  }

  isPaused(): boolean {
    return this.paused;
  }

  private tick() {
    this.rng.setStepSeed(this.stepIndex);
    const stepResult = Step.run(
      this.context,
      this.particles,
      this.forces,
      this.emitters
    );
    this.updateExtensions(this.context, stepResult);
    if (this.stepIndex % this.historyInterval === 0) {
      this.pushSnapshot();
    }
    this.stepIndex += 1;
  }

  update(): void {
    if (this.isPaused()) return;
    this.ensureInitialSnapshot();
    this.tick();
  }

  stepForward(n: number): void {
    if (!this.isPaused()) return;
    this.ensureInitialSnapshot();
    const targetStep = this.stepIndex + n;
    const snap = this.history.findLatestNotAfter(targetStep);
    if (snap !== undefined) {
      this.restoreSnapshot(snap);
    }
    while (this.stepIndex < targetStep) {
      this.tick();
    }
  }

  stepBackward(n: number): void {
    if (!this.isPaused()) return;
    const targetStep = Math.max(0, this.stepIndex - n);
    const snap = this.history.findLatestNotAfter(targetStep);
    if (snap === undefined) return;
    this.restoreSnapshot(snap);
    while (this.stepIndex < targetStep) {
      this.tick();
    }
  }

  /* Snapshots */

  private ensureInitialSnapshot(): void {
    if (!this.history.isEmpty()) return;
    this.pushSnapshot();
  }

  private pushSnapshot(): void {
    const slot = this.history.getNextSlot();
    this.particles.snapshotInto(slot.pool);
    slot.stepIndex = this.stepIndex;
    slot.extensionSnapshots = this.extensions.map((e) => e.snapshot());
    this.history.commitPush();
  }

  private restoreSnapshot(snap: HistorySnapshot): void {
    this.rng.setStepSeed(snap.stepIndex);
    this.particles.restore(snap.pool);
    this.extensions.forEach((e, i) => e.restore(snap.extensionSnapshots[i]));
    this.stepIndex = snap.stepIndex;
  }

  /* Extensions */

  private updateExtensions(context: Context, stepResult: Step.Result): void {
    const payload: OnUpdatePayload = {
      particles: this.particles,
      context,
      stepResult,
      frame: this.stepIndex,
    };
    for (const ext of this.extensions) ext.update(payload);
  }
}
