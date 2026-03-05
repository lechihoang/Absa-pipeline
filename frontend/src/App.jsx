import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Predict from './pages/Predict'

export default function App() {
  const [page, setPage] = useState('dashboard')

  return (
    <div className="min-h-screen bg-bg">
      <nav className="h-14 bg-accent flex items-center px-6 sticky top-0 z-50 shadow-sm">
        <span className="font-display text-sm font-bold tracking-wide text-white mr-8">
          ABSA / CellphoneS
        </span>
        <div className="flex gap-1">
          {[['dashboard', 'Dashboard'], ['predict', 'Live Predict']].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`px-4 h-14 text-sm font-display font-medium tracking-wide transition-colors border-b-2 ${
                page === key
                  ? 'text-white border-white'
                  : 'text-white/70 border-transparent hover:text-white hover:border-white/40'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">
        {page === 'dashboard' ? <Dashboard /> : <Predict />}
      </main>
    </div>
  )
}
