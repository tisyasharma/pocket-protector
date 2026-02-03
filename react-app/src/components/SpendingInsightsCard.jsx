import client from '../api/client'
import AnimatedNumber from './AnimatedNumber'
import { toISO } from '../utils/constants'
import formatDate from '../utils/formatDate'

// rough day count for the period, used to compute daily average spending
function getDaysInPeriod(period, periodStart, periodEnd) {
  if (period === 'week') return 7
  if (period === 'year') return 365
  if (periodStart && periodEnd) {
    const start = new Date(periodStart)
    const end = new Date(periodEnd)
    return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1
  }
  return 30
}

function SpendingInsightsCard({
  summary, period, totalSpent, user,
  expandedInsight, setExpandedInsight,
  insightReceipts, setInsightReceipts,
  insightLoading, setInsightLoading,
  topMerchants
}) {
  const dailyAvg = totalSpent / getDaysInPeriod(period, summary.period_start, summary.period_end)

  const byDay = summary.by_day || []
  const highestDay = byDay.reduce((best, d) =>
    Number(d.total) > Number(best?.total || 0) ? d : best
  , null)

  const byWeek = summary.by_week || []
  const highestWeek = byWeek.reduce((best, w) =>
    Number(w.total) > Number(best?.total || 0) ? w : best
  , null)

  // when a user clicks "highest spend day/week", fetch the receipts for
  // that date range and show a merchant-level breakdown below the card
  function toggleInsight(type) {
    if (expandedInsight === type) {
      setExpandedInsight(null)
      setInsightReceipts([])
      return
    }

    setExpandedInsight(type)
    setInsightLoading(true)

    let startDate, endDate
    if (type === 'day' && highestDay) {
      startDate = toISO(highestDay.day_date)
      endDate = startDate
    } else if (type === 'week' && highestWeek) {
      startDate = toISO(highestWeek.week_start)
      const weekEnd = new Date(startDate + 'T00:00:00')
      weekEnd.setDate(weekEnd.getDate() + 6)
      endDate = weekEnd.toISOString().split('T')[0]
    }

    if (!startDate || !endDate || !user) {
      setInsightLoading(false)
      return
    }

    client.get(`/purchases/receipts/${user.user_id}?start_date=${startDate}&end_date=${endDate}&per_page=50&page=1`)
      .then(res => {
        const data = res.data
        setInsightReceipts(data.receipts || data)
      })
      .catch(() => setInsightReceipts([]))
      .finally(() => setInsightLoading(false))
  }

  function buildMerchantBreakdown(receipts) {
    const map = {}
    receipts.forEach(r => {
      const name = r.store_name || '__unlisted__'
      if (!map[name]) map[name] = 0
      map[name] += Number(r.total_amount)
    })
    return Object.entries(map)
      .map(([name, total]) => ({ name, total, unlisted: name === '__unlisted__' }))
      .sort((a, b) => b.total - a.total)
  }

  function formatWeekLabel(weekStart) {
    const iso = toISO(weekStart)
    if (!iso) return ''
    const start = new Date(iso + 'T00:00:00')
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return `${formatDate(iso)} - ${formatDate(end.toISOString().split('T')[0])}`
  }

  const merchantBreakdown = expandedInsight && !insightLoading
    ? buildMerchantBreakdown(insightReceipts)
    : []

  // if the top-spend and most-visited merchant are the same store,
  // collapse them into one column to save horizontal space
  const mostSpent = topMerchants.length > 0 ? topMerchants[0] : null
  const mostVisited = topMerchants.length > 0
    ? topMerchants.reduce((top, m) =>
        Number(m.visit_count) > Number(top.visit_count) ? m : top
      , topMerchants[0])
    : null
  const sameStore = mostSpent && mostVisited
    && mostSpent.store_name === mostVisited.store_name

  const insightColumns = mostSpent
    ? (sameStore ? 4 : 5)
    : 3

  const gridClass = {
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  }[insightColumns]

  return (
    <div className="bg-white rounded-2xl shadow-sm p-5">
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-3">Spending Insights</p>

      <div className={`grid ${gridClass} divide-x divide-gray-100`}>
        <div className="pr-4">
          <p className="text-xs text-gray-400 mb-0.5">Daily average</p>
          <p className="text-lg font-bold text-gray-900">
            <AnimatedNumber value={dailyAvg} />
          </p>
          <p className="text-xs text-gray-400">per day this {period}</p>
        </div>

        {highestDay && (
          <div
            className="px-4 cursor-pointer group"
            onClick={() => toggleInsight('day')}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 mb-0.5">Highest spend day</p>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" className={`text-gray-300 transition-transform ${expandedInsight === 'day' ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            <p className="text-lg font-bold text-gray-900">${Number(highestDay.total).toFixed(2)}</p>
            <p className="text-xs text-gray-400">{formatDate(toISO(highestDay.day_date))}</p>
          </div>
        )}

        {highestWeek && (
          <div
            className="px-4 cursor-pointer group"
            onClick={() => toggleInsight('week')}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400 mb-0.5">Highest spend week</p>
              <svg
                width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" className={`text-gray-300 transition-transform ${expandedInsight === 'week' ? 'rotate-90' : ''}`}
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
            <p className="text-lg font-bold text-gray-900">${Number(highestWeek.total).toFixed(2)}</p>
            <p className="text-xs text-gray-400">{formatWeekLabel(highestWeek.week_start)}</p>
          </div>
        )}

        {mostSpent && (
          <div className="px-4">
            <p className="text-xs text-gray-400 mb-0.5">
              {sameStore
                ? (Number(mostSpent.is_subscription) ? 'Top subscription' : 'Most spent & visited')
                : 'Most spent'}
            </p>
            <p className="text-lg font-bold text-gray-900">{mostSpent.store_name}</p>
            <p className="text-xs text-gray-400">
              <AnimatedNumber value={Number(mostSpent.total_spent)} />
              {Number(mostSpent.is_subscription) ? (
                <span className="ml-1">subscription</span>
              ) : (
                <span className="ml-1">
                  across {mostSpent.visit_count} visit{Number(mostSpent.visit_count) !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        )}

        {mostSpent && !sameStore && mostVisited && (
          <div className="pl-4">
            <p className="text-xs text-gray-400 mb-0.5">
              {Number(mostVisited.is_subscription) ? 'Most frequent' : 'Most visited'}
            </p>
            <p className="text-lg font-bold text-gray-900">{mostVisited.store_name}</p>
            <p className="text-xs text-gray-400">
              <AnimatedNumber value={Number(mostVisited.total_spent)} />
              {Number(mostVisited.is_subscription) ? (
                <span className="ml-1">subscription</span>
              ) : (
                <span className="ml-1">
                  across {mostVisited.visit_count} visit{Number(mostVisited.visit_count) !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {expandedInsight && (
        <div className="border-t border-gray-100 mt-3 pt-3 space-y-1">
          {insightLoading ? (
            <p className="text-xs text-gray-400">Loading...</p>
          ) : (
            merchantBreakdown.map(m => (
              <div key={m.name} className="flex justify-between text-xs">
                <span className="text-gray-600">
                  {m.unlisted ? (
                    <span className="relative group/tip">
                      Unlisted merchant
                      <span className="text-gray-400">*</span>
                      <span className="absolute bottom-full left-0 mb-1 hidden group-hover/tip:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                        No merchant name was provided for this purchase
                      </span>
                    </span>
                  ) : m.name}
                </span>
                <span className="text-gray-900 font-medium">${m.total.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default SpendingInsightsCard
