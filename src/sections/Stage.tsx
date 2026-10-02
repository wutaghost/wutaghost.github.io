import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { PaperScene, type SceneState } from '../three/PaperScene'
import { moodLabel, type Expression } from '../three/face'
import { Bento } from './Bento'
import { gsap, reducedMotion, ScrollTrigger, isTouch } from '../lib/smooth'
import { P, T, useI18n } from '../lib/i18n'
import { profile } from '../data/profile'
import { setPageNo } from '../components/Nav'
import { GhostMark } from '../components/ui'

const stagedQuery = '(min-width: 1100px) and (min-height: 740px)'

export function Stage({ ready }: { ready: boolean }) {
  const stageRef = useRef<HTMLElement>(null)
  const pinRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<PaperScene | null>(null)
  const st = useRef<SceneState>({ flat: 0, cut: 0, rect: null })
  const [staged] = useState(() => !reducedMotion && matchMedia(stagedQuery).matches)
  const [webgl, setWebgl] = useState(true)
  const { lang } = useI18n()
  const [mood, setMood] = useState<Expression>('calm')

  // ---- WebGL scene + render loop ----
  useEffect(() => {
    let scene: PaperScene
    try {
      scene = new PaperScene(canvasRef.current!, { lowPower: isTouch })
    } catch {
      setWebgl(false)
      return
    }
    sceneRef.current = scene
    scene.onMood = setMood
    let visible = true
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(stageRef.current!)

    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      const canvas = canvasRef.current
      if (!canvas || !visible || document.hidden || getComputedStyle(canvas).visibility === 'hidden') return
      const s = st.current
      if (staged && gridRef.current) {
        const g = gridRef.current.getBoundingClientRect()
        const c = canvas.getBoundingClientRect()
        s.rect = new DOMRect(g.left - c.left, g.top - c.top, g.width, g.height)
      }
      scene.frame(s, reducedMotion)
    }
    raf = requestAnimationFrame(loop)

    const pin = pinRef.current!
    const local = (e: PointerEvent) => {
      const c = canvasRef.current!.getBoundingClientRect()
      return [e.clientX - c.left, e.clientY - c.top] as const
    }
    const move = (e: PointerEvent) => scene.pointer(...local(e))
    const down = (e: PointerEvent) => {
      if (st.current.flat > 0.2) return
      scene.click(...local(e))
    }
    pin.addEventListener('pointermove', move)
    pin.addEventListener('pointerdown', down)
    const ro = new ResizeObserver(() => scene.resize())
    ro.observe(canvasRef.current!)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      ro.disconnect()
      pin.removeEventListener('pointermove', move)
      pin.removeEventListener('pointerdown', down)
      scene.dispose()
      sceneRef.current = null
    }
  }, [staged])

  // ---- crease lines follow the real card layout (measured with gap = 0) ----
  useEffect(() => {
    if (!staged) return
    const grid = gridRef.current!
    const measure = () => {
      const scene = sceneRef.current
      if (!scene) return
      const saved = grid.style.getPropertyValue('--gap')
      grid.style.setProperty('--gap', '0px')
      const W = grid.clientWidth, H = grid.clientHeight
      if (!W || !H) return grid.style.setProperty('--gap', saved)
      const cells = [...grid.querySelectorAll<HTMLElement>('.cell')].map((c) => ({
        x: c.offsetLeft / W,
        y: c.offsetTop / H,
        w: c.offsetWidth / W,
        h: c.offsetHeight / H,
      }))
      grid.style.setProperty('--gap', saved)
      scene.setCreases(cells, W / H)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(grid)
    document.fonts.ready.then(measure)
    return () => ro.disconnect()
  }, [staged, lang])

  // ---- scroll choreography ----
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: stageRef.current,
        start: 'top center',
        end: 'bottom center',
        onToggle: (s) => s.isActive && setPageNo('01'),
      })

      if (reducedMotion) return

      if (!staged) {
        gsap.to('.hero-type', {
          y: -60,
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: { trigger: stageRef.current, start: 'top top', end: 'bottom top', scrub: true },
        })
        gsap.to(canvasRef.current, {
          yPercent: -18,
          autoAlpha: 0,
          ease: 'none',
          scrollTrigger: { trigger: stageRef.current, start: '30% top', end: 'bottom top', scrub: true },
        })
        return
      }

      const grid = gridRef.current!
      const cells = gsap.utils.toArray<HTMLElement>('.cell', grid)
      const reveals = gsap.utils.toArray<HTMLElement>('.reveal', grid)
      gsap.set(grid, { '--gap': '0px', '--radius': '0px', '--lift': 0, autoAlpha: 0 })
      gsap.set(reveals, { autoAlpha: 0, y: 18 })

      const spread = cells.map((c) => {
        const gx = grid.clientWidth / 2, gy = grid.clientHeight / 2
        const dx = c.offsetLeft + c.offsetWidth / 2 - gx
        const dy = c.offsetTop + c.offsetHeight / 2 - gy
        const d = Math.hypot(dx, dy) || 1
        return { x: (dx / d) * 26, y: (dy / d) * 20, r: gsap.utils.random(-2.4, 2.4) }
      })

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: stageRef.current,
          pin: pinRef.current,
          start: 'top top',
          end: '+=210%',
          scrub: 0.9,
        },
      })
      tl.to(st.current, { flat: 1, duration: 0.42, ease: 'power2.inOut' }, 0)
        .to('.hero-type', { y: -70, autoAlpha: 0, duration: 0.26, ease: 'power1.in', stagger: 0.02 }, 0)
        .to('.hero-scroll', { autoAlpha: 0, duration: 0.08 }, 0)
        .to(st.current, { cut: 1, duration: 0.14 }, 0.44)
        .set(canvasRef.current, { autoAlpha: 0 }, 0.6)
        .set(grid, { autoAlpha: 1 }, 0.6)
        .to(grid, { '--gap': '14px', '--radius': '6px', '--lift': 1, duration: 0.18, ease: 'power2.out' }, 0.6)
        .to(cells, { x: (i) => spread[i].x, y: (i) => spread[i].y, rotation: (i) => spread[i].r, duration: 0.09, ease: 'power2.out' }, 0.6)
        .to(cells, { x: 0, y: 0, rotation: 0, duration: 0.13, ease: 'power2.inOut' }, 0.69)
        .to(reveals, { autoAlpha: 1, y: 0, duration: 0.12, stagger: 0.003, ease: 'power2.out' }, 0.72)
        .to({}, { duration: 0.1 })
    }, stageRef)
    return () => ctx.revert()
  }, [staged])

  // ---- intro letters ----
  useEffect(() => {
    if (!ready || reducedMotion) return
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-word span', { yPercent: 105 }, { yPercent: 0, stagger: 0.045, duration: 1.4, ease: 'expo.out' })
      gsap.fromTo('.hero-meta > *', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, stagger: 0.06, duration: 1, delay: 0.35, ease: 'expo.out' })
      gsap.fromTo('.hero-edition', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 1.2, delay: 0.7 })
      gsap.fromTo(canvasRef.current, { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 1.6, ease: 'expo.out' })
    }, stageRef)
    return () => ctx.revert()
  }, [ready])

  return (
    <>
      <section className={`stage ${staged ? 'is-staged' : ''}`} ref={stageRef} id="top">
        <div className="stage-pin" ref={pinRef}>
          <div className="hero-light hero-type" aria-hidden />
          <div className="hero-orbit hero-type" aria-hidden><i /><i /></div>
          <div className="hero-edition hero-type mono" aria-hidden>
            <span>Independent inquiry</span><span>Research · Code · Form</span>
          </div>
          <h1 className="hero-word serif hero-type" aria-label={profile.id}>
            <span className="line-mask">
              {[...profile.id].map((c, i) => (
                <span key={i} aria-hidden>
                  {c}
                </span>
              ))}
            </span>
          </h1>

          {webgl ? (
            <canvas className="paper-canvas" ref={canvasRef} aria-label="A floating paper ghost" />
          ) : (
            <GhostMark className="paper-fallback" />
          )}

          <div className="hero-meta hero-type">
            <div className="hero-name">
              <span className="zh">{profile.name.zh}</span>
              <span className="serif en">{profile.name.en}</span>
            </div>
            <p className="mono muted">
              <T k="hero.role" />
              <br />
              <T k="hero.line" />
            </p>
            <p className="mono muted hero-research">{profile.research.map((r) => r.key).join(' · ')}</p>
          </div>

          <div className="hero-fig hero-type mono">
            <span className="hero-mood">
              <span className="live-dot" />
              <P v={moodLabel[mood]} />
            </span>
            <span className="muted hero-hint">
              <T k="hero.hint" />
            </span>
          </div>

          <div className="hero-scroll mono">
            <span className="hero-scroll-line" />
            <T k="hero.scroll" />
          </div>

          {staged && (
            <div className="bento-wrap">
              <Bento gridRef={gridRef} />
            </div>
          )}
        </div>
      </section>
      {!staged && (
        <section className="bento-section">
          <Bento />
        </section>
      )}
    </>
  )
}
