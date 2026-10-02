import { useEffect, useRef, useState } from 'react'
import { projects, upcomingSlots } from '../data/projects'
import { P, T, useI18n } from '../lib/i18n'
import { gsap, isTouch } from '../lib/smooth'
import { unfold } from '../lib/transition'
import { Cover } from '../components/Cover'
import { GhostMark } from '../components/ui'

export function Work() {
  const { pick } = useI18n()
  const previewRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<number | null>(null)

  // preview sheet follows the pointer with inertia and leans into motion
  useEffect(() => {
    if (isTouch) return
    const el = previewRef.current!
    const xTo = gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.7, ease: 'power3' })
    const rTo = gsap.quickTo(el, 'rotation', { duration: 0.9, ease: 'power3' })
    let lastX = 0
    const move = (e: PointerEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
      rTo(gsap.utils.clamp(-9, 9, (e.clientX - lastX) * 0.6))
      lastX = e.clientX
    }
    addEventListener('pointermove', move)
    return () => removeEventListener('pointermove', move)
  }, [])

  useEffect(() => {
    gsap.to(previewRef.current, {
      scale: active === null ? 0.6 : 1,
      autoAlpha: active === null ? 0 : 1,
      rotationX: active === null ? 40 : 0,
      duration: 0.6,
      ease: 'expo.out',
    })
  }, [active])

  const open = (i: number) => {
    const p = projects[i]
    // on touch there is no floating preview; unfold from the row itself
    const from = isTouch
      ? document.querySelector(`[data-row="${i}"] .row-cover`)
      : previewRef.current?.querySelector(`.preview-slide:nth-child(${i + 1}) .cover`)
    unfold((from as HTMLElement) ?? null, `/work/${p.slug}`)
  }

  return (
    <section className="work" id="work">
      <header className="sec-head">
        <div>
          <span className="mono muted">02</span>
          <h2>
            <span className="line-mask">
              <span className="split">
                <T k="work.title" />
              </span>
            </span>
          </h2>
        </div>
        <span className="mono muted">
          <T k="work.sub" />
        </span>
      </header>

      <ol className="rows" onPointerLeave={() => setActive(null)}>
        {projects.map((p, i) => (
          <li key={p.slug} data-row={i} className={`row ${active === i ? 'is-active' : ''}`}>
            <a
              href={`/work/${p.slug}`}
              data-cursor="view"
              onPointerEnter={() => setActive(i)}
              onClick={(e) => {
                e.preventDefault()
                open(i)
              }}
            >
              <span className="row-no mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="row-title">
                <span className="serif row-full">{p.fullTitle}</span>
                <span className="row-sub muted">
                  <P v={p.title} /> · <P v={p.role} />
                </span>
              </span>
              <span className="row-kind mono muted">
                <P v={p.kind} />
              </span>
              <span className="row-venue mono">{p.venue}</span>
              <span className="row-year mono muted">{p.year}</span>
              <span className="row-arrow">→</span>
              {isTouch && <Cover project={p} className="row-cover" />}
            </a>
          </li>
        ))}
        {Array.from({ length: upcomingSlots }, (_, k) => (
          <li key={'ghost' + k} className="row row-ghost" onPointerEnter={() => setActive(null)}>
            <div>
              <span className="row-no mono">{String(projects.length + k + 1).padStart(2, '0')}</span>
              <span className="row-title">
                <span className="serif row-full">
                  <T k="work.progress" />
                </span>
              </span>
              <span className="row-kind mono muted">— — —</span>
              <span className="row-venue mono muted">????</span>
              <span className="row-year mono muted">20XX</span>
              <span className="row-peek">
                <GhostMark />
                <span className="mono">
                  <T k="work.soon" />
                </span>
              </span>
            </div>
          </li>
        ))}
      </ol>

      <div className="preview" ref={previewRef} aria-hidden>
        {projects.map((p, i) => (
          <div key={p.slug} className="preview-slide" style={{ clipPath: active === i || (active === null && i === 0) ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)' }}>
            <Cover project={p} />
            <span className="preview-cap mono">
              {String(i + 1).padStart(2, '0')} — {pick(p.kind)}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
