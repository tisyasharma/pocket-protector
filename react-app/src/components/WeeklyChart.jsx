import { useState, useEffect, useRef } from 'react'
import { getCategoryColor } from '../utils/categoryColors'
import { toISO } from '../utils/constants'

// creates a vertical CSS gradient so each bar can show its category breakdown
function buildBarGradient(segments, total) {
  if (!segments || segments.length === 0) return '#3d5a80'
  if (segments.length === 1) return getCategoryColor(segments[0].category_name).hex

  const BLEND = 2
  const stops = []
  let cursor = 0

  segments.forEach((seg, i) => {
    const pct = (seg.total / total) * 100
    const color = getCategoryColor(seg.category_name).hex
    const start = cursor
    const end = cursor + pct

    if (i === 0) {
      stops.push(`${color} ${Math.max(end - BLEND, start)}%`)
    } else if (i === segments.length - 1) {
      stops.push(`${color} ${Math.min(start + BLEND, end)}%`)
    } else {
      stops.push(`${color} ${Math.min(start + BLEND, end)}%`)
      stops.push(`${color} ${Math.max(end - BLEND, start)}%`)
    }

    cursor = end
  })

  return `linear-gradient(to top, ${stops.join(', ')})`
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// pad daily data to a full Mon-Sun week so the chart always has 7 bars
function buildFullWeek(dailyData, periodStart) {
  const monday = new Date(periodStart + 'T00:00:00')
  const days = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    const iso = d.toISOString().split('T')[0]
    const existing = dailyData?.find(row => toISO(row.day_date) === iso)
    days.push({
      day_date: iso,
      total: existing ? Number(existing.total) : 0
    })
  }
  return days
}

// pick "nice" round numbers for the y-axis gridlines (e.g. $0, $50, $100)
function computeGridTicks(maxVal, targetCount = 4) {
  if (maxVal <= 0) return [0]
  const rawStep = maxVal / targetCount
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)))
  const normalized = rawStep / magnitude

  let niceStep
  if (normalized <= 1) niceStep = magnitude
  else if (normalized <= 2) niceStep = 2 * magnitude
  else if (normalized <= 5) niceStep = 5 * magnitude
  else niceStep = 10 * magnitude

  const ticks = []
  for (let v = 0; v <= maxVal + niceStep * 0.01; v += niceStep) {
    ticks.push(Math.round(v))
  }
  if (ticks[ticks.length - 1] < maxVal) {
    ticks.push(ticks[ticks.length - 1] + Math.round(niceStep))
  }
  return ticks
}

