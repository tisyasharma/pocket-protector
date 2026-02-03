import { Link } from 'react-router-dom'
import { getCategoryColor } from '../utils/categoryColors'
import AnimatedNumber from './AnimatedNumber'

function BudgetAlerts({ budgets }) {
  if (budgets.length === 0) {
    return (
      <div className="h-full">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Budget alerts</h2>
        <p className="text-sm text-gray-400">No budgets for this period.</p>
      </div>
    )
  }

  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Budget alerts</h2>
        <Link to="/budgets" className="text-sm text-brand-500 hover:text-brand-700">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {budgets.map(b => {
          const spent = Number(b.spent_amount) || 0
          const limit = Number(b.amount) || 1
          const pct = Math.round((spent / limit) * 100)
          const barPct = Math.min(pct, 100)
          const color = getCategoryColor(b.category_name)

          // same projection math as BudgetCard, just in compact form
          const bStart = b.start_date ? new Date(b.start_date) : null
          const bEnd = b.end_date ? new Date(b.end_date) : null
          const now = new Date()
          const budgetEnded = bEnd && now > bEnd
          const totalDays = bStart && bEnd
            ? Math.max(Math.round((bEnd - bStart) / (1000 * 60 * 60 * 24)) + 1, 1)
            : 1
          const refDate = budgetEnded ? bEnd : now
          const daysElapsed = bStart
            ? Math.max(Math.round((refDate - bStart) / (1000 * 60 * 60 * 24)), 1)
            : 1
          const projected = spent > 0 ? (spent / daysElapsed) * totalDays : 0
          const overProjected = projected > limit
          const showProjection = spent > 0 && bStart && bEnd && !budgetEnded

          let barColor = 'bg-emerald-500'
          let statusLabel = 'On track'
          let statusStyle = 'text-emerald-600'
          if (pct >= 100) {
            barColor = 'bg-[#ee6c4d]'
            statusLabel = 'Over budget'
            statusStyle = 'text-[#ee6c4d]'
          } else if (pct > 80) {
            barColor = 'bg-amber-500'
            statusLabel = 'Getting close'
            statusStyle = 'text-amber-600'
          }

          return (
            <div
              key={b.budget_id}
              className="bg-brand-50 rounded-2xl border border-brand-100 p-4 hover:-translate-y-px transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: color.icon || color.dark || color.hex }}
                  >
                    {b.category_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${statusStyle}`}>{statusLabel}</span>
                  <span className="text-xs text-gray-400">{pct}%</span>
                </div>
              </div>
              <div className="w-full bg-white/60 rounded-full h-1.5">
                <div
                  className={`${barColor} h-1.5 rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-gray-500">
                  <AnimatedNumber value={spent} /> spent
                </span>
                <span className="text-xs text-gray-400">${limit.toFixed(2)} limit</span>
              </div>
              {showProjection && (
                <p className={`text-xs mt-1 ${overProjected ? 'text-[#ee6c4d]' : 'text-emerald-600'}`}>
                  Projected: ${projected.toFixed(2)} by end of period
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default BudgetAlerts
