import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { L10n, Lang } from '../data/profile'

const dict = {
  'nav.work': { zh: '作品', en: 'Work' },
  'nav.about': { zh: '关于', en: 'About' },
  'nav.contact': { zh: '联系', en: 'Contact' },
  'nav.index': { zh: '目录', en: 'Index' },
  'hero.role': { zh: '开发者 & 创作者', en: 'Developer & Creative' },
  'hero.line': { zh: '华中科技大学 · 计算机科学与技术', en: 'Computer Science · HUST' },
  'hero.scroll': { zh: '向下滚动', en: 'Scroll' },
  'hero.hint': { zh: '点一下幽灵，换个表情', en: 'Click the ghost to change its mood' },
  'bento.profile': { zh: '档案', en: 'Profile' },
  'bento.bio': {
    zh: '写代码，也做设计。关心 AI 如何评判、改进自身，以及如何帮助科学。',
    en: 'I write code and make things look right. Curious about how AI judges, improves itself, and helps science.',
  },
  'bento.now': { zh: '现在', en: 'Now' },
  'bento.nowText': { zh: '华中科技大学计算机学院，本科在读', en: 'Undergrad in CS at HUST' },
  'bento.nowSub': { zh: '研究中', en: 'Researching' },
  'bento.time': { zh: '本地时间', en: 'Local time' },
  'bento.research': { zh: '研究方向', en: 'Research' },
  'bento.featured': { zh: '精选', en: 'Featured' },
  'bento.read': { zh: '阅读项目', en: 'Read project' },
  'bento.contact': { zh: '联系', en: 'Contact' },
  'bento.copy': { zh: '点击复制邮箱', en: 'Click to copy' },
  'toast.copied': { zh: '邮箱已复制', en: 'Email copied' },
  'work.title': { zh: '精选作品', en: 'Selected Work' },
  'work.sub': { zh: '论文、数据与正在成形的东西', en: 'Papers, data, and things taking shape' },
  'work.progress': { zh: '进行中', en: 'In progress' },
  'work.soon': { zh: '敬请期待', en: 'Coming soon' },
  'about.title': { zh: '关于', en: 'About' },
  'about.body': {
    zh: '我是 Lesui Yu，也可以叫我 wutaghost。华中科技大学计算机科学与技术学院 2023 级本科生，研究兴趣集中在 AI4OpenReview、递归自我改进（RSI）与 AI4Science —— 让 AI 更公正地评判研究，更可靠地改进自己，也更有力地推动科学。',
    en: 'I’m Lesui Yu — you can also call me wutaghost. I study Computer Science and Technology at Huazhong University of Science and Technology (class of 2027). My research interests are AI4OpenReview, Recursive Self-Improvement and AI4Science: making AI judge research more fairly, improve itself more reliably, and push science further.',
  },
  'about.timeline': { zh: '经历', en: 'Timeline' },
  'footer.talk': { zh: '聊聊吧', en: "Let's talk" },
  'footer.built': { zh: '由 wutaghost 设计并编写', en: 'Designed & built by wutaghost' },
  'footer.top': { zh: '回到顶部', en: 'Back to top' },
  'project.venue': { zh: '录用', en: 'Venue' },
  'project.role': { zh: '角色', en: 'Role' },
  'project.year': { zh: '年份', en: 'Year' },
  'project.authors': { zh: '作者', en: 'Authors' },
  'project.links': { zh: '链接', en: 'Links' },
  'project.next': { zh: '下一个项目', en: 'Next project' },
  'project.more': { zh: '更多项目正在路上', en: 'More projects on the way' },
  'project.back': { zh: '回到目录', en: 'Back to index' },
  'project.keep': { zh: '继续滚动翻页', en: 'Keep scrolling to turn the page' },
  'cursor.view': { zh: '查看', en: 'View' },
} satisfies Record<string, L10n>

export type DictKey = keyof typeof dict

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: DictKey) => string; pick: (v: L10n) => string }
const I18nCtx = createContext<Ctx>(null!)

function initialLang(): Lang {
  const saved = localStorage.getItem('lang')
  if (saved === 'zh' || saved === 'en') return saved
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const setLang = useCallback((l: Lang) => {
    localStorage.setItem('lang', l)
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en'
    setLangState(l)
  }, [])
  const t = useCallback((k: DictKey) => dict[k][lang], [lang])
  const pick = useCallback((v: L10n) => v[lang], [lang])
  return <I18nCtx.Provider value={{ lang, setLang, t, pick }}>{children}</I18nCtx.Provider>
}

export const useI18n = () => useContext(I18nCtx)

const GLYPHS = '#%&*+=/<>_·—░▒'

/** Text that "decodes" through random glyphs whenever its content changes. */
export function S({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const prev = useRef<string | null>(null)

  useLayoutEffect(() => {
    const el = ref.current!
    const from = prev.current
    prev.current = text
    if (from === null || from === text || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.textContent = text
      return
    }
    // Pool scramble glyphs from both strings so no new font subsets are fetched
    const pool = (GLYPHS + from + text).replace(/\s/g, '')
    const chars = [...text]
    const dur = Math.min(900, 380 + chars.length * 6)
    const reveal = chars.map((_, i) => (i / chars.length) * 0.65 + Math.random() * 0.35)
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = (now - start) / dur
      let out = ''
      for (let i = 0; i < chars.length; i++) {
        const c = chars[i]
        out += p >= reveal[i] || c === ' ' ? c : pool[(Math.random() * pool.length) | 0]
      }
      el.textContent = out
      if (p < 1) raf = requestAnimationFrame(tick)
      else el.textContent = text
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [text])

  return <span ref={ref} className={className} />
}

export function T({ k, className }: { k: DictKey; className?: string }) {
  const { t } = useI18n()
  return <S text={t(k)} className={className} />
}

export function P({ v, className }: { v: L10n; className?: string }) {
  const { pick } = useI18n()
  return <S text={pick(v)} className={className} />
}
