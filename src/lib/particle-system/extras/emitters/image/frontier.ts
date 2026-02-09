import type { Context } from "$particles/types";
import type { PixelData } from "./image";

//

export interface Frontier {
  getNextBatch(
    ctx: Context,
    chosenPixels: readonly PixelData[],
    emitted: Set<number>
  ): number[];
}
