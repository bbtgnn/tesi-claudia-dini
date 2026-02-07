import type { ParticlePoolSnapshot } from "./particle-pool";

/** One frame in history: state after the step at stepIndex. simTime = stepIndex * fixedDt. */
export interface HistorySnapshot {
  stepIndex: number;
  pool: ParticlePoolSnapshot;
  extensionSnapshots: unknown[];
  rngState: { stepIndex: number; seed: number };
}

export class HistoryStore {
  private readonly _maxLength: number;
  private readonly _entries: HistorySnapshot[] = [];

  constructor(maxLength: number) {
    this._maxLength = maxLength;
  }

  push(entry: HistorySnapshot): void {
    this._entries.push(entry);
    if (this._entries.length > this._maxLength) {
      this._entries.shift();
    }
  }

  find(stepIndex: number): HistorySnapshot | undefined {
    return this._entries.find((s) => s.stepIndex === stepIndex);
  }
}
