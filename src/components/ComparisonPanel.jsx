import { useEffect, useState } from 'react'
import * as db from '../db.js'

export default function ComparisonPanel({ exerciseId, refreshKey }) {
  const [mode, setMode] = useState(null) // null | 'last' | 'best'
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mode) return
    setLoading(true)
    const fetcher = mode === 'last' ? db.getLastWeekComparison : db.getBestWeekComparison
    fetcher(exerciseId).then((r) => {
      setResult(r)
      setLoading(false)
    })
  }, [mode, exerciseId, refreshKey])

  function toggle(next) {
    setMode((current) => (current === next ? null : next))
  }

  return (
    <div className="comparison">
      <div className="comparison-toggle">
        <button className={mode === 'last' ? 'active' : ''} onClick={() => toggle('last')}>
          Last week
        </button>
        <button className={mode === 'best' ? 'active' : ''} onClick={() => toggle('best')}>
          Best week
        </button>
      </div>

      {mode && (
        <div className="comparison-body">
          {loading && <div className="hint">Loading…</div>}
          {!loading && !result && (
            <div className="hint">
              {mode === 'last'
                ? 'No matching exercise found in the previous week of this block.'
                : 'No matching exercise with logged sets found elsewhere in this block.'}
            </div>
          )}
          {!loading && result && (
            <>
              <div className="hint">
                Week {result.week.weekNumber} · {result.day.name}
                {mode === 'best' && ` · Total volume: ${result.volume}`}
              </div>
              {result.sets.map((set, i) => (
                <div className="set-row" key={set.id}>
                  <span className="set-index">{i + 1}</span>
                  <span className="set-values">
                    {set.weight} × {set.reps}
                    {set.rpe != null && <span className="set-rpe"> @ RPE {set.rpe}</span>}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
