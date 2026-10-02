/** Sculpted paper shell with fixed-step Verlet dynamics. Pure math, no rendering. */

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
  /** Rest lengths come from the sculpted surface, not from a flat rectangular lattice. */
  constraints: { a: number; b: number; rest: number; du: number; dv: number; stiffness: number }[] = []
  restLengths = new Float32Array(0)
  restKey = ''
  W: number
  H: number
  cx = 0
  cy = 0
  time = 0
  /** Smoothed turn towards the pointer; radians, limited to preserve the face. */
  facing = 0
  /** wind from the pointer, world units / s */
  gust = { x: 0, y: 0, z: 0, px: 0, py: 0, r: 1, active: 0 }

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
        this.anchor[j * nx + i] = smooth(0.38, 0.85, v)
      }
    }
    this.reset()
    const add = (a: number, b: number, stiffness = 1) => {
      const rest = Math.hypot(this.pos[a * 3] - this.pos[b * 3], this.pos[a * 3 + 1] - this.pos[b * 3 + 1], this.pos[a * 3 + 2] - this.pos[b * 3 + 2])
      this.constraints.push({ a, b, rest, du: ((a % nx) - (b % nx)) / (nx - 1), dv: (Math.floor(a / nx) - Math.floor(b / nx)) / (ny - 1), stiffness })
    }
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i
      if (i + 1 < nx) add(k, k + 1)
      if (j + 1 < ny) add(k, k + nx)
      if (i + 1 < nx && j + 1 < ny) { add(k, k + nx + 1); add(k + 1, k + nx) }
      // Bending constraints suppress sub-pixel corrugations while leaving the hem flexible.
      if (i + 2 < nx) add(k, k + 2, 0.45)
      if (j + 2 < ny) add(k, k + nx * 2, 0.45)
    }
    this.restLengths = new Float32Array(this.constraints.length)
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
    const bob = Math.sin(t * 0.64) * 0.045
    const sway = Math.sin(t * 0.37) * 0.024
    const tilt = -0.025 + Math.sin(t * 0.31) * 0.013
    const across = u * 2 - 1
    const skirt = 1 - smooth(0.12, 0.72, v)

    // The silhouette is geometry, including the arch and scalloped cut edge.
    // UVs remain rectangular, so the same mesh can unfurl into the DOM spread.
    const crown = 0.13 + 0.37 * Math.sqrt(Math.max(0, 1 - across * across))
    const hem = -0.47 + 0.032 * Math.cos(u * Math.PI * 6 + 0.25)
      + 0.012 * Math.sin(u * Math.PI * 2 + 0.4)
    const taper = 0.85 + 0.15 * skirt
    const x = (u - 0.5) * this.W * taper
    const y = (hem + v * (crown - hem)) * this.H
    // An elliptical dome opens into asymmetric, deeper folds below the face.
    const dome = Math.pow(Math.max(0, Math.cos(across * Math.PI / 2)), 0.72)
      * this.W * (0.13 + 0.13 * smooth(0.3, 0.85, v))
    const folds = (Math.sin(u * Math.PI * 5.2 + 0.3) * 0.056
      + Math.sin(u * Math.PI * 9.5 - 0.7) * 0.018) * this.W * skirt
    const curl = Math.pow(Math.abs(across), 8) * this.W * 0.055 * skirt
    const wave = Math.sin(u * 7 - v * 5 - t * 0.95) * 0.017 * skirt
    const z = dome + folds + curl + wave
    const ry = y - this.H * 0.27
    const xx = x * Math.cos(tilt) - ry * Math.sin(tilt)
    out[0] = this.cx + xx * Math.cos(this.facing) + z * Math.sin(this.facing) + sway
    out[1] = this.cy + x * Math.sin(tilt) + ry * Math.cos(tilt) + this.H * 0.27 + bob
    out[2] = z * Math.cos(this.facing) - xx * Math.sin(this.facing)

  }

  /**
   * Advance one fixed step.
   * flat: 0 = floating ghost, 1 = lying exactly on `rect`.
   */
  step(dt: number, flat: number, rect: Rect | null, calm: boolean) {
    this.time += calm ? 0 : dt
    const turn = calm ? 0 : Math.max(-0.16, Math.min(0.16, (this.gust.px - this.cx) * 0.04 * this.gust.active))
    this.facing += (turn - this.facing) * 0.035
    const { nx, ny, pos, prev, anchor } = this
    const n = nx * ny
    const t = this.time
    const air = (1 - flat) * (calm ? 0 : 1)
    const g = -0.85 * (1 - flat)
    const damp = 0.935 - flat * 0.07
    const dt2 = dt * dt
    const G = this.gust
    const r2 = Math.max(0.001, G.r * G.r)

    for (let k = 0; k < n; k++) {
      const i = k % nx
      const j = (k / nx) | 0
      const u = i / (nx - 1)
      const v = j / (ny - 1)
      const free = 1 - anchor[k]
      const o = k * 3
      const x = pos[o], y = pos[o + 1], z = pos[o + 2]
      // idle breeze, stronger towards the hem
      let ax = Math.sin(t * 1.3 + v * 4.0 + u * 2.0) * 0.10 * free * air
      let az = (Math.sin(t * 1.7 + u * 6.0 - v * 3.0) * 0.12 + Math.sin(t * 0.7 + u * 3.1) * 0.05) * free * air
      let ay = g * free
      // pointer gust
      const dx = x - G.px, dy = y - G.py
      const fall = Math.exp(-(dx * dx + dy * dy) / r2) * air * (0.12 + free * 0.88)
      if (fall > 0.002) {
        ax += G.x * fall * 5
        ay += G.y * fall * 2.5
        az += G.z * fall * 8 - G.active * fall * 1.8
      }
      const vx = (x - prev[o]) * damp
      const vy = (y - prev[o + 1]) * damp
      const vz = (z - prev[o + 2]) * damp
      prev[o] = x; prev[o + 1] = y; prev[o + 2] = z
      pos[o] = x + vx + ax * dt2
      pos[o + 1] = y + vy + ay * dt2
      pos[o + 2] = z + vz + az * dt2
    }

    // Preserve the shell's intrinsic metric. A flat-sheet metric buckles the dome.
    const rw = rect ? rect.w : this.W
    const rh = rect ? rect.h : this.H
    const key = `${flat}:${rw}:${rh}`
    if (key !== this.restKey) {
      this.constraints.forEach((c, i) => {
        this.restLengths[i] = c.rest * (1 - flat) + Math.hypot(c.du * rw, c.dv * rh) * flat
      })
      this.restKey = key
    }
    for (let it = 0; it < 4; it++) {
      for (let i = 0; i < this.constraints.length; i++) {
        const c = this.constraints[i]
        this.solve(c.a, c.b, this.restLengths[i], c.stiffness)
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
        const distance = ((tx - G.px) ** 2 + (ty - G.py) ** 2) / r2
        tz -= Math.exp(-distance * 1.5) * G.active * air * (0.025 + (1 - anchor[k]) * 0.10)
        if (rect && fe > 0) {
          const u = i / (nx - 1), v = j / (ny - 1)
          tx += (rect.x + u * rect.w - tx) * fe
          ty += (rect.y - (1 - v) * rect.h - ty) * fe
          tz += (0 - tz) * fe
        }
        // A weak shape-restoring spring prevents the free hem folding across the face.
        const a = Math.max(0.045, anchor[k], fe) * (fe > 0.995 ? 1 : 0.9)
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

  private solve(a: number, b: number, rest: number, stiffness: number) {
    const p = this.pos
    const oa = a * 3, ob = b * 3
    const dx = p[ob] - p[oa], dy = p[ob + 1] - p[oa + 1], dz = p[ob + 2] - p[oa + 2]
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6
    const f = ((d - rest) / d) * 0.5 * stiffness
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
