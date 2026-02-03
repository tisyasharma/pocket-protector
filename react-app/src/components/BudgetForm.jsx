import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'

const COMMON_CATEGORIES = [
  'Food & Drink', 'Shopping', 'Entertainment', 'Transportation',
  'Health', 'Travel', 'Services'
]

function BudgetForm({ onCreated, onCancel }) {
  const { user } = useAuth()

  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [form, setForm] = useState({
    amount: '',
    start_date: firstOfMonth.toISOString().split('T')[0],
    end_date: lastOfMonth.toISOString().split('T')[0],
    category_id: ''
  })
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    client.get('/descriptors/categories')
      .then(res => {
        const common = res.data.filter(c => COMMON_CATEGORIES.includes(c.category_name))
        setCategories(common)
      })
      .catch(() => {})
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.amount || !form.end_date || !form.category_id) {
      setError('Please fill in all required fields.')
      return
    }

    client.post(`/management/budgets/${form.category_id}`, {
      amount: form.amount,
      start_date: form.start_date,
      end_date: form.end_date,
      user_id: user.user_id
    })
      .then(() => onCreated())
      .catch(() => setError('Failed to create budget.'))
  }

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">New Budget</h3>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.category_id}
              type="button"
              onClick={() => update('category_id', cat.category_id)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                form.category_id === cat.category_id
                  ? 'bg-[#98c1d9] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Budget Limit</label>
          <input
            type="number"
            step="0.01"
            value={form.amount}
            onChange={e => update('amount', e.target.value)}
            placeholder="500.00"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={form.start_date}
            onChange={e => update('start_date', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={form.end_date}
            onChange={e => update('end_date', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 text-sm bg-[#98c1d9] text-white rounded-md hover:bg-[#84adc5]">
          Create Budget
        </button>
      </div>
    </form>
  )
}

export default BudgetForm
