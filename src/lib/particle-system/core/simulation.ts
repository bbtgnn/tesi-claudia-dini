import type { IRenderer } from '../renderer/types';
import type { HistorySnapshot } from './history-store';
import type { Context, Emitter, Force, StepRng } from './types';

import { HistoryStore } from './history-store';
import { ParticlePool } from './particle-pool';
import * as Step from './simulation.step';

//

/** Read-only view of one particle (e.g. for drawing). Do not hold across frames. */
export interface ParticleData {
	x: number;
	y: number;
	size: number;
	r: number;
	g: number;
	b: number;
	a: number;
}

/** Single particle passed to the simulation's draw callback. Do not store; use immediately. */
export interface ParticleDrawItem extends ParticleData {
	index: number;
}

export interface Extension {
	update(payload: OnUpdatePayload): void;
	snapshot(): unknown;
	restore(snap: unknown): void;
	/** Called each frame to draw this extension. Order: all extensions render first, then simulation draw. */
	render(renderer: IRenderer, simulation: Simulation): void;
	/** If false, this extension is excluded from the simulation. */
	active: boolean;
	/** Optional: load assets. Called by simulation during renderer setup. */
	init?(renderer: IRenderer): Promise<void>;
}

export interface OnUpdatePayload {
	particles: ParticlePool;
	context: Context;
	stepResult: Step.Result;
	/**
	 * Simulation step index for the step that just completed (same value
	 * stored in history when pushSnapshot runs immediately after extensions update).
	 */
	frame: number;
}

interface Config {
	/** Maximum number of particles. */
	capacity: number;
	forces: Force[];
	emitters: Emitter[];
	/** Speed of the simulation */
	speed: number;
	/** Maximum number of history snapshots. */
	maxHistory?: number;
	/** Store a snapshot every N simulation steps (default 1). Use 5–10 to reduce GC and stutter. */
	historyInterval?: number;
	baseSeed?: number;
	extensions?: Extension[];
	/** Draw one particle. Called once per particle after all extensions render. */
	draw?: (renderer: IRenderer, particle: ParticleDrawItem) => void;
	/** Steps per key when paused (ArrowLeft/ArrowRight). Default 5. */
	frameStepSize?: number;
	/**
	 * Create canvas. Optional when an emitter sets bounds via configureSimulation().
	 */
	createCanvas?: (renderer: IRenderer) => void;
	/** Draw background each frame. Optional when an emitter sets it via configureSimulation(). */
	background?: (renderer: IRenderer) => void;
	/** Renderer to use. Optional; you can also call addRenderer() before run(). */
	renderer?: IRenderer;
}

interface Rng extends StepRng {
	setStepSeed(stepIndex: number): void;
}

export class Simulation {
	readonly particles: ParticlePool;
	readonly forces: Force[];
	readonly emitters: Emitter[];

	private readonly extensions: Extension[];
	private readonly history: HistoryStore;
	private readonly particleView: ParticleDrawItem = {
		index: 0,
		x: 0,
		y: 0,
		size: 0,
		r: 0,
		g: 0,
		b: 0,
		a: 0
	};

	/** Base seed for RNG; pass to renderer.createRng() when wiring. */
	readonly baseSeed: number;
	/** Steps per key when paused (ArrowLeft/ArrowRight). */
	readonly frameStepSize: number;
	private rngRef?: Rng;
	private boundsRef?: Context['bounds'];

	private stepIndex = 0;
	private paused = true;
	private readonly fixedDt: number;
	private readonly historyInterval: number;
	private readonly draw?: (renderer: IRenderer, particle: ParticleDrawItem) => void;
	private readonly createCanvas?: (renderer: IRenderer) => void;
	private backgroundDraw?: (renderer: IRenderer) => void;

	private rendererRef?: IRenderer;

	private readonly onMountHandlers: ((canvas: HTMLCanvasElement) => void)[] = [];
	private canvasRef: HTMLCanvasElement | undefined;

	constructor(config: Config) {
		const {
			capacity,
			forces,
			emitters,
			speed,
			maxHistory = 600,
			historyInterval = 1,
			baseSeed = 0,
			extensions = [],
			draw,
			frameStepSize = 5,
			createCanvas,
			background: backgroundDraw,
			renderer: rendererRef
		} = config;
		this.particles = new ParticlePool(capacity);
		this.forces = forces;
		this.emitters = emitters;
		this.extensions = extensions.filter((e) => e.active);
		this.history = new HistoryStore(maxHistory, capacity);
		this.fixedDt = speed / 10;
		this.baseSeed = baseSeed;
		this.historyInterval = historyInterval;
		this.draw = draw;
		this.frameStepSize = frameStepSize;
		this.createCanvas = createCanvas;
		this.backgroundDraw = backgroundDraw;
		this.rendererRef = rendererRef;
	}

