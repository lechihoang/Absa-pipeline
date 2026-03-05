import { useEffect, useState } from 'react'

const API = '/api'

// Aspect color system — consistent across whole app
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
  POSITIVE: { text: 'text-pos', bg: 'bg-pos-bg', label: 'POSITIVE' },
  NEGATIVE: { text: 'text-neg', bg: 'bg-neg-bg', label: 'NEGATIVE' },
  NEUTRAL:  { text: 'text-neu', bg: 'bg-neu-bg', label: 'NEUTRAL'  },
}

// ── Inline comment with #ASPECT tags ─────────────────────────────────────────

function CommentWithTags({ text, labels }) {
  if (!labels?.length) return <span className="text-primary text-sm">{text}</span>

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
    <span className="text-sm leading-7">
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
            <span
              className="font-medium rounded px-0.5"
              style={{ background: cfg.bg, color: cfg.text }}
            >
              {p.content}
            </span>
          </span>
        )
      })}
    </span>
  )
}

// ── Sentiment chip ────────────────────────────────────────────────────────────

function SentChip({ s }) {
  const cfg = SENT_CFG[s] ?? SENT_CFG.NEUTRAL
  return (
    <span className={`font-mono text-xs font-semibold px-2 py-0.5 rounded ${cfg.text} ${cfg.bg}`}>
      {s}
    </span>
  )
}

// ── Stat block ────────────────────────────────────────────────────────────────

function StatBlock({ value, label }) {
  return (
    <div className="bg-surface border border-border px-5 py-4 flex-1 min-w-[130px]">
      <div className="font-mono text-2xl font-medium text-primary tabular-nums">
        {value?.toLocaleString() ?? '—'}
      </div>
      <div className="font-mono text-[10px] tracking-widest text-secondary uppercase mt-1">{label}</div>
    </div>
  )
}

// ── Sentiment bar ─────────────────────────────────────────────────────────────

