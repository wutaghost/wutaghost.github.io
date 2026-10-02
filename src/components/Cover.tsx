import type { Project } from '../data/projects'

/** Deterministic PRNG so the cover looks the same everywhere it appears. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

const points = (() => {
  const r = rng(7)
  return Array.from({ length: 70 }, () => {
    const anchor = 0.12 + r() * 0.76
    const noise = (r() + r() + r() - 1.5) * 0.32
    return { a: anchor, s: Math.min(0.95, Math.max(0.05, anchor + noise)) }
  })
})()

function Scatter() {
  // x = anchor score, y = given score; residual = vertical distance to y = x
  const X = (v: number) => 40 + v * 520
  const Y = (v: number) => 380 - v * 340
  return (
    <svg viewBox="0 0 600 420" preserveAspectRatio="xMidYMid slice" className="cover-svg">
      <rect width="600" height="420" fill="var(--ink)" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={i} x1={40 + i * 65} y1="30" x2={40 + i * 65} y2="390" stroke="#ffffff10" />
      ))}
      {points.map((p, i) => (
        <line key={'r' + i} x1={X(p.a)} y1={Y(p.s)} x2={X(p.a)} y2={Y(p.a)} stroke="#E5482B" strokeOpacity="0.55" strokeWidth="1" />
      ))}
      <line x1={X(0)} y1={Y(0)} x2={X(1)} y2={Y(1)} stroke="#FBF9F4" strokeWidth="1.5" strokeDasharray="5 5" />
      {points.map((p, i) => (
        <circle key={'p' + i} cx={X(p.a)} cy={Y(p.s)} r={Math.abs(p.s - p.a) > 0.18 ? 4 : 3} fill={Math.abs(p.s - p.a) > 0.18 ? '#E5482B' : '#FBF9F4'} />
      ))}
    </svg>
  )
}

export function Cover({ project, className = '' }: { project: Project; className?: string }) {
  return (
    <div className={`cover ${className}`}>
      {project.cover === 'scatter' ? <Scatter /> : <img src={project.cover.image} alt="" />}
    </div>
  )
}
