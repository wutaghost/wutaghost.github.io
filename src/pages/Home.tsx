import { useLayoutEffect, useRef } from 'react'
import { Stage } from '../sections/Stage'
import { Work } from '../sections/Work'
import { About } from '../sections/About'
import { Footer } from '../sections/Footer'
import { gsap, reducedMotion, ScrollTrigger } from '../lib/smooth'
import { setPageNo } from '../components/Nav'

export function Home({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      if (reducedMotion) return
      gsap.to('.reading-progress', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: ref.current, start: 'top top', end: 'bottom bottom', scrub: 0.3 },
      })
      // section titles rise out of their masks
      gsap.utils.toArray<HTMLElement>('.sec-head').forEach((h) => {
        gsap.from(h.querySelectorAll('.split'), {
          yPercent: 110,
          duration: 1.3,
          ease: 'expo.out',
          scrollTrigger: { trigger: h, start: 'top 85%' },
        })
        gsap.from(h, { '--rule': 0, duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: h, start: 'top 85%' } })
      })
      // journal page counter
      ;(
        [
          ['#work', '02'],
          ['#about', '03'],
          ['#contact', '04'],
        ] as const
      ).forEach(([id, n]) =>
        ScrollTrigger.create({
          trigger: id,
          start: 'top 55%',
          end: 'bottom 55%',
          onToggle: (s) => s.isActive && setPageNo(n),
        }),
      )
      ScrollTrigger.create({
        trigger: '#contact',
        start: 'top 40px',
        toggleClass: { targets: document.body, className: 'nav-dark' },
      })
      // non-staged (mobile) bento: cards drop in like dealt sheets
      ScrollTrigger.batch('.bento-section .cell', {
        start: 'top 90%',
        once: true,
        onEnter: (els) =>
          gsap.from(els, { y: 44, rotationX: 5, autoAlpha: 0, stagger: 0.09, duration: 1.2, ease: 'power3.out' }),
      })
      gsap.from('.row', {
        y: 30,
        autoAlpha: 0,
        stagger: 0.08,
        duration: 1,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.rows', start: 'top 85%' },
      })
    }, ref)
    return () => {
      ctx.revert()
      document.body.classList.remove('nav-dark')
    }
  }, [])

  return (
    <main ref={ref}>
      <div className="reading-progress" aria-hidden />
      <Stage ready={ready} />
      <Work />
      <About />
      <Footer />
    </main>
  )
}
