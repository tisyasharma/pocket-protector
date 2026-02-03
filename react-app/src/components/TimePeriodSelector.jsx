const PERIODS = ['week', 'month', 'year']

function formatPeriodLabel(period, startStr, endStr) {
  if (!startStr) return ''
  const start = new Date(startStr + 'T00:00:00')
  if (period === 'week') {
    const end = new Date(endStr + 'T00:00:00')
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  }
  if (period === 'year') {
    return start.getFullYear().toString()
  }
  return start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function TimePeriodSelector({ period, offset, maxOffset, minOffset, onPeriodChange, onOffsetChange, periodStart, periodEnd }) {
  const cap = maxOffset !== undefined ? maxOffset : 0
  const floor = minOffset !== undefined && minOffset !== null ? minOffset : null
  const atMax = offset >= cap
  const atMin = floor !== null && offset <= floor

  return (
    <div className="flex items-center justify-between">
      <div className="bg-gray-100 rounded-xl p-1 flex">
        {PERIODS.map(p => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              period === p
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => onOffsetChange(offset - 1)}
          disabled={atMin}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
            atMin
              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
          </svg>
        </button>

        <span className="text-sm font-medium text-gray-700 min-w-[160px] text-center">
          {formatPeriodLabel(period, periodStart, periodEnd)}
        </span>

        <button
          onClick={() => onOffsetChange(offset + 1)}
          disabled={atMax}
          className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${
            atMax
              ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-900'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  )
}

export default TimePeriodSelector
