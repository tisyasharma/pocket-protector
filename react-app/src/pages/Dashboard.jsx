import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import CategoryBreakdown from '../components/CategoryBreakdown'
import SpendingChart from '../components/WeeklyChart'
import TimePeriodSelector from '../components/TimePeriodSelector'
import SpendingSummaryCard from '../components/SpendingSummaryCard'
import CategoryDrilldown from '../components/CategoryDrilldown'
import EmptyState from '../components/EmptyState'
import AnimatedNumber from '../components/AnimatedNumber'
import { getCategoryColor } from '../utils/categoryColors'
import formatDate from '../utils/formatDate'

function getMonday(date) {
  // normalize to Monday for week comparisons
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialOffset, setInitialOffset] = useState(null)
  const [initialWeekOffset, setInitialWeekOffset] = useState(null)
  const [initialYearOffset, setInitialYearOffset] = useState(null)
  const [minMonthOffset, setMinMonthOffset] = useState(null)
  const [minWeekOffset, setMinWeekOffset] = useState(null)
  const [minYearOffset, setMinYearOffset] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)

  const [period, setPeriod] = useState('month')
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    if (!user) return

    // find newest + oldest receipt to set slider limits
    client.get(`/purchases/receipts/${user.user_id}?per_page=1&page=1`)
      .then(res => {
        const data = res.data
        const latestReceipts = data.receipts || data
        if (latestReceipts && latestReceipts.length > 0) {
          const raw = latestReceipts[0].date
          const latestDate = new Date(raw)
          const now = new Date()

          const monthDiff = (now.getFullYear() - latestDate.getFullYear()) * 12
            + (now.getMonth() - latestDate.getMonth())
          setInitialOffset(-monthDiff)
          setOffset(-monthDiff)

          const latestMonday = getMonday(latestDate)
          const currentMonday = getMonday(now)
          const weekDiff = Math.round((currentMonday - latestMonday) / (7 * 24 * 60 * 60 * 1000))
          setInitialWeekOffset(-weekDiff)

          const yearDiff = now.getFullYear() - latestDate.getFullYear()
          setInitialYearOffset(-yearDiff)

          const totalPages = data.total_pages || 1
          return client.get(`/purchases/receipts/${user.user_id}?per_page=1&page=${totalPages}`)
        } else {
          setInitialOffset(0)
          setInitialWeekOffset(0)
          setInitialYearOffset(0)
          setMinMonthOffset(0)
          setMinWeekOffset(0)
          setMinYearOffset(0)
          return null
        }
      })
      .then(res => {
        if (!res) return
        const data = res.data
        const oldestReceipts = data.receipts || data
        if (oldestReceipts && oldestReceipts.length > 0) {
          const oldestDate = new Date(oldestReceipts[0].date)
          const now = new Date()

          const monthDiff = (now.getFullYear() - oldestDate.getFullYear()) * 12
            + (now.getMonth() - oldestDate.getMonth())
          setMinMonthOffset(-monthDiff)

          const oldestMonday = getMonday(oldestDate)
          const currentMonday = getMonday(now)
          const weekDiff = Math.round((currentMonday - oldestMonday) / (7 * 24 * 60 * 60 * 1000))
          setMinWeekOffset(-weekDiff)

          const yearDiff = now.getFullYear() - oldestDate.getFullYear()
          setMinYearOffset(-yearDiff)
        }
      })
      .catch(() => {
        setInitialOffset(0)
        setInitialWeekOffset(0)
        setInitialYearOffset(0)
        setMinMonthOffset(0)
        setMinWeekOffset(0)
        setMinYearOffset(0)
      })
  }, [user])

  const fetchPeriodData = useCallback(() => {
    if (!user || initialOffset === null) return

    // load summary + receipts + budgets for the selected window
    setLoading(true)

    client.get(`/purchases/receipts/${user.user_id}/summary?period=${period}&offset=${offset}`)
      .then(res => {
        setSummary(res.data)
        const { period_start, period_end } = res.data

        return Promise.allSettled([
          client.get(`/purchases/receipts/${user.user_id}?start_date=${period_start}&end_date=${period_end}&per_page=5&page=1`),
          client.get(`/management/budgets/user/${user.user_id}?start_date=${period_start}&end_date=${period_end}`)
        ])
      })
      .then(results => {
        if (!results) return
        const [rReceipts, rBudgets] = results

        if (rReceipts.status === 'fulfilled') {
          const data = rReceipts.value.data
          setReceipts(data.receipts || data)
        }
        if (rBudgets.status === 'fulfilled') {
          setBudgets(rBudgets.value.data || [])
        }
      })
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [user, period, offset, initialOffset])

  useEffect(() => {
    fetchPeriodData()
  }, [fetchPeriodData])

  function getMaxOffset() {
    if (period === 'week') return initialWeekOffset
    if (period === 'year') return initialYearOffset
    return initialOffset
  }

  function getMinOffset() {
    if (period === 'week') return minWeekOffset
    if (period === 'year') return minYearOffset
    return minMonthOffset
  }

  function handlePeriodChange(newPeriod) {
    setPeriod(newPeriod)
    if (newPeriod === 'year') {
      setOffset(initialYearOffset)
    } else if (newPeriod === 'week') {
      setOffset(initialWeekOffset)
    } else {
      setOffset(initialOffset)
    }
  }

  function handleCategoryClick(categoryName) {
    setSelectedCategory(categoryName)
  }

  if (loading && initialOffset === null) {
    return <p className="text-gray-400">Loading dashboard...</p>
  }

  const totalSpent = summary?.total_spent || 0
  const isEmpty = totalSpent === 0 && !loading

  const topBudgets = [...budgets]
    .filter(b => Number(b.amount) > 0)
    .map(b => ({
      ...b,
      ratio: Number(b.spent_amount || 0) / Number(b.amount)
    }))
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 3)

  return (
    <div className="space-y-8 page-enter">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back, {user.first_name}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here is your financial overview.</p>
      </div>

      <TimePeriodSelector
        period={period}
        offset={offset}
        maxOffset={getMaxOffset()}
        minOffset={getMinOffset()}
        onPeriodChange={handlePeriodChange}
        onOffsetChange={setOffset}
        periodStart={summary?.period_start}
        periodEnd={summary?.period_end}
      />

      {isEmpty ? (
        <EmptyState
          title="No Data"
          message={`No spending recorded for this ${period}. Try navigating to a different time period.`}
        />
      ) : (
        <>
          <SpendingSummaryCard
            summary={summary}
            period={period}
            receiptCount={receipts.length}
            onCategoryClick={handleCategoryClick}
          />

          {summary && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <CategoryBreakdown
                data={summary.by_category}
                totalSpent={totalSpent}
                onCategoryClick={handleCategoryClick}
              />
              <SpendingChart
                data={summary.by_week}
                categoryData={summary.by_week_category}
                dailyData={summary.by_day}
                dailyCategoryData={summary.by_day_category}
                monthlyData={summary.by_month}
                monthlyCategoryData={summary.by_month_category}
                period={period}
                periodStart={summary.period_start}
              />
            </div>
          )}

          <div className="space-y-8 xl:grid xl:grid-cols-2 xl:gap-8 xl:space-y-0">
            <BudgetAlerts budgets={topBudgets} />
            <RecentReceipts receipts={receipts} />
          </div>
        </>
      )}

      {selectedCategory && summary && (
        <CategoryDrilldown
          category={selectedCategory}
          periodStart={summary.period_start}
          periodEnd={summary.period_end}
          onClose={() => setSelectedCategory(null)}
        />
      )}
    </div>
  )
}

