import { useState, useEffect } from 'react'

function SpendingGoalCard({ goal, onDelete, onEdit }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const current = Number(goal.current_amount) || 0
  const target = Number(goal.target_amount) || 1
  const percentage = Math.min(Math.round((current / target) * 100), 100)
  const overLimit = current >= target
  const difference = Math.abs(target - current)

  let barColor = 'bg-emerald-500'
  let statusColor = 'text-emerald-600'
  if (percentage >= 100) {
    barColor = 'bg-[#ee6c4d]'
    statusColor = 'text-[#ee6c4d]'
  } else if (percentage > 80) {
    barColor = 'bg-amber-500'
    statusColor = 'text-amber-600'
  }

  return (
    <div className="bg-brand-50 rounded-2xl border border-brand-100 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-brand-400">Monthly Target</p>
          <p className="font-semibold text-gray-900">{goal.Month}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${statusColor}`}>{percentage}%</span>
          {onEdit && (
            <button
              onClick={() => onEdit(goal)}
              className="text-xs text-gray-400 hover:text-brand-500 transition-colors"
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(goal.goal_id)}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex items-end gap-1 mb-2">
        <span className="text-2xl font-bold text-gray-900">${current.toFixed(2)}</span>
        <span className="text-sm text-gray-400 mb-0.5">/ ${target.toFixed(2)}</span>
      </div>

      <div className="w-full bg-white/60 rounded-full h-2 mb-3">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-700 ease-out`}
          style={{ width: mounted ? `${percentage}%` : '0%' }}
        />
      </div>

      {overLimit ? (
        <p className="text-xs text-[#ee6c4d] font-medium">
          ${difference.toFixed(2)} over limit
        </p>
      ) : (
        <p className="text-xs text-gray-400">
          ${difference.toFixed(2)} remaining under limit
        </p>
      )}
    </div>
  )
}

export default SpendingGoalCard
