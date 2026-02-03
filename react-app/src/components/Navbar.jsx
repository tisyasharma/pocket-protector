import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { to: '/', label: 'Dashboard', icon: DashboardIcon },
  { to: '/receipts', label: 'Receipts', icon: ReceiptsIcon },
  { to: '/budgets', label: 'Budgets', icon: BudgetsIcon }
]

function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()

  if (!user) return null

  return (
    <>
      <nav className="bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-xl font-bold text-brand-500">
                Pocket Protectors
              </Link>
              <div className="hidden md:flex space-x-1">
                {NAV_LINKS.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      location.pathname === link.to
                        ? 'text-gray-900 font-semibold'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600 hidden sm:inline">
                {user.first_name} {user.last_name}
              </span>
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-md transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 md:hidden z-50">
        <div className="flex justify-around py-2">
          {NAV_LINKS.map(link => {
            const active = location.pathname === link.to
            const Icon = link.icon
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 ${
                  active ? 'text-gray-900' : 'text-gray-400'
                }`}
              >
                <Icon active={active} />
                <span className={`text-[10px] ${active ? 'font-semibold' : 'font-medium'}`}>
                  {link.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}

function DashboardIcon({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
    </svg>
  )
}

function ReceiptsIcon({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
    </svg>
  )
}

function BudgetsIcon({ active }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
    </svg>
  )
}

export default Navbar