	/**
	 * Register a handler to run when the renderer's canvas is ready (after setup).
	 * If the canvas is already available, the handler is called immediately.
	 * Use e.g. to move the canvas into a specific DOM container.
	 */
	onMount(handler: (canvas: HTMLCanvasElement) => void): void {
		if (this.canvasRef) {
			handler(this.canvasRef);
		} else {
			this.onMountHandlers.push(handler);
		}
	}

	/**
	 * Register a renderer (optional if renderer was passed in config).
	 * Call run() to start the loop.
	 */
	addRenderer(renderer: IRenderer): void {
		this.rendererRef = renderer;
	}

	/**
	 * Save the current canvas as an image (e.g. PNG). No-op if the renderer
	 * does not support saveImage (e.g. P5Renderer does).
	 */
	saveImage(filename?: string, extension?: string): void {
		this.rendererRef?.saveImage?.(filename, extension);
	}

	/**
	 * Start the render loop. Requires a canvas element and a renderer (config or addRenderer()).
	 * Bounds and background must be set (via config or emitter.configureSimulation()).
	 * The renderer will instance the sketch inside the given canvas (e.g. p5 uses it via createCanvas).
	 */
	run(canvas: HTMLCanvasElement): void {
		const renderer = this.rendererRef;
		if (!renderer) {
			throw new Error(
				'Simulation.run() requires a renderer (pass renderer in config or call addRenderer() first)'
			);
		}
		const sim = this;
		const frameStepSize = this.frameStepSize;
		renderer.onSetup(async () => {
			for (const emitter of sim.emitters) {
				if (emitter.init) await emitter.init(renderer);
			}
			for (const ext of sim.extensions) {
				if (ext.init) await ext.init(renderer);
			}
			for (const emitter of sim.emitters) {
				if (emitter.configureSimulation) emitter.configureSimulation(sim);
			}
			if (sim.boundsRef) {
				renderer.createCanvas(sim.boundsRef.width, sim.boundsRef.height);
			} else if (sim.createCanvas) {
				sim.createCanvas(renderer);
			} else {
				throw new Error('Simulation: setBounds() or createCanvas in config required');
			}
			if (!sim.boundsRef) {
				sim.setBounds(renderer.getBounds().width, renderer.getBounds().height);
			}
			sim.setRng(renderer.createRng(sim.baseSeed));
			const canvas = renderer.getCanvas?.();
			if (canvas) {
				sim.canvasRef = canvas;
				for (const h of sim.onMountHandlers) h(canvas);
				sim.onMountHandlers.length = 0;
			}
		});
		renderer.onDraw(() => {
			const bg = sim.backgroundDraw;
			if (!bg) {
				throw new Error('Simulation: setBackground() or background in config required');
			}
			bg(renderer);
			sim.update();
			sim.render(renderer);
		});
		renderer.onKeyPressed((key) => {
			if (key === ' ') {
				sim.isPaused() ? sim.play() : sim.pause();
			} else if (key === 's' || key === 'S') {
				if (typeof renderer.saveImage === 'function') {
					renderer.saveImage();
				}
			} else if (key === 'ArrowRight' && sim.isPaused()) {
				sim.stepForward(frameStepSize);
			} else if (key === 'ArrowLeft' && sim.isPaused()) {
				sim.stepBackward(frameStepSize);
			}
		});
		renderer.run(canvas);
	}

	/**
	 * Render extensions first (in order), then the simulation's draw callback if provided.
	 * Call this each frame after simulation.update().
	 */
	render(renderer: IRenderer): void {
		const sim = this;
		for (const ext of this.extensions) {
			ext.render(renderer, sim);
		}
		if (this.draw) {
			this.forEachParticle((i, x, y, size, r, g, b, a) => {
				this.particleView.index = i;
				this.particleView.x = x;
				this.particleView.y = y;
				this.particleView.size = size;
				this.particleView.r = r;
				this.particleView.g = g;
				this.particleView.b = b;
				this.particleView.a = a;
				this.draw!(renderer, this.particleView);
			});
		}
	}

	setRng(rng: Rng): void {
		this.rngRef = rng;
	}

