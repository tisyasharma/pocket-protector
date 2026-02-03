function EmptyState({ title, message, action }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
      <p className="text-gray-400 text-sm font-medium">{title}</p>
      <p className="text-gray-500 mt-2 text-sm">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 text-sm bg-[#98c1d9] text-white rounded-lg hover:bg-[#84adc5] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

export default EmptyState
