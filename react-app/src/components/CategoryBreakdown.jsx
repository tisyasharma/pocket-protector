import { useState, useEffect } from 'react'
import { getCategoryColor } from '../utils/categoryColors'
import { getCategoryIcon } from '../utils/categoryIcons'

// builds a horizontal CSS gradient for the category bar,
// each segment sized proportionally to its share of total spending
function buildGradient(data, totalSpent, mounted) {
  if (!data || data.length === 0 || totalSpent <= 0 || !mounted) return null

  const stops = []
  let cumulative = 0
  const blend = 3

  data.forEach((cat, i) => {
    const pct = (Number(cat.total) / totalSpent) * 100
    const color = getCategoryColor(cat.category_name)
    const start = cumulative
    const end = cumulative + pct

    if (i > 0 && blend > 0) {
      stops.push(`${color.hex} ${Math.max(start - blend, 0).toFixed(1)}%`)
    } else {
      stops.push(`${color.hex} ${start.toFixed(1)}%`)
    }
    stops.push(`${color.hex} ${end.toFixed(1)}%`)
    cumulative = end
  })

  return `linear-gradient(to right, ${stops.join(', ')})`
}

function CategoryBreakdown({ data, totalSpent, onCategoryClick }) {
  const [mounted, setMounted] = useState(false)
  const [hovered, setHovered] = useState(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-400">No spending data yet.</p>
  }

  const gradient = buildGradient(data, totalSpent, mounted)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Spending by category
      </h2>

      <div className="relative">
        <div
          className="h-2 rounded-full overflow-hidden bg-gray-100 mb-5 cursor-pointer"
          style={gradient ? { background: gradient } : undefined}
          onMouseLeave={() => setHovered(null)}
        >
          {data.map(cat => {
            const pct = totalSpent > 0 ? (Number(cat.total) / totalSpent) * 100 : 0
            return (
              <div
                key={cat.category_name}
                className="inline-block h-full"
                style={{ width: `${pct}%` }}
                onMouseEnter={() => setHovered(cat.category_name)}
                onClick={() => onCategoryClick?.(cat.category_name)}
              />
            )
          })}
        </div>

        {/* floating tooltip positioned over the hovered segment */}
      {hovered && (() => {
          const cat = data.find(c => c.category_name === hovered)
          if (!cat) return null
          const amount = Number(cat.total)
          const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
          const color = getCategoryColor(cat.category_name)

          let leftOffset = 0
          for (const c of data) {
            if (c.category_name === hovered) break
            leftOffset += totalSpent > 0 ? (Number(c.total) / totalSpent) * 100 : 0
          }
          const segWidth = totalSpent > 0 ? (amount / totalSpent) * 100 : 0
          const tooltipLeft = Math.min(Math.max(leftOffset + segWidth / 2, 10), 90)

          return (
            <div
              className="absolute -top-12 transform -translate-x-1/2 bg-brand-50 border border-brand-100 text-gray-700 text-xs rounded-xl px-3 py-1.5 pointer-events-none whitespace-nowrap shadow-md z-10"
              style={{ left: `${tooltipLeft}%` }}
            >
              <span className="font-medium" style={{ color: color.icon || color.dark || color.hex }}>
                {cat.category_name}
              </span>
              <span className="text-gray-500"> : ${amount.toFixed(2)} ({pct}%)</span>
              {cat.count && <span className="text-gray-400 ml-1">{cat.count} txns</span>}
            </div>
          )
        })()}
      </div>

      <div className="space-y-3">
        {data.map(cat => {
          const amount = Number(cat.total)
          const pct = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0
          const icon = getCategoryIcon(cat.category_name)
          const color = getCategoryColor(cat.category_name)
          return (
            <div
              key={cat.category_name}
              className="flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 py-1 rounded-lg transition-colors"
              onClick={() => onCategoryClick?.(cat.category_name)}
            >
              <div className="flex items-center gap-2">
                {icon}
                <span
                  className="text-sm font-medium"
                  style={{ color: color.icon || color.dark || color.hex }}
                >
                  {cat.category_name || 'Uncategorized'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">${amount.toFixed(2)}</span>
                <span className="text-xs text-gray-400 w-8 text-right">{pct}%</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CategoryBreakdown