	setBounds(width: number, height: number): void;
	setBounds(bounds: Context['bounds']): void;
	setBounds(widthOrBounds: number | Context['bounds'], height?: number): void {
		if (typeof widthOrBounds === 'number' && height !== undefined) {
			this.boundsRef = { width: widthOrBounds, height };
		} else {
			this.boundsRef = widthOrBounds as Context['bounds'];
		}
	}

	setBackground(fn: (renderer: IRenderer) => void): void {
		this.backgroundDraw = fn;
	}

	/* Getters */

	/** Single-particle view (use immediately; do not store). For many particles use forEachParticle(). */
	getParticle(index: number): ParticleData {
		const p = this.particles;
		const v = this.particleView;
		v.x = p.px[index];
		v.y = p.py[index];
		v.size = p.size[index];
		v.r = p.r[index];
		v.g = p.g[index];
		v.b = p.b[index];
		v.a = p.a[index];
		return v;
	}

	/** Zero-allocation iteration for drawing. Callback receives (index, x, y, size, r, g, b, a). */
	forEachParticle(
		cb: (
			i: number,
			x: number,
			y: number,
			size: number,
			r: number,
			g: number,
			b: number,
			a: number
		) => void
	): void {
		const pool = this.particles;
		const n = pool.count;
		for (let i = 0; i < n; i++) {
			cb(i, pool.px[i], pool.py[i], pool.size[i], pool.r[i], pool.g[i], pool.b[i], pool.a[i]);
		}
	}

	/** Number of active particles. */
	getActiveCount(): number {
		return this.particles.count;
	}

	getTime(): number {
		return this.stepIndex * this.fixedDt;
	}

	private get rng(): Rng {
		if (this.rngRef === undefined) {
			throw new Error('Simulation: setRng() or setContext() must be called first');
		}
		return this.rngRef;
	}

	private get context(): Context {
		if (this.boundsRef === undefined) {
			throw new Error('Simulation: setBounds() or setContext() must be called first');
		}

		return {
			time: {
				current: this.getTime(),
				delta: this.fixedDt
			},
			rng: this.rng,
			bounds: this.boundsRef
		};
	}

	/* Execution methods (tick, update, stepForward, stepBackward) */

	play(): void {
		this.paused = false;
	}

	pause(): void {
		this.paused = true;
	}

	isPaused(): boolean {
		return this.paused;
	}

	private tick() {
		this.rng.setStepSeed(this.stepIndex);
		const stepResult = Step.run(this.context, this.particles, this.forces, this.emitters);
		this.updateExtensions(this.context, stepResult);
		if (this.stepIndex % this.historyInterval === 0) {
			this.pushSnapshot();
		}
		this.stepIndex += 1;
	}

	update(): void {
		if (this.isPaused()) return;
		this.ensureInitialSnapshot();
		this.tick();
	}

	stepForward(n: number): void {
		if (!this.isPaused()) return;
		this.ensureInitialSnapshot();
		const targetStep = this.stepIndex + n;
		const snap = this.history.findLatestNotAfter(targetStep);
		if (snap !== undefined) {
			this.restoreSnapshot(snap);
		}
		while (this.stepIndex < targetStep) {
			this.tick();
		}
	}

	stepBackward(n: number): void {
		if (!this.isPaused()) return;
		const targetStep = Math.max(0, this.stepIndex - n);
		const snap = this.history.findLatestNotAfter(targetStep);
		if (snap === undefined) return;
		this.restoreSnapshot(snap);
		while (this.stepIndex < targetStep) {
			this.tick();
		}
	}

	/* Snapshots */

	private ensureInitialSnapshot(): void {
		if (!this.history.isEmpty()) return;
		this.pushSnapshot();
	}

	private pushSnapshot(): void {
		const slot = this.history.getNextSlot();
		this.particles.snapshotInto(slot.pool);
		slot.stepIndex = this.stepIndex;
		slot.extensionSnapshots = this.extensions.map((e) => e.snapshot());
		this.history.commitPush();
	}

	private restoreSnapshot(snap: HistorySnapshot): void {
		this.rng.setStepSeed(snap.stepIndex);
		this.particles.restore(snap.pool);
		this.extensions.forEach((e, i) => e.restore(snap.extensionSnapshots[i]));
		this.stepIndex = snap.stepIndex;
	}

	/* Extensions */

	private updateExtensions(context: Context, stepResult: Step.Result): void {
		const payload: OnUpdatePayload = {
			particles: this.particles,
			context,
			stepResult,
			frame: this.stepIndex
		};
		for (const ext of this.extensions) ext.update(payload);
	}
}
