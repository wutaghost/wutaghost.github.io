import type { Cloth } from './cloth'

/** Fine render mesh driven by a coarse simulation. Rest-shape residuals retain the
 * sculpted crown and folds instead of merely subdividing a faceted low-poly mesh. */
export class PaperSurface {
  positions: Float32Array
  uv: Float32Array
  indices: number[] = []
  edgeIndices: number[] = []
  private nodes: Uint16Array
  private weights: Float32Array
  private residual: Float32Array

  constructor(cloth: Cloth, subdivisions = 2) {
    const nx = (cloth.nx - 1) * subdivisions + 1
    const ny = (cloth.ny - 1) * subdivisions + 1
    const count = nx * ny
    this.positions = new Float32Array(count * 3)
    this.uv = new Float32Array(count * 2)
    this.nodes = new Uint16Array(count * 4)
    this.weights = new Float32Array(count * 4)
    this.residual = new Float32Array(count * 3)
    const target = new Float32Array(3)
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = j * nx + i
      const x = i / subdivisions, y = j / subdivisions
      const ix = Math.min(cloth.nx - 2, Math.floor(x)), iy = Math.min(cloth.ny - 2, Math.floor(y))
      const u = x - ix, v = y - iy, a = iy * cloth.nx + ix
      this.nodes.set([a, a + 1, a + cloth.nx, a + cloth.nx + 1], k * 4)
      this.weights.set([(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v], k * 4)
      this.uv.set([i / (nx - 1), j / (ny - 1)], k * 2)
      cloth.floatTarget(x, y, target)
      for (let axis = 0; axis < 3; axis++) {
        let interpolated = 0
        for (let n = 0; n < 4; n++) interpolated += cloth.pos[this.nodes[k * 4 + n] * 3 + axis] * this.weights[k * 4 + n]
        this.residual[k * 3 + axis] = target[axis] - interpolated
      }
      if (i < nx - 1 && j < ny - 1) this.indices.push(k, k + 1, k + nx, k + 1, k + nx + 1, k + nx)
    }
    for (let i = 0; i < nx; i++) this.edgeIndices.push(i)
    for (let j = 1; j < ny; j++) this.edgeIndices.push(j * nx + nx - 1)
    for (let i = nx - 2; i >= 0; i--) this.edgeIndices.push((ny - 1) * nx + i)
    for (let j = ny - 2; j > 0; j--) this.edgeIndices.push(j * nx)
    this.update(cloth.pos, 0)
  }

  update(particles: Float32Array, flat: number) {
    const residualWeight = 1 - flat * flat * (3 - 2 * flat)
    for (let k = 0; k < this.positions.length / 3; k++) {
      for (let axis = 0; axis < 3; axis++) {
        let value = this.residual[k * 3 + axis] * residualWeight
        for (let n = 0; n < 4; n++) value += particles[this.nodes[k * 4 + n] * 3 + axis] * this.weights[k * 4 + n]
        this.positions[k * 3 + axis] = value
      }
    }
  }
}
