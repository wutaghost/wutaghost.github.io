import { useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { I18nProvider } from './lib/i18n'
import { bindNavigate } from './lib/transition'
import { Cursor, Toast } from './components/ui'
import { Intro, Nav } from './components/Nav'
import { Home } from './pages/Home'
import { ProjectPage } from './pages/ProjectPage'

function Shell() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const done = useCallback(() => setReady(true), [])
  useEffect(() => bindNavigate(navigate), [navigate])

  return (
    <>
      <Intro onDone={done} />
      <Nav />
      <Routes>
        <Route path="/" element={<Home ready={ready} />} />
        <Route path="/work/:slug" element={<ProjectPage />} />
        <Route path="*" element={<Home ready={ready} />} />
      </Routes>
      <Toast />
      <Cursor />
      <div className="grain" aria-hidden />
    </>
  )
}

export function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </I18nProvider>
  )
}
