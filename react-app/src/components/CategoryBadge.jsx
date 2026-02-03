function CategoryBadge({ category, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
        selected
          ? 'bg-[#98c1d9] text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {category.category_name}
    </button>
  )
}

export default CategoryBadge