function formatDollar(val) {
  if (val >= 1000) return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`
  return `$${val}`
}

function SpendingChart({
  data, categoryData,
  dailyData, dailyCategoryData,
  monthlyData, monthlyCategoryData,
  period, periodStart
}) {
  const [mounted, setMounted] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const tooltipRef = useRef(null)

  const isDaily = period === 'week'
  const isMonthly = period === 'year'

  // pick the right data source depending on period: daily for week view,
  // monthly buckets for year view, weekly buckets for month view
  let chartData, dateKey, categorySource

  if (isDaily) {
    chartData = buildFullWeek(dailyData, periodStart)
    dateKey = 'day_date'
    categorySource = dailyCategoryData
  } else if (isMonthly && monthlyData && monthlyData.length > 0) {
    chartData = monthlyData
    dateKey = 'month_start'
    categorySource = monthlyCategoryData
  } else {
    chartData = data
    dateKey = 'week_start'
    categorySource = categoryData
  }

  useEffect(() => {
    setMounted(false)
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [data, dailyData, monthlyData, period])

  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">{getHeading(period)}</h2>
        <p className="text-sm text-gray-400">No data for this period.</p>
      </div>
    )
  }

  const maxAmount = Math.max(...chartData.map(d => Number(d.total)), 1)
  const ticks = computeGridTicks(maxAmount)
  const ceilAmount = ticks[ticks.length - 1] || maxAmount

  function buildCategoryMap() {
    if (!categorySource || categorySource.length === 0) return null
    const map = {}
    categorySource.forEach(row => {
      const key = toISO(row[dateKey])
      if (!map[key]) map[key] = []
      map[key].push({
        category_name: row.category_name,
        total: Number(row.total)
      })
    })
    return map
  }

  function formatLabel(item, index) {
    if (isDaily) {
      const d = new Date(item.day_date + 'T00:00:00')
      if (isNaN(d.getTime())) return DAY_NAMES[index] || ''
      const dayIndex = (d.getDay() + 6) % 7
      return DAY_NAMES[dayIndex]
    }
    if (isMonthly) {
      const d = new Date(item.month_start + 'T00:00:00')
      if (isNaN(d.getTime())) return ''
      return MONTH_ABBR[d.getMonth()]
    }
    const d = new Date(item.week_start)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function extractYear() {
    if (isMonthly && monthlyData && monthlyData.length > 0) {
      const d = new Date(monthlyData[0].month_start + 'T00:00:00')
      if (!isNaN(d.getTime())) return d.getFullYear()
    }
    if (data && data[0]?.week_start) {
      const d = new Date(data[0].week_start)
      if (!isNaN(d.getTime())) return d.getFullYear()
    }
    return null
  }

  const categoryMap = buildCategoryMap()
  const useStacked = categoryMap !== null
  const year = !isDaily ? extractYear() : null
  const heading = getHeading(period)
  const chartHeight = isDaily ? 'h-48' : 'h-56'

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-base font-semibold text-gray-900">{heading}</h2>
        {year && <span className="text-xs text-gray-400">{year}</span>}
      </div>

      <div className="flex">
        <div className={`flex flex-col justify-between ${chartHeight} pr-2 shrink-0`} style={{ width: '48px' }}>
          {[...ticks].reverse().map((tick, i) => (
            <span key={i} className="text-[10px] text-gray-400 text-right leading-none">
              {formatDollar(tick)}
            </span>
          ))}
        </div>

        <div className={`flex-1 relative ${chartHeight}`}>
          {ticks.map((tick, i) => {
            const pct = ceilAmount > 0 ? (tick / ceilAmount) * 100 : 0
            return (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-gray-100"
                style={{ bottom: `${pct}%` }}
              />
            )
          })}

          <div className="flex gap-1.5 h-full relative z-10">
            {chartData.map((item, index) => {
              const itemTotal = Number(item.total)
              const barHeight = ceilAmount > 0 ? (itemTotal / ceilAmount) * 100 : 0
              const itemKey = toISO(item[dateKey])
              const segments = useStacked ? (categoryMap[itemKey] || []) : []

              return (
                <div
                  key={itemKey || index}
                  className="flex-1 min-w-0 h-full flex flex-col justify-end items-center relative"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {itemTotal > 0 && useStacked ? (
                    <div
                      className="w-full rounded-t-md overflow-hidden transition-all duration-700 ease-out"
                      style={{
                        height: mounted ? `${barHeight}%` : '0%',
                        background: buildBarGradient(segments, itemTotal)
                      }}
                    />
                  ) : itemTotal > 0 ? (
                    <div
                      className="w-full rounded-t-md transition-all duration-700 ease-out"
                      style={{
                        height: mounted ? `${barHeight}%` : '0%',
                        backgroundColor: '#3d5a80',
                        transitionDelay: `${index * 60}ms`
                      }}
                    />
                  ) : null}

                  {hoveredIndex === index && itemTotal > 0 && (
                    <div
                      ref={tooltipRef}
                      className="fixed bg-brand-50 border border-brand-100 text-gray-700 text-xs rounded-xl px-3 py-2 pointer-events-none whitespace-nowrap shadow-md z-20"
                      style={{ left: mousePos.x + 12, top: mousePos.y - 12 }}
                    >
                      <p className="font-semibold text-gray-900 mb-1">${itemTotal.toFixed(2)}</p>
                      {segments.map(seg => {
                        const color = getCategoryColor(seg.category_name)
                        return (
                          <div key={seg.category_name} className="flex items-center gap-1.5">
                            <span className="font-medium" style={{ color: color.icon || color.dark || color.hex }}>
                              {seg.category_name}
                            </span>
                            <span className="text-gray-500">: ${seg.total.toFixed(2)}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex" style={{ paddingLeft: '48px' }}>
        <div className="flex-1 flex gap-1.5">
          {chartData.map((item, index) => (
            <span key={index} className="flex-1 text-xs text-gray-400 text-center mt-1">
              {formatLabel(item, index)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function getHeading(period) {
  if (period === 'week') return 'Spending by day'
  if (period === 'year') return 'Spending by month'
  return 'Spending by week'
}

export default SpendingChart
