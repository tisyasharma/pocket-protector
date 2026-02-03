import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import client from '../api/client'
import BudgetCard from '../components/BudgetCard'
import BudgetForm from '../components/BudgetForm'
import SpendingGoalCard from '../components/SpendingGoalCard'
import SpendingGoalForm from '../components/SpendingGoalForm'
import AnimatedNumber from '../components/AnimatedNumber'
import EmptyState from '../components/EmptyState'
import { CATEGORIES } from '../utils/constants'

function Budgets() {
  const { user } = useAuth()
  const [budgets, setBudgets] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [showHistorical, setShowHistorical] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [error, setError] = useState('')

  // fetch budgets and goals in parallel, using allSettled so one
  // failure doesn't block the other from rendering
  function fetchData() {
    setLoading(true)
    const activeParam = showHistorical ? '' : '?active=true'
    Promise.allSettled([
      client.get(`/management/budgets/user/${user.user_id}${activeParam}`),
      client.get(`/management/spending-goals/${user.user_id}`)
    ]).then(([rBudgets, rGoals]) => {
      if (rBudgets.status === 'fulfilled') setBudgets(rBudgets.value.data)
      if (rGoals.status === 'fulfilled') setGoals(rGoals.value.data)
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchData()
  }, [user, showHistorical])

  function handleDeleteBudget(budgetId) {
    setError('')
    client.delete(`/management/budgets/${budgetId}`)
      .then(() => fetchData())
      .catch(() => setError('Failed to delete budget'))
  }

  function handleDeleteGoal(goalId) {
    setError('')
    client.delete(`/management/spending-goals/${goalId}`)
      .then(() => fetchData())
      .catch(() => setError('Failed to delete goal'))
  }

  function handleEditGoal(goal) {
    setEditingGoal(goal)
    setShowGoalForm(true)
  }

  function handleGoalCreated() {
    setShowGoalForm(false)
    setEditingGoal(null)
    fetchData()
  }

  function handleCreated() {
    setShowForm(false)
    fetchData()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
      </div>
    )
  }

  const filteredBudgets = categoryFilter
    ? budgets.filter(b => b.category_name === categoryFilter)
    : budgets

  const totalBudgeted = filteredBudgets.reduce((sum, b) => sum + Number(b.amount), 0)
  const totalSpent = filteredBudgets.reduce((sum, b) => sum + Number(b.spent_amount || 0), 0)
  const overallPct = totalBudgeted > 0 ? Math.min(Math.round((totalSpent / totalBudgeted) * 100), 100) : 0

  let summaryBarColor = 'bg-emerald-500'
  if (overallPct >= 100) summaryBarColor = 'bg-[#ee6c4d]'
  else if (overallPct > 80) summaryBarColor = 'bg-amber-500'

  // split budgets into two groups for the UI: those at 80%+ and those below
  const needsAttention = filteredBudgets.filter(b => {
    const ratio = Number(b.amount) > 0 ? Number(b.spent_amount || 0) / Number(b.amount) : 0
    return ratio >= 0.8
  })
  const onTrack = filteredBudgets.filter(b => {
    const ratio = Number(b.amount) > 0 ? Number(b.spent_amount || 0) / Number(b.amount) : 0
    return ratio < 0.8
  })

  return (
    <div className="space-y-8 page-enter">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 text-xs">Dismiss</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {showHistorical ? 'All Budgets' : 'Active Budgets'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Per-category monthly spending limits</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowHistorical(!showHistorical)}
            className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            {showHistorical ? 'Show Active Only' : 'View Historical'}
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-sm bg-[#98c1d9] text-white rounded-md hover:bg-[#84adc5] transition-colors"
          >
            {showForm ? 'Cancel' : 'New Budget'}
          </button>
        </div>
      </div>

      {budgets.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-sm text-gray-500">
                <span className="text-2xl font-bold text-gray-900">
                  <AnimatedNumber value={totalSpent} />
                </span>
                <span className="text-gray-400 ml-1">of ${totalBudgeted.toFixed(2)} budgeted</span>
              </p>
            </div>
            <span className="text-sm font-medium text-gray-500">{overallPct}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className={`${summaryBarColor} h-2.5 rounded-full transition-all duration-700 ease-out`}
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>
      )}

      {budgets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(prev => prev === cat ? '' : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
          {categoryFilter && (
            <button
              onClick={() => setCategoryFilter('')}
              className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {showForm && <BudgetForm onCreated={handleCreated} onCancel={() => setShowForm(false)} />}

      {filteredBudgets.length === 0 ? (
        <EmptyState
          title={categoryFilter ? 'No Matching Budgets' : 'No Budgets'}
          message={categoryFilter ? `No budgets found for ${categoryFilter}.` : 'Create a budget to start tracking your spending by category.'}
          action={categoryFilter
            ? { label: 'Clear Filter', onClick: () => setCategoryFilter('') }
            : { label: 'New Budget', onClick: () => setShowForm(true) }
          }
        />
      ) : (
        <>
          {needsAttention.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-[#ee6c4d] mb-3">
                Needs attention
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {needsAttention.map(b => (
                  <BudgetCard key={b.budget_id} budget={b} onDelete={handleDeleteBudget} onUpdate={fetchData} />
                ))}
              </div>
            </div>
          )}

          {onTrack.length > 0 && (
            <div>
              <h2 className="text-base font-semibold text-emerald-600 mb-3">
                On track
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onTrack.map(b => (
                  <BudgetCard key={b.budget_id} budget={b} onDelete={handleDeleteBudget} onUpdate={fetchData} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div className="border-t border-gray-200 pt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Spending Goals</h2>
            <p className="text-sm text-gray-500 mt-0.5">Track your total monthly spending across all categories</p>
          </div>
          <button
            onClick={() => { setEditingGoal(null); setShowGoalForm(!showGoalForm) }}
            className="px-3 py-1.5 text-sm text-brand-500 hover:text-brand-700 transition-colors"
          >
            {showGoalForm ? 'Cancel' : 'Add Goal'}
          </button>
        </div>

        {showGoalForm && (
          <div className="mb-4">
            <SpendingGoalForm
              userId={user.user_id}
              goal={editingGoal}
              onCreated={handleGoalCreated}
              onCancel={() => { setShowGoalForm(false); setEditingGoal(null) }}
            />
          </div>
        )}

        {goals.length === 0 ? (
          <p className="text-sm text-gray-400">No spending goals set.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map(g => (
              <SpendingGoalCard
                key={g.goal_id}
                goal={g}
                onDelete={handleDeleteGoal}
                onEdit={handleEditGoal}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Budgets
