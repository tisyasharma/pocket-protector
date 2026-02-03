// must stay in sync with the Categories table in the database
export const CATEGORIES = [
  'Food & Drink', 'Shopping', 'Entertainment', 'Transportation',
  'Health', 'Travel', 'Services'
]

// normalize various date formats (ISO strings, datetime stamps) to YYYY-MM-DD
export function toISO(dateStr) {
  if (!dateStr) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toISOString().split('T')[0]
}
