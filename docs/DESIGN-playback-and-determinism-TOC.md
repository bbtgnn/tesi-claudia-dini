# Design: Playback (play/pause, frame stepping) and deterministic replay — TOC for implementation

Use this as the table of contents for a design document. Each section should be implemented in the **current** codebase (class-based `Simulation`, `Context` with `time`/`rng`/`bounds`, etc.).

**Ownership rule**: The **simulation owns everything** related to playback and time: clock, play/pause state, history, RNG lifecycle (reseeding/restore), and internal trail system. The host (e.g. p5) **only**: (1) provides **current time** (e.g. `millis() / 1000`), and (2) calls **`simulation.update(currentTime)`** cyclically at a given framerate (e.g. 30 fps). The host also calls `simulation.play()`, `simulation.pause()`, `simulation.stepForward(n)`, `simulation.stepBackward(n)` in response to input (keyboard); it does **not** own clock, history, or RNG state.

---

## 1. Simulation as sole owner of clock and playback

- **State inside Simulation**: `simTime` (seconds), `stepIndex` (integer), `isPaused` (boolean), `fixedDt` (e.g. `1/30`), optional `frameStepSize` (e.g. 10) for scrub amount. All are private (or config).
- **Fixed dt**: Every simulation step uses `fixedDt`. The simulation **does not** use `currentTime - lastTime` for stepping; it uses `fixedDt` so steps are reproducible. `currentTime` is still passed into `update(currentTime)` for use in `Context` (e.g. emitters that need “current time” for emission logic); the simulation can set `context.time.current = simTime` and `context.time.delta = fixedDt`.
- **Public API**:
  - **`update(currentTime: number)`**: Called by the host every frame. If **playing**: perform one step (`simTime += fixedDt`, `stepIndex++`, reseed RNG, run one step with `fixedDt`, push snapshot), then return. If **paused**: do nothing. Use `currentTime` only where needed (e.g. pass to context or for debugging); the step itself uses `simTime` and `fixedDt`.
  - **`play()`**, **`pause()`**: Set `isPaused` to false/true.
  - **`stepForward(n: number)`**: Only when paused. For each of n steps: if we have a snapshot for that frame, restore it; else run one step and push snapshot. No skipping: each step is a full simulation step.
  - **`stepBackward(n: number)`**: Only when paused. Restore the snapshot that is n frames back in history (clamped to 0). Do **not** reverse the simulation.
- **Getters** (so the host can draw): e.g. `getSimTime()`, `getParticles()`, `getTrails()`, `isPaused()`, and any existing particle/trail accessors.

**Key point**: The host never advances `simTime` or touches history; it only calls `update(currentTime)` and the playback/scrub methods.

---

## 2. RNG owned and driven by the simulation

- **Ownership**: The simulation holds the RNG reference (e.g. set once via `setRng(rng)` at init; the host may create the RNG from p5 and pass it in, but after that the simulation owns **when** to call `setSeed` / `setState`).
- **State inside Simulation**: `baseSeed` (number), set at init (constructor config or setter). The simulation uses it for step-index reseeding.
- **Before every step** (in `update` when playing, or inside `stepForward` when running a step): call `rng.setSeed(seedForStep(baseSeed, stepIndex))` where `seedForStep(base, i) = base + i * 0x9e3779b9`. So step N always gets the same sequence.
- **On restore** (in `stepBackward` or when restoring in `stepForward`): call `rng.setState(snap.rngState)`. The RNG’s `setState` must reseed so the **next** step produces the same sequence (e.g. `setSeed(seedForStep(state.seed, state.stepIndex + 1))`).
- **Context.rng**: The simulation passes its owned RNG into `Context` so forces and emitters use **only** `context.rng.random()` and `context.rng.noise(...)`. No `Math.random()` or global random in simulation code.

**Key point**: The host does not call `setSeed` or `setState`; the simulation does, using its own `baseSeed` and `stepIndex`.

---

## 3. Snapshots and history owned by the simulation

- **What a snapshot contains**: (1) **Particle pool**: deep copy of count + all Float32Arrays. (2) **Trails**: deep copy of the trail map (particle index → array of Vec2). (3) **RNG state**: `{ stepIndex, seed }` (seed = base seed).
- **Where it lives**: Private array (or ring buffer) inside the simulation, with a max length (e.g. 600). Push after each step when playing (and when stepping forward beyond the last snapshot, after each run step). Clear or clamp on overflow.
- **Restore order** (critical, inside simulation): (1) `rng.setState(snap.rngState)`, (2) restore particle pool, (3) update render buffer from pool, (4) restore trails. Then set internal `simTime` and `stepIndex` from the snapshot (or from snapshot metadata).
- **ParticlePool**: Add `snapshot()` and `restore(snapshot)` (simulation calls these).
- **Trails**: Simulation owns the trail system (internal instance). Add `snapshot()` and `restore(snapshot)` on that instance so the simulation can save/restore trails with the rest of the state.

