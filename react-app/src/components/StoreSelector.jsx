import { useState, useEffect, useRef } from 'react'
import client from '../api/client'

function StoreSelector({ value, onChange }) {
  const [query, setQuery] = useState(value || '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (query.length < 1) {
      setResults([])
      return
    }

    const timer = setTimeout(() => {
      client.get(`/purchases/stores/search?q=${encodeURIComponent(query)}`)
        .then(res => {
          setResults(res.data)
          setOpen(true)
        })
        .catch(() => setResults([]))
    }, 200)

    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(store) {
    setQuery(store.store_name)
    onChange({ store_id: store.store_id, store_name: store.store_name })
    setOpen(false)
    setHighlighted(-1)
  }

  function handleInputChange(e) {
    const val = e.target.value
    setQuery(val)
    onChange({ store_id: null, store_name: val })
    setHighlighted(-1)
  }

  function handleKeyDown(e) {
    if (!open || results.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault()
      handleSelect(results[highlighted])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  const showDropdown = open && results.length > 0 && query.length > 0

  return (
    <div ref={wrapperRef} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">Store</label>
      <input
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Type a store name..."
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
        autoComplete="off"
      />
      {query.length > 0 && results.length === 0 && open && (
        <p className="text-xs text-gray-400 mt-1">New store will be created automatically.</p>
      )}
      {showDropdown && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map((store, i) => (
            <li
              key={store.store_id}
              onClick={() => handleSelect(store)}
              onMouseEnter={() => setHighlighted(i)}
              className={`px-3 py-2 text-sm cursor-pointer ${
                i === highlighted ? 'bg-brand-50 text-brand-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{store.store_name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default StoreSelector
