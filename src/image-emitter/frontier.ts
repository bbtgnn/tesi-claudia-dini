import type { PixelData } from "./image";

/**
 * Stateful frontier: selects which pixels should be emitted in the current step.
 * The frontier maintains its own state and advances each time getNextBatch is called.
 */
export interface Frontier {
  /**
   * Get the next batch of pixel indices to emit.
   * Returns indices into the chosen pixels array.
   * Returns empty array when no more pixels are available.
   */
  getNextBatch(
    chosenPixels: readonly PixelData[],
    emitted: Set<number>
  ): number[];
}

export interface LineMovingUpConfig {
  /** Starting Y coordinate. If not provided, uses max Y from chosen pixels. */
  startY?: number;
  /** Direction: -1 for moving up, 1 for moving down. Default: -1 (up). */
  direction?: -1 | 1;
  /**
   * Number of rows to process per step. Higher values = faster emission.
   * Can be fractional for slower speeds (e.g., 0.5 = one row every 2 frames, 0.25 = one row every 4 frames).
   * Default: 1.
   */
  rowsPerStep?: number;
}

/**
 * Line moving up: emits pixels row by row, starting from the bottom and moving upward.
 * Can be configured to start at a specific Y or move in different directions.
 */
export function makeLineMovingUp(config: LineMovingUpConfig = {}): Frontier {
  const { startY, direction = -1, rowsPerStep = 1 } = config;
  let currentY: number | null = startY ?? null;
  let maxY = -Infinity;
  let minY = Infinity;
  let progress = 0; // Accumulator for fractional rows

  return {
    getNextBatch(chosenPixels, emitted) {
      // Initialize: find min/max Y if not set
      if (currentY === null) {
        for (const pixel of chosenPixels) {
          maxY = Math.max(maxY, pixel.coords[1]);
          minY = Math.min(minY, pixel.coords[1]);
        }
        currentY = startY ?? (direction === -1 ? maxY : minY);
      }

      // Accumulate fractional progress
      progress += rowsPerStep;

      // Only process rows when we've accumulated at least 1.0
      if (progress < 1) {
        return [];
      }

      const batch: number[] = [];
      const rowsToProcess = Math.floor(progress);
      progress -= rowsToProcess; // Keep fractional remainder

      // Process multiple rows per step for speed control
      for (let row = 0; row < rowsToProcess; row++) {
        // Check if we've gone past bounds
        if (direction === -1 && currentY < minY) {
          break;
        }
        if (direction === 1 && currentY > maxY) {
          break;
        }

        // Collect all pixels at currentY that haven't been emitted
        for (let i = 0; i < chosenPixels.length; i++) {
          if (!emitted.has(i) && chosenPixels[i]!.coords[1] === currentY) {
            batch.push(i);
          }
        }

        // Move to next line
        currentY += direction;
      }

      return batch;
    },
  };
}