function SentimentBar({ sentiment, count, total }) {
  const cfg = SENT_CFG[sentiment] ?? SENT_CFG.NEUTRAL
  const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0
  const barColor = sentiment === 'POSITIVE' ? 'bg-pos' : sentiment === 'NEGATIVE' ? 'bg-neg' : 'bg-neu'
  return (
    <div className="flex items-center gap-3">
      <span className={`font-mono text-[10px] tracking-widest uppercase w-20 shrink-0 ${cfg.text}`}>
        {sentiment}
      </span>
      <div className="term-bar-track flex-1">
        <div className={`term-bar-fill ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs text-secondary tabular-nums w-28 text-right">
        {count?.toLocaleString()} <span className="text-dim">{pct}%</span>
      </span>
    </div>
  )
}

// ── Aspect bar ────────────────────────────────────────────────────────────────

function AspectBar({ aspect, count, maxCount }) {
  const cfg = ASPECT_CFG[aspect] ?? { border: '#94a3b8' }
  const pct = maxCount > 0 ? (count / maxCount) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span
        className="font-mono text-[10px] font-medium px-1.5 py-0 rounded w-24 shrink-0 text-center truncate"
        style={{ background: cfg.bg ?? '#f1f5f9', color: cfg.text ?? '#334155', border: `1px solid ${cfg.border}55` }}
      >
        {aspect}
      </span>
      <div className="term-bar-track flex-1">
        <div className="term-bar-fill" style={{ width: `${pct}%`, backgroundColor: cfg.border }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-secondary w-14 text-right">
        {count?.toLocaleString()}
      </span>
    </div>
  )
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product, onClick }) {
  const total = product.review_count
  const dist  = product.sentiment_dist ?? {}

  return (
    <button
      onClick={onClick}
      className="bg-surface border border-border hover:border-accent hover:shadow-md transition-all text-left p-4 group"
    >
      <div className="font-display font-semibold text-sm text-primary group-hover:text-accent transition-colors line-clamp-2 mb-3">
        {product.product_name || product.product_slug}
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="font-mono text-xs text-secondary">{total.toLocaleString()} reviews</span>
        {product.avg_rating && (
          <span className="font-mono text-xs text-accent font-medium">★ {product.avg_rating}</span>
        )}
      </div>

      {/* Mini sentiment bar */}
      <div className="flex h-1.5 rounded-none overflow-hidden gap-px">
        {['POSITIVE', 'NEGATIVE', 'NEUTRAL'].map(s => {
          const pct = total > 0 ? ((dist[s] ?? 0) / total) * 100 : 0
          const color = s === 'POSITIVE' ? 'bg-pos' : s === 'NEGATIVE' ? 'bg-neg' : 'bg-neu'
          return pct > 0 ? (
            <div key={s} className={`${color} h-full`} style={{ width: `${pct}%` }} title={`${s}: ${pct.toFixed(0)}%`} />
          ) : null
        })}
      </div>

      <div className="flex gap-3 mt-2">
        {['POSITIVE', 'NEGATIVE', 'NEUTRAL'].map(s => dist[s] ? (
          <span key={s} className={`font-mono text-[10px] ${SENT_CFG[s].text}`}>
            {s[0]} {dist[s]}
          </span>
        ) : null)}
      </div>
    </button>
  )
}

// ── Product reviews (detail view) ────────────────────────────────────────────

function ProductReviews({ product, onBack }) {
  const [reviews, setReviews]   = useState([])
  const [total, setTotal]       = useState(0)
  const [page, setPage]         = useState(1)
  const [sentiment, setSentiment] = useState('')
  const [loading, setLoading]   = useState(true)
  const PAGE_SIZE = 20

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page, size: PAGE_SIZE, product: product.product_slug })
    if (sentiment) params.set('sentiment', sentiment)
    fetch(`${API}/reviews?${params}`)
      .then(r => r.json())
      .then(d => { setReviews(d.items); setTotal(d.total); setLoading(false) })
  }, [page, sentiment, product])

  function changeFilter(val) { setSentiment(val); setPage(1) }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="font-mono text-xs text-secondary hover:text-accent transition-colors flex items-center gap-1"
        >
          ← Back
        </button>
        <div className="h-4 w-px bg-border" />
        <div>
          <h2 className="font-display font-bold text-lg text-primary">
            {product.product_name || product.product_slug}
          </h2>
          <p className="font-mono text-xs text-secondary mt-0.5">
            {product.review_count.toLocaleString()} reviews
            {product.avg_rating && <span className="ml-3 text-accent">★ {product.avg_rating}</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4 items-center flex-wrap">
        {['', 'POSITIVE', 'NEGATIVE', 'NEUTRAL'].map(s => (
          <button
            key={s}
            onClick={() => changeFilter(s)}
            className={`font-mono text-xs px-3 py-1.5 border transition-colors ${
              sentiment === s
                ? 'bg-accent text-white border-accent'
                : 'bg-surface text-secondary border-border hover:border-accent hover:text-accent'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
        <span className="ml-auto font-mono text-xs text-secondary">{total.toLocaleString()} reviews</span>
      </div>

      {/* Table */}
      <div className="bg-surface border border-border overflow-hidden">
        {loading ? (
          <p className="font-mono text-xs text-secondary animate-pulse p-6">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">STT</th>
                  <th>Comment</th>
                  <th className="w-36">Labels</th>
                  <th className="w-28">Sentiment</th>
                  <th className="w-28">Overall</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r, idx) => {
                  const aspects   = [...new Set(r.labels?.map(l => l[2].split('#')[0]) ?? [])]
                  const sentiments = r.labels?.map(l => l[2].split('#')[1]) ?? []
                  return (
                    <tr key={r.review_id}>
                      <td className="font-mono text-xs text-dim tabular-nums text-center">
                        {(page - 1) * PAGE_SIZE + idx + 1}
                      </td>
                      <td className="max-w-xl">
                        <CommentWithTags text={r.content} labels={r.labels} />
                        <div className="font-mono text-[10px] text-dim mt-1">
                          {r.customer_name} · ★{r.rating_id ?? '?'} · {r.created_at?.slice(0, 10)}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {aspects.map((a, i) => {
                            const cfg = ASPECT_CFG[a] ?? {}
                            return (
                              <span
                                key={i}
                                className="font-mono text-[10px] font-medium px-1.5 py-0.5 rounded inline-block"
                                style={{ background: cfg.bg ?? '#f1f5f9', color: cfg.text ?? '#334155', border: `1px solid ${(cfg.border ?? '#94a3b8')}44` }}
                              >
                                {a}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td>
                        <div className="flex flex-col gap-1">
                          {sentiments.map((s, i) => <SentChip key={i} s={s} />)}
                        </div>
                      </td>
                      <td><SentChip s={r.sentiment} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-border">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="font-mono text-xs text-secondary hover:text-accent disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            ← prev
          </button>
          <span className="font-mono text-xs text-dim tabular-nums">
            {page} / {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <button
            disabled={page * PAGE_SIZE >= total}
            onClick={() => setPage(p => p + 1)}
            className="font-mono text-xs text-secondary hover:text-accent disabled:opacity-30 disabled:cursor-default transition-colors"
          >
            next →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard (main view) ─────────────────────────────────────────────────────

export default function Dashboard() {
  const [stats, setStats]             = useState(null)
  const [products, setProducts]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [search, setSearch]           = useState('')

  useEffect(() => {
    Promise.all([
      fetch(`${API}/stats`).then(r => r.json()),
      fetch(`${API}/products`).then(r => r.json()),
    ])
      .then(([s, p]) => { setStats(s); setProducts(p); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  if (loading) return <p className="font-mono text-xs text-secondary animate-pulse mt-8">Loading...</p>
  if (error)   return <p className="font-mono text-xs text-neg border border-neg/30 bg-neg-bg px-4 py-3 mt-8">Error: {error}</p>

  if (selectedProduct) {
    return <ProductReviews product={selectedProduct} onBack={() => setSelectedProduct(null)} />
  }

  const sentTotal    = stats?.total_reviews ?? 0
  const topAspects   = stats?.top_aspects?.slice(0, 8) ?? []
  const maxAspect    = topAspects[0]?.count ?? 1
  const filteredProducts = search
    ? products.filter(p => (p.product_name || p.product_slug).toLowerCase().includes(search.toLowerCase()))
    : products

  return (
    <div className="space-y-6">

      {/* Stats strip */}
      <div className="flex gap-px bg-border">
        <StatBlock value={stats?.total_reviews}            label="Total Reviews" />
        <StatBlock value={stats?.sentiment_dist?.POSITIVE} label="Positive" />
        <StatBlock value={stats?.sentiment_dist?.NEGATIVE} label="Negative" />
        <StatBlock value={stats?.sentiment_dist?.NEUTRAL}  label="Neutral" />
        <StatBlock value={products.length}                 label="Products" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-5 gap-px bg-border">
        <div className="col-span-2 bg-surface px-5 py-5">
          <p className="font-mono text-[10px] tracking-widest text-secondary uppercase mb-4">
            Sentiment Distribution
          </p>
          <div className="space-y-4">
            {['POSITIVE', 'NEGATIVE', 'NEUTRAL'].map(s => (
              <SentimentBar
                key={s}
                sentiment={s}
                count={stats?.sentiment_dist?.[s] ?? 0}
                total={sentTotal}
              />
            ))}
          </div>
        </div>

        <div className="col-span-3 bg-surface px-5 py-5">
          <p className="font-mono text-[10px] tracking-widest text-secondary uppercase mb-4">
            Top Aspects
          </p>
          <div className="space-y-3">
            {topAspects.map(a => (
              <AspectBar key={a.aspect} aspect={a.aspect} count={a.count} maxCount={maxAspect} />
            ))}
          </div>
        </div>
      </div>

      {/* Product list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display font-semibold text-base text-primary">
            Products
            <span className="font-mono text-xs text-secondary font-normal ml-2">
              — click to view reviews
            </span>
          </h2>
          <input
            type="text"
            placeholder="Search product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-surface border border-border text-primary font-sans text-sm px-3 py-1.5 w-56 focus:outline-none focus:border-accent transition-colors placeholder:text-dim"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-px bg-border">
          {filteredProducts.map(p => (
            <ProductCard key={p.product_slug} product={p} onClick={() => setSelectedProduct(p)} />
          ))}
        </div>
      </div>
    </div>
  )
}