function BudgetAlerts({ budgets }) {
  if (budgets.length === 0) {
    return (
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Budget alerts</h2>
        <p className="text-sm text-gray-400">No budgets for this period.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">Budget alerts</h2>
        <Link to="/budgets" className="text-sm text-brand-500 hover:text-brand-700">
          View all
        </Link>
      </div>
      <div className="space-y-3">
        {budgets.map(b => {
          const spent = Number(b.spent_amount) || 0
          const limit = Number(b.amount) || 1
          const pct = Math.round((spent / limit) * 100)
          const barPct = Math.min(pct, 100)
          const color = getCategoryColor(b.category_name)

          let barColor = 'bg-emerald-500'
          let statusLabel = 'On track'
          let statusStyle = 'text-emerald-600'
          if (pct >= 100) {
            barColor = 'bg-[#ee6c4d]'
            statusLabel = `Over budget`
            statusStyle = 'text-[#ee6c4d]'
          } else if (pct > 80) {
            barColor = 'bg-amber-500'
            statusLabel = 'Getting close'
            statusStyle = 'text-amber-600'
          }

          return (
            <div
              key={b.budget_id}
              className="bg-brand-50 rounded-2xl border border-brand-100 p-4 hover:-translate-y-px transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="text-sm font-semibold"
                    style={{ color: color.icon || color.dark || color.hex }}
                  >
                    {b.category_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${statusStyle}`}>{statusLabel}</span>
                  <span className="text-xs text-gray-400">{pct}%</span>
                </div>
              </div>
              <div className="w-full bg-white/60 rounded-full h-1.5">
                <div
                  className={`${barColor} h-1.5 rounded-full transition-all duration-700 ease-out`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-gray-500">
                  <AnimatedNumber value={spent} /> spent
                </span>
                <span className="text-xs text-gray-400">${limit.toFixed(2)} limit</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RecentReceipts({ receipts }) {
  return (
    <div>
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

export default Dashboard
