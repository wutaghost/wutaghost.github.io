import * as THREE from 'three'
import { Cloth, type Rect } from './cloth'
import { Face, expressions, type Expression } from './face'

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

const vert = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
void main() {
  vUv = uv;
  vN = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const frag = /* glsl */ `
uniform sampler2D uPaper;
uniform sampler2D uCrease;
uniform sampler2D uFace;
uniform vec3 uCard;
uniform vec3 uRed;
uniform float uFlat;
uniform float uCut;
uniform float uAspect;
uniform float uTime;
uniform vec2 uLook;
uniform float uSeed;
varying vec2 vUv;
varying vec3 vN;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
// ridged noise reads as soft creases in handled paper
float crumple(vec2 p) {
  float h = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) {
    h += a * (1.0 - abs(noise(p) * 2.0 - 1.0));
    p = p * 2.07 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return h;
}

void main() {
  float ghost = 1.0 - uFlat;
  vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y);

  // silhouette: rounded head + wavy hem, relaxing to a rectangle when flat
  float edge = 1.0;
  float r = 0.5 * uAspect * ghost;
  if (r > 0.001 && vUv.y > 1.0 - r) {
    vec2 c = vec2(clamp(p.x, -0.5 * uAspect + r, 0.5 * uAspect - r), 1.0 - r);
    float d = length(p - c) - r;
    if (d > 0.0) discard;
    edge = smoothstep(0.0, 0.006, -d);
  }
  float hem = (0.075 + 0.04 * sin(vUv.x * 18.85 + uTime * 1.2) + 0.018 * sin(vUv.x * 40.0 - uTime * 0.8)) * ghost;
  if (vUv.y < hem) discard;
  edge = min(edge, smoothstep(hem, hem + 0.006, vUv.y));

  // paper body: fibres, mottling and fine tooth
  vec3 tex = texture2D(uPaper, vUv).rgb;
  float tooth = noise(vUv * vec2(520.0 * uAspect, 520.0));
  vec3 warm = uCard * vec3(0.985, 0.972, 0.948);
  vec3 base = warm * tex * (0.99 + 0.018 * tooth);

  // bump from crumples + tooth, perturbing the cloth normal
  float h = crumple(p * 5.5 + uSeed) * 0.9 + tooth * 0.08;
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  n = normalize(n - vec3(dFdx(h), dFdy(h), 0.0) * 3.5 * ghost);

  // matte wrap lighting, no specular; light passing through thin paper
  vec3 L = normalize(vec3(-0.4, 0.6, 0.75));
  float wrap = dot(n, L) * 0.5 + 0.5;
  float diff = wrap * wrap;
  float trans = max(0.0, -dot(n, L)) * 0.18;
  vec3 lit = base * (0.74 + 0.34 * diff) + vec3(0.95, 0.82, 0.62) * trans * 0.35;
  lit *= 0.94 + 0.08 * h;
  if (!gl_FrontFacing) lit *= vec3(0.9, 0.87, 0.82);
  lit *= mix(0.78, 1.0, edge);

  vec3 col = mix(lit, uCard, uFlat);

  // face — follows the pointer; blink squashes it vertically
  vec2 fc = vec2(0.0, 0.66) + uLook * vec2(0.035, 0.024);
  vec2 fuv = (p - fc) / vec2(0.48, 0.24) + 0.5;
  if (fuv.x > 0.0 && fuv.x < 1.0 && fuv.y > 0.0 && fuv.y < 1.0) {
    vec4 f = texture2D(uFace, fuv);
    // ink soaks into the fibres a little
    float soak = 0.88 + 0.12 * tex.r;
    col = mix(col, f.rgb * soak, f.a * smoothstep(0.65, 1.0, ghost) * 0.94);
  }

  // cut lines sweep across the flattened sheet
  vec4 cr = texture2D(uCrease, vUv);
  float on = cr.a * step(cr.g, uCut * 1.02) * step(0.001, uCut);
  col = mix(col, uRed, on);

  gl_FragColor = vec4(col, 1.0);
}
`

function paperTexture() {
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, S, S)
  // low-frequency mottling
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 60 + Math.random() * 180
    const grd = g.createRadialGradient(x, y, 0, x, y, r)
    grd.addColorStop(0, `rgba(150,128,100,${0.025 + Math.random() * 0.03})`)
    grd.addColorStop(1, 'rgba(150,128,100,0)')
    g.fillStyle = grd
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // fibres
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * S, y = Math.random() * S
    const a = Math.random() * Math.PI
    const l = 3 + Math.random() * 16
    g.strokeStyle = Math.random() < 0.85 ? `rgba(110,92,70,${0.04 + Math.random() * 0.07})` : `rgba(255,255,255,${0.3 + Math.random() * 0.4})`
    g.lineWidth = 0.5 + Math.random() * 0.7
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
  // specks
  for (let i = 0; i < 260; i++) {
    g.fillStyle = `rgba(80,65,50,${0.08 + Math.random() * 0.18})`
    g.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 1.4, 1 + Math.random() * 1.4)
  }
  // a small vermilion seal near the hem
  g.fillStyle = 'rgba(229,72,43,0.86)'
  g.fillRect(780, 808, 54, 54)
  g.fillStyle = 'rgba(251,249,244,0.92)'
  g.font = '600 30px "Noto Serif SC", serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('遂', 807, 836)
  const t = new THREE.CanvasTexture(c)
  t.anisotropy = 8
  return t
}

function shadowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(60,45,30,0.55)')
  grd.addColorStop(1, 'rgba(60,45,30,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

export type SceneState = {
  flat: number
  cut: number
  /** grid rect in CSS px relative to the canvas, or null */
  rect: DOMRect | null
}

export class PaperScene {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
  cloth!: Cloth
  geo!: THREE.BufferGeometry
  mesh!: THREE.Mesh
  shadow: THREE.Mesh
  mat: THREE.ShaderMaterial
  creaseCanvas = document.createElement('canvas')
  creaseTex: THREE.CanvasTexture
  face = new Face()
  faceTex: THREE.CanvasTexture
  /** mood picked by clicking */
  expression = 0
  /** temporary mood (auto-sleep / startled awake) */
  override: { e: Expression; until: number } | null = null
  shown: Expression = 'calm'
  changedAt = performance.now()
  lastPointer = performance.now()
  onMood?: (e: Expression) => void
  /** blink state: performance.now() timestamps */
  blinkAt = performance.now() + 2500
  swapAt = 0
  open = 1
  w = 1
  h = 1
  visH = 1
  acc = 0
  last = performance.now()
  mouse = { x: 0, y: 0, wx: 0, wy: 0, has: false }
  quality: number

  constructor(public canvas: HTMLCanvasElement, opts: { lowPower: boolean }) {
    this.quality = opts.lowPower ? 0.6 : 1
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, opts.lowPower ? 1.5 : 2))
    this.renderer.setClearColor(0x000000, 0)
    this.camera.position.set(0, 0, 12)

    this.creaseTex = new THREE.CanvasTexture(this.creaseCanvas)
    this.faceTex = new THREE.CanvasTexture(this.face.canvas)
    this.faceTex.anisotropy = 4

    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      side: THREE.DoubleSide,
      uniforms: {
        uPaper: { value: paperTexture() },
        uCrease: { value: this.creaseTex },
        uFace: { value: this.faceTex },
        uCard: { value: hex('#FBF9F4') },
        uRed: { value: hex('#E5482B') },
        uFlat: { value: 0 },
        uCut: { value: 0 },
        uAspect: { value: 0.78 },
        uTime: { value: 0 },
        uLook: { value: new THREE.Vector2() },
        uSeed: { value: Math.random() * 50 },
      },
    })

    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }),
    )
    this.shadow.position.z = -2
    this.scene.add(this.shadow)
    this.resize()
  }

  /** world units per CSS pixel on the z=0 plane */
  get unit() {
    return this.visH / this.h
  }

  toWorld(px: number, py: number) {
    return { x: (px - this.w / 2) * this.unit, y: -(py - this.h / 2) * this.unit }
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.w = Math.max(1, r.width)
    this.h = Math.max(1, r.height)
    this.renderer.setSize(this.w, this.h, false)
    this.camera.aspect = this.w / this.h
    this.camera.updateProjectionMatrix()
    this.visH = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z

    const portrait = this.w < this.h
    const H = this.visH * (portrait ? 0.4 : 0.47)
    const W = H * 0.78
    const nx = Math.round(22 * this.quality) + 4
    const ny = Math.round(28 * this.quality) + 4
    this.buildCloth(nx, ny, W, H)
    this.cloth.cy = this.visH * (portrait ? 0.08 : 0.06)
    this.cloth.reset()
    this.mat.uniforms.uAspect.value = W / H
    this.shadow.scale.set(W * 1.5, H * 0.9, 1)
  }

  private buildCloth(nx: number, ny: number, W: number, H: number) {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.geo.dispose()
    }
    this.cloth = new Cloth(nx, ny, W, H)
    const g = new THREE.BufferGeometry()
    const uv = new Float32Array(nx * ny * 2)
    const idx: number[] = []
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const k = j * nx + i
        uv[k * 2] = i / (nx - 1)
        uv[k * 2 + 1] = j / (ny - 1)
        if (i < nx - 1 && j < ny - 1) idx.push(k, k + 1, k + nx, k + 1, k + nx + 1, k + nx)
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(this.cloth.pos, 3))
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    g.setIndex(idx)
    this.geo = g
    this.mesh = new THREE.Mesh(g, this.mat)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)
  }

  /** Draw dashed cut lines along the internal edges of the given cells (uv fractions). */
  setCreases(cells: { x: number; y: number; w: number; h: number }[], aspect: number) {
    const W = 1600
    const H = Math.round(W / Math.max(0.3, aspect))
    const c = this.creaseCanvas
    c.width = W
    c.height = H
    const g = c.getContext('2d')!
    g.clearRect(0, 0, W, H)
    const grd = g.createLinearGradient(0, 0, W, H)
    grd.addColorStop(0, 'rgb(255,0,0)')
    grd.addColorStop(1, 'rgb(255,255,0)')
    g.strokeStyle = grd
    g.lineWidth = 2.4
    g.setLineDash([12, 9])
    const e = 0.002
    for (const r of cells) {
      const x0 = r.x * W, y0 = r.y * H, x1 = (r.x + r.w) * W, y1 = (r.y + r.h) * H
      g.beginPath()
      if (r.x > e) { g.moveTo(x0, y0); g.lineTo(x0, y1) }
      if (r.x + r.w < 1 - e) { g.moveTo(x1, y0); g.lineTo(x1, y1) }
      if (r.y > e) { g.moveTo(x0, y0); g.lineTo(x1, y0) }
      if (r.y + r.h < 1 - e) { g.moveTo(x0, y1); g.lineTo(x1, y1) }
      g.stroke()
    }
    this.creaseTex.needsUpdate = true
  }

  pointer(px: number, py: number) {
    const w = this.toWorld(px, py)
    const G = this.cloth.gust
    if (this.mouse.has) {
      const k = 1 / 60
      const cap = 4
      const vx = Math.max(-cap, Math.min(cap, (w.x - this.mouse.wx) / k))
      const vy = Math.max(-cap, Math.min(cap, (w.y - this.mouse.wy) / k))
      G.x += (vx - G.x) * 0.3
      G.y += (vy - G.y) * 0.3
      G.z += (-Math.hypot(G.x, G.y) * 0.35 - G.z) * 0.3
    }
    G.px = w.x
    G.py = w.y
    G.r = this.cloth.W * 0.5
    const now = performance.now()
    // woken up from an idle nap → startled for a moment
    if (this.override?.e === 'sleepy' && this.mouse.has) this.override = { e: 'surprised', until: now + 1300 }
    this.lastPointer = now
    this.mouse = { x: px, y: py, wx: w.x, wy: w.y, has: true }
  }

  /** Click on the sheet → blink into the next expression. Returns true on hit. */
  click(px: number, py: number) {
    const w = this.toWorld(px, py)
    const b = this.cloth.bounds()
    if (w.x < b.minX || w.x > b.maxX || w.y < b.minY || w.y > b.maxY) return false
    this.cloth.poke(w.x, w.y, 0.018)
    const now = performance.now()
    this.override = null
    this.blinkAt = now
    this.swapAt = now + 90
    return true
  }

  private currentMood(now: number): Expression {
    if (this.override && now > this.override.until) this.override = null
    if (!this.override && now - this.lastPointer > 9000) this.override = { e: 'sleepy', until: Infinity }
    return this.override?.e ?? expressions[this.expression]
  }

  get mood(): Expression {
    return expressions[this.expression]
  }

  private updateBlink(now: number) {
    if (this.swapAt && now >= this.swapAt) {
      this.swapAt = 0
      this.expression = (this.expression + 1) % expressions.length
    }
    // a blink: close over 90 ms, reopen over 140 ms
    const t = now - this.blinkAt
    let open = 1
    if (t >= 0 && t < 90) open = 1 - t / 90
    else if (t >= 90 && t < 230) open = (t - 90) / 140
    else if (t >= 230 && !this.swapAt) this.blinkAt = now + 2600 + Math.random() * 3200
    this.open = open
  }

  frame(state: SceneState, calm: boolean) {
    const now = performance.now()
    const dt = Math.min(0.1, (now - this.last) / 1000)
    this.last = now
    const cloth = this.cloth

    let rect: Rect | null = null
    if (state.rect && state.flat > 0) {
      const tl = this.toWorld(state.rect.left, state.rect.top)
      rect = { x: tl.x, y: tl.y, w: state.rect.width * this.unit, h: state.rect.height * this.unit }
    }

    const step = 1 / 60
    this.acc += dt
    let steps = 0
    while (this.acc >= step && steps < 4) {
      cloth.step(step, state.flat, rect, calm)
      this.acc -= step
      steps++
    }
    if (steps === 4) this.acc = 0
    const G = cloth.gust
    G.x *= 0.88; G.y *= 0.88; G.z *= 0.88

    this.geo.attributes.position.needsUpdate = true
    this.geo.computeVertexNormals()
    this.updateBlink(now)

    const u = this.mat.uniforms
    u.uFlat.value = state.flat
    u.uCut.value = state.cut
    u.uTime.value = cloth.time
    const b = cloth.bounds()
    const hx = (b.minX + b.maxX) / 2, hy = b.maxY - cloth.H * 0.3
    const look = u.uLook.value as THREE.Vector2
    look.x += (Math.max(-1, Math.min(1, (this.mouse.wx - hx) / 2.5)) - look.x) * 0.12
    look.y += (Math.max(-1, Math.min(1, (this.mouse.wy - hy) / 2.5)) - look.y) * 0.12

    const mood = this.currentMood(now)
    if (mood !== this.shown) {
      this.shown = mood
      this.changedAt = now
      this.onMood?.(mood)
    }
    if (state.flat < 0.999) {
      this.face.draw(mood, { t: now / 1000, k: (now - this.changedAt) / 1000, look, open: this.open })
      this.faceTex.needsUpdate = true
    }

    this.shadow.position.set(hx + 0.35, (b.minY + b.maxY) / 2 - 0.45, -2)
    ;(this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - state.flat)

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.geo.dispose()
    this.mat.dispose()
    this.renderer.dispose()
  }
}
