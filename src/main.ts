import P5 from "p5";
import { Engine, Emitter, Force } from "./core";

//

new P5((_) => {
  const engine = Engine.make({
    capacity: 1000,
    emitter: Emitter.makeSimple(),
    getTime: () => _.millis() / 1000,
    forces: [
      Force.turbulence(10, () => _.random(0, 1)),
      Force.drag(0.1),
      Force.gravity(0, 9.8),
      Force.wind(1, 0),
      Force.vortex(50, 50, 10),
    ],
  });

  _.setup = () => {
    _.createCanvas(800, 600);
    _.frameRate(30);
  };

  _.draw = () => {
    Engine.update(engine);

    _.background(20, 20, 30);
    _.noStroke();

    Engine.render(engine, (p) => {
      _.fill(p.r * 255, p.g * 255, p.b * 255, p.a * 255);
      _.square(p.x - p.size / 2, p.y - p.size / 2, p.size);
    });
  };
});
