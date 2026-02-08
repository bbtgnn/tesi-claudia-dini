import P5 from "p5";
import { Simulation, type Emitter, type Force } from "./core";
import { EmittedPixels, Forces, ImageEmitter, Frontiers } from "./extras";

//

const imageEmitter = new ImageEmitter({
  imageFile: "/images/image-full-size.png",
  polygonsFile: "images/image-full-size.svg",
  lifetime: 20,
  frontier: (width, height) =>
    Frontiers.circle({
      center: [width / 2, height / 2],
      speed: 5,
      gradientSize: 100,
    }),
  boundaryDistance: 100,
  scale: 4,
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
  Forces.wind(1, -1),
];

const emittedPixelsCollector = new EmittedPixels({
  maxLength: 10_000,
  fadeDuration: 0.5,
  draw: (_, pixel, opacity) => {
    _.noStroke();
    _.fill(0, 0, 0, opacity * 255);
    _.square(pixel.x, pixel.y, pixel.size);
  },
});

const simulation = new Simulation({
  capacity: 10_000,
  emitters,
  forces,
  fixedDt: 1 / 10,
  maxHistory: 600,
  baseSeed: 0,
  extensions: [emittedPixelsCollector],
});

const FRAME_STEP_SIZE = 5;

new P5((_) => {
  _.setup = async () => {
    await imageEmitter.init(_);

    _.createCanvas(imageEmitter.image.width, imageEmitter.image.height);
    _.frameRate(30);

    simulation.loadDependenciesFromP5(_);
  };

  _.draw = () => {
    _.image(imageEmitter.image, 0, 0);

    simulation.update();

    emittedPixelsCollector.render(_);

    // // Render trails (host owns Trails; it's a playback participant for snapshot/restore)
    // const trails = trailSystem.getTrails();
    // for (const [particleIndex, trail] of trails) {
    //   const p = simulation.getParticle(particleIndex);
    //   _.strokeWeight(2);
    //   for (let i = 0; i < trail.length - 1; i++) {
    //     const [x1, y1] = trail[i];
    //     const [x2, y2] = trail[i + 1];
    //     const trailAlpha = (i / trail.length) * p.a * 0.5;
    //     _.stroke(p.r, p.g, p.b, trailAlpha);
    //     _.line(x1, y1, x2, y2);
    //   }
    // }

    // Render particles
    _.noStroke();
    for (const p of simulation.getParticles()) {
      _.fill(p.r, p.g, p.b, p.a);
      _.ellipse(p.x - p.size / 2, p.y - p.size / 2, p.size);
    }
  };

  _.keyPressed = () => {
    if (_.key === " ") {
      simulation.isPaused() ? simulation.play() : simulation.pause();
    } else if (_.key === "ArrowRight" && simulation.isPaused()) {
      simulation.stepForward(FRAME_STEP_SIZE);
    } else if (_.key === "ArrowLeft" && simulation.isPaused()) {
      simulation.stepBackward(FRAME_STEP_SIZE);
    }
  };
});
