import { useEffect, useState } from 'react'
import { profile } from '../data/profile'
import { T, useI18n } from '../lib/i18n'
import { scrollTo } from '../lib/smooth'
import { copyText, GhostMark, Magnetic, toast } from '../components/ui'

export function Footer() {
  const { t, pick } = useI18n()
  const [time, setTime] = useState('')
  useEffect(() => {
    const f = () =>
      setTime(new Intl.DateTimeFormat('en-GB', { timeZone: profile.timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date()))
    f()
    const id = setInterval(f, 10_000)
    return () => clearInterval(id)
  }, [])

  return (
    <footer className="footer" id="contact">
      <span className="mono muted">04</span>
      <a
        className="talk serif"
        href={`mailto:${profile.email}`}
        onClick={() => copyText(profile.email).then((ok) => ok && toast(t('toast.copied')))}
      >
        <span className="talk-text">
          <T k="footer.talk" />
        </span>
        <span className="talk-arrow">↗</span>
      </a>
      <div className="footer-mail mono">{profile.email}</div>

      <div className="footer-grid mono">
        <div className="footer-links">
          {profile.links.map((l) => (
            <Magnetic key={l.label}>
              <a href={l.href} target="_blank" rel="noreferrer" className="u-link">
                {l.label} ↗
              </a>
            </Magnetic>
          ))}
        </div>
        <span className="muted">
          {pick(profile.city)} · {time} UTC+8
        </span>
        <span className="muted">
          © 2026 · <T k="footer.built" />
        </span>
        <Magnetic>
          <button className="to-top" onClick={() => scrollTo(0)} aria-label={t('footer.top')}>
            <GhostMark />
            <span>
              <T k="footer.top" /> ↑
            </span>
          </button>
        </Magnetic>
      </div>
    </footer>
  )
}
