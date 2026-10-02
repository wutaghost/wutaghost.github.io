/**
 * The ghost's face — redrawn every frame on a 2D canvas that the paper shader
 * samples. Each mood has its own idle motion; switching moods springs in.
 */
import type { L10n } from '../data/profile'

export const expressions = ['calm', 'happy', 'surprised', 'love', 'wink', 'shy', 'sleepy', 'dizzy'] as const
export type Expression = (typeof expressions)[number]

export const moodLabel: Record<Expression, L10n> = {
  calm: { zh: '平静', en: 'Calm' },
  happy: { zh: '开心', en: 'Happy' },
  surprised: { zh: '惊讶', en: 'Surprised' },
  love: { zh: '心动', en: 'In love' },
  wink: { zh: '眨眼', en: 'Wink' },
  shy: { zh: '害羞', en: 'Shy' },
  sleepy: { zh: '犯困', en: 'Sleepy' },
  dizzy: { zh: '晕了', en: 'Dizzy' },
}

const INK = '#302e29'
const RED = '#b94b35'
const PAPER = '#FBF9F4'
export const FACE_W = 512
export const FACE_H = 256
const CX = 256
const EY = 118
const EX = 74 // half distance between eyes

const TAU = Math.PI * 2
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))

export type FaceInput = {
  t: number
  /** seconds since the mood changed */
  k: number
  /** -1..1 where the pointer is relative to the head */
  look: { x: number; y: number }
  /** 0 closed … 1 open */
  open: number
}

export class Face {
  canvas = document.createElement('canvas')
  private g: CanvasRenderingContext2D

  constructor() {
    this.canvas.width = FACE_W / 2
    this.canvas.height = FACE_H / 2
    this.g = this.canvas.getContext('2d')!
  }

  draw(e: Expression, f: FaceInput) {
    const g = this.g
    g.setTransform(0.5, 0, 0, 0.5, 0, 0)
    g.clearRect(0, 0, FACE_W, FACE_H)

    // spring "pop" when the mood changes + slow breathing
    const pop = 1 - 0.10 * Math.exp(-f.k * 7) * Math.cos(f.k * 13)
    const breathe = Math.sin(f.t * 1.4) * 0.9
    const wobble = e === 'dizzy' ? Math.sin(f.t * 3.2) * 0.07 : 0
    g.translate(CX, FACE_H / 2 + breathe)
    g.rotate(wobble)
    g.scale(1.08 * pop, 1.08 * (2 - pop))
    g.translate(-CX, -FACE_H / 2)
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.fillStyle = INK
    g.strokeStyle = INK

    let lx = f.look.x, ly = f.look.y
    if (e === 'shy') (lx = 0.75), (ly = -0.55)
    const ox = lx * 7, oy = -ly * 5

    this[e](f, ox, oy)
  }

  /* ---------- primitives ---------- */

