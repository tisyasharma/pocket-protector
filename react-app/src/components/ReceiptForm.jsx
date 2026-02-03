import { useState, useEffect } from 'react'
import client from '../api/client'
import StoreSelector from './StoreSelector'

const CATEGORIES = [
  'Food & Drink', 'Shopping', 'Entertainment', 'Transportation',
  'Health', 'Travel', 'Services'
]

function ReceiptForm({ userId, onCreated, onCancel }) {
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    total_amount: '',
    store_id: null,
    store_name: '',
    category_id: ''
  })
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    client.get('/descriptors/categories')
      .then(res => {
        const filtered = res.data.filter(c => CATEGORIES.includes(c.category_name))
        setCategories(filtered)
      })
      .catch(() => {})
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!form.total_amount || !form.store_name) {
      setError('Please enter the amount and store name.')
      return
    }

    setSubmitting(true)

    const payload = {
      date: form.date,
      total_amount: form.total_amount,
      store_name: form.store_name
    }
    if (form.store_id) payload.store_id = form.store_id
    if (form.category_id) payload.category_id = form.category_id

    client.post(`/purchases/receipts/${userId}`, payload)
      .then(() => onCreated())
      .catch(() => setError('Failed to create receipt.'))
      .finally(() => setSubmitting(false))
  }

  function handleStoreChange({ store_id, store_name }) {
    setForm(prev => ({ ...prev, store_id, store_name }))
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">New Receipt</h3>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
          <input
            type="number"
            step="0.01"
            value={form.total_amount}
            onChange={e => setForm(prev => ({ ...prev, total_amount: e.target.value }))}
            placeholder="0.00"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
      </div>

      <StoreSelector value={form.store_name} onChange={handleStoreChange} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Category <span className="text-gray-400 font-normal">(optional, auto-assigned if empty)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.category_id}
              type="button"
              onClick={() => setForm(prev => ({
                ...prev,
                category_id: prev.category_id === cat.category_id ? '' : cat.category_id
              }))}
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

      <div className="flex justify-end space-x-3 pt-2">
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
          {submitting ? 'Adding...' : 'Add Receipt'}
        </button>
      </div>
    </form>
  )
}

export default ReceiptForm
