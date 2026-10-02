import { useEffect, useRef, type RefObject } from 'react'
import { isTouch, reducedMotion } from '../lib/smooth'

type Point = { x: number; y: number; time: number }
type Mark = { from: Point; control: Point; to: Point; width: number; born: number }
const LIFETIME = 3200
const MAX_MARKS = 150
const DWELL_TIME = 2000
const DWELL_RADIUS = 10

/** A local, click-through ink layer. No React updates, blur filters, or idle animation loop. */
export function InkTrail({ hostRef }: { hostRef: RefObject<HTMLDivElement | null> }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current, host = hostRef.current
    if (!canvas || !host || isTouch || reducedMotion) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let marks: Mark[] = []
    let pending: Point | null = null
    let previous: Point | null = null
    let midpoint: Point | null = null
    let dwell: Point | null = null
    let armed = false
    let width = 3
    let raf = 0
    let lastPaint = 0
    let visible = true
    let sized = false
    let w = 0, h = 0

    // Waiting needs no timer or animation loop; leaving starts a fresh, disconnected stroke.
    const leave = () => {
      dwell = pending = previous = midpoint = null
      armed = false
      width = 3
      canvas.dataset.armed = 'false'
    }
    const enter = (event: PointerEvent) => {
      leave()
      if (event.pointerType !== 'touch' && visible && !host.closest('[inert]')) {
        dwell = { x: event.clientX, y: event.clientY, time: event.timeStamp }
      }
    }

    // Allocate only after intentional interaction. Cap the backing scale on large cards.
    const resize = () => {
      w = host.clientWidth; h = host.clientHeight
      const ratio = Math.min(devicePixelRatio, 1.25)
      canvas.width = Math.max(1, Math.round(w * ratio))
      canvas.height = Math.max(1, Math.round(h * ratio))
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      ctx.lineCap = 'butt'
      ctx.lineJoin = 'round'
      sized = true
    }
    const clear = () => {
      cancelAnimationFrame(raf)
      raf = 0
      marks = []
      canvas.dataset.active = 'false'
      leave()
      if (sized) ctx.clearRect(0, 0, w, h)
    }
    const paint = (now: number) => {
      raf = 0
      if (!visible || document.hidden) { clear(); return }
      // Ink dries at 30 fps while the pointer still feeds a continuous quadratic path.
      if (now - lastPaint < 30) { raf = requestAnimationFrame(paint); return }
      lastPaint = now
      if (pending) {
        const point = pending
        pending = null
        if (previous && midpoint) {
          const distance = Math.hypot(point.x - previous.x, point.y - previous.y)
          if (distance > 1) {
            const speed = distance / Math.max(8, point.time - previous.time)
            width += (1.7 + 3.8 / (1 + speed * 1.3) - width) * 0.4
            const nextMid = { x: (point.x + previous.x) / 2, y: (point.y + previous.y) / 2, time: point.time }
            marks.push({ from: midpoint, control: previous, to: nextMid, width, born: now })
            midpoint = nextMid
          }
        } else midpoint = point
        previous = point
      }
      // Bound both history and drawing cost, including long, continuous pointer movement.
      marks = marks.filter(mark => now - mark.born < LIFETIME).slice(-MAX_MARKS)
      ctx.clearRect(0, 0, w, h)
      ctx.strokeStyle = '#39342d'
      ctx.fillStyle = '#39342d'
      for (const mark of marks) {
        const age = (now - mark.born) / LIFETIME
        const opacity = (1 - age) ** 1.5
        ctx.beginPath()
        ctx.moveTo(mark.from.x, mark.from.y)
        ctx.quadraticCurveTo(mark.control.x, mark.control.y, mark.to.x, mark.to.y)
        // A faint wider pass suggests paper absorption without an expensive shadow blur.
        ctx.globalAlpha = opacity * 0.085
        ctx.lineWidth = mark.width + age * 3 + 2
        ctx.stroke()
        ctx.globalAlpha = opacity * 0.43
        ctx.lineWidth = mark.width
        ctx.stroke()
      }
      ctx.globalAlpha = 1
      canvas.dataset.active = marks.length ? 'true' : 'false'
      if (marks.length || pending) raf = requestAnimationFrame(paint)
    }
    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || !visible || document.hidden || host.closest('[inert]')) {
        leave()
        return
      }
      if (!armed) {
        const cursor = { x: event.clientX, y: event.clientY, time: event.timeStamp }
        if (!dwell) { dwell = cursor; return }
        // Check elapsed time first: the first movement after a pause enables drawing.
        // Small hand jitter is allowed; sweeping across the card restarts the wait.
        if (cursor.time - dwell.time >= DWELL_TIME) {
          armed = true
          canvas.dataset.armed = 'true'
        } else {
          if (Math.hypot(cursor.x - dwell.x, cursor.y - dwell.y) > DWELL_RADIUS) dwell = cursor
          return
        }
      }
      if (!sized) resize()
      const rect = host.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      // Card tilt is deliberately small; scale into the card's untransformed canvas.
      const point = {
        x: (event.clientX - rect.left) * w / rect.width,
        y: (event.clientY - rect.top) * h / rect.height,
        time: event.timeStamp,
      }
      if (!previous) { previous = point; midpoint = point }
      pending = point
      if (!raf) raf = requestAnimationFrame(paint)
    }
    const hide = () => { if (document.hidden) clear() }
    const ro = new ResizeObserver(() => { clear(); if (sized) resize() })
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (!visible) clear()
    })
    ro.observe(host)
    io.observe(host)
    host.addEventListener('pointerenter', enter)
    host.addEventListener('pointermove', move, { passive: true })
    host.addEventListener('pointerleave', leave)
    host.addEventListener('pointercancel', leave)
    window.addEventListener('scroll', leave, { passive: true })
    window.addEventListener('blur', leave)
    document.addEventListener('visibilitychange', hide)
    return () => {
      clear()
      ro.disconnect(); io.disconnect()
      host.removeEventListener('pointerenter', enter)
      host.removeEventListener('pointermove', move)
      host.removeEventListener('pointerleave', leave)
      host.removeEventListener('pointercancel', leave)
      window.removeEventListener('scroll', leave)
      window.removeEventListener('blur', leave)
      document.removeEventListener('visibilitychange', hide)
    }
  }, [hostRef])

  return <canvas ref={ref} className="ink-trail" width="1" height="1" aria-hidden="true" />
}
