import P5 from "p5";
import { Engine, type Emitter, type Force } from "./core";
import testImagePath from "/images/prova.png?url";
import testSvgPath from "/images/prova.svg?url";
import { Trails, Forces, Emitters } from "./extras";

//

const imageEmitter = new Emitters.ImageEmitter({
  imageFile: testImagePath,
  polygonsFile: testSvgPath,
  lifetime: 20,
  frontier: (width, height) =>
    Emitters.makeLineFrontier({
      start: [width / 2, (height / 5) * 4],
      angle: 90,
      speed: 10,
      activationDistance: 50,
    }),
  boundaryDistance: 20,
  scale: 2,
  imageMaxHeight: 400,
  loadPolygonsOptions: {
    convertPaths: true,
    pathSamplePoints: 100,
  },
});

const emitters: Emitter[] = [imageEmitter];

const forces: Force[] = [
  Forces.flowField({
    cellSize: 30,
    strength: 1,
    timeScale: 0.0005,
    updateEvery: 1,
  }),
];

const trailSystem = new Trails({ maxLength: 20 });

const engine = new Engine({
  capacity: 10_000,
  emitters,
  forces,
  onUpdate: ({ particles, stepResult }) => {
    trailSystem.update(particles, stepResult);
  },
});

new P5((_) => {
  let lastTime = 0;

  _.setup = async () => {
    await imageEmitter.init(_);

    _.createCanvas(imageEmitter.getWidth(), imageEmitter.getHeight());
    _.frameRate(30);
  };

  _.draw = () => {
    _.background(20, 20, 30);
    const img = imageEmitter.getImage();
    if (img) _.image(img, 0, 0);

    // Calculate time and delta time
    const currentTime = _.millis() / 1000;
    const dt = lastTime === 0 ? 0 : currentTime - lastTime;
    lastTime = currentTime;

    // Update engine (trail is updated via onUpdate callback)
    engine.update({
      time: { current: currentTime, delta: dt },
      rng: {
        random: () => _.random(0, 1),
        noise: (x: number, y?: number, z?: number) =>
          _.noise(x, y ?? 0, z ?? 0),
      },
      bounds: { width: _.width, height: _.height },
    });

    // Draw emitted pixels white with fade-in
    const emittedPixels = imageEmitter.getEmittedPixels();
    if (emittedPixels.length > 0) {
      Emitters.renderWithFadeIn(emittedPixels, {
        currentTime,
        fadeDuration: 0.5,
        fill: (r, g, b, alpha) => _.fill(r, g, b, alpha),
        rect: (x, y, size) => _.rect(x, y, size, size),
        noStroke: () => _.noStroke(),
      });
    }

    // Render trails (completely separate from particle rendering)
    trailSystem.render((trail, particleIndex) => {
      const p = engine.renderBuffer.data[particleIndex];
      _.strokeWeight(1);
      for (let i = 0; i < trail.length - 1; i++) {
        const [x1, y1] = trail[i];
        const [x2, y2] = trail[i + 1];
        // Fade trail from head to tail
        const trailAlpha = (i / trail.length) * p.a * 0.5;
        _.stroke(p.r, p.g, p.b, trailAlpha);
        _.line(x1, y1, x2, y2);
      }
    });

    // Render particles
    _.noStroke();
    // engine.render((p) => {
    //   _.fill(p.r, p.g, p.b, p.a);
    //   _.square(p.x - p.size / 2, p.y - p.size / 2, p.size);
    // });
  };

  _.mouseClicked = () => {
    emitters.push(
      Emitters.makeSimple({
        position: [_.mouseX, _.mouseY],
        lifetime: 10,
      })
    );
  };
});
