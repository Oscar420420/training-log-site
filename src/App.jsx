import { HashRouter, Routes, Route } from 'react-router-dom'
import { ModeProvider } from './ModeContext.jsx'
import BlocksPage from './pages/BlocksPage.jsx'
import WeeksPage from './pages/WeeksPage.jsx'
import DaysPage from './pages/DaysPage.jsx'
import ExercisesPage from './pages/ExercisesPage.jsx'
import ExercisePage from './pages/ExercisePage.jsx'

function App() {
  return (
    <ModeProvider>
      <HashRouter>
        <div className="app">
          <Routes>
            <Route path="/" element={<BlocksPage />} />
            <Route path="/blocks/:blockId" element={<WeeksPage />} />
            <Route path="/blocks/:blockId/weeks/:weekId" element={<DaysPage />} />
            <Route path="/blocks/:blockId/weeks/:weekId/days/:dayId" element={<ExercisesPage />} />
            <Route
              path="/blocks/:blockId/weeks/:weekId/days/:dayId/exercises/:exerciseId"
              element={<ExercisePage />}
            />
          </Routes>
        </div>
      </HashRouter>
    </ModeProvider>
  )
}

export default App
