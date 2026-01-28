/** Build RGBA float buffer [0,1] for a simple test image. No per-frame alloc. */
function createTestImageData(w: number, h: number): Float32Array {
  const n = w * h * 4;
  const data = new Float32Array(n);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const u = x / (w - 1 || 1);
      const v = y / (h - 1 || 1);
      data[i]! = u;
      data[i + 1]! = v;
      data[i + 2]! = 0.6;
      data[i + 3]! = 1;
    }
  }
  return data;
}

function buildEngine(
  worldWidth: number,
  worldHeight: number
): {
  image: ReturnType<typeof createImageSystem>;
  activation: ReturnType<typeof createActivation>;
  pool: ReturnType<typeof createParticlePool>;
  pixelToWorld: ReturnType<typeof createPixelToWorld>;
  forces: Force[];
  config: {
    emission: {
      velocityX: number;
      velocityY: number;
      lifetime: number;
      particleSize: number;
    };
  };
} {
  const imageData = createTestImageData(IMAGE_WIDTH, IMAGE_HEIGHT);
  const image = createImageSystem(IMAGE_WIDTH, IMAGE_HEIGHT, imageData);

  const seeds: BurnSeed[] = [
    {
      centerX: IMAGE_WIDTH * 0.25,
      centerY: IMAGE_HEIGHT * 0.5,
      speed: 1,
      radius: 0,
      delay: 0,
      maxRange: 0,
    },
    {
      centerX: IMAGE_WIDTH * 0.5,
      centerY: IMAGE_HEIGHT * 0.5,
      speed: 1,
      radius: 0,
      delay: 0,
      maxRange: 0,
    },
    {
      centerX: IMAGE_WIDTH * 0.75,
      centerY: IMAGE_HEIGHT * 0.5,
      speed: 1,
      radius: 0,
      delay: 0,
      maxRange: 0,
    },
  ];
  const activation = createActivation(IMAGE_WIDTH, IMAGE_HEIGHT, seeds);

  const pool = createParticlePool(PARTICLE_CAPACITY);

  const pixelToWorld = createPixelToWorld({
    imageWidth: IMAGE_WIDTH,
    imageHeight: IMAGE_HEIGHT,
    worldWidth,
    worldHeight,
    origin: "center",
  });

  const forces: Force[] = [
    gravity(0, 40),
    wind(15, -5),
    drag(1.2),
    vortex(worldWidth / 2, worldHeight / 2, 80),
  ];

  const config = {
    emission: {
      velocityX: 0,
      velocityY: 0,
      lifetime: 3,
      particleSize: 6,
    },
  };

  return { image, activation, pool, pixelToWorld, forces, config };
}
