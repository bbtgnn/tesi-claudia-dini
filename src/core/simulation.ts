import type { HistorySnapshot } from "./history-store";
import { HistoryStore } from "./history-store";
import { ParticlePool } from "./particle-pool";
import type { ParticleData } from "./render-buffer";
import { RenderBuffer } from "./render-buffer";
import * as Step from "./simulation.step";
import type { Context, Emitter, Force, StepRng } from "./types";

import type P5 from "p5";

//

export interface Extension {
  update(payload: OnUpdatePayload): void;
  snapshot(): unknown;
  restore(snap: unknown): void;
}

export interface OnUpdatePayload {
  particles: ParticlePool;
  context: Context;
  stepResult: Step.Result;
}

interface Config {
  capacity: number;
  forces: Force[];
  emitters: Emitter[];
  fixedDt: number;
  maxHistory?: number;
  baseSeed?: number;
  extensions?: Extension[];
}

interface Rng extends StepRng {
  setStepSeed(stepIndex: number): void;
}

export class Simulation {
  readonly particles: ParticlePool;
  readonly renderBuffer: RenderBuffer;
  readonly forces: Force[];
  readonly emitters: Emitter[];

  private readonly extensions: Extension[];
  private readonly history: HistoryStore;

  private readonly baseSeed: number;
  private rngRef?: Rng;
  private boundsRef?: Context["bounds"];

  private stepIndex = 0;
  private paused = true;
  private readonly fixedDt: number;

  constructor(config: Config) {
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
    this.extensions = extensions;
    this.history = new HistoryStore(maxHistory);
    this.fixedDt = fixedDt;
    this.baseSeed = baseSeed;
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

  getParticle(index: number): ParticleData {
    return this.renderBuffer.data[index];
  }

  getParticleCount(): number {
    return this.particles.count;
  }

  getParticles(): ParticleData[] {
    return this.renderBuffer.data;
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
    this.renderBuffer.update(this.particles);
    this.updateExtensions(this.context, stepResult);
    this.pushSnapshot();
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

    for (let i = 0; i < n; i++) {
      const nextStep = this.stepIndex + 1;
      const snap = this.history.find(nextStep);
      if (snap !== undefined) {
        this.restoreSnapshot(snap);
      } else {
        this.tick();
      }
    }
  }

  stepBackward(n: number): void {
    if (!this.isPaused()) return;
    const targetStep = Math.max(0, this.stepIndex - n);
    const snap = this.history.find(targetStep);
    if (snap === undefined) return;
    this.restoreSnapshot(snap);
  }

  /* Snapshots */

  private ensureInitialSnapshot(): void {
    if (!this.history.isEmpty()) return;
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
    this.stepIndex = snap.stepIndex;
  }

  /* Extensions */

  private updateExtensions(context: Context, stepResult: Step.Result): void {
    const payload: OnUpdatePayload = {
      particles: this.particles,
      context,
      stepResult,
    };
    for (const ext of this.extensions) ext.update(payload);
  }
}