  private ellipse(x: number, y: number, rx: number, ry: number, rot = 0) {
    this.g.beginPath()
    this.g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU)
  }

  /** Printed ink eye with a single small paper-colored glint */
  private eye(x: number, y: number, rx: number, ry: number, open: number, ox: number, oy: number) {
    const g = this.g
    const h = ry * clamp(open, 0.06)
    if (open < 0.18) {
      g.lineWidth = 8
      g.beginPath()
      g.moveTo(x - rx, y + 2)
      g.quadraticCurveTo(x, y + 10, x + rx, y + 2)
      g.stroke()
      return
    }
    g.fillStyle = INK
    this.ellipse(x, y, rx, h)
    g.fill()
    g.fillStyle = PAPER
    this.ellipse(x - rx * 0.32 - ox * 0.25, y - h * 0.38 - oy * 0.25, rx * 0.16, rx * 0.16 * open)
    g.fill()
    g.fillStyle = INK
  }

  private brow(x: number, y: number, angle: number, side: 1 | -1, len = 30) {
    const g = this.g
    g.save()
    g.translate(x, y)
    g.rotate(angle * side)
    g.lineWidth = 5.5
    g.beginPath()
    g.moveTo(-len / 2, 0)
    g.quadraticCurveTo(0, -5, len / 2, 0)
    g.stroke()
    g.restore()
  }

  private brows(ox: number, oy: number, lift: number, angle: number, len?: number) {
    this.brow(CX - EX + ox * 0.6, EY - 50 - lift + oy * 0.6, -angle, 1, len)
    this.brow(CX + EX + ox * 0.6, EY - 50 - lift + oy * 0.6, -angle, -1, len)
  }

  private blush(alpha: number, hatch = false) {
    const g = this.g
    g.fillStyle = `rgba(185,75,53,${alpha * 0.45})`
    for (const s of [-1, 1]) {
      this.ellipse(CX + s * (EX + 40), EY + 40, 24, 10)
      g.fill()
      if (hatch) {
        g.strokeStyle = RED
        g.lineWidth = 3
        for (let i = -1; i <= 1; i++) {
          const x = CX + s * (EX + 40) + i * 13
          g.beginPath()
          g.moveTo(x - 4, EY + 54)
          g.lineTo(x + 5, EY + 38)
          g.stroke()
        }
        g.strokeStyle = INK
      }
    }
    g.fillStyle = INK
  }

  private heart(x: number, y: number, s: number) {
    const g = this.g
    g.beginPath()
    g.moveTo(x, y + s * 0.9)
    g.bezierCurveTo(x - s * 1.5, y - s * 0.1, x - s * 0.75, y - s * 1.25, x, y - s * 0.45)
    g.bezierCurveTo(x + s * 0.75, y - s * 1.25, x + s * 1.5, y - s * 0.1, x, y + s * 0.9)
    g.fill()
  }

  private star(x: number, y: number, r: number) {
    const g = this.g
    g.beginPath()
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU - Math.PI / 2
      const rr = i % 2 ? r * 0.32 : r
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    }
    g.closePath()
    g.fill()
  }

  private smile(x: number, y: number, w: number, depth: number, lw = 6.5) {
    const g = this.g
    g.lineWidth = lw
    g.beginPath()
    g.moveTo(x - w, y)
    g.quadraticCurveTo(x, y + depth, x + w, y)
    g.stroke()
  }

  /* ---------- moods ---------- */

  private calm(f: FaceInput, ox: number, oy: number) {
    this.eye(CX - EX + ox, EY + oy, 19, 27, f.open, ox, oy)
    this.eye(CX + EX + ox, EY + oy, 19, 27, f.open, ox, oy)
    this.smile(CX + ox * 0.7, EY + 53 + oy * 0.6, 12, 7 + Math.sin(f.t * 1.4) * 0.7)
    this.blush(0.07)
  }

  private happy(f: FaceInput, ox: number, oy: number) {
    const g = this.g
    const hop = -Math.abs(Math.sin(f.t * 5.2)) * 6
    this.brows(ox, oy + hop, 9, -0.1)
    g.lineWidth = 9
    for (const s of [-1, 1]) {
      const x = CX + s * EX + ox, y = EY + oy + hop
      g.beginPath()
      g.arc(x, y + 12, 25, Math.PI * 1.15, Math.PI * 1.85)
      g.stroke()
    }
    // open laughing mouth with a tongue
    const mx = CX + ox * 0.7, my = EY + 50 + oy * 0.6 + hop * 0.5
    const open = 22 + Math.sin(f.t * 10.4) * 4
    g.beginPath()
    g.moveTo(mx - 30, my)
    g.quadraticCurveTo(mx, my + open * 2, mx + 30, my)
    g.closePath()
    g.fill()
    g.save()
    g.clip()
    g.fillStyle = RED
    this.ellipse(mx, my + open * 0.95, 17, 11)
    g.fill()
    g.restore()
    this.blush(0.3 + Math.sin(f.t * 3) * 0.08)
  }

  private surprised(f: FaceInput, ox: number, oy: number) {
    const g = this.g
    const jump = Math.exp(-f.k * 4) * 12
    this.brows(ox, oy, 16 + jump, 0.18, 34)
    const r = 30 + Math.exp(-f.k * 5) * 6
    this.eye(CX - EX + ox, EY + oy, r * 0.88, r, Math.max(f.open, 0.2), ox, oy)
    this.eye(CX + EX + ox, EY + oy, r * 0.88, r, Math.max(f.open, 0.2), ox, oy)
    // little gasping "o"
    const s = 1 + Math.sin(f.t * 4) * 0.12
    this.ellipse(CX + ox * 0.7, EY + 72 + oy * 0.6, 12 * s, 16 * s)
    g.fill()
    // exclamation pops out
    const a = clamp(f.k * 4) * clamp(3 - f.k)
    if (a > 0) {
      g.save()
      g.globalAlpha = a
      g.fillStyle = RED
      g.translate(CX + EX + 92, 46 - clamp(f.k * 3) * 10)
      g.rotate(0.2)
      g.fillRect(-5, -26, 10, 32)
      this.ellipse(0, 18, 6, 6)
      g.fill()
      g.restore()
    }
  }

  private love(f: FaceInput, ox: number, oy: number) {
    const g = this.g
    const beat = 1 + 0.16 * Math.pow(Math.max(0, Math.sin(f.t * 6.5)), 6)
    g.fillStyle = RED
    this.heart(CX - EX + ox, EY + oy, 30 * beat)
    this.heart(CX + EX + ox, EY + oy, 30 * beat)
    // tiny hearts floating up
    for (let i = 0; i < 3; i++) {
      const ph = (f.t * 0.45 + i / 3) % 1
      g.globalAlpha = Math.sin(ph * Math.PI) * 0.85
      this.heart(CX + (i - 1) * 150 + Math.sin(ph * 9 + i) * 10, 96 - ph * 90, 7 + ph * 5)
    }
    g.globalAlpha = 1
    g.fillStyle = INK
    // cat mouth ω
    g.lineWidth = 6
    const mx = CX + ox * 0.7, my = EY + 60 + oy * 0.6
    g.beginPath()
    g.arc(mx - 9, my, 9, 0, Math.PI)
    g.arc(mx + 9, my, 9, 0, Math.PI)
    g.stroke()
    this.blush(0.32)
  }

  private wink(f: FaceInput, ox: number, oy: number) {
    const g = this.g
    this.brow(CX - EX + ox * 0.6, EY - 54 + oy * 0.6, 0.12, 1)
    this.brow(CX + EX + ox * 0.6, EY - 42 + oy * 0.6, 0.24, -1)
    this.eye(CX - EX + ox, EY + oy, 19, 27, f.open, ox, oy)
    // closed eye >
    g.lineWidth = 9
    const x = CX + EX + ox, y = EY + oy
    g.beginPath()
    g.moveTo(x - 22, y - 14)
    g.lineTo(x + 18, y)
    g.lineTo(x - 22, y + 14)
    g.stroke()
    // smirk with a tongue tip
    const mx = CX + ox * 0.7 + 6, my = EY + 60 + oy * 0.6
    g.lineWidth = 5.5
    g.beginPath()
    g.moveTo(mx - 22, my + 2)
    g.quadraticCurveTo(mx, my + 14, mx + 24, my - 6)
    g.stroke()
    g.fillStyle = RED
    this.ellipse(mx + 4, my + 13, 8, 10)
    g.fill()
    // sparkle
    const tw = 0.6 + 0.4 * Math.sin(f.t * 7)
    this.star(CX + EX + 70, EY - 52, 14 * tw)
    g.fillStyle = INK
    this.blush(0.24)
  }

  private shy(f: FaceInput, ox: number, oy: number) {
    const g = this.g
    this.brows(ox * 0.5, oy * 0.5, -2, -0.22)
    const peek = 0.55 + 0.1 * Math.sin(f.t * 1.4)
    this.eye(CX - EX + ox, EY + oy + 6, 19, 26, Math.min(f.open, peek), ox, oy)
    this.eye(CX + EX + ox, EY + oy + 6, 19, 26, Math.min(f.open, peek), ox, oy)
    // wobbly little mouth
    g.lineWidth = 5.5
    g.beginPath()
    const mx = CX + ox * 0.4, my = EY + 66
    for (let i = 0; i <= 16; i++) {
      const x = mx - 14 + i * 1.75
      const y = my + Math.sin(i * 0.9 + f.t * 6) * 2.4
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.stroke()
    this.blush(0.42 + Math.sin(f.t * 2.4) * 0.08, true)
    // sweat drop
    g.strokeStyle = INK
    g.fillStyle = PAPER
    g.lineWidth = 4
    const dy = Math.sin(f.t * 2) * 3
    g.beginPath()
    g.moveTo(CX - EX - 66, EY - 70 + dy)
    g.quadraticCurveTo(CX - EX - 80, EY - 46 + dy, CX - EX - 66, EY - 40 + dy)
    g.quadraticCurveTo(CX - EX - 52, EY - 46 + dy, CX - EX - 66, EY - 70 + dy)
    g.fill()
    g.stroke()
    g.fillStyle = INK
  }

  private sleepy(f: FaceInput, ox: number, oy: number) {
    const g = this.g
    const lid = 0.22 + 0.16 * Math.max(0, Math.sin(f.t * 0.9))
    this.brows(ox * 0.3, oy * 0.3, -6, -0.05)
    for (const s of [-1, 1]) {
      const x = CX + s * EX + ox * 0.3, y = EY + 8
      // heavy lid over a half-open eye
      g.save()
      g.beginPath()
      g.rect(x - 30, y - 33 * lid, 60, 60)
      g.clip()
      this.ellipse(x, y, 23, 30)
      g.fill()
      g.restore()
      g.lineWidth = 7
      g.beginPath()
      g.moveTo(x - 27, y - 33 * lid)
      g.lineTo(x + 27, y - 33 * lid)
      g.stroke()
    }
    // snore bubble
    const ph = (f.t * 0.35) % 1
    const mx = CX + 6, my = EY + 66
    this.ellipse(mx, my, 9, 7)
    g.fill()
    if (ph < 0.9) {
      g.strokeStyle = INK
      g.lineWidth = 3
      const r = 4 + ph * 24
      this.ellipse(mx + 16 + r * 0.8, my - 2, r, r * 0.92)
      g.stroke()
    }
    // floating z's
    g.fillStyle = RED
    for (let i = 0; i < 3; i++) {
      const p = (f.t * 0.3 + i / 3) % 1
      g.globalAlpha = Math.sin(p * Math.PI)
      g.font = `italic ${22 + p * 26}px "Instrument Serif", serif`
      g.fillText('z', CX + EX + 50 + p * 60, 92 - p * 84)
    }
    g.globalAlpha = 1
    g.fillStyle = INK
  }

  private dizzy(f: FaceInput, ox: number, oy: number) {
    const g = this.g
    g.lineWidth = 6
    for (const s of [-1, 1]) {
      const x = CX + s * EX + ox * 0.3, y = EY + oy * 0.3
      g.beginPath()
      for (let i = 0; i <= 60; i++) {
        const a = (i / 60) * TAU * 2.4
        const r = 2 + (i / 60) * 26
        const rot = f.t * 5 * s
        const px = x + Math.cos(a + rot) * r, py = y + Math.sin(a + rot) * r
        if (i) g.lineTo(px, py)
        else g.moveTo(px, py)
      }
      g.stroke()
    }
    // wavy mouth
    g.lineWidth = 6
    g.beginPath()
    for (let i = 0; i <= 24; i++) {
      const x = CX - 26 + i * 2.2
      const y = EY + 70 + Math.sin(i * 0.75 + f.t * 8) * 5
      if (i) g.lineTo(x, y)
      else g.moveTo(x, y)
    }
    g.stroke()
    // orbiting stars
    g.fillStyle = RED
    for (let i = 0; i < 3; i++) {
      const a = f.t * 2.4 + (i / 3) * TAU
      const depth = (Math.sin(a) + 1) / 2
      this.star(CX + Math.cos(a) * 130, 40 + Math.sin(a) * 14, 7 + depth * 6)
    }
    g.fillStyle = INK
  }
}