**Key point**: History and snapshot logic are entirely inside the simulation; the host never sees the array or the snapshot type (unless exposed for debugging).

---

## 4. Trails owned by the simulation

- The simulation creates and holds the **Trails** instance (e.g. in constructor, from config). After each step, the simulation calls `this.trails.update(this.particles, stepResult)` (or equivalent). No need for the host to pass an `onUpdate` that does trails; the simulation can do it internally and expose `getTrails()` for drawing.
- **Snapshot/restore**: The simulation’s snapshot includes the result of `this.trails.snapshot()`; on restore, it calls `this.trails.restore(snap.trails)`.

**Key point**: The host only reads `simulation.getTrails()` to draw; it does not own or update the trail system.

---

## 5. Host (p5) contract

- **Setup**: Create simulation (with capacity, forces, emitters, config for fixedDt, frameStepSize, maxHistory, baseSeed). Call `simulation.setRng(rng)` with an RNG created from p5 (or a factory). Call `simulation.setBounds(...)`. Optionally push initial snapshot (stepIndex 0) so step-back has a frame 0.
- **Draw loop** (at framerate, e.g. 30 fps): `currentTime = millis() / 1000`; `simulation.update(currentTime)`; then read `simulation.getParticles()`, `simulation.getTrails()`, etc., and draw. Do **not** skip `update()` when paused — the simulation will no-op when paused.
- **Input**: On Space, call `simulation.isPaused() ? simulation.play() : simulation.pause()`. On Arrow Right (when paused), call `simulation.stepForward(FRAME_STEP_SIZE)`. On Arrow Left (when paused), call `simulation.stepBackward(FRAME_STEP_SIZE)`. Use key names (`" "`, `"ArrowRight"`, `"ArrowLeft"`) for portability.

**Key point**: The host never holds `simTime`, `stepIndex`, or history; it only calls the simulation’s public API and uses current time for `update(currentTime)`.

---

## 6. Simulation.update(currentTime) contract

- **When playing**: One step per call: set `context.time` to `{ current: simTime, delta: fixedDt }`, reseed RNG with `seedForStep(baseSeed, stepIndex)`, run one step (emitters, forces, integrate, kill), update render buffer, update internal trails, push snapshot, then increment `simTime` and `stepIndex`.
- **When paused**: No-op (no step, no snapshot push).
- **currentTime**: Use only where the simulation or context needs “wall clock” (e.g. for emission timing if you ever need it). The **step** is always driven by `simTime` and `fixedDt`.

**Key point**: `update(currentTime)` is the only entry point the host uses to “tick” the simulation; the simulation decides whether to step or not based on `isPaused`.

---

## 7. Deterministic RNG interface and flow field

- **RNG interface** (same as before): `setSeed(seed)`, `setState(state)`, `random()`, `noise(x, y?, z?)`. State shape: `{ stepIndex, seed }`.
- **Flow field**: Use `context.rng.random()` per sample for chaotic/whirlpool behavior; using `context.rng.noise(x, y)` gives smooth Perlin (document the choice).

---

## 8. Initialization and first snapshot

- After construction and `setRng` / `setBounds`, the simulation can push an initial snapshot (stepIndex 0, simTime 0, empty pool and trails, rngState `{ stepIndex: 0, seed: baseSeed }`) so that “step back” from frame 1 has a frame 0 to restore. This can happen inside `update(currentTime)` on the first call, or in a dedicated `start()`/`init()` if you add one.

---

## Summary checklist for the agent

- [ ] **Simulation owns**: `simTime`, `stepIndex`, `isPaused`, `baseSeed`, RNG usage (setSeed/setState), history array, internal Trails, fixedDt, frameStepSize (or config).
- [ ] **Host only**: provides `currentTime`, calls `update(currentTime)` every frame, calls `play()`/`pause()`/`stepForward(n)`/`stepBackward(n)` on input, reads getters to draw.
- [ ] **update(currentTime)**: when playing, one step with `fixedDt`, reseed, push snapshot; when paused, no-op.
- [ ] **ParticlePool**: `snapshot()` / `restore(snapshot)`.
- [ ] **Trails**: owned by simulation; `snapshot()` / `restore(snapshot)`; simulation calls them when saving/restoring.
- [ ] **Snapshot** = pool + trails + `rngState: { stepIndex, seed }`. Restore order: RNG → pool → render buffer → trails.
- [ ] **RNG**: simulation calls `setSeed(seedForStep(baseSeed, stepIndex))` before each step and `setState(snap.rngState)` on restore.
- [ ] All randomness via `context.rng`; flow field uses `rng.random()` for chaotic behavior (or document `noise(x,y)`).
- [ ] Keys: Space (play/pause), Arrow Left/Right (step back/forward when paused); host maps keys to simulation methods.
