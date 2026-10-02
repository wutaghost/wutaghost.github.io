import type { L10n } from './profile'

export type Project = {
  slug: string
  title: L10n
  /** Full formal title, e.g. paper title */
  fullTitle: string
  kind: L10n
  venue: string
  year: string
  role: L10n
  summary: L10n
  authors: string[]
  /** Index into authors to highlight as "me" */
  me: number
  /** Indices of equal-contribution authors (marked with *) */
  equal?: number[]
  links: { label: string; href: string }[]
  stats: { value: number; label: L10n }[]
  bars?: { title: L10n; items: { label: string; value: number }[] }
  sections: { heading: L10n; body: L10n }[]
  /** 'scatter' = built-in figure; or an image placed in /public */
  cover: 'scatter' | { image: string }
}

/**
 * Add new projects here — the list, the Bento "featured" card, detail pages
 * and the page-turn transitions all derive from this array.
 */
export const projects: Project[] = [
  {
    slug: 'llmscore',
    title: { zh: '用 LLM 校准同行评审', en: 'Calibrating Peer Review with LLMs' },
    fullTitle: 'Position: Peer Review Should Be Calibrated via LLM Scoring',
    kind: { zh: '论文 · 数据集', en: 'Paper · Dataset' },
    venue: 'ICML 2026 · Position Track',
    year: '2026',
    role: { zh: '共同第一作者', en: 'Co-first author' },
    summary: {
      zh: '评审给出的分数常常与其写下的理由并不一致。我们主张用大模型从评审理由中推断“锚点分数”，以此度量并校准评审偏差，并发布了覆盖 ICLR 2023–2025 的配套数据集。',
      en: 'Reviewers’ scores often disagree with the rationales they write. We argue for inferring an LLM “anchor score” from review rationales to measure and calibrate reviewer bias, and release a dataset spanning ICLR 2023–2025.',
    },
    authors: ['Zijin Chen', 'Lesui Yu', 'Xiaofei Liao', 'Hai Jin', 'Qinbin Li'],
    me: 1,
    equal: [0, 1],
    links: [
      { label: 'OpenReview', href: 'https://openreview.net/forum?id=PEyouQzOLD' },
      { label: 'GitHub', href: 'https://github.com/wutaghost/LLMscore-ICLR-OpenReview' },
      { label: 'Hugging Face', href: 'https://huggingface.co/datasets/Wutaghost/LLMscore-ICLR-OpenReview' },
    ],
    stats: [
      { value: 22177, label: { zh: '篇论文', en: 'papers' } },
      { value: 52369, label: { zh: '条评审', en: 'reviews' } },
      { value: 435754, label: { zh: '条理由单元', en: 'rationale items' } },
    ],
    bars: {
      title: { zh: '各年份论文数', en: 'Papers per year' },
      items: [
        { label: 'ICLR 2023', value: 3507 },
        { label: 'ICLR 2024', value: 7150 },
        { label: 'ICLR 2025', value: 11520 },
      ],
    },
    sections: [
      {
        heading: { zh: '问题', en: 'The problem' },
        body: {
          zh: '同一篇论文，不同评审写下相似的优缺点，却可能给出相差甚远的分数。分数是决策的依据，而理由才是判断的证据——当两者脱节，评审就会被个人尺度的偏差所左右。',
          en: 'For the same paper, reviewers can list similar strengths and weaknesses yet give wildly different scores. Scores drive decisions, but rationales carry the evidence — when the two drift apart, outcomes depend on each reviewer’s private scale.',
        },
      },
      {
        heading: { zh: '主张', en: 'The position' },
        body: {
          zh: '用统一的大模型评分协议，从评审的结构化理由（优点 / 缺点）中推断一个锚点分数 expected_score，再以评审实际给分与锚点之差（bias）作为可度量的残差，用于校准评审、分析偏差。',
          en: 'Apply one consistent LLM scoring protocol to infer an anchor score (expected_score) from each review’s structured rationale — pros and cons — and treat the gap between the given score and the anchor (bias) as a measurable residual for calibration and bias analysis.',
        },
      },
      {
        heading: { zh: '数据集', en: 'The dataset' },
        body: {
          zh: '数据集覆盖 ICLR 2023、2024、2025，包含论文元数据、评审、匿名化理由单元与论文全文索引。三年使用同一评分协议以保证可比性，并通过“模型是否见过该论文”的筛查降低数据泄漏风险。以 CC-BY-4.0 协议发布于 GitHub 与 Hugging Face。',
          en: 'Covering ICLR 2023, 2024 and 2025: paper metadata, reviews, anonymized rationale items and a full-text index. The same scoring protocol is used across years for comparability, and papers the model recognized were filtered out to reduce leakage. Released under CC-BY-4.0 on GitHub and Hugging Face.',
        },
      },
    ],
    cover: 'scatter',
  },
]

/** How many “ghost” placeholder rows to show for projects still in progress */
export const upcomingSlots = 2
