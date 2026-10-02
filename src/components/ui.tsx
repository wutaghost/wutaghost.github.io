import { useEffect, useRef, useState, type ReactNode } from 'react'
import { gsap, isTouch, reducedMotion } from '../lib/smooth'
import { useI18n } from '../lib/i18n'

/* ---------------- cursor ---------------- */

export function Cursor() {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useI18n()
  useEffect(() => {
    if (isTouch) return
    const el = ref.current!
    const xTo = gsap.quickTo(el, 'x', { duration: 0.18, ease: 'power3' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.18, ease: 'power3' })
    const move = (e: PointerEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
      el.dataset.hidden = 'false'
    }
    const over = (e: PointerEvent) => {
      const tgt = e.target as Element
      const v = tgt.closest('[data-cursor]') as HTMLElement | null
      el.dataset.state = v ? v.dataset.cursor! : tgt.closest('a, button') ? 'link' : ''
    }
    const leave = () => (el.dataset.hidden = 'true')
    addEventListener('pointermove', move)
    addEventListener('pointerover', over)
    document.addEventListener('pointerleave', leave)
    return () => {
      removeEventListener('pointermove', move)
      removeEventListener('pointerover', over)
      document.removeEventListener('pointerleave', leave)
    }
  }, [])
  return (
    <div className="cursor" ref={ref} data-hidden="true" aria-hidden>
      <div className="cursor-ring" />
      <div className="cursor-dot" />
      <div className="cursor-label mono">{t('cursor.view')} ↗</div>
    </div>
  )
}

/* ---------------- magnetic ---------------- */

export function Magnetic({ children, strength = 0.35, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (isTouch || reducedMotion) return
    const el = ref.current!
    const xTo = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' })
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      xTo((e.clientX - (r.left + r.width / 2)) * strength)
      yTo((e.clientY - (r.top + r.height / 2)) * strength)
    }
    const out = () => {
      xTo(0)
      yTo(0)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', out)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', out)
    }
  }, [strength])
  return (
    <span ref={ref} className={className} style={{ display: 'inline-block' }}>
      {children}
    </span>
  )
}

/* ---------------- tilt ---------------- */

/** Sets --rx/--ry/--mx/--my on the element for a 3D tilt + sheen. */
export function useTilt<T extends HTMLElement>(max = 3) {
  const ref = useRef<T>(null)
  useEffect(() => {
    if (isTouch || reducedMotion) return
    const el = ref.current!
    let raf = 0
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        const px = (e.clientX - r.left) / r.width
        const py = (e.clientY - r.top) / r.height
        el.style.setProperty('--rx', `${(0.5 - py) * max}deg`)
        el.style.setProperty('--ry', `${(px - 0.5) * max}deg`)
        el.style.setProperty('--mx', `${px * 100}%`)
        el.style.setProperty('--my', `${py * 100}%`)
      })
    }
    const out = () => {
      cancelAnimationFrame(raf)
      el.style.setProperty('--rx', '0deg')
      el.style.setProperty('--ry', '0deg')
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', out)
    return () => {
      cancelAnimationFrame(raf)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', out)
    }
  }, [max])
  return ref
}

/* ---------------- odometer ---------------- */

export function Digits({ value }: { value: string }) {
  return (
    <span className="digits" aria-label={value}>
      {[...value].map((ch, i) =>
        /\d/.test(ch) ? (
          <span key={i} style={{ transform: `translateY(${-Number(ch) * 1.2}em)` }} aria-hidden>
            {'0123456789'.split('').map((d) => (
              <span key={d}>{d}</span>
            ))}
          </span>
        ) : (
          <span key={i} aria-hidden>
            {ch}
          </span>
        ),
      )}
    </span>
  )
}

/* ---------------- language toggle ---------------- */

export function LangToggle() {
  const { lang, setLang } = useI18n()
  return (
    <div className="lang mono" data-lang={lang} role="group" aria-label="Language">
      <span className="lang-pill" />
      <button aria-pressed={lang === 'zh'} onClick={() => setLang('zh')}>
        中
      </button>
      <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>
        EN
      </button>
    </div>
  )
}

/* ---------------- toast ---------------- */

let pushToast: (msg: string) => void = () => {}
export const toast = (msg: string) => pushToast(msg)

export function Toast() {
  const [msg, setMsg] = useState('')
  const [show, setShow] = useState(false)
  useEffect(() => {
    let id = 0
    pushToast = (m) => {
      setMsg(m)
      setShow(true)
      clearTimeout(id)
      id = window.setTimeout(() => setShow(false), 1800)
    }
  }, [])
  return (
    <div className="toast mono" data-show={show} role="status">
      {msg}
    </div>
  )
}

/* ---------------- count-up ---------------- */

export function CountUp({ to, className }: { to: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current!
    const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
    if (reducedMotion) {
      el.textContent = fmt(to)
      return
    }
    const o = { v: 0 }
    el.textContent = fmt(0)
    const tw = gsap.to(o, {
      v: to,
      duration: 2.2,
      ease: 'expo.out',
      onUpdate: () => (el.textContent = fmt(o.v)),
      scrollTrigger: { trigger: el, start: 'top 92%' },
    })
    return () => {
      tw.scrollTrigger?.kill()
      tw.kill()
    }
  }, [to])
  return <span ref={ref} className={className} />
}

/* ---------------- ghost mark ---------------- */

export function GhostMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <path
        d="M14 56V30a18 18 0 0 1 36 0v26l-6-5-6 5-6-5-6 5-6-5z"
        fill="var(--card)"
        stroke="var(--ink)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <ellipse className="ghost-eye" cx="26" cy="31" rx="2.6" ry="3.8" fill="var(--ink)" />
      <ellipse className="ghost-eye" cx="38" cy="31" rx="2.6" ry="3.8" fill="var(--ink)" />
    </svg>
  )
}

/* ---------------- copy email ---------------- */

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
