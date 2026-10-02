/** Verlet cloth for the floating paper ghost. Pure math, no rendering. */

export type Rect = { x: number; y: number; w: number; h: number } // world units, (x,y) = top-left

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export class Cloth {
  nx: number
  ny: number
  pos: Float32Array
  prev: Float32Array
  /** 0..1 how strongly each particle follows its float target (top = head) */
  anchor: Float32Array
  W: number
  H: number
  cx = 0
  cy = 0
  time = 0
  /** wind from the pointer, world units / s */
  gust = { x: 0, y: 0, z: 0, px: 0, py: 0, r: 1 }

  constructor(nx: number, ny: number, W: number, H: number) {
    this.nx = nx
    this.ny = ny
    this.W = W
    this.H = H
    const n = nx * ny
    this.pos = new Float32Array(n * 3)
    this.prev = new Float32Array(n * 3)
    this.anchor = new Float32Array(n)
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const v = j / (ny - 1)
        this.anchor[j * nx + i] = smooth(0.52, 0.96, v)
      }
    }
    this.reset()
  }

  reset() {
    const t = new Float32Array(3)
    for (let j = 0; j < this.ny; j++) {
      for (let i = 0; i < this.nx; i++) {
        const k = j * this.nx + i
        this.floatTarget(i, j, t)
        this.pos.set(t, k * 3)
        this.prev.set(t, k * 3)
      }
    }
  }

  /** Where particle (i,j) wants to be while the ghost floats. */
  floatTarget(i: number, j: number, out: Float32Array) {
    const u = i / (this.nx - 1)
    const v = j / (this.ny - 1)
    const t = this.time
    const bob = Math.sin(t * 0.9) * 0.07
    const sway = Math.sin(t * 0.55) * 0.05
    const tilt = Math.sin(t * 0.45) * 0.04
    // head is narrower than the hem: taper the upper part slightly
    const taper = 0.9 + 0.1 * (1 - v)
    let x = (u - 0.5) * this.W * taper
    const y = (v - 0.5) * this.H
    // rotate around head center
    const ry = y - this.H * 0.3
    x = x * Math.cos(tilt) - ry * Math.sin(tilt)
    const yy = x * Math.sin(tilt) + ry * Math.cos(tilt) + this.H * 0.3
    const dome = Math.cos((u - 0.5) * Math.PI) * smooth(0.45, 1, v) * 0.32
    out[0] = this.cx + x + sway
    out[1] = this.cy + yy + bob
    out[2] = dome
  }

  /**
   * Advance one fixed step.
   * flat: 0 = floating ghost, 1 = lying exactly on `rect`.
   */
  step(dt: number, flat: number, rect: Rect | null, calm: boolean) {
    this.time += dt
    const { nx, ny, pos, prev, anchor } = this
    const n = nx * ny
    const t = this.time
    const air = (1 - flat) * (calm ? 0.25 : 1)
    const g = -7 * (1 - flat)
    const damp = 0.975 - flat * 0.1
    const dt2 = dt * dt
    const G = this.gust
    const r2 = G.r * G.r

    for (let k = 0; k < n; k++) {
      const i = k % nx
      const j = (k / nx) | 0
      const u = i / (nx - 1)
      const v = j / (ny - 1)
      const free = 1 - anchor[k]
      const o = k * 3
      const x = pos[o], y = pos[o + 1], z = pos[o + 2]
      // idle breeze, stronger towards the hem
      let ax = Math.sin(t * 1.3 + v * 4.0 + u * 2.0) * 0.4 * free * air
      let az = (Math.sin(t * 1.7 + u * 6.0 - v * 3.0) * 0.45 + Math.sin(t * 0.7 + u * 3.1) * 0.25) * free * air
      let ay = g * free
      // pointer gust
      const dx = x - G.px, dy = y - G.py
      const fall = Math.exp(-(dx * dx + dy * dy) / r2) * air
      if (fall > 0.002) {
        ax += G.x * fall * 16
        ay += G.y * fall * 10
        az += G.z * fall * 16
      }
      const vx = (x - prev[o]) * damp
      const vy = (y - prev[o + 1]) * damp
      const vz = (z - prev[o + 2]) * damp
      prev[o] = x; prev[o + 1] = y; prev[o + 2] = z
      pos[o] = x + vx + ax * dt2
      pos[o + 1] = y + vy + ay * dt2
      pos[o + 2] = z + vz + az * dt2
    }

    // rest lengths morph from the ghost sheet to the target rect
    const rw = rect ? rect.w : this.W
    const rh = rect ? rect.h : this.H
    const restX = ((1 - flat) * this.W + flat * rw) / (nx - 1)
    const restY = ((1 - flat) * this.H + flat * rh) / (ny - 1)
    const restD = Math.hypot(restX, restY)

    for (let it = 0; it < 5; it++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i
          if (i < nx - 1) this.solve(k, k + 1, restX)
          if (j < ny - 1) this.solve(k, k + nx, restY)
          if (i < nx - 1 && j < ny - 1) {
            this.solve(k, k + nx + 1, restD)
            this.solve(k + 1, k + nx, restD)
          }
        }
      }
    }

    // pull towards targets
    const tgt = new Float32Array(3)
    const fe = flat * flat * (3 - 2 * flat)
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i
        const o = k * 3
        this.floatTarget(i, j, tgt)
        let tx = tgt[0], ty = tgt[1], tz = tgt[2]
        if (rect && fe > 0) {
          const u = i / (nx - 1), v = j / (ny - 1)
          tx += (rect.x + u * rect.w - tx) * fe
          ty += (rect.y - (1 - v) * rect.h - ty) * fe
          tz += (0 - tz) * fe
        }
        const a = Math.max(anchor[k], fe) * (fe > 0.995 ? 1 : 0.9)
        if (a <= 0) continue
        pos[o] += (tx - pos[o]) * a
        pos[o + 1] += (ty - pos[o + 1]) * a
        pos[o + 2] += (tz - pos[o + 2]) * a
        if (fe > 0.995) {
          prev[o] = pos[o]; prev[o + 1] = pos[o + 1]; prev[o + 2] = pos[o + 2]
        }
      }
    }
  }

  private solve(a: number, b: number, rest: number) {
    const p = this.pos
    const oa = a * 3, ob = b * 3
    const dx = p[ob] - p[oa], dy = p[ob + 1] - p[oa + 1], dz = p[ob + 2] - p[oa + 2]
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6
    const f = ((d - rest) / d) * 0.5
    // anchored particles barely move; the free hem takes the correction
    const wa = 1 - this.anchor[a] * 0.9, wb = 1 - this.anchor[b] * 0.9
    const s = wa + wb
    const ka = (f * 2 * wa) / s, kb = (f * 2 * wb) / s
    p[oa] += dx * ka; p[oa + 1] += dy * ka; p[oa + 2] += dz * ka
    p[ob] -= dx * kb; p[ob + 1] -= dy * kb; p[ob + 2] -= dz * kb
  }

  /** Push the sheet away from the viewer around a point (click "shiver"). */
  poke(px: number, py: number, strength: number) {
    const { pos, prev } = this
    for (let k = 0; k < this.nx * this.ny; k++) {
      const o = k * 3
      const dx = pos[o] - px, dy = pos[o + 1] - py
      const f = Math.exp(-(dx * dx + dy * dy) / 0.9) * strength
      prev[o + 2] += f
      prev[o] -= dx * f * 0.3
    }
  }

  bounds() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (let k = 0; k < this.nx * this.ny; k++) {
      const x = this.pos[k * 3], y = this.pos[k * 3 + 1]
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
    return { minX, maxX, minY, maxY }
  }
}
