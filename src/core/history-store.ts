import type { ParticlePoolSnapshot } from "./particle-pool";

//

export interface HistorySnapshot {
  stepIndex: number;
  pool: ParticlePoolSnapshot;
  extensionSnapshots: unknown[];
}

function createEmptyPoolSnapshot(capacity: number): ParticlePoolSnapshot {
  return {
    count: 0,
    px: new Float32Array(capacity),
    py: new Float32Array(capacity),
    vx: new Float32Array(capacity),
    vy: new Float32Array(capacity),
    emissionTime: new Float32Array(capacity),
    lifetime: new Float32Array(capacity),
    r: new Float32Array(capacity),
    g: new Float32Array(capacity),
    b: new Float32Array(capacity),
    a: new Float32Array(capacity),
    size: new Float32Array(capacity),
  };
}

export class HistoryStore {
  private readonly maxLength: number;
  private readonly slots: HistorySnapshot[];
  private writeIndex = 0;
  private length = 0;

  constructor(maxLength: number, particleCapacity: number) {
    this.maxLength = maxLength;
    this.slots = Array.from({ length: maxLength }, () => ({
      stepIndex: 0,
      pool: createEmptyPoolSnapshot(particleCapacity),
      extensionSnapshots: [],
    }));
  }

  /** Get the next slot to fill. Call snapshotInto(slot.pool), set stepIndex and extensionSnapshots, then commitPush(). */
  getNextSlot(): HistorySnapshot {
    return this.slots[this.writeIndex % this.maxLength];
  }

  /** Call after filling the slot returned by getNextSlot(). */
  commitPush(): void {
    this.writeIndex++;
    this.length = Math.min(this.length + 1, this.maxLength);
  }

  find(stepIndex: number): HistorySnapshot | undefined {
    for (let i = 0; i < this.length; i++) {
      const slot =
        this.slots[
          (this.writeIndex - 1 - i + this.maxLength * 2) % this.maxLength
        ];
      if (slot.stepIndex === stepIndex) return slot;
    }
    return undefined;
  }

  /** For sparse history: return the snapshot with the largest stepIndex <= targetStep. */
  findLatestNotAfter(targetStep: number): HistorySnapshot | undefined {
    let best: HistorySnapshot | undefined;
    for (let i = 0; i < this.length; i++) {
      const slot =
        this.slots[
          (this.writeIndex - 1 - i + this.maxLength * 2) % this.maxLength
        ];
      if (slot.stepIndex <= targetStep) {
        if (best === undefined || slot.stepIndex > best.stepIndex) {
          best = slot;
        }
      }
    }
    return best;
  }

  isEmpty(): boolean {
    return this.length === 0;
  }
}
