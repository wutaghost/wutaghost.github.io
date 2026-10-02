import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { profile } from '../data/profile'
import { projects } from '../data/projects'
import { P, S, T, useI18n } from '../lib/i18n'
import { copyText, GhostMark, Magnetic, toast, useTilt } from '../components/ui'
import { scrollTo } from '../lib/smooth'
import { unfold } from '../lib/transition'
import { Cover } from '../components/Cover'
import { InkTrail } from '../components/InkTrail'

function Card({ area, children, className = '', cursor }: { area: string; children: ReactNode; className?: string; cursor?: string }) {
  const ref = useTilt<HTMLDivElement>(3)
  return (
    <div className={`cell cell-${area}`}>
      <div className={`card ${className}`} ref={ref} data-cursor={cursor}>
        <span className="crop tl" />
        <span className="crop tr" />
        <span className="crop bl" />
        <span className="crop br" />
        <div className="card-body">{children}</div>
        <span className="sheen" />
        <InkTrail hostRef={ref} />
      </div>
    </div>
  )
}

function Clock() {
  const { lang } = useI18n()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: profile.timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(now)
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value)
  const h = get('hour'), m = get('minute'), s = get('second')
  const date = new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    timeZone: profile.timeZone,
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(now)
  const hand = (deg: number, len: number, w: number, c: string) => (
    <line x1="50" y1="50" x2="50" y2={50 - len} stroke={c} strokeWidth={w} strokeLinecap="round" transform={`rotate(${deg} 50 50)`} />
  )
  return (
    <div className="clock">
      <svg viewBox="0 0 100 100" className="clock-face" aria-hidden>
        <circle cx="50" cy="50" r="47" fill="none" stroke="var(--line)" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="50" y1="6" x2="50" y2={i % 3 ? 10 : 13} stroke="var(--ink)" strokeWidth={i % 3 ? 1 : 2} transform={`rotate(${i * 30} 50 50)`} />
        ))}
        {hand((h % 12) * 30 + m * 0.5, 24, 3, 'var(--ink)')}
        {hand(m * 6 + s * 0.1, 34, 2, 'var(--ink)')}
        {hand(s * 6, 38, 1, 'var(--red)')}
        <circle cx="50" cy="50" r="2.5" fill="var(--red)" />
      </svg>
      <div>
        <div className="clock-digital serif">
          {String(h).padStart(2, '0')}
          <span className="blink">:</span>
          {String(m).padStart(2, '0')}
        </div>
        <div className="mono muted">
          <S text={date} /> · UTC+8
        </div>
      </div>
    </div>
  )
}

export function Bento({ gridRef }: { gridRef?: React.Ref<HTMLDivElement> }) {
  const { t, pick } = useI18n()
  const featured = projects[0]

  const copy = async () => {
    const ok = await copyText(profile.email)
    toast(ok ? t('toast.copied') : profile.email)
  }

  return (
    <div className="bento" ref={gridRef}>
      <Card area="profile" className="card-profile">
        <div className="card-top reveal">
          <span className="mono muted">
            <T k="bento.profile" />
          </span>
          <span className="mono muted">HUST · CS · 2023—2027</span>
        </div>
        <div className="card-main">
          <GhostMark className="profile-ghost reveal" />
          <h2 className="profile-id serif reveal">{profile.id}</h2>
          <div className="profile-name reveal">
            <span className="zh">{profile.name.zh}</span>
            <span className="serif en">{profile.name.en}</span>
          </div>
          <p className="profile-bio reveal">
            <T k="bento.bio" />
          </p>
        </div>
      </Card>

      <Card area="now">
        <div className="card-top reveal">
          <span className="mono muted">
            <span className="live-dot" /> <T k="bento.now" />
          </span>
        </div>
        <div className="card-main">
          <p className="now-text serif reveal">
            <T k="bento.nowText" />
          </p>
          <span className="mono muted reveal">
            <P v={profile.city} /> · 2026
          </span>
        </div>
      </Card>

      <Card area="time">
        <div className="card-top reveal">
          <span className="mono muted">
            <T k="bento.time" /> · <P v={profile.city} />
          </span>
        </div>
        <div className="card-main reveal">
          <Clock />
        </div>
      </Card>

      <Card area="featured" className="card-featured" cursor="view">
        <Link
          to={`/work/${featured.slug}`}
          className="featured-link"
          onClick={(e) => {
            e.preventDefault()
            unfold(e.currentTarget.querySelector('.cover'), `/work/${featured.slug}`)
          }}
        >
          <div className="featured-text">
            <div className="card-top reveal">
              <span className="mono muted">
                <T k="bento.featured" />
              </span>
            </div>
            <div className="card-main">
              <span className="badge reveal">{featured.venue}</span>
              <h3 className="featured-title serif reveal">{featured.fullTitle}</h3>
              <p className="featured-authors reveal">
                {featured.authors.map((a, i) => (
                  <span key={a} className={i === featured.me ? 'me' : ''}>
                    {a}
                    {featured.equal?.includes(i) ? '*' : ''}
                    {i < featured.authors.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
              <span className="mono reveal featured-cta">
                <S text={pick(featured.role)} /> · <T k="bento.read" /> →
              </span>
            </div>
          </div>
          <div className="featured-cover">
            <Cover project={featured} />
          </div>
        </Link>
      </Card>

      <Card area="research">
        <div className="card-top reveal">
          <span className="mono muted">
            <T k="bento.research" />
          </span>
        </div>
        <ul className="research card-main">
          {profile.research.map((r, i) => (
            <li key={r.key} className="reveal">
              <span className="mono muted">0{i + 1}</span>
              <span className="research-key serif">{r.key}</span>
              <span className="research-desc">
                <P v={r.desc} />
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card area="contact" className="card-contact">
        <div className="card-top reveal">
          <span className="mono muted">
            <T k="bento.contact" />
          </span>
        </div>
        <div className="card-main">
          <button className="email reveal" onClick={copy} data-cursor="link">
            <span className="email-text">{profile.email}</span>
            <span className="mono muted">
              <T k="bento.copy" /> ⧉
            </span>
          </button>
          <div className="links reveal">
            {profile.links.map((l) => (
              <Magnetic key={l.label}>
                <a className="chip mono" href={l.href} target="_blank" rel="noreferrer">
                  {l.label} ↗
                </a>
              </Magnetic>
            ))}
          </div>
        </div>
      </Card>

      <Card area="index">
        <div className="card-top reveal">
          <span className="mono muted">
            <T k="nav.index" />
          </span>
        </div>
        <ol className="toc card-main">
          {(
            [
              ['work', '02'],
              ['about', '03'],
              ['contact', '04'],
            ] as const
          ).map(([id, n]) => (
            <li key={id} className="reveal">
              <button onClick={() => scrollTo('#' + id)}>
                <span className="serif">
                  <T k={`nav.${id}`} />
                </span>
                <span className="toc-dots" />
                <span className="mono">{n}</span>
              </button>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  )
}
