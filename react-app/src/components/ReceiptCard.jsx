import { useState } from 'react'
import TransactionList from './TransactionList'
import formatDate from '../utils/formatDate'
import { getCategoryColor } from '../utils/categoryColors'

function ReceiptCard({ receipt, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const color = getCategoryColor(receipt.category_name)

  return (
    <div className="group bg-brand-50 rounded-2xl border border-brand-100 p-5 hover:-translate-y-px transition-all">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {receipt.category_name && (
            <>
              <span
                className="text-[10px] uppercase tracking-wider font-semibold"
                style={{ color: color.icon || color.dark || color.hex }}
              >
                {receipt.category_name}
              </span>
            </>
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
          onClick={() => onDelete(receipt.receipt_id)}
          className="text-sm text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all"
        >
          Delete
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-brand-100">
          <TransactionList receiptId={receipt.receipt_id} />
        </div>
      )}
    </div>
  )
}

export default ReceiptCard
