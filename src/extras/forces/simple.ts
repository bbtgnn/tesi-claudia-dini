import type { Force } from "../../core";

export function gravity(ax: number, ay: number): Force {
  return {
    update(_ctx) {},
    apply(ctx) {
      const { count, vx, vy, dt } = ctx;
      for (let i = 0; i < count; i++) {
        vx[i] += ax * dt;
        vy[i] += ay * dt;
      }
    },
  };
}

export function wind(wx: number, wy: number): Force {
  return {
    update(_ctx) {},
    apply(ctx) {
      const { count, vx, vy, dt } = ctx;
      for (let i = 0; i < count; i++) {
        vx[i] += wx * dt;
        vy[i] += wy * dt;
      }
    },
  };
}

export function drag(k: number): Force {
  return {
    update(_ctx) {},
    apply(ctx) {
      const { count, vx, vy, dt } = ctx;
      const f = 1 - k * dt;
      if (f <= 0) {
        for (let i = 0; i < count; i++) {
          vx[i] = 0;
          vy[i] = 0;
        }
      } else {
        for (let i = 0; i < count; i++) {
          vx[i] *= f;
          vy[i] *= f;
        }
      }
    },
  };
}

export function vortex(cx: number, cy: number, strength: number): Force {
  return {
    update(_ctx) {},
    apply(ctx) {
      const { count, px, py, vx, vy, dt } = ctx;
      for (let i = 0; i < count; i++) {
        const dx = px[i] - cx;
        const dy = py[i] - cy;
        const perpX = -dy;
        const perpY = dx;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const s = (strength * dt) / len;
        vx[i] += perpX * s;
        vy[i] += perpY * s;
      }
    },
  };
}

export function turbulence(mag: number): Force {
  let random: () => number = () => 0.5;
  return {
    update(ctx) {
      random = ctx.rng.random;
    },
    apply(ctx) {
      const { count, vx, vy, dt } = ctx;
      for (let i = 0; i < count; i++) {
        vx[i] += (random() - 0.5) * 2 * mag * dt;
        vy[i] += (random() - 0.5) * 2 * mag * dt;
      }
    },
  };
}
