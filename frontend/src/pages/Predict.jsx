import { useState } from 'react'

const API = '/api'

const ASPECT_CFG = {
  BATTERY:     { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
  CAMERA:      { bg: '#ede9fe', text: '#5b21b6', border: '#7c3aed' },
  DESIGN:      { bg: '#fce7f3', text: '#9d174d', border: '#db2777' },
  FEATURES:    { bg: '#e0e7ff', text: '#3730a3', border: '#6366f1' },
  GENERAL:     { bg: '#d1fae5', text: '#065f46', border: '#10b981' },
  PERFORMANCE: { bg: '#fee2e2', text: '#991b1b', border: '#ef4444' },
  PRICE:       { bg: '#dcfce7', text: '#14532d', border: '#22c55e' },
  SCREEN:      { bg: '#e0f2fe', text: '#0c4a6e', border: '#0ea5e9' },
  'SER&ACC':   { bg: '#ffedd5', text: '#7c2d12', border: '#f97316' },
  STORAGE:     { bg: '#f0fdf4', text: '#166534', border: '#84cc16' },
}

const SENT_CFG = {
  POSITIVE: { text: 'text-pos', bg: 'bg-pos-bg' },
  NEGATIVE: { text: 'text-neg', bg: 'bg-neg-bg' },
  NEUTRAL:  { text: 'text-neu', bg: 'bg-neu-bg' },
}

const EXAMPLES = [
  'Màn hình đẹp, sắc nét, pin trâu nhưng camera hơi thường, giá hơi cao so với cấu hình.',
  'Sản phẩm tuyệt vời, nhân viên nhiệt tình, giao hàng nhanh, đóng gói chắc chắn.',
  'Máy lag, nóng, pin tụt nhanh, rất thất vọng với sản phẩm này.',
]

function HighlightedText({ text, labels }) {
  if (!labels?.length) return <p className="text-primary text-sm leading-7">{text}</p>

  const sorted = [...labels].sort((a, b) => a[0] - b[0])
  const parts = []
  let cursor = 0

  for (const [start, end, tag] of sorted) {
    if (start > cursor) parts.push({ type: 'text', content: text.slice(cursor, start) })
    const [aspect, sent] = tag.split('#')
    parts.push({ type: 'span', content: text.slice(start, end), aspect, sent })
    cursor = end
  }
  if (cursor < text.length) parts.push({ type: 'text', content: text.slice(cursor) })

  return (
    <p className="text-sm leading-8">
      {parts.map((p, i) => {
        if (p.type === 'text') return <span key={i} className="text-primary">{p.content}</span>
        const cfg = ASPECT_CFG[p.aspect] ?? { bg: '#f1f5f9', text: '#334155', border: '#94a3b8' }
        return (
          <span key={i}>
            <span
              className="inline-block font-mono text-[10px] font-medium px-1 py-0 rounded mr-0.5 translate-y-[-1px]"
              style={{ background: cfg.border + '22', color: cfg.border, border: `1px solid ${cfg.border}55` }}
            >
              #{p.aspect}
            </span>
            <span className="font-medium rounded px-0.5" style={{ background: cfg.bg, color: cfg.text }}>
              {p.content}
            </span>
          </span>
        )
      })}
    </p>
  )
}

function SentChip({ s }) {
  const cfg = SENT_CFG[s] ?? SENT_CFG.NEUTRAL
  return (
    <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${cfg.text} ${cfg.bg}`}>{s}</span>
  )
}

export default function Predict() {
  const [text, setText]       = useState('')
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch(`${API}/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      })
      if (!res.ok) throw new Error((await res.json()).detail ?? res.statusText)
      setResult(await res.json())
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-5">

      {/* Input */}
      <div className="bg-surface border border-border">
        <div className="px-5 py-3 border-b border-border bg-surface2">
          <p className="font-mono text-[10px] tracking-widest text-secondary uppercase">
            Input — Vietnamese Review
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Nhập đánh giá tiếng Việt…"
            rows={4}
            className="w-full bg-bg border border-border text-primary font-sans text-sm px-4 py-3 resize-none focus:outline-none focus:border-accent transition-colors placeholder:text-dim"
          />
          <div className="flex gap-3 items-center">
            <button
              type="submit"
              disabled={loading || !text.trim()}
              className="font-mono text-xs tracking-widest uppercase px-5 py-2 bg-accent text-white font-medium hover:bg-accent/90 disabled:opacity-40 disabled:cursor-default transition-colors"
            >
              {loading ? 'Processing…' : 'Analyse →'}
            </button>
            <button
              type="button"
              onClick={() => { setText(''); setResult(null); setError(null) }}
              className="font-mono text-xs text-secondary hover:text-primary transition-colors"
            >
              Clear
            </button>
          </div>
        </form>

        <div className="px-5 pb-5 space-y-1.5">
          <p className="font-mono text-[10px] tracking-widest text-dim uppercase mb-2">Examples</p>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => { setText(ex); setResult(null) }}
              className="block w-full text-left font-sans text-xs text-secondary hover:text-accent border border-border hover:border-accent px-3 py-2 transition-colors bg-bg"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="font-mono text-xs text-neg border border-neg/30 bg-neg-bg px-4 py-3">{error}</p>
      )}

      {/* Result */}
      {result && (
        <div className="bg-surface border border-border">
          <div className="px-5 py-3 border-b border-border bg-surface2 flex items-center justify-between">
            <p className="font-mono text-[10px] tracking-widest text-secondary uppercase">Result</p>
            <SentChip s={result.sentiment} />
          </div>

          {/* Highlighted text */}
          <div className="px-5 py-4 border-b border-border">
            <p className="font-mono text-[10px] tracking-widest text-dim uppercase mb-3">Highlighted Spans</p>
            <HighlightedText text={result.text} labels={result.labels} />
          </div>

          {/* Breakdown table */}
          {result.labels.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Aspect</th>
                  <th>Sentiment</th>
                  <th>Span</th>
                </tr>
              </thead>
              <tbody>
                {result.labels.map(([start, end, tag], i) => {
                  const [aspect, sent] = tag.split('#')
                  const cfg = ASPECT_CFG[aspect] ?? { bg: '#f1f5f9', text: '#334155', border: '#94a3b8' }
                  return (
                    <tr key={i}>
                      <td className="font-mono text-xs text-dim tabular-nums">{i + 1}</td>
                      <td>
                        <span
                          className="font-mono text-xs font-medium px-2 py-0.5 rounded"
                          style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}44` }}
                        >
                          {aspect}
                        </span>
                      </td>
                      <td><SentChip s={sent} /></td>
                      <td className="font-sans text-xs text-secondary">
                        "{result.text.slice(start, end)}"
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-4 font-mono text-xs text-secondary">
              No specific aspects detected. Overall: <SentChip s={result.sentiment} />
            </p>
          )}
        </div>
      )}

      {/* Aspect legend */}
      <div className="pt-2">
        <p className="font-mono text-[10px] tracking-widest text-dim uppercase mb-3">Aspect Legend</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ASPECT_CFG).map(([a, cfg]) => (
            <span
              key={a}
              className="font-mono text-[10px] font-medium px-2 py-0.5 rounded"
              style={{ background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}44` }}
            >
              {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
