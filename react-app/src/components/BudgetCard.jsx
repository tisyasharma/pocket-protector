import { useState, useEffect } from 'react'
import formatDate, { formatMonthYear } from '../utils/formatDate'
import { getCategoryColor } from '../utils/categoryColors'
import AnimatedNumber from './AnimatedNumber'
import client from '../api/client'

function BudgetCard({ budget, onDelete, onUpdate }) {
  const [mounted, setMounted] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    amount: budget.amount,
    start_date: budget.start_date?.split('T')[0] || '',
    end_date: budget.end_date?.split('T')[0] || '',
    notification_threshold: budget.notification_threshold || ''
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const spent = Number(budget.spent_amount) || 0
  const limit = Number(budget.amount) || 1
  const percentage = Math.min(Math.round((spent / limit) * 100), 100)
  const remaining = Math.max(limit - spent, 0)

  // projection math: extrapolate current daily spending rate to the full
  // budget window so we can warn the user if they're on pace to exceed it
  const now = new Date()
  const budgetStart = budget.start_date ? new Date(budget.start_date) : null
  const budgetEnd = budget.end_date ? new Date(budget.end_date) : null
  const budgetEnded = budgetEnd && now > budgetEnd
  const totalDays = budgetStart && budgetEnd
    ? Math.max(Math.round((budgetEnd - budgetStart) / (1000 * 60 * 60 * 24)) + 1, 1)
    : 1
  const refDate = budgetEnded ? budgetEnd : now
  const daysElapsed = budgetStart
    ? Math.max(Math.round((refDate - budgetStart) / (1000 * 60 * 60 * 24)), 1)
    : 1
  const projectedSpend = spent > 0 ? (spent / daysElapsed) * totalDays : 0
  const overProjected = projectedSpend > limit
  const showProjection = spent > 0 && budgetStart && budgetEnd && !budgetEnded

  // color-code the progress bar: green -> amber -> red
  let barColor = 'bg-emerald-500'
  let statusColor = 'text-emerald-600'
  let statusLabel = 'On track'
  if (percentage >= 100) {
    barColor = 'bg-[#ee6c4d]'
    statusColor = 'text-[#ee6c4d]'
    statusLabel = 'Over budget'
  } else if (percentage > 80) {
    barColor = 'bg-amber-500'
    statusColor = 'text-amber-600'
    statusLabel = 'Getting close'
  }

  const categoryColor = getCategoryColor(budget.category_name)

  function handleSave() {
    setSaving(true)
    setSaveError('')
    client.put(`/management/budgets/${budget.budget_id}`, {
      amount: editForm.amount,
      start_date: editForm.start_date,
      end_date: editForm.end_date,
      notification_threshold: editForm.notification_threshold || null
    })
      .then(() => {
        setEditing(false)
        if (onUpdate) onUpdate()
      })
      .catch(() => setSaveError('Failed to save changes'))
      .finally(() => setSaving(false))
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <p
            className="font-semibold"
            style={{ color: categoryColor.icon || categoryColor.dark || categoryColor.hex }}
          >
            {budget.category_name || 'General'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Budget Limit</label>
            <input
              type="number"
              step="0.01"
              value={editForm.amount}
              onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Start Date</label>
            <input
              type="date"
              value={editForm.start_date}
              onChange={e => setEditForm(f => ({ ...f, start_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">End Date</label>
            <input
              type="date"
              value={editForm.end_date}
              onChange={e => setEditForm(f => ({ ...f, end_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
        </div>

        {saveError && (
          <p className="text-xs text-red-500">{saveError}</p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={() => { setEditing(false); setSaveError('') }}
            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs bg-[#98c1d9] text-white rounded-md hover:bg-[#84adc5] disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md hover:-translate-y-px transition-all">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <p
              className="font-semibold"
              style={{ color: categoryColor.icon || categoryColor.dark || categoryColor.hex }}
            >
              {budget.category_name || 'General'}
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5 ml-[18px]">
            {formatMonthYear(budget.end_date)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 hover:text-brand-500 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(budget.budget_id)}
            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>

      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-2xl font-bold text-gray-900"><AnimatedNumber value={spent} /></span>
          <span className="text-sm text-gray-400 ml-1">/ ${limit.toFixed(2)}</span>
        </div>
        <span className="text-sm font-medium text-gray-500">{percentage}%</span>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-700 ease-out`}
          style={{ width: mounted ? `${percentage}%` : '0%' }}
        />
      </div>

      <p className="text-xs text-gray-400">
        ${remaining.toFixed(2)} remaining
      </p>
      {showProjection && (
        <p className={`text-xs mt-1 ${overProjected ? 'text-[#ee6c4d]' : 'text-emerald-600'}`}>
          Projected: ${projectedSpend.toFixed(2)} by end of period
        </p>
      )}
    </div>
  )
}

export default BudgetCard
