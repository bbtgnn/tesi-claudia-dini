import Sketch from "p5";
import {
  ParticleSystem,
  DefaultRenderer,
  MouseEmitter,
  BurstEmitter,
  LiquidMotionModel,
  DustMotionModel,
  ChaosMotionModel,
  TrailRenderer,
} from "./core";

new Sketch((p5) => {
  let particleSystem: ParticleSystem;
  let mouseEmitter: MouseEmitter;
  let currentMotionModel: "liquid" | "dust" | "chaos" = "liquid";

  p5.setup = () => {
    p5.createCanvas(800, 600);
    p5.colorMode(p5.RGB, 255, 255, 255, 255);

    // Create renderer
    const renderer = new TrailRenderer();

    // Create particle system
    particleSystem = new ParticleSystem(renderer);
    particleSystem.setGravity(9.8);

    // Create mouse emitter with liquid motion model
    mouseEmitter = new MouseEmitter(() => new LiquidMotionModel(), 5);

    // Initial burst
    const burstEmitter = new BurstEmitter(() => new LiquidMotionModel(), 30);
    burstEmitter.setPosition(p5.width / 2, p5.height / 2);
    const initialParticles = burstEmitter.emit(p5);
    particleSystem.addParticles(initialParticles);
  };

  p5.draw = () => {
    // Semi-transparent background for trail effect
    p5.background(20, 20, 30, 30);

    // Update mouse emitter position
    mouseEmitter.setPosition(p5.mouseX, p5.mouseY);

    // Emit particles on mouse drag
    if (p5.mouseIsPressed) {
      const motionModelFactory = () => {
        switch (currentMotionModel) {
          case "liquid":
            return new LiquidMotionModel();
          case "dust":
            return new DustMotionModel();
          case "chaos":
            return new ChaosMotionModel();
        }
      };
      mouseEmitter = new MouseEmitter(motionModelFactory, 3);
      mouseEmitter.setPosition(p5.mouseX, p5.mouseY);
      const newParticles = mouseEmitter.emit(p5);
      particleSystem.addParticles(newParticles);
    }

    // Update and render
    particleSystem.update(p5);
    particleSystem.render(p5);

    // Display info
    p5.push();
    p5.fill(255, 255, 255, 200);
    p5.textSize(14);
    p5.text(`Particles: ${particleSystem.getParticleCount()}`, 10, 20);
    p5.text(`Motion: ${currentMotionModel}`, 10, 40);
    p5.text("Press 1/2/3 to switch motion models", 10, 60);
    p5.text("Click and drag to emit particles", 10, 80);
    p5.pop();
  };

  p5.keyPressed = () => {
    if (p5.key === "1") {
      currentMotionModel = "liquid";
    } else if (p5.key === "2") {
      currentMotionModel = "dust";
    } else if (p5.key === "3") {
      currentMotionModel = "chaos";
    } else if (p5.key === "c" || p5.key === "C") {
      particleSystem.clear();
    }
  };
});
