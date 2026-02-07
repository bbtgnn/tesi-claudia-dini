import P5 from "p5";
import { Engine, Simulation, ParticlePool, RenderBuffer } from "./core";
import type { RandomState } from "./core/random";
import testImagePath from "/images/prova.png?url";
import testSvgPath from "/images/prova.svg?url";
import { Trail, Forces, Emitters, Random } from "./extras";

//

new P5((_) => {
  let img: P5.Image;
  let imageEmitter: Emitters.ImageEmitter | null = null;

  const emitters: Simulation.Emitter[] = [];
  const forces: Simulation.Force[] = [];

  const trailSystem = Trail.make({ maxLength: 20 });

  // --- playback / time control state ---
  const FIXED_DT = 1 / 30; // seconds per simulation step
  const FRAME_STEP_SIZE = 10; // frames to jump when scrubbing

  let simTime = 0; // simulation time in seconds
  let stepIndex = 0; // discrete simulation step counter
  let isPaused = false;

  let rng: ReturnType<typeof Random.makeP5Random>;
  let baseSeed: number;

  type SimSnapshot = {
    time: number;
    stepIndex: number;
    pool: ParticlePool.PoolSnapshot;
    trails: Trail.TrailSnapshot;
    rngState: RandomState;
  };

  const history: SimSnapshot[] = [];
  const MAX_HISTORY = 600; // keep roughly 20 seconds at 30 fps
  let historyIndex = 0;

  function pushSnapshot() {
    const snap: SimSnapshot = {
      time: simTime,
      stepIndex,
      pool: ParticlePool.snapshot(engine.particles),
      trails: trailSystem.snapshot(),
      rngState: { stepIndex, seed: baseSeed },
    };
    history.push(snap);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    historyIndex = history.length - 1;
  }

  function restoreSnapshot(index: number) {
    if (index < 0 || index >= history.length) return;
    const snap = history[index];
    simTime = snap.time;
    stepIndex = snap.stepIndex;
    rng.setState(snap.rngState);
    ParticlePool.restore(engine.particles, snap.pool);
    RenderBuffer.update(engine.particles, engine.renderBuffer);
    trailSystem.restore(snap.trails);
    historyIndex = index;
  }

  function runSimulationStep() {
    simTime += FIXED_DT;
    stepIndex++;
    rng.setSeed(Random.seedForStep(baseSeed, stepIndex));
    Engine.update(engine, { time: simTime, dt: FIXED_DT, rng });
    pushSnapshot();
  }

  function stepForward(frames: number) {
    if (!isPaused) return;
    for (let i = 0; i < frames; i++) {
      if (historyIndex < history.length - 1) {
        // Reuse already-simulated frame
        restoreSnapshot(historyIndex + 1);
      } else {
        // Advance simulation and record a new snapshot
        runSimulationStep();
      }
    }
  }

  function stepBackward(frames: number) {
    if (!isPaused) return;
    const targetIndex = Math.max(0, historyIndex - frames);
    restoreSnapshot(targetIndex);
  }

  const engine = Engine.make({
    capacity: 10_000,
    emitters,
    forces,
    onUpdate: (_engine, _timeStep, stepResult) => {
      trailSystem.update(stepResult, _engine.particles);
    },
  });

  _.setup = async () => {
    rng = Random.makeP5Random(_);
    baseSeed = 12;
    rng.setSeed(baseSeed);

    img = await _.loadImage(testImagePath);
    img.resize(0, 400);
    img.loadPixels();

    forces.push(
      // Forces.gravity(0, 9.8),
      // Forces.wind(10, 0),
      Forces.make({
        width: img.width,
        height: img.height,
        cellSize: 30,
        strength: 1,
        timeScale: 0.0005,
        updateEvery: 1,
        noise: () => _.random(0, 1),
      })
    );

    // Load polygons from SVG file
    // Scale polygons to match the resized image dimensions
    const svgPolygons = await Emitters.loadPolygonsFromSVG(testSvgPath, {
      convertPaths: true, // Convert <path> elements to polygons
      pathSamplePoints: 100, // Number of points to sample along paths
      targetDimensions: {
        width: img.width,
        height: img.height,
      },
    });

    // Fallback to hardcoded polygon if SVG loading fails or returns no polygons
    const polygons = svgPolygons.length > 0 ? svgPolygons : [makePolygon(img)];

    imageEmitter = Emitters.make({
      lifetime: 20,
      image: img,
      polygons: polygons,
      frontier: Emitters.makeLineFrontier({
        start: [img.width / 2, (img.height / 5) * 4],
        angle: 90,
        speed: 10,
        activationDistance: 50,
      }),
      boundaryDistance: 20,
      scale: 2, // Process at 1/2 resolution, emit at full resolution
    });
    emitters.push(imageEmitter);

    _.createCanvas(img.width, img.height);
    _.frameRate(30);

    // initial snapshot at time 0
    pushSnapshot();
  };

  _.draw = () => {
    _.background(20, 20, 30);
    _.image(img, 0, 0);

    // Advance simulation only when playing
    if (!isPaused) {
      runSimulationStep();
    }

    const currentTime = simTime;

    // Draw emitted pixels white with fade-in
    if (imageEmitter) {
      const emittedPixels = imageEmitter.getEmittedPixels();
      Emitters.renderWithFadeIn(emittedPixels, {
        currentTime,
        fadeDuration: 0.5,
        fill: (r, g, b, alpha) => _.fill(r, g, b, alpha),
        rect: (x, y, size) => _.rect(x, y, size, size),
        noStroke: () => _.noStroke(),
      });
    }

    // Render trails (completely separate from particle rendering)
    trailSystem.render(engine.particles, (trail, particleIndex) => {
      const p = engine.renderBuffer[particleIndex];
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
    // Engine.render(engine, (p) => {
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

  _.keyPressed = () => {
    // Space: toggle play/pause
    if (_.key === " ") {
      isPaused = !isPaused;
      return;
    }

    // Left/right arrows: scrub when paused
    // Use key strings for reliability across browsers.
    if (_.key == "ArrowRight") {
      stepForward(FRAME_STEP_SIZE);
      return;
    }

    if (_.key == "ArrowLeft") {
      stepBackward(FRAME_STEP_SIZE);
      return;
    }
  };
});

//

export function makePolygon(image: P5.Image): Emitters.Polygon {
  const x = 0.2 * image.width;
  const y = 0.2 * image.height;
  const w = 0.3 * image.width;
  const h = 0.3 * image.height;
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}
