import assert from 'node:assert/strict'
import test from 'node:test'
import { Cloth } from '../src/three/cloth.ts'
import { PaperSurface } from '../src/three/PaperSurface.ts'

test('fine surface preserves the sculpt and lands exactly on the card plane', () => {
  const cloth = new Cloth(24, 30, 2.4, 3.1)
  const surface = new PaperSurface(cloth)
  const target = new Float32Array(3)
  for (let k = 0; k < surface.positions.length / 3; k++) {
    cloth.floatTarget(surface.uv[k * 2] * 23, surface.uv[k * 2 + 1] * 29, target)
    for (let axis = 0; axis < 3; axis++) assert.ok(Math.abs(surface.positions[k * 3 + axis] - target[axis]) < 1e-5)
  }
  const rect = { x: -4, y: 2.5, w: 8, h: 5 }
  for (let f = 0; f <= 90; f++) cloth.step(1 / 60, f / 90, rect, false)
  surface.update(cloth.pos, 1)
  for (let k = 0; k < surface.positions.length / 3; k++) {
    assert.ok(Math.abs(surface.positions[k * 3] - (rect.x + surface.uv[k * 2] * rect.w)) < 1e-5)
    assert.ok(Math.abs(surface.positions[k * 3 + 1] - (rect.y - (1 - surface.uv[k * 2 + 1]) * rect.h)) < 1e-5)
    assert.equal(surface.positions[k * 3 + 2], 0)
  }
  // Fast reverse scrolling must not leave particles at the spread's dimensions.
  for (let f = 90; f >= 0; f--) cloth.step(1 / 60, f / 90, rect, false)
  for (let f = 0; f < 180; f++) cloth.step(1 / 60, 0, null, false)
  surface.update(cloth.pos, 0)
  assert.ok(surface.positions.every(Number.isFinite))
  const bounds = cloth.bounds()
  assert.ok(bounds.maxX - bounds.minX < cloth.W * 1.15)
  assert.ok(bounds.maxY - bounds.minY < cloth.H * 1.15)
})
