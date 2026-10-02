export type Lang = 'zh' | 'en'
export type L10n = { zh: string; en: string }

export const profile = {
  id: 'wutaghost',
  name: { zh: '俞乐遂', en: 'Lesui Yu' },
  email: 'U202315428@hust.edu.cn',
  city: { zh: '武汉', en: 'Wuhan' },
  timeZone: 'Asia/Shanghai',
  links: [
    { label: 'GitHub', href: 'https://github.com/wutaghost' },
    { label: 'Hugging Face', href: 'https://huggingface.co/Wutaghost' },
    { label: 'OpenReview', href: 'https://openreview.net/profile?id=~Lesui_Yu3' },
  ],
  research: [
    {
      key: 'AI4OpenReview',
      desc: {
        zh: '用大模型理解、度量与校准学术同行评审。',
        en: 'Using LLMs to understand, measure and calibrate scholarly peer review.',
      },
    },
    {
      key: 'RSI',
      desc: {
        zh: 'Recursive Self-Improvement —— 能够持续改进自身的 AI 系统。',
        en: 'Recursive Self-Improvement — AI systems that keep improving themselves.',
      },
    },
    {
      key: 'AI4Science',
      desc: {
        zh: '让 AI 成为科学发现的加速器。',
        en: 'Making AI an accelerator for scientific discovery.',
      },
    },
  ],
  timeline: [
    {
      when: '2023.09',
      title: { zh: '华中科技大学', en: 'Huazhong University of Science and Technology' },
      role: { zh: '计算机科学与技术学院 · 本科', en: 'B.Eng. in Computer Science and Technology' },
      note: { zh: '开始在 HUST 学习计算机科学。', en: 'Started studying computer science at HUST.' },
    },
    {
      when: '2026',
      title: { zh: 'ICML 2026 · Position Track', en: 'ICML 2026 · Position Track' },
      role: { zh: '论文录用 · 共同第一作者', en: 'Paper accepted · Co-first author' },
      note: {
        zh: '《Position: Peer Review Should Be Calibrated via LLM Scoring》，并公开发布配套数据集。',
        en: '“Position: Peer Review Should Be Calibrated via LLM Scoring”, with its dataset released publicly.',
      },
    },
    {
      when: '2027',
      title: { zh: '本科毕业（预计）', en: 'Graduation (expected)' },
      role: { zh: '进行中', en: 'In progress' },
      note: { zh: '', en: '' },
    },
  ],
}
