import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import ReceiptCard from '../components/ReceiptCard'
import ReceiptForm from '../components/ReceiptForm'
import EmptyState from '../components/EmptyState'

const CATEGORIES = [
  'Food & Drink', 'Shopping', 'Entertainment', 'Transportation',
  'Health', 'Travel', 'Services'
]

function Receipts() {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const debounceRef = useRef(null)

  useEffect(() => {
    // debounce search input
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [search])

  const fetchReceipts = useCallback(() => {
    setLoading(true)
    // build query params from filters
    const params = new URLSearchParams()
    params.set('page', page)
    params.set('per_page', 20)
    if (debouncedSearch) params.set('search', debouncedSearch)
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    if (categoryFilter) params.set('category', categoryFilter)

    client.get(`/purchases/receipts/${user.user_id}?${params.toString()}`)
      .then(res => {
        setReceipts(res.data.receipts)
        setTotalPages(res.data.total_pages)
      })
      .catch(() => {
        setReceipts([])
        setTotalPages(1)
      })
      .finally(() => setLoading(false))
  }, [user, debouncedSearch, startDate, endDate, categoryFilter, page])

  useEffect(() => {
    fetchReceipts()
  }, [fetchReceipts])

  function handleDelete(receiptId) {
    client.delete(`/purchases/receipts/${receiptId}`)
      .then(() => fetchReceipts())
      .catch(() => {})
  }

  function handleCreated() {
    setShowForm(false)
    setPage(1)
    fetchReceipts()
  }

  function handleCategoryToggle(cat) {
    setCategoryFilter(prev => prev === cat ? '' : cat)
    setPage(1)
  }

  function handleDateChange(field, value) {
    if (field === 'start') setStartDate(value)
    else setEndDate(value)
    setPage(1)
  }

  function clearFilters() {
    setSearch('')
    setDebouncedSearch('')
    setStartDate('')
    setEndDate('')
    setCategoryFilter('')
    setPage(1)
  }

  const hasFilters = debouncedSearch || startDate || endDate || categoryFilter

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-sm bg-[#98c1d9] text-white rounded-md hover:bg-[#84adc5] transition-colors"
        >
          {showForm ? 'Cancel' : 'Add Receipt'}
        </button>
      </div>

      {showForm && (
        <ReceiptForm
          userId={user.user_id}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by store name..."
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
          <input
            type="date"
            value={startDate}
            onChange={e => handleDateChange('start', e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
          <input
            type="date"
            value={endDate}
            onChange={e => handleDateChange('end', e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => handleCategoryToggle(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading receipts...</p>
      ) : receipts.length === 0 ? (
        <EmptyState
          title="No Receipts"
          message={hasFilters ? 'No receipts match your filters.' : 'No receipts found. Add your first receipt to get started.'}
          action={hasFilters ? { label: 'Clear Filters', onClick: clearFilters } : { label: 'Add Receipt', onClick: () => setShowForm(true) }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receipts.map(r => (
              <ReceiptCard key={r.receipt_id} receipt={r} onDelete={handleDelete} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className={`text-sm font-medium transition-colors ${
                  page <= 1
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className={`text-sm font-medium transition-colors ${
                  page >= totalPages
                    ? 'text-gray-300 cursor-not-allowed'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Receipts
