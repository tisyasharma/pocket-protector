import { useState, useEffect } from 'react'
import TransactionList from './TransactionList'
import formatDate from '../utils/formatDate'
import { getCategoryColor } from '../utils/categoryColors'
import { CATEGORIES } from '../utils/constants'
import client from '../api/client'

// shows previous visits to the same store so users can spot spending patterns
function StoreHistory({ userId, storeId, currentReceiptId }) {
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId || !storeId) {
      setLoading(false)
      return
    }
    client.get(`/purchases/receipts/${userId}/store/${storeId}`)
      .then(res => {
        const all = res.data || []
        setVisits(all.filter(v => v.receipt_id !== currentReceiptId))
      })
      .catch(() => setVisits([]))
      .finally(() => setLoading(false))
  }, [userId, storeId, currentReceiptId])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="w-4 h-4 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        <span className="text-xs text-gray-400">Loading history...</span>
      </div>
    )
  }

  if (visits.length === 0) return null

  const totalAcrossVisits = visits.reduce((sum, v) => sum + Number(v.total_amount), 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-700">
          Previous visits ({visits.length})
        </p>
        <p className="text-xs text-gray-400">
          ${totalAcrossVisits.toFixed(2)} total
        </p>
      </div>
      <div className="space-y-1">
        {visits.map(v => (
          <div key={v.receipt_id} className="flex items-center justify-between py-1">
            <span className="text-xs text-gray-500">{formatDate(v.date)}</span>
            <span className="text-xs font-medium text-gray-700">
              ${Number(v.total_amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ExpandedDetails({ receipt }) {
  return (
    <>
      <TransactionList receiptId={receipt.receipt_id} />
      {receipt.store_id && (
        <div className="mt-4 pt-3 border-t border-brand-100">
          <StoreHistory
            userId={receipt.user_id}
            storeId={receipt.store_id}
            currentReceiptId={receipt.receipt_id}
          />
        </div>
      )}
    </>
  )
}

function ReceiptCard({ receipt, onDelete, onUpdate, layout = 'card' }) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    total_amount: receipt.total_amount,
    date: receipt.date?.split('T')[0] || '',
    category_name: receipt.category_name || ''
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [categories, setCategories] = useState(null)
  const color = getCategoryColor(receipt.category_name)

  // lazy-load the category list the first time the user opens the edit form
  useEffect(() => {
    if (!editing || categories) return
    client.get('/descriptors/categories')
      .then(res => {
        const catList = res.data || []
        const map = {}
        catList.forEach(c => { map[c.category_name] = c.category_id })
        setCategories(map)
      })
      .catch(() => setCategories({}))
  }, [editing, categories])

  function handleSave() {
    setSaving(true)
    setSaveError('')
    const payload = {
      total_amount: editForm.total_amount,
      date: editForm.date
    }

    if (editForm.category_name !== receipt.category_name && categories) {
      const catId = categories[editForm.category_name]
      if (catId) payload.category_id = catId
    }

    client.put(`/purchases/receipts/${receipt.receipt_id}`, payload)
      .then(() => {
        setEditing(false)
        if (onUpdate) onUpdate()
      })
      .catch(() => setSaveError('Failed to save changes'))
      .finally(() => setSaving(false))
  }

  if (editing) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-brand-100 p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-900">
          {receipt.store_name || `Receipt #${receipt.receipt_id}`}
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Amount</label>
            <input
              type="number"
              step="0.01"
              value={editForm.total_amount}
              onChange={e => setEditForm(f => ({ ...f, total_amount: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date</label>
            <input
              type="date"
              value={editForm.date}
              onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-brand-500 focus:border-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category</label>
            <select
              value={editForm.category_name}
              onChange={e => setEditForm(f => ({ ...f, category_name: e.target.value }))}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Select</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
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

  if (layout === 'row') {
    return (
      <div className="group bg-brand-50 rounded-xl border border-brand-100 px-5 py-3 flex items-center flex-wrap gap-4 hover:-translate-y-px transition-all">
        <p className="text-sm font-semibold text-gray-900 w-48 truncate">
          {receipt.store_name || `Receipt #${receipt.receipt_id}`}
        </p>
        {receipt.category_name && (
          <span
            className="text-[10px] uppercase tracking-wider font-semibold w-28 truncate"
            style={{ color: color.icon || color.dark || color.hex }}
          >
            {receipt.category_name}
          </span>
        )}
        <span className="text-sm text-gray-500 w-28">{formatDate(receipt.date)}</span>
        <span className="text-sm font-semibold text-gray-900 ml-auto">
          ${Number(receipt.total_amount).toFixed(2)}
        </span>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-brand-500 hover:text-brand-700 transition-colors"
          >
            {expanded ? 'Hide' : 'Details'}
          </button>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 hover:text-brand-500 transition-all"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(receipt.receipt_id)}
            className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
          >
            Delete
          </button>
        </div>
        {expanded && (
          <div className="w-full mt-3 pt-3 border-t border-brand-100">
            <ExpandedDetails receipt={receipt} />
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="group bg-brand-50 rounded-2xl border border-brand-100 p-5 hover:-translate-y-px transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {receipt.category_name && (
            <span
              className="text-[10px] uppercase tracking-wider font-semibold"
              style={{ color: color.icon || color.dark || color.hex }}
            >
              {receipt.category_name}
            </span>
          )}
        </div>
        <span className="text-lg font-semibold text-gray-900 shrink-0">
          ${Number(receipt.total_amount).toFixed(2)}
        </span>
      </div>

      <p className="text-base font-semibold text-gray-900 mt-2">
        {receipt.store_name || `Receipt #${receipt.receipt_id}`}
      </p>
      <p className="text-sm text-gray-500 mt-0.5">{formatDate(receipt.date)}</p>

      <div className="flex items-center gap-3 mt-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-sm text-brand-500 hover:text-brand-700 transition-colors"
        >
          {expanded ? 'Hide' : 'Details'}
        </button>
        <button
          onClick={() => setEditing(true)}
          className="text-sm text-gray-400 opacity-0 group-hover:opacity-100 hover:text-brand-500 transition-all"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(receipt.receipt_id)}
          className="text-sm text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
        >
          Delete
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-brand-100">
          <ExpandedDetails receipt={receipt} />
        </div>
      )}
    </div>
  )
}

export default ReceiptCard
