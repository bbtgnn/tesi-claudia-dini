import type { ParticlePoolSnapshot } from "./particle-pool";

/** One frame in history: state after the step at stepIndex. simTime = stepIndex * fixedDt. */
export interface HistorySnapshot {
  stepIndex: number;
  pool: ParticlePoolSnapshot;
  extensionSnapshots: unknown[];
}

export class HistoryStore {
  private readonly maxLength: number;
  private readonly entries: HistorySnapshot[] = [];

  constructor(maxLength: number) {
    this.maxLength = maxLength;
  }

  push(entry: HistorySnapshot): void {
    this.entries.push(entry);
    if (this.entries.length > this.maxLength) {
      this.entries.shift();
    }
  }

  find(stepIndex: number): HistorySnapshot | undefined {
    return this.entries.find((s) => s.stepIndex === stepIndex);
  }

  isEmpty(): boolean {
    return this.entries.length === 0;
  }
}
