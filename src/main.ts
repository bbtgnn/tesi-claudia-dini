import P5 from "p5";
import { particlepool, renderbuffer, emitter, simulation, force } from "./core";

//

const PARTICLE_CAPACITY = 1;

new P5((_) => {
  const pool = particlepool.make(PARTICLE_CAPACITY);
  const renderBuffer = renderbuffer.make(PARTICLE_CAPACITY);
  const mitt = emitter.makeSimple();
  const sim = simulation.make([force.gravity(0, 9.8)]);

  _.setup = () => {
    _.createCanvas(800, 600);
    _.frameRate(30);
  };

  _.draw = () => {
    _.background(20, 20, 30);

    mitt.emit(pool);
    simulation.update(sim, pool, () => _.millis() / 1000);
    const n = renderbuffer.update(pool, renderBuffer);

    _.noStroke();
    for (let i = 0; i < n; i++) {
      const p = renderBuffer[i];
      _.fill(p.r * 255, p.g * 255, p.b * 255, p.a * 255);
      _.square(p.x - p.size / 2, p.y - p.size / 2, p.size);
    }
  };
});
