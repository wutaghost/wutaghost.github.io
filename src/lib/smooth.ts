import Lenis from 'lenis'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches
export const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches

export const lenis: Lenis | null = reducedMotion ? null : new Lenis({ lerp: 0.14, wheelMultiplier: 1 })

if (lenis) {
  if (import.meta.env.DEV) (window as unknown as { __lenis: Lenis }).__lenis = lenis
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
}

history.scrollRestoration = 'manual'
window.scrollTo(0, 0)

export function scrollTo(target: string | number, immediate = false) {
  // dimensions may be stale right after a route change
  lenis?.resize()
  if (lenis) lenis.scrollTo(target, { immediate, force: true, duration: 1.0, offset: typeof target === 'string' ? -40 : 0 })
  else if (typeof target === 'number') window.scrollTo(0, target)
  else document.querySelector(target)?.scrollIntoView()
}

export { gsap, ScrollTrigger }
