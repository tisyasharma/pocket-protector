import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import { getCategoryColor } from '../utils/categoryColors'
import { getCategoryIcon } from '../utils/categoryIcons'
import formatDate from '../utils/formatDate'

// slide-over panel for a category in the selected time range
function CategoryDrilldown({ category, periodStart, periodEnd, onClose }) {
  const { user } = useAuth()
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)

  const color = getCategoryColor(category)
  const icon = getCategoryIcon(category)

  useEffect(() => {
    if (!user || !category) return
    setLoading(true)

    client.get(
      `/purchases/receipts/${user.user_id}?category=${encodeURIComponent(category)}&start_date=${periodStart}&end_date=${periodEnd}&per_page=100&page=1`
    )
      .then(res => {
        const data = res.data
        setReceipts(data.receipts || data)
      })
      .catch(() => setReceipts([]))
      .finally(() => setLoading(false))
  }, [user, category, periodStart, periodEnd])

  const totalForCategory = receipts.reduce((sum, r) => sum + Number(r.total_amount), 0)

  const storeBreakdown = {}
  receipts.forEach(r => {
    const name = r.store_name || 'Unknown'
    if (!storeBreakdown[name]) {
      storeBreakdown[name] = { total: 0, count: 0 }
    }
    storeBreakdown[name].total += Number(r.total_amount)
    storeBreakdown[name].count += 1
  })

  const topStores = Object.entries(storeBreakdown)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto page-enter">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {icon}
              <h2 className="text-lg font-semibold text-gray-900">{category}</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="mt-3 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-gray-900">${totalForCategory.toFixed(2)}</span>
            <span className="text-sm text-gray-400">
              {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
            </span>
          </div>

          <p className="text-xs text-gray-400 mt-1">
            {formatDate(periodStart)} to {formatDate(periodEnd)}
          </p>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <p className="text-sm text-gray-400">Loading receipts...</p>
          ) : (
            <>
              {topStores.length > 1 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-3">Top merchants</h3>
                  <div className="space-y-2">
                    {topStores.slice(0, 5).map(store => (
                      <div key={store.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color.hex }} />
                          <span className="text-sm text-gray-700">{store.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">${store.total.toFixed(2)}</span>
                          <span className="text-xs text-gray-400 ml-2">{store.count}x</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-3">All receipts</h3>
                {receipts.length === 0 ? (
                  <p className="text-sm text-gray-400">No receipts found.</p>
                ) : (
                  <div className="space-y-2">
                    {receipts.map(r => (
                      <div
                        key={r.receipt_id}
                        className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                      >
                        <div>
                          <p className="text-sm text-gray-900">
                            {r.store_name || `Receipt #${r.receipt_id}`}
                          </p>
                          <p className="text-xs text-gray-400">{formatDate(r.date)}</p>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          ${Number(r.total_amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default CategoryDrilldown
