// Run with Node.js 22.18+ (native TypeScript stripping): node --test tests/cloth.test.mjs
import assert from 'node:assert/strict'
import test from 'node:test'
import { Cloth } from '../src/three/cloth.ts'

// Exercise both the full and low-power mesh under sustained, reversing input.
for (const [nx, ny] of [[26, 32], [17, 21]]) {
  test(`wind preserves a readable face and bounded cloth (${nx} × ${ny})`, () => {
    const cloth = new Cloth(nx, ny, 2.4, 3.1)
    const target = new Float32Array(3)
    let maxHeadDrift = 0
    let maxDepth = 0
    for (let frame = 0; frame < 1200; frame++) {
      const sign = Math.sin(frame * 0.13)
      Object.assign(cloth.gust, { x: sign * 2.2, y: -sign * 2.2, z: -0.56, px: sign, py: 0, r: 1.2 })
      if (frame % 90 === 0) cloth.poke(0, 0, 0.008)
      cloth.step(1 / 60, 0, null, false)
      assert.ok(cloth.pos.every(Number.isFinite))
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          const k = (j * nx + i) * 3
          maxDepth = Math.max(maxDepth, Math.abs(cloth.pos[k + 2]))
          if (j / (ny - 1) > 0.6) {
            cloth.floatTarget(i, j, target)
            maxHeadDrift = Math.max(maxHeadDrift, Math.hypot(...target.map((v, axis) => v - cloth.pos[k + axis])))
          }
        }
      }
    }
    assert.ok(maxHeadDrift < 0.25, `face drift: ${maxHeadDrift}`)
    assert.ok(maxDepth < 1, `depth: ${maxDepth}`)

    // After the scroll morph, every point must land on the DOM card plane.
    const rect = { x: -4, y: 2.5, w: 8, h: 5 }
    for (let f = 0; f <= 120; f++) cloth.step(1 / 60, f / 120, rect, false)
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const k = (j * nx + i) * 3
      assert.ok(Math.abs(cloth.pos[k] - (rect.x + i / (nx - 1) * rect.w)) < 1e-5)
      assert.ok(Math.abs(cloth.pos[k + 1] - (rect.y - (1 - j / (ny - 1)) * rect.h)) < 1e-5)
      assert.equal(cloth.pos[k + 2], 0)
    }
  })
}
