# Prompt for coding agent: Playback and deterministic replay

Copy the block below and pass it to the coding agent.

---

Implement playback (play/pause, frame stepping) and deterministic replay in this codebase by following the design document **in this repo**: `docs/DESIGN-playback-and-determinism-TOC.md`.

**Task:** Implement everything described in that document. The simulation must own all playback state (clock, play/pause, history, RNG reseeding/restore, internal trails). The host (e.g. `main.ts` / p5) must only: (1) provide current time, (2) call `simulation.update(currentTime)` every frame at the chosen framerate, and (3) call `play()`, `pause()`, `stepForward(n)`, `stepBackward(n)` from keyboard input. The host must not own or manipulate `simTime`, `stepIndex`, history, or RNG state.

**Deliverables:**

- **Simulation**: Add internal state (simTime, stepIndex, isPaused, fixedDt, frameStepSize, baseSeed, history), internal Trails instance, and methods `update(currentTime)`, `play()`, `pause()`, `stepForward(n)`, `stepBackward(n)`, plus getters (e.g. `getSimTime()`, `getTrails()`, `isPaused()`). Use `fixedDt` for every step (not wall-clock delta). Reseed RNG with `seedForStep(baseSeed, stepIndex)` before each step; call `rng.setState(snap.rngState)` on restore. Snapshot = pool + trails + rngState; restore order: RNG → pool → render buffer → trails.
- **ParticlePool**: Add `snapshot()` and `restore(snapshot)` (deep copy of count and all arrays).
- **Trails**: Add `snapshot()` and `restore(snapshot)` (deep copy of the trail map). Simulation owns the Trails instance and calls it after each step; host only reads `getTrails()` to draw.
- **RNG**: Ensure the RNG object has `setSeed(seed)`, `setState({ stepIndex, seed })`, `random()`, `noise(x, y?, z?)`. Simulation calls setSeed/setState; host only passes the RNG once via `setRng(rng)`.
- **Host (main.ts)**: In draw, always call `simulation.update(millis()/1000)`; in key handlers, call `simulation.play()`, `simulation.pause()`, `simulation.stepForward(n)`, `simulation.stepBackward(n)` for Space and Arrow keys. Remove any host-owned clock or history.
- **Flow field**: Use `context.rng.random()` per sample (not `noise(x,y)`) so the flow stays chaotic and the seed visibly changes the result.

Use the **Summary checklist** at the end of the design doc to verify nothing is missed. Keep the host thin: no playback logic, no snapshot/history, no RNG reseeding—only `update(currentTime)` and playback/scrub method calls.
