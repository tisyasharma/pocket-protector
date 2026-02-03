import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import CategoryBreakdown from '../components/CategoryBreakdown'
import SpendingChart from '../components/WeeklyChart'
import TimePeriodSelector from '../components/TimePeriodSelector'
import SpendingSummaryCard from '../components/SpendingSummaryCard'
import SpendingInsightsCard from '../components/SpendingInsightsCard'
import BudgetAlerts from '../components/BudgetAlerts'
import RecentReceipts from '../components/RecentReceipts'
import CategoryDrilldown from '../components/CategoryDrilldown'
import EmptyState from '../components/EmptyState'

// returns the Monday of whatever week `date` falls in,
// used to align week-based offset calculations
function getMonday(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
    </div>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [receipts, setReceipts] = useState([])
  const [budgets, setBudgets] = useState([])
  const [topMerchants, setTopMerchants] = useState([])
  const [loading, setLoading] = useState(true)
  const [initialOffset, setInitialOffset] = useState(null)
  const [initialWeekOffset, setInitialWeekOffset] = useState(null)
  const [initialYearOffset, setInitialYearOffset] = useState(null)
  const [minMonthOffset, setMinMonthOffset] = useState(null)
  const [minWeekOffset, setMinWeekOffset] = useState(null)
  const [minYearOffset, setMinYearOffset] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [expandedInsight, setExpandedInsight] = useState(null)
  const [insightReceipts, setInsightReceipts] = useState([])
  const [insightLoading, setInsightLoading] = useState(false)

  const [period, setPeriod] = useState('month')
  const [offset, setOffset] = useState(0)

  // on mount, figure out the most recent and oldest receipt dates so we
  // can set initial offsets and nav bounds for every period type
  useEffect(() => {
    if (!user) return

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

  // pulls summary + recent receipts + budgets + top merchants in parallel
  // once the summary endpoint returns the date range for this period
  const fetchPeriodData = useCallback(() => {
    if (!user || initialOffset === null) return

    setLoading(true)

    client.get(`/purchases/receipts/${user.user_id}/summary?period=${period}&offset=${offset}`)
      .then(res => {
        setSummary(res.data)
        const { period_start, period_end } = res.data

        return Promise.allSettled([
          client.get(`/purchases/receipts/${user.user_id}?start_date=${period_start}&end_date=${period_end}&per_page=5&page=1`),
          client.get(`/management/budgets/user/${user.user_id}?start_date=${period_start}&end_date=${period_end}`),
          client.get(`/purchases/receipts/${user.user_id}/top-merchants?period=${period}&offset=${offset}&limit=5`)
        ])
      })
      .then(results => {
        if (!results) return
        const [rReceipts, rBudgets, rMerchants] = results

        if (rReceipts.status === 'fulfilled') {
          const data = rReceipts.value.data
          setReceipts(data.receipts || data)
        }
        if (rBudgets.status === 'fulfilled') {
          setBudgets(rBudgets.value.data || [])
        }
        if (rMerchants.status === 'fulfilled') {
          setTopMerchants(rMerchants.value.data || [])
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

  // when switching between week/month/year, jump to that period's latest data
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
    return <Spinner />
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
            <SpendingInsightsCard
              summary={summary}
              period={period}
              totalSpent={totalSpent}
              user={user}
              expandedInsight={expandedInsight}
              setExpandedInsight={setExpandedInsight}
              insightReceipts={insightReceipts}
              setInsightReceipts={setInsightReceipts}
              insightLoading={insightLoading}
              setInsightLoading={setInsightLoading}
              topMerchants={topMerchants}
            />
          )}

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

export default Dashboard
