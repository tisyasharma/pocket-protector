import { useState } from 'react'
import client from '../api/client'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

function SpendingGoalForm({ userId, onCreated, onCancel, goal }) {
  const editing = !!goal
  const [form, setForm] = useState({
    month: goal?.Month || MONTHS[new Date().getMonth()],
    target_amount: goal?.target_amount || ''
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.target_amount || !form.month) {
      setError('Please fill in all fields.')
      return
    }

    setSubmitting(true)

    const payload = {
      current_amount: 0,
      target_amount: form.target_amount,
      month: form.month
    }

    const request = editing
      ? client.put(`/management/spending-goals/${goal.goal_id}`, payload)
      : client.post(`/management/spending-goals/${userId}`, payload)

    request
      .then(() => onCreated())
      .catch(() => setError(editing ? 'Failed to update goal.' : 'Failed to create goal.'))
      .finally(() => setSubmitting(false))
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-5 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">
        {editing ? 'Edit Spending Goal' : 'New Spending Goal'}
      </h3>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
          <select
            value={form.month}
            onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          >
            {MONTHS.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Spending Limit</label>
          <input
            type="number"
            step="0.01"
            value={form.target_amount}
            onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))}
            placeholder="500.00"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm bg-[#98c1d9] text-white rounded-md hover:bg-[#84adc5] disabled:opacity-50"
        >
          {submitting ? 'Saving...' : editing ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </form>
  )
}

export default SpendingGoalForm
