import { Simulation, type Emitter, type Force } from "./core";
import {
  EmittedPixels,
  Forces,
  Frontiers,
  ImageEmitter,
  Trails,
} from "./extras";
import { P5Renderer } from "./renderer";

//

const imageEmitter = new ImageEmitter({
  imageFile: "/images/image-full-size.png",
  polygonsFile: "images/image-full-size.svg",
  lifetime: 20,
  frontiers: [
    Frontiers.circle({
      center: [0.5, 0.5],
      speed: 5,
      gradientSize: 100,
    }),
    Frontiers.circle({
      center: [1, 0.5],
      speed: 5,
      gradientSize: 100,
    }),
  ],
  boundaryDistance: 100,
  scale: 4,
  loadPolygonsOptions: {
    convertPaths: true,
    pathSamplePoints: 100,
  },
});

const emitters: Emitter[] = [imageEmitter];

const forces: Force[] = [
  Forces.Flows.swirl({
    type: "chaotic",
    updateEvery: 2,
    style: {
      patternZoom: 0.0001,
    },
  }),
];

const emittedPixelsCollector = new EmittedPixels({
  maxLength: 10_000,
  fadeDuration: 0.5,
  draw: (target, pixel, opacity) => {
    target.noStroke();
    target.setFill(0, 0, 0, opacity * 255);
    target.drawRect(pixel.x, pixel.y, pixel.size, pixel.size);
  },
  active: true,
});

const trailsSystem = new Trails({
  maxLength: 20,
  storeEveryNFrames: 5,
  active: false,
});

const simulation = new Simulation({
  capacity: 10_000,
  emitters,
  forces,
  fixedDt: 1 / 10,
  maxHistory: 600,
  historyInterval: 10,
  baseSeed: 0,
  extensions: [emittedPixelsCollector, trailsSystem],
});

const FRAME_STEP_SIZE = 5;

const renderer = new P5Renderer({ frameRate: 30 });

renderer.onSetup(async () => {
  await imageEmitter.init(renderer);
  renderer.createCanvas(imageEmitter.image.width, imageEmitter.image.height);

  simulation.setBounds(renderer.getBounds());
  simulation.setRng(renderer.createRng(simulation.baseSeed));
});

renderer.onDraw(() => {
  renderer.drawImage(imageEmitter.image, 0, 0);

  simulation.update();

  // emittedPixelsCollector.render(renderer);

  trailsSystem.forEachTrail((particleIndex, xs, ys, len) => {
    const p = simulation.getParticle(particleIndex);
    renderer.setStrokeWeight(2);
    for (let i = 0; i < len - 1; i++) {
      const trailAlpha = (i / len) * p.a * 0.5;
      renderer.setStroke(p.r, p.g, p.b, trailAlpha);
      renderer.drawLine(xs[i], ys[i], xs[i + 1], ys[i + 1]);
    }
  });

  renderer.noStroke();
  simulation.forEachParticle((_i, x, y, size, r, g, b, a) => {
    renderer.setFill(r, g, b, a);
    renderer.drawEllipse(x - size / 2, y - size / 2, size, size);
  });
});

renderer.onKeyPressed((key) => {
  if (key === " ") {
    simulation.isPaused() ? simulation.play() : simulation.pause();
  } else if (key === "ArrowRight" && simulation.isPaused()) {
    simulation.stepForward(FRAME_STEP_SIZE);
  } else if (key === "ArrowLeft" && simulation.isPaused()) {
    simulation.stepBackward(FRAME_STEP_SIZE);
  }
});

renderer.run();
