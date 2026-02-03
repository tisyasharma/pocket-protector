import { Link } from 'react-router-dom'
import { getCategoryColor } from '../utils/categoryColors'
import formatDate from '../utils/formatDate'

function RecentReceipts({ receipts }) {
  return (
    <div className="h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Recent receipts</h2>
        <Link to="/receipts" className="text-sm text-brand-500 hover:text-brand-700">
          View all
        </Link>
      </div>
      {receipts.length === 0 ? (
        <p className="text-sm text-gray-400">No receipts for this period.</p>
      ) : (
        <div className="space-y-2">
          {receipts.map(r => {
            const color = getCategoryColor(r.category_name)
            return (
              <div
                key={r.receipt_id}
                className="bg-brand-50 rounded-2xl border border-brand-100 p-3 flex justify-between items-center hover:-translate-y-px transition-all"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {r.store_name || `Receipt #${r.receipt_id}`}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-gray-500">{formatDate(r.date)}</p>
                    {r.category_name && (
                      <span
                        className="text-xs font-medium"
                        style={{ color: color.icon || color.dark || color.hex }}
                      >
                        {r.category_name}
                      </span>
                    )}
                  </div>
                </div>
                <span className="font-semibold text-gray-900">
                  ${Number(r.total_amount).toFixed(2)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default RecentReceipts
