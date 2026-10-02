import { useLayoutEffect, useRef } from 'react'
import { profile } from '../data/profile'
import { P, T, useI18n } from '../lib/i18n'
import { gsap, reducedMotion } from '../lib/smooth'

export function About() {
  const { t } = useI18n()
  const lineRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (reducedMotion) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.tl-line i',
        { scaleY: 0 },
        { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.tl', start: 'top 70%', end: 'bottom 60%', scrub: true } },
      )
      gsap.utils.toArray<HTMLElement>('.tl-item').forEach((el) => {
        gsap.from(el.querySelectorAll('.tl-anim'), {
          y: 14,
          autoAlpha: 0,
          stagger: 0.08,
          duration: 0.65,
          ease: 'expo.out',
          scrollTrigger: { trigger: el, start: 'top 72%', toggleClass: { targets: el, className: 'is-on' } },
        })
      })
    }, lineRef)
    return () => ctx.revert()
  }, [])

  return (
    <section className="about" id="about" ref={lineRef}>
      <header className="sec-head">
        <div>
          <span className="mono muted">03</span>
          <h2>
            <span className="line-mask">
              <span className="split">
                <T k="about.title" />
              </span>
            </span>
          </h2>
        </div>
        <span className="mono muted">
          {profile.name.en} · {profile.id}
        </span>
      </header>

      <div className="about-grid">
        <aside className="about-side mono muted">
          <span>{profile.name.en}</span>
          <span>HUST · CS</span>
          <span>2023 — 2027</span>
          <span>{profile.research.map((r) => r.key).join(' / ')}</span>
        </aside>
        <p className="about-body">{t('about.body')}</p>
      </div>

      <div className="tl">
        <span className="mono muted tl-head">
          <T k="about.timeline" />
        </span>
        <div className="tl-line">
          <i />
        </div>
        <ol>
          {profile.timeline.map((e) => (
            <li key={e.when} className="tl-item">
              <span className="tl-dot" />
              <span className="tl-when mono tl-anim">{e.when}</span>
              <div>
                <h3 className="serif tl-anim">
                  <P v={e.title} />
                </h3>
                <p className="mono muted tl-anim">
                  <P v={e.role} />
                </p>
                {e.note.en && (
                  <p className="tl-note tl-anim">
                    <P v={e.note} />
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
