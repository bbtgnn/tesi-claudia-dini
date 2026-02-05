import P5 from "p5";
import { Engine, Simulation } from "./core";
import testImagePath from "/images/prova.png?url";
import testSvgPath from "/images/prova.svg?url";
import { Trail, Forces, Emitters } from "./extras";

//

new P5((_) => {
  let img: P5.Image;
  let imageEmitter: Emitters.ImageEmitter | null = null;

  const emitters: Simulation.Emitter[] = [];
  const forces: Simulation.Force[] = [];

  // Create optional trail system
  const trailSystem = Trail.make({
    maxLength: 20,
    updateInterval: 0.016, // Update every ~16ms (60fps)
  });

  const engine = Engine.make({
    capacity: 10_000,
    emitters,
    forces,
  });

  let lastTime = 0;

  _.setup = async () => {
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
        start: [img.width / 2, (img.height / 3) * 2],
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
  };

  _.draw = () => {
    _.background(20, 20, 30);
    _.image(img, 0, 0);

    // Calculate time and delta time
    const currentTime = _.millis() / 1000;
    const dt = lastTime === 0 ? 0 : currentTime - lastTime;
    lastTime = currentTime;

    // Update engine (core simulation)
    Engine.update(engine, { time: currentTime, dt });

    // Update trail system independently (reads particle state)
    trailSystem.update(engine.particles, currentTime);

    // Draw emitted pixels white with fade-in
    if (imageEmitter) {
      const emittedPixels = imageEmitter.getEmittedPixels(currentTime);
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
