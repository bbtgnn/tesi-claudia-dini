import { Emitter, ParticlePool } from "$particles";
import * as Image from "./image";
import type { Polygon } from "./utils";

//

interface Config {
  image: Image.Image;
  polygon: Polygon;
}

export function make(config: Config): Emitter.Emitter {
  const pixels = Image.getPixelsInPolygon(config.image, config.polygon);
  return (pool) => {
    for (const pixel of pixels) {
      ParticlePool.spawn(pool, {
        position: pixel.coords,
        velocity: [0, 0],
        lifetime: 100,
        color: pixel.color,
        size: 1,
      });
    }
  };
}
