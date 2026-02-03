import { useState, useEffect } from 'react'
import client from '../api/client'

function TransactionList({ receiptId }) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    client.get(`/purchases/transactions/${receiptId}`)
      .then(res => setTransactions(res.data))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false))
  }, [receiptId])

  if (loading) return <p className="text-sm text-gray-400">Loading...</p>
  if (transactions.length === 0) return <p className="text-sm text-gray-400">No transactions found.</p>

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="pb-2">Item</th>
          <th className="pb-2">Qty</th>
          <th className="pb-2 text-right">Unit Cost</th>
          <th className="pb-2 text-right">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        {transactions.map(t => (
          <tr key={t.transaction_id} className="border-t border-gray-50">
            <td className="py-1.5 text-gray-700">{t.item_name}</td>
            <td className="py-1.5 text-gray-600">{t.quantity}</td>
            <td className="py-1.5 text-right text-gray-600">${Number(t.unit_cost).toFixed(2)}</td>
            <td className="py-1.5 text-right text-gray-900 font-medium">
              ${(Number(t.unit_cost) * t.quantity).toFixed(2)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default TransactionList
