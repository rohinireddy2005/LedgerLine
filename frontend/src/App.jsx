import { useState, useEffect, useCallback } from 'react'
import API_BASE_URL from './config'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import Toast from './components/Toast'
import Auth from './portals/auth/Auth'
import AccountHolderDashboard from './portals/accountHolder/AccountHolderDashboard'
import MyAccountsView from './portals/accountHolder/MyAccountsView'
import TransactionsView from './portals/accountHolder/TransactionsView'
import LedgerView from './portals/accountHolder/LedgerView'
import MoneyModal from './portals/accountHolder/MoneyModal'
import AdminPortal from './portals/admin/AdminPortal'
import AuditorPortal from './portals/auditor/AuditorPortal'
import './App.css'

export default function App() {
  const [token, setToken] = useState(() => sessionStorage.getItem('ledgerline_access_token'))
  const [user, setUser] = useState(null)
  const [role, setRole] = useState('')
  const [authLoading, setAuthLoading] = useState(true)

  // Navigation
  const [activeTab, setActiveTab] = useState('overview')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  // Account Holder Data
  const [accounts, setAccounts] = useState([])
  const [transactions, setTransactions] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  // Money Modal Action
  const [activeMoneyAction, setActiveMoneyAction] = useState('') // 'Deposit', 'Withdrawal', 'Transfer'

  // Toast System
  const [toast, setToast] = useState(null)

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type })
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev))
    }, 4000)
  }, [])

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('ledgerline_access_token')
    setToken(null)
    setUser(null)
    setRole('')
    setAccounts([])
    setTransactions([])
    setActiveTab('overview')
    setIsSidebarOpen(false)
    showToast('Logged out successfully.', 'info')
  }, [showToast])

  // Fetch Current User Details from /api/auth/me
  const fetchCurrentUser = useCallback(async (authToken) => {
    try {
      setAuthLoading(true)
      const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          Accept: 'application/json'
        }
      })

      if (!res.ok) {
        throw new Error('Session invalid or expired.')
      }

      const userData = await res.json()
      setUser(userData)
      setRole(userData.role)

      // Set default tab based on role
      if (userData.role === 'ADMIN') {
        setActiveTab('admin-overview')
      } else if (userData.role === 'AUDITOR') {
        setActiveTab('auditor-overview')
      } else {
        setActiveTab('overview')
      }
    } catch (err) {
      console.warn('Session verification error:', err.message)
      handleLogout()
    } finally {
      setAuthLoading(false)
    }
  }, [handleLogout])

  // Fetch Account Holder Specific Data
  const fetchAccountHolderData = useCallback(async () => {
    if (!token || role !== 'ACCOUNT_HOLDER') return

    setAccountsLoading(true)
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }

    try {
      // 1. Fetch Accounts
      const accRes = await fetch(`${API_BASE_URL}/api/accounts`, { headers })
      if (!accRes.ok) throw new Error('Failed to load accounts.')
      const accData = await accRes.json()
      const safeAccounts = Array.isArray(accData) ? accData : []
      setAccounts(safeAccounts)

      // 2. Fetch User Transactions
      const txRes = await fetch(`${API_BASE_URL}/api/transactions`, { headers })
      if (txRes.ok) {
        const txData = await txRes.json()
        setTransactions(Array.isArray(txData) ? txData : [])
      } else {
        // Fallback: Aggregate from ledgers if dedicated transaction endpoint is unavailable
        const ledgerResults = await Promise.all(
          safeAccounts.map(async (acc) => {
            const lRes = await fetch(
              `${API_BASE_URL}/api/transactions/accounts/${acc.id}/ledger`,
              { headers }
            )
            return lRes.ok ? await lRes.json() : []
          })
        )
        const allEntries = ledgerResults.flat()
        const fallbackTx = allEntries.map((e) => ({
          id: e.transactionId,
          type: e.entryType === 'CREDIT' ? 'DEPOSIT' : 'WITHDRAWAL',
          amount: e.amount,
          status: 'SUCCESS',
          sourceAccountId: e.accountId,
          createdAt: e.createdAt
        }))
        setTransactions(fallbackTx)
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err)
      showToast(err.message, 'error')
    } finally {
      setAccountsLoading(false)
    }
  }, [token, role, showToast])

  // Initialize Auth on Mount
  useEffect(() => {
    if (token) {
      fetchCurrentUser(token)
    } else {
      setAuthLoading(false)
    }
  }, [token, fetchCurrentUser])

  // Load account data when role is verified
  useEffect(() => {
    if (role === 'ACCOUNT_HOLDER') {
      fetchAccountHolderData()
    }
  }, [role, fetchAccountHolderData])

  function handleLoginSuccess(newToken, userFromLogin) {
    setToken(newToken)
    if (userFromLogin) {
      setUser(userFromLogin)
      setRole(userFromLogin.role)
      if (userFromLogin.role === 'ADMIN') setActiveTab('admin-overview')
      else if (userFromLogin.role === 'AUDITOR') setActiveTab('auditor-overview')
      else setActiveTab('overview')
      setAuthLoading(false)
    } else {
      fetchCurrentUser(newToken)
    }
    showToast('Signed in successfully!', 'success')
  }

  async function handleCreateAccount() {
    if (!token) return
    setIsCreatingAccount(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json'
        }
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.message || 'Failed to create account.')
      }

      const newAccount = await res.json()
      setAccounts((prev) => [...prev, newAccount])
      showToast(`Account ${newAccount.accountNumber} created successfully!`, 'success')
      fetchAccountHolderData()
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  // Not logged in view
  if (!token || !user) {
    if (authLoading) {
      return (
        <div className="auth-loading-screen">
          <div className="brand-logo-lg animate-pulse">LL</div>
          <p className="mt-4 text-muted">Securing financial connection...</p>
        </div>
      )
    }
    return <Auth onLoginSuccess={handleLoginSuccess} />
  }

  return (
    <div className="app-shell">
      {/* Toast Notification Container */}
      {toast && (
        <div className="toast-fixed-container">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      {/* Responsive Sidebar */}
      <Sidebar
        role={role}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Layout Area */}
      <div className="main-wrapper">
        <Navbar
          user={user}
          role={role}
          onLogout={handleLogout}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        />

        <main className="main-viewport">
          {/* ACCOUNT HOLDER VIEWS */}
          {role === 'ACCOUNT_HOLDER' && (
            <>
              {activeTab === 'overview' && (
                <AccountHolderDashboard
                  user={user}
                  accounts={accounts}
                  transactions={transactions}
                  isLoading={accountsLoading}
                  onOpenMoneyAction={setActiveMoneyAction}
                  onCreateAccount={handleCreateAccount}
                  onNavigateTab={setActiveTab}
                />
              )}

              {activeTab === 'accounts' && (
                <MyAccountsView
                  accounts={accounts}
                  onCreateAccount={handleCreateAccount}
                  onOpenMoneyAction={setActiveMoneyAction}
                  onNavigateTab={setActiveTab}
                  isCreating={isCreatingAccount}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionsView
                  transactions={transactions}
                  accounts={accounts}
                  isLoading={accountsLoading}
                />
              )}

              {activeTab === 'ledger' && (
                <LedgerView accounts={accounts} />
              )}

              {/* Money Action Modal */}
              {activeMoneyAction && (
                <MoneyModal
                  action={activeMoneyAction}
                  accounts={accounts}
                  isOpen={Boolean(activeMoneyAction)}
                  onClose={() => setActiveMoneyAction('')}
                  onSuccess={() => {
                    fetchAccountHolderData()
                    showToast(`${activeMoneyAction} completed successfully!`, 'success')
                  }}
                />
              )}
            </>
          )}

          {/* ADMINISTRATOR VIEWS */}
          {role === 'ADMIN' && (
            <AdminPortal
              activeTab={activeTab}
              onNavigateTab={setActiveTab}
            />
          )}

          {/* AUDITOR VIEWS */}
          {role === 'AUDITOR' && (
            <AuditorPortal
              activeTab={activeTab}
              onNavigateTab={setActiveTab}
            />
          )}
        </main>

        <footer className="portal-footer">
          <div className="footer-content">
            <span>LedgerLine Financial Management • Snovasys Hiring Challenge 2026</span>
            <span className="footer-security-tag">
              Bank-Grade Security • Real-Time Protection • 256-Bit SSL Encryption
            </span>
          </div>
        </footer>
      </div>
    </div>
  )
}
