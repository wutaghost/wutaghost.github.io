import * as THREE from 'three'
import { Cloth, type Rect } from './cloth'
import { PaperSurface } from './PaperSurface'
import { Face, expressions, type Expression } from './face'

const hex = (h: string) => {
  const n = parseInt(h.slice(1), 16)
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

const vert = /* glsl */ `
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
void main() {
  vUv = uv;
  vN = normalize(normalMatrix * normal);
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vView = -view.xyz;
  gl_Position = projectionMatrix * view;
}
`

const frag = /* glsl */ `
uniform sampler2D uPaper;
uniform sampler2D uFace;
uniform vec3 uCard;
uniform float uFlat;
uniform float uOpacity;
uniform sampler2D uCrease;
uniform float uCut;
uniform vec3 uRed;
uniform float uAspect;
uniform vec2 uLook;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vView;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  float ghost = 1.0 - uFlat;
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 view = normalize(vView);
  vec3 key = normalize(vec3(-0.95, 1.2, 1.45));
  vec3 back = normalize(vec3(1.0, 0.6, -0.5));
  vec3 tex = texture2D(uPaper, vUv).rgb;

  // Broad diffuse illumination and grazing fibre sheen, without a plastic hotspot.
  float diffuse = max(0.0, dot(n, key));
  float grazing = pow(1.0 - abs(dot(n, view)), 2.4);
  float transmission = pow(max(0.0, dot(-n, back)), 2.0);
  float tooth = hash(floor(vUv * vec2(1400.0 * uAspect, 1400.0)));
  vec3 base = uCard * tex * (0.997 + 0.006 * tooth);
  vec3 lit = base * (0.68 + 0.33 * diffuse);
  lit += vec3(1.0, 0.93, 0.80) * transmission * 0.075;
  lit += vec3(1.0, 0.97, 0.89) * grazing * 0.095;
  // Fibre detail becomes visible only where light rakes over the surface.
  lit += (tex - vec3(0.986)) * grazing * 0.22;
  if (!gl_FrontFacing) lit *= vec3(0.97, 0.955, 0.93);
  vec3 col = mix(lit, uCard, uFlat);

  vec2 p = vec2((vUv.x - 0.5) * uAspect, vUv.y);
  vec2 fc = vec2(-0.005, 0.64) + uLook * vec2(0.012, 0.008);
  vec2 fuv = (p - fc) / vec2(0.57, 0.28) + 0.5;
  if (fuv.x > 0.0 && fuv.x < 1.0 && fuv.y > 0.0 && fuv.y < 1.0) {
    vec4 face = texture2D(uFace, fuv);
    col = mix(col, face.rgb * (0.9 + 0.1 * tex.r), face.a * smoothstep(0.55, 0.95, ghost) * 0.93);
  }
  vec4 cr = texture2D(uCrease, vUv);
  float on = cr.a * step(cr.g, uCut * 1.02) * step(0.001, uCut);
  col = mix(col, uRed, on);
  gl_FragColor = vec4(col, uOpacity);
}
`

function paperTexture() {
  let seed = 731
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const S = 1024
  const c = document.createElement('canvas')
  c.width = c.height = S
  const g = c.getContext('2d')!
  g.fillStyle = '#fff'
  g.fillRect(0, 0, S, S)
  // low-frequency mottling
  for (let i = 0; i < 24; i++) {
    const x = random() * S, y = random() * S, r = 60 + random() * 180
    const grd = g.createRadialGradient(x, y, 0, x, y, r)
    grd.addColorStop(0, `rgba(150,128,100,${0.007 + random() * 0.01})`)
    grd.addColorStop(1, 'rgba(150,128,100,0)')
    g.fillStyle = grd
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // fibres
  for (let i = 0; i < 2400; i++) {
    const x = random() * S, y = random() * S
    const a = random() * Math.PI
    const l = 3 + random() * 16
    g.strokeStyle = random() < 0.85 ? `rgba(110,92,70,${0.015 + random() * 0.025})` : `rgba(255,255,255,${0.15 + random() * 0.15})`
    g.lineWidth = 0.5 + random() * 0.7
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + Math.cos(a + 0.6) * l * 0.5, y + Math.sin(a + 0.6) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l)
    g.stroke()
  }
  // specks
  for (let i = 0; i < 65; i++) {
    g.fillStyle = `rgba(80,65,50,${0.025 + random() * 0.04})`
    g.fillRect(random() * S, random() * S, 1 + random() * 1.4, 1 + random() * 1.4)
  }
  // a small vermilion seal near the hem
  g.fillStyle = 'rgba(185,75,53,0.78)'
  g.fillRect(766, 786, 43, 49)
  g.fillStyle = 'rgba(251,249,244,0.92)'
  g.font = '400 25px "Noto Serif SC", serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('遂', 787.5, 811)
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
  surface!: PaperSurface
  faceDrawAt = 0
  geo!: THREE.BufferGeometry
  mesh!: THREE.Mesh
  shadow: THREE.Mesh
  mat: THREE.ShaderMaterial
  rim!: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>
  edgeIndices: number[] = []
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
  pointerAt = 0
  pointerInside = false

  constructor(public canvas: HTMLCanvasElement, opts: { lowPower: boolean }) {
    this.quality = opts.lowPower ? 0.75 : 1
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, opts.lowPower ? 1.25 : 1.5))
    this.renderer.setClearColor(0x000000, 0)
    this.camera.position.set(0, 0, 12)

    this.creaseTex = new THREE.CanvasTexture(this.creaseCanvas)
    this.faceTex = new THREE.CanvasTexture(this.face.canvas)
    this.faceTex.generateMipmaps = false
    this.faceTex.minFilter = THREE.LinearFilter
    this.faceTex.magFilter = THREE.LinearFilter

    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      side: THREE.DoubleSide,
      transparent: true,
      uniforms: {
        uPaper: { value: paperTexture() },
        uFace: { value: this.faceTex },
        uCard: { value: hex(getComputedStyle(canvas).getPropertyValue('--card').trim() || '#fcfaf5') },
        uFlat: { value: 0 },
        uOpacity: { value: 1 },
        uCrease: { value: this.creaseTex },
        uCut: { value: 0 },
        uRed: { value: hex('#E5482B') },
        uAspect: { value: 0.78 },

        uLook: { value: new THREE.Vector2() },
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
    // Cap fill rate on large/Retina screens independently of CSS text resolution.
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, this.quality < 1 ? 1.25 : 1.5, Math.sqrt(1800000 / (this.w * this.h))))
    this.renderer.setSize(this.w, this.h, false)
    this.camera.aspect = this.w / this.h
    this.camera.updateProjectionMatrix()
    this.visH = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z

    const portrait = this.w < this.h
    const H = this.visH * (portrait ? 0.38 : 0.49)
    const W = H * 0.78
    const nx = Math.round(24 * this.quality)
    const ny = Math.round(30 * this.quality)
    this.buildCloth(nx, ny, W, H)
    this.cloth.cy = this.visH * (portrait ? 0.12 : 0.095)
    this.cloth.reset()
    this.mat.uniforms.uAspect.value = W / H
    this.shadow.scale.set(W * 1.4, H * 0.22, 1)
  }

  private buildCloth(nx: number, ny: number, W: number, H: number) {
    if (this.mesh) {
      this.scene.remove(this.mesh)
      this.geo.dispose()
      this.scene.remove(this.rim)
      this.rim.geometry.dispose()
      this.rim.material.dispose()
    }
    this.cloth = new Cloth(nx, ny, W, H)
    const g = new THREE.BufferGeometry()
    this.surface = new PaperSurface(this.cloth)
    g.setAttribute('position', new THREE.BufferAttribute(this.surface.positions, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('uv', new THREE.BufferAttribute(this.surface.uv, 2))
    g.setIndex(this.surface.indices)
    this.geo = g
    this.mesh = new THREE.Mesh(g, this.mat)
    this.mesh.frustumCulled = false
    this.scene.add(this.mesh)

    // A narrow geometric ribbon closes the cut edge; it follows the simulated shell.
    this.edgeIndices = this.surface.edgeIndices
    const rimGeo = new THREE.BufferGeometry()
    rimGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.edgeIndices.length * 6), 3))
    const rimIndex: number[] = []
    for (let i = 0; i < this.edgeIndices.length; i++) {
      const a = i * 2, b = ((i + 1) % this.edgeIndices.length) * 2
      rimIndex.push(a, b, a + 1, b, b + 1, a + 1)
    }
    rimGeo.setIndex(rimIndex)
    this.rim = new THREE.Mesh(rimGeo, new THREE.MeshBasicMaterial({ color: '#e1d6c2', side: THREE.DoubleSide, transparent: true }))
    this.rim.frustumCulled = false
    this.scene.add(this.rim)
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

  leave() {
    this.pointerInside = false
    this.mouse.has = false
  }

  pointer(px: number, py: number) {
    const w = this.toWorld(px, py)
    const G = this.cloth.gust
    const now = performance.now()
    this.pointerInside = true
    if (this.mouse.has) {
      const k = Math.max(1 / 120, Math.min(0.08, (now - this.pointerAt) / 1000))
      const cap = 2.2
      const vx = Math.max(-cap, Math.min(cap, (w.x - this.mouse.wx) / k))
      const vy = Math.max(-cap, Math.min(cap, (w.y - this.mouse.wy) / k))
      G.x += (vx - G.x) * 0.3
      G.y += (vy - G.y) * 0.3
      G.z += (-Math.hypot(G.x, G.y) * 0.18 - G.z) * 0.3
    }
    G.px = w.x
    G.py = w.y
    G.r = this.cloth.W * 0.28
    this.pointerAt = now
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
    this.cloth.poke(w.x, w.y, 0.014)
    const now = performance.now()
    this.override = null
    this.blinkAt = now
    this.swapAt = now + 90
    return true
  }

  private currentMood(now: number): Expression {
    if (this.override && now > this.override.until) this.override = null
    if (!this.override && now - this.lastPointer > 24000) this.override = { e: 'sleepy', until: Infinity }
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

    const G = cloth.gust
    G.active += ((this.pointerInside && !calm ? 1 : 0) - G.active) * (1 - Math.exp(-dt * 8))
    const step = 1 / 60
    this.acc += dt
    let steps = 0
    while (this.acc >= step && steps < 4) {
      cloth.step(step, state.flat, rect, calm)
      this.acc -= step
      steps++
    }
    if (steps === 4) this.acc = 0
    const decay = Math.exp(-dt * 9)
    G.x *= decay; G.y *= decay; G.z *= decay

    this.surface.update(cloth.pos, state.flat)
    this.geo.attributes.position.needsUpdate = true
    this.geo.computeVertexNormals()
    if (!calm) this.updateBlink(now)

    const u = this.mat.uniforms
    u.uFlat.value = state.flat
    u.uCut.value = state.cut
    const b = cloth.bounds()
    const hx = (b.minX + b.maxX) / 2, hy = b.maxY - cloth.H * 0.3
    const look = u.uLook.value as THREE.Vector2
    look.x += ((this.pointerInside ? Math.max(-1, Math.min(1, (this.mouse.wx - hx) / 2.5)) : 0) - look.x) * (1 - Math.exp(-dt * 7))
    look.y += ((this.pointerInside ? Math.max(-1, Math.min(1, (this.mouse.wy - hy) / 2.5)) : 0) - look.y) * (1 - Math.exp(-dt * 7))

    const mood = calm ? expressions[this.expression] : this.currentMood(now)
    if (mood !== this.shown) {
      this.shown = mood
      this.changedAt = now
      this.onMood?.(mood)
    }
    // Upload the small face texture at 30 Hz; retain 60 Hz during blinks and mood changes.
    const faceInterval = now - this.blinkAt < 250 || now - this.changedAt < 400 ? 16 : 32
    if (state.flat < 0.999 && (now - this.faceDrawAt >= faceInterval || calm)) {
      this.faceDrawAt = now
      this.face.draw(mood, { t: calm ? 0 : now / 1000, k: calm ? 10 : (now - this.changedAt) / 1000, look, open: calm ? 1 : this.open })
      this.faceTex.needsUpdate = true
    }

    const edge = this.rim.geometry.attributes.position
    const normals = this.geo.attributes.normal
    this.edgeIndices.forEach((k, i) => {
      const thickness = 0.007 * (1 - state.flat)
      for (let side = 0; side < 2; side++) {
        const sign = side ? -1 : 1
        edge.setXYZ(i * 2 + side,
          this.surface.positions[k * 3] + normals.getX(k) * thickness * sign,
          this.surface.positions[k * 3 + 1] + normals.getY(k) * thickness * sign,
          this.surface.positions[k * 3 + 2] + normals.getZ(k) * thickness * sign)
      }
    })
    edge.needsUpdate = true
    this.rim.material.opacity = 1 - state.flat
    const height = 0.5 + Math.sin(cloth.time * 0.64) * 0.045
    this.shadow.position.set(hx + 0.08, b.minY - height * 0.3, -0.6)
    this.shadow.scale.set(cloth.W * (1.15 + height * 0.5), cloth.H * 0.17, 1)
    ;(this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.36 * (1 - state.flat)

    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    this.geo.dispose()
    this.rim.geometry.dispose()
    this.rim.material.dispose()
    for (const key of ['uPaper', 'uFace', 'uCrease']) this.mat.uniforms[key].value.dispose()
    this.shadow.geometry.dispose()
    const shadowMaterial = this.shadow.material as THREE.MeshBasicMaterial
    shadowMaterial.map?.dispose()
    shadowMaterial.dispose()
    this.mat.dispose()
    this.renderer.dispose()
  }
}
