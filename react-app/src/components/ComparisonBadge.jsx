function ComparisonBadge({ current, previous, period }) {
  if (!previous || previous === 0) return null

  const diff = current - previous
  const isMore = diff > 0
  const absDiff = Math.abs(diff)

  const periodLabel = period === 'week' ? 'week' : period === 'year' ? 'year' : 'month'

  return (
    <p className="text-sm text-gray-500 flex items-center gap-1">
      <span>You spent{' '}
        <span className={`font-medium ${isMore ? 'text-[#ee6c4d]' : 'text-emerald-500'}`}>
          ${absDiff.toFixed(2)}
        </span>
        {' '}{isMore ? 'more' : 'less'} than last {periodLabel}
      </span>
      {isMore ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#ee6c4d] inline-block">
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 inline-block">
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="19 12 12 19 5 12" />
        </svg>
      )}
    </p>
  )
}

export default ComparisonBadge
