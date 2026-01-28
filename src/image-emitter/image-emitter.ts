import { Emitter, ParticlePool } from "$particles";
import * as Image from "./image";
import type { Polygon } from "./utils";

export type { Polygon } from "./utils";

//

interface Config {
  image: Image.Image;
  polygon: Polygon;
  lifetime: number;
}

export function make(config: Config): Emitter.Emitter {
  const pixels = Image.getPixelsInPolygon(config.image, config.polygon);
  return (pool) => {
    for (const pixel of pixels) {
      ParticlePool.spawn(pool, {
        position: pixel.coords,
        velocity: [0, 0],
        lifetime: config.lifetime,
        color: pixel.color,
        size: 1,
      });
    }
  };
}
