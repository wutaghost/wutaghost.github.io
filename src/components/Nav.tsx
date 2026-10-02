import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { Digits, GhostMark, LangToggle, Magnetic } from './ui'
import { T, S } from '../lib/i18n'
import { gsap, lenis, scrollTo } from '../lib/smooth'
import { pageTurn } from '../lib/transition'
import { useI18n } from '../lib/i18n'
import { profile } from '../data/profile'

/* --------- journal page number shared across the app --------- */

let page = '01'
const subs = new Set<() => void>()
export function setPageNo(p: string) {
  if (p === page) return
  page = p
  subs.forEach((f) => f())
}
const usePageNo = () =>
  useSyncExternalStore(
    (f) => (subs.add(f), () => subs.delete(f)),
    () => page,
  )

export function Nav() {
  const p = usePageNo()
  const loc = useLocation()
  const { t } = useI18n()
  const home = loc.pathname === '/'

  const jump = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    if (home) scrollTo('#' + id)
    else pageTurn('/#' + id, { kicker: t('nav.index'), num: '00', title: t(`nav.${id}` as 'nav.work') })
  }

  return (
    <header className="nav">
      <a
        href="/"
        className="nav-brand"
        onClick={(e) => {
          e.preventDefault()
          if (home) scrollTo(0)
          else pageTurn('/', { kicker: t('nav.index'), num: '00', title: profile.id })
        }}
      >
        <GhostMark />
        <span className="mono">{profile.id}</span>
      </a>
      <nav className="nav-links mono">
        <a href="/#work" className="u-link" onClick={jump('work')}>
          <T k="nav.work" />
        </a>
        <a href="/#about" className="u-link" onClick={jump('about')}>
          <T k="nav.about" />
        </a>
        <a href="/#contact" className="u-link" onClick={jump('contact')}>
          <T k="nav.contact" />
        </a>
      </nav>
      <div className="nav-right">
        {home && (
          <span className="mono page-no muted">
            <Digits value={p} />
            <span>&nbsp;/ 04</span>
          </span>
        )}
        <Magnetic strength={0.25}>
          <LangToggle />
        </Magnetic>
      </div>
    </header>
  )
}

/* --------- intro: ink curtain that lifts once fonts are ready --------- */

export function Intro({ onDone }: { onDone: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const [gone, setGone] = useState(false)
  useEffect(() => {
    const el = ref.current!
    lenis?.stop()
    const word = el.querySelectorAll('.intro-word span')
    const bar = el.querySelector('.intro-bar i')
    const tl = gsap.timeline({ paused: true })
    tl.from(word, { yPercent: 110, stagger: 0.035, duration: 0.9, ease: 'expo.out' })
      .to(bar, { scaleX: 1, duration: 1.1, ease: 'power3.inOut' }, 0.1)
      .add('ready')
      .to(word, { yPercent: -110, stagger: 0.02, duration: 0.6, ease: 'power3.in' }, 'ready+=0.15')
      .to(el, { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=0.25')
      .add(() => {
        lenis?.start()
        onDone()
      }, '-=0.55')
      .add(() => setGone(true))
    gsap.set(el, { clipPath: 'inset(0 0 0% 0)' })
    const fonts = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 2500))])
    tl.tweenTo('ready').then(() => fonts.then(() => tl.play()))
    return () => {
      tl.kill()
    }
  }, [onDone])
  if (gone) return null
  return (
    <div className="intro" ref={ref} aria-hidden>
      <div className="intro-inner">
        <div className="intro-word">
          {[...profile.id].map((c, i) => (
            <span key={i}>{c}</span>
          ))}
        </div>
        <div className="intro-bar">
          <i />
        </div>
        <span className="mono" style={{ opacity: 0.6 }}>
          <S text={`${profile.name.zh} · ${profile.name.en}`} />
        </span>
      </div>
    </div>
  )
}
