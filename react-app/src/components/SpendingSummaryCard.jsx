import { getCategoryColor } from '../utils/categoryColors'
import { getCategoryIcon } from '../utils/categoryIcons'
import AnimatedNumber from './AnimatedNumber'
import ComparisonBadge from './ComparisonBadge'

// build a simple gradient for the summary bar
function buildGradient(categories, totalSpent) {
  if (categories.length === 0 || totalSpent <= 0) return null

  const stops = []
  let cumulative = 0
  const blend = 3

  categories.forEach((cat, i) => {
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

function SpendingSummaryCard({ summary, period, receiptCount, onCategoryClick }) {
  const totalSpent = summary?.total_spent || 0
  const categories = summary?.by_category || []
  const gradient = buildGradient(categories, totalSpent)

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <div>
        <p className="text-sm text-gray-400">Total Spent</p>
        <p className="text-5xl font-bold tracking-tight text-gray-900 mt-1">
          <AnimatedNumber value={totalSpent} />
        </p>
        {summary && (
          <div className="mt-2">
            <ComparisonBadge
              current={summary.total_spent}
              previous={summary.previous_total}
              period={period}
            />
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <div className="mt-6">
          <div
            className="h-2.5 rounded-full overflow-hidden bg-gray-100"
            style={gradient ? { background: gradient } : undefined}
          />

          <div className="flex flex-wrap gap-4 mt-3">
            {categories.map(cat => {
              const icon = getCategoryIcon(cat.category_name)
              return (
                <div
                  key={cat.category_name}
                  className="flex items-center gap-1.5 cursor-pointer hover:opacity-70 transition-opacity"
                  onClick={() => onCategoryClick?.(cat.category_name)}
                >
                  {icon}
                  <span className="text-xs text-gray-500">{cat.category_name}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6 pt-4 border-t border-gray-100">
        <span className="text-sm text-gray-400">
          {receiptCount} receipt{receiptCount !== 1 ? 's' : ''} this {period}
        </span>
      </div>
    </div>
  )
}

export default SpendingSummaryCard
