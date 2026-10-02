import { useLayoutEffect, useRef } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { projects } from '../data/projects'
import { P, S, T, useI18n } from '../lib/i18n'
import { gsap, ScrollTrigger } from '../lib/smooth'
import { pageTurn } from '../lib/transition'
import { Cover } from '../components/Cover'
import { CountUp, Magnetic } from '../components/ui'
import { setPageNo } from '../components/Nav'

export function ProjectPage() {
  const { slug } = useParams()
  const idx = projects.findIndex((p) => p.slug === slug)
  const p = projects[idx]
  const ref = useRef<HTMLElement>(null)
  const { t, pick } = useI18n()
  const next = projects[idx + 1]

  useLayoutEffect(() => {
    if (!p) return
    setPageNo(String(idx + 1).padStart(2, '0'))
    const ctx = gsap.context(() => {
      gsap.from('.pj-title .ch', { yPercent: 115, stagger: 0.012, duration: 1.2, ease: 'expo.out', delay: 0.15 })
      gsap.from('.pj-kicker > *', { autoAlpha: 0, y: 14, stagger: 0.06, duration: 0.9, ease: 'expo.out', delay: 0.1 })
      gsap.to('.pj-cover .cover', {
        yPercent: 18,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: { trigger: '.pj-cover', start: 'top top', end: 'bottom top', scrub: true },
      })
      gsap.utils.toArray<HTMLElement>('.pj-fade').forEach((el) =>
        gsap.from(el, { y: 36, autoAlpha: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } }),
      )
      gsap.utils.toArray<HTMLElement>('.bar i').forEach((el) =>
        gsap.from(el, { scaleX: 0, duration: 1.6, ease: 'expo.inOut', scrollTrigger: { trigger: el, start: 'top 90%' } }),
      )
      // nav turns light while it sits over the dark cover / next-page panel
      for (const sel of ['.pj-cover', '.pj-next']) {
        ScrollTrigger.create({
          trigger: sel,
          start: 'top 40px',
          end: 'bottom 40px',
          toggleClass: { targets: document.body, className: 'nav-dark' },
        })
      }
      // scroll past the end → the next page turns in by itself
      let fired = false
      ScrollTrigger.create({
        trigger: '.pj-next',
        start: 'top bottom',
        end: 'bottom bottom',
        onUpdate: (s) => {
          gsap.set('.pj-next-progress i', { scaleX: s.progress })
          if (s.progress > 0.995 && !fired) {
            fired = true
            turn()
          }
        },
      })
    }, ref)
    return () => {
      ctx.revert()
      document.body.classList.remove('nav-dark')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  if (!p) return <Navigate to="/" replace />

  const turn = () =>
    next
      ? pageTurn(`/work/${next.slug}`, { kicker: t('project.next'), num: String(idx + 2).padStart(2, '0'), title: next.fullTitle })
      : pageTurn('/#work', { kicker: t('project.back'), num: '02', title: t('work.title') })

  const max = Math.max(...(p.bars?.items.map((b) => b.value) ?? [1]))

  return (
    <main className="pj" ref={ref}>
      <div className="pj-cover">
        <Cover project={p} />
      </div>

      <section className="pj-head">
        <div className="pj-kicker mono">
          <span className="red">№ {String(idx + 1).padStart(2, '0')}</span>
          <span className="muted">
            <P v={p.kind} />
          </span>
          <span className="badge">{p.venue}</span>
        </div>
        <h1 className="pj-title serif" aria-label={p.fullTitle}>
          {p.fullTitle.split(' ').map((w, i) => (
            <span className="line-mask word" key={i} aria-hidden>
              {[...w].map((c, j) => (
                <span className="ch" key={j}>
                  {c}
                </span>
              ))}
            </span>
          ))}
        </h1>
        <p className="pj-sub serif muted">
          <P v={p.title} />
        </p>
      </section>

      <section className="pj-meta pj-fade">
        <div>
          <span className="mono muted">
            <T k="project.venue" />
          </span>
          <span>{p.venue}</span>
        </div>
        <div>
          <span className="mono muted">
            <T k="project.role" />
          </span>
          <span>
            <P v={p.role} />
          </span>
        </div>
        <div>
          <span className="mono muted">
            <T k="project.year" />
          </span>
          <span>{p.year}</span>
        </div>
        <div className="pj-authors">
          <span className="mono muted">
            <T k="project.authors" />
          </span>
          <span>
            {p.authors.map((a, i) => (
              <span key={a} className={i === p.me ? 'me' : ''}>
                {a}
                {p.equal?.includes(i) && <sup>*</sup>}
                {i < p.authors.length - 1 ? ', ' : ''}
              </span>
            ))}
            {p.equal && <small className="mono muted"> * {pick({ zh: '共同第一作者', en: 'Equal contribution' })}</small>}
          </span>
        </div>
        <div>
          <span className="mono muted">
            <T k="project.links" />
          </span>
          <span className="pj-links">
            {p.links.map((l) => (
              <Magnetic key={l.label}>
                <a className="chip mono" href={l.href} target="_blank" rel="noreferrer">
                  {l.label} ↗
                </a>
              </Magnetic>
            ))}
          </span>
        </div>
      </section>

      <p className="pj-summary serif pj-fade">
        <P v={p.summary} />
      </p>

      <section className="pj-stats">
        {p.stats.map((s) => (
          <div className="pj-stat pj-fade" key={s.label.en}>
            <CountUp to={s.value} className="serif pj-stat-num" />
            <span className="mono muted">
              <P v={s.label} />
            </span>
          </div>
        ))}
      </section>

      {p.bars && (
        <section className="pj-bars pj-fade">
          <span className="mono muted">
            <P v={p.bars.title} />
          </span>
          {p.bars.items.map((b) => (
            <div className="bar" key={b.label}>
              <span className="mono">{b.label}</span>
              <span className="bar-track">
                <i style={{ width: `${(b.value / max) * 100}%` }} />
              </span>
              <span className="mono">{b.value.toLocaleString('en-US')}</span>
            </div>
          ))}
        </section>
      )}

      <section className="pj-sections">
        {p.sections.map((s, i) => (
          <article key={i} className="pj-sec pj-fade">
            <span className="mono red">0{i + 1}</span>
            <h2 className="serif">
              <P v={s.heading} />
            </h2>
            <p>
              <P v={s.body} />
            </p>
          </article>
        ))}
      </section>

      <section className="pj-next" data-cursor="view" onClick={turn}>
        <div className="pj-next-sticky">
          <span className="mono muted">{next ? t('project.next') : t('project.more')}</span>
          <span className="pj-next-num serif">{next ? String(idx + 2).padStart(2, '0') : '→'}</span>
          <span className="pj-next-title serif">
            <S text={next ? next.fullTitle : t('project.back')} />
          </span>
          <span className="pj-next-progress">
            <i />
          </span>
          <span className="mono muted">
            <T k="project.keep" />
          </span>
          <Link to="/" className="sr-only">
            {t('project.back')}
          </Link>
        </div>
      </section>
    </main>
  )
}
