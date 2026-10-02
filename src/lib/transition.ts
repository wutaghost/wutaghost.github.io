import { flushSync } from 'react-dom'
import { gsap, lenis, reducedMotion, scrollTo, ScrollTrigger } from './smooth'

let navigate: (to: string) => void = () => {}
let busy = false

export function bindNavigate(fn: (to: string) => void) {
  navigate = fn
}

/** Navigate synchronously, then land at the top (or at a hash) without smooth scrolling. */
function go(to: string) {
  const [path, hash] = to.split('#')
  flushSync(() => navigate(path || '/'))
  lenis?.stop()
  window.scrollTo(0, 0)
  lenis?.scrollTo(0, { immediate: true, force: true })
  ScrollTrigger.refresh()
  lenis?.start()
  // ScrollTrigger auto-refreshes after the new page lays out and restores the
  // scroll it recorded, so jump to the hash once that refresh has happened
  if (hash) {
    let done = false
    const jump = () => {
      if (done) return
      done = true
      ScrollTrigger.removeEventListener('refresh', jump)
      requestAnimationFrame(() => {
        ScrollTrigger.refresh()
        scrollTo('#' + hash, true)
      })
    }
    ScrollTrigger.addEventListener('refresh', jump)
    setTimeout(jump, 400)
  }
}

/**
 * List → detail. The hovered preview sheet is cloned and unfolds to become
 * the detail page's full-bleed cover, then the page swaps underneath it.
 */
export function unfold(from: HTMLElement | null, to: string, coverVh = 0.78) {
  if (busy) return
  if (!from || reducedMotion) return go(to)
  busy = true
  const r = from.getBoundingClientRect()
  const backdrop = document.createElement('div')
  backdrop.className = 'tx-backdrop'
  const clone = from.cloneNode(true) as HTMLElement
  clone.className = 'tx-clone'
  Object.assign(clone.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` })
  document.body.append(backdrop, clone)

  const rot = Number(gsap.getProperty(from, 'rotation')) || 0
  gsap.set(clone, { rotation: rot })
  const tl = gsap.timeline({
    onComplete: () => {
      busy = false
    },
  })
  tl.to(backdrop, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0)
    .to(
      clone,
      {
        left: 0,
        top: 0,
        width: innerWidth,
        height: innerHeight * coverVh,
        rotation: 0,
        borderRadius: 0,
        duration: 1,
        ease: 'expo.inOut',
      },
      0,
    )
    .add(() => go(to))
    .to(backdrop, { opacity: 0, duration: 0.5, ease: 'power2.out' }, '+=0.05')
    .to(clone, { opacity: 0, duration: 0.6, ease: 'power2.out', onComplete: () => (clone.remove(), backdrop.remove()) }, '<0.1')
}

export type TurnLabel = { kicker: string; num: string; title: string }

/**
 * Page turn. A sheet swings in from the right edge (hinge on the right),
 * covers the screen, the route swaps, then it lifts away hinged on the left.
 */
export function pageTurn(to: string, label: TurnLabel) {
  if (busy) return
  if (reducedMotion) return go(to)
  busy = true
  const stage = document.createElement('div')
  stage.className = 'tx-turn'
  stage.innerHTML = `
    <div class="tx-page">
      <div class="tx-page-shade"></div>
      <div class="tx-page-inner">
        <span class="mono muted">${label.kicker}</span>
        <span class="tx-page-num serif">${label.num}</span>
        <span class="tx-page-title serif">${label.title}</span>
      </div>
      <span class="tx-page-fold"></span>
    </div>`
  document.body.append(stage)
  const page = stage.querySelector('.tx-page') as HTMLElement
  const shade = stage.querySelector('.tx-page-shade') as HTMLElement
  const inner = stage.querySelector('.tx-page-inner') as HTMLElement

  gsap.set(page, { transformOrigin: '100% 50%', rotationY: 100 })
  gsap.set(shade, { opacity: 0.55 })
  gsap.set(inner.children, { y: 40, opacity: 0 })

  gsap
    .timeline({ onComplete: () => ((busy = false), stage.remove()) })
    .to(page, { rotationY: 0, duration: 0.95, ease: 'power3.inOut' })
    .to(shade, { opacity: 0, duration: 0.95, ease: 'power3.inOut' }, 0)
    .to(inner.children, { y: 0, opacity: 1, stagger: 0.07, duration: 0.6, ease: 'power3.out' }, 0.45)
    .add(() => go(to), '+=0.15')
    .set(page, { transformOrigin: '0% 50%' })
    .to(inner.children, { y: -30, opacity: 0, stagger: 0.04, duration: 0.35, ease: 'power2.in' }, '+=0.45')
    .to(page, { rotationY: -100, duration: 1, ease: 'power3.inOut' }, '<0.15')
    .to(shade, { opacity: 0.6, duration: 1, ease: 'power3.inOut' }, '<')
}

export const isBusy = () => busy
