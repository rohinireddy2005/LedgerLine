
import { useCallback, useEffect, useMemo, useState } from 'react'

import './App.css'

import Ledger from './Ledger.jsx'
import Auth from './Auth.jsx'
import Transactions from './Transactions.jsx'
import MoneyAction from './MoneyAction.jsx'
import API_BASE_URL from './config'

const navigation = [
  { name: 'Overview', icon: '▦' },
  { name: 'My Accounts', icon: '▤' },
  { name: 'Transactions', icon: '⇄' },
  { name: 'Ledger', icon: '▧' },
]

function formatBalance(balance) {
  return Number(balance || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatCurrency(amount) {
  return `₹ ${formatBalance(amount)}`
}

function getGroupedTransactions(entries) {
  const grouped = new Map()

  entries.forEach((entry) => {
    const id = String(entry.transactionId)

    if (!grouped.has(id)) {
      grouped.set(id, [])
    }

    grouped.get(id).push(entry)
  })

  return Array.from(grouped.entries()).map(([id, items]) => {
    const hasCredit = items.some(
      (entry) => entry.entryType === 'CREDIT'
    )

    const hasDebit = items.some(
      (entry) => entry.entryType === 'DEBIT'
    )

    let type = 'Debit'

    if (hasCredit && hasDebit) {
      type = 'Transfer'
    } else if (hasCredit) {
      type = 'Credit'
    }

    const firstEntry = items[0]

    return {
      id,
      type,
      amount: Number(firstEntry.amount),
      createdAt: firstEntry.createdAt,
      timestamp: new Date(firstEntry.createdAt).getTime(),
      accountIds: [
        ...new Set(items.map((entry) => entry.accountId)),
      ],
      entries: items,
    }
  }).sort((a, b) => b.timestamp - a.timestamp)
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [activePage, setActivePage] = useState('Overview')
  const [activeAction, setActiveAction] = useState('')
  const [showAccountForm, setShowAccountForm] = useState(false)

  const [accounts, setAccounts] = useState([])
  const [ledgerEntries, setLedgerEntries] = useState([])

  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  const [accountMessage, setAccountMessage] = useState('')
  const [dashboardError, setDashboardError] = useState('')

  const fetchMyAccounts = useCallback(async () => {
    const token = sessionStorage.getItem('ledgerline_access_token')

    if (!token) {
      setAccountMessage(
        'Your login session has expired. Please sign in again.'
      )
      return
    }

    setIsLoadingAccounts(true)
    setAccountMessage('')
    setDashboardError('')

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      }

      const response = await fetch(`${API_BASE_URL}/api/accounts`, {
        method: 'GET',
        headers,
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.detail ||
          'Could not load your accounts.'
        )
      }

      if (!Array.isArray(data)) {
        throw new Error(
          'Unexpected account response from the backend.'
        )
      }

      setAccounts(data)

      if (data.length === 0) {
        setLedgerEntries([])
        return
      }

      // Load the real ledger for every account.
      const ledgerResults = await Promise.all(
        data.map(async (account) => {
          const ledgerResponse = await fetch(
            `${API_BASE_URL}/api/transactions/accounts/${account.id}/ledger`,
            { headers }
          )

          const ledgerData = await ledgerResponse.json().catch(() => null)

          if (!ledgerResponse.ok) {
            throw new Error(
              ledgerData?.message ||
              `Could not load ledger for account ${account.id}.`
            )
          }

          if (!Array.isArray(ledgerData)) {
            throw new Error(
              `Unexpected ledger response for account ${account.id}.`
            )
          }

          return ledgerData
        })
      )

      setLedgerEntries(ledgerResults.flat())
    } catch (error) {
      console.error('Dashboard loading error:', error)

      setDashboardError(
        error.message || 'Unable to load your financial activity.'
      )

      setAccountMessage(
        error.message || 'Unable to load accounts.'
      )
    } finally {
      setIsLoadingAccounts(false)
    }
  }, [])

  useEffect(() => {
    if (isLoggedIn) {
      fetchMyAccounts()
    }
  }, [isLoggedIn, fetchMyAccounts])

  async function handleCreateAccount(event) {
    event.preventDefault()

    const token = sessionStorage.getItem('ledgerline_access_token')

    if (!token) {
      setAccountMessage(
        'Your login session has expired. Please sign in again.'
      )
      return
    }

    setIsCreatingAccount(true)
    setAccountMessage('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/accounts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          data?.message ||
          data?.detail ||
          'Account creation failed.'
        )
      }

      if (!data || data.id == null || !data.accountNumber) {
        throw new Error(
          'Unexpected account response from the backend.'
        )
      }

      setAccounts((previousAccounts) => [
        ...previousAccounts,
        data,
      ])

      setShowAccountForm(false)
      setAccountMessage('Your account was created successfully.')
    } catch (error) {
      console.error('Account creation error:', error)

      setAccountMessage(
        error.message || 'Unable to create account.'
      )
    } finally {
      setIsCreatingAccount(false)
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('ledgerline_access_token')

    setIsLoggedIn(false)
    setAccounts([])
    setLedgerEntries([])
    setActivePage('Overview')
    setActiveAction('')
    setAccountMessage('')
    setDashboardError('')
    setShowAccountForm(false)
  }

  const totalBalance = accounts.reduce(
    (total, account) => total + Number(account.balance || 0),
    0
  )

  const overviewTransactions = useMemo(
    () => getGroupedTransactions(ledgerEntries),
    [ledgerEntries]
  )

  const monthlyTotals = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let income = 0
    let expenses = 0

    overviewTransactions.forEach((transaction) => {
      const date = new Date(transaction.createdAt)

      if (
        date.getMonth() !== currentMonth ||
        date.getFullYear() !== currentYear
      ) {
        return
      }

      // Transfers between two of the user's own accounts
      // have both a debit and a credit entry. Exclude them
      // from income and expenses to avoid double-counting.
      if (transaction.type === 'Transfer') {
        return
      }

      if (transaction.type === 'Credit') {
        income += transaction.amount
      } else if (transaction.type === 'Debit') {
        expenses += transaction.amount
      }
    })

    return { income, expenses }
  }, [overviewTransactions])

  const recentTransactions = overviewTransactions.slice(0, 5)

  if (!isLoggedIn) {
    return <Auth onLogin={() => setIsLoggedIn(true)} />
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">L</div>
          <span>LedgerLine</span>
        </div>

        <div className="sidebar-label">MENU</div>

        <nav className="navigation">
          {navigation.map((item) => (
            <button
              key={item.name}
              className={`nav-item ${
                activePage === item.name ? 'active' : ''
              }`}
              onClick={() => {
                setActivePage(item.name)

                if (item.name === 'My Accounts') {
                  fetchMyAccounts()
                }
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-avatar">LL</div>
          <div>
            <strong>LedgerLine User</strong>
            <span>Account Holder</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>{activePage}</h1>
            <p>Welcome back! Here's your financial overview.</p>
          </div>

          <div className="topbar-right">
            <span className="demo-label">LIVE ACCOUNT DATA</span>
            <div className="top-avatar">LL</div>

            <button className="text-button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        {activePage === 'Overview' && (
          <>
            <section className="welcome-banner">
              <div>
                <p className="banner-small">
                  YOUR FINANCES, SIMPLIFIED
                </p>

                <h2>Welcome to LedgerLine</h2>

                <p>
                  Manage your accounts and track every transaction
                  in one place.
                </p>
              </div>

              <div className="banner-symbol">₹</div>
            </section>

            {dashboardError && (
              <p className="money-message" role="alert">
                {dashboardError}
              </p>
            )}

            <section className="summary-grid">
              <div className="summary-card">
                <div className="card-top">
                  <span>Total Balance</span>
                  <span className="card-icon">₹</span>
                </div>

                <h2>₹ {formatBalance(totalBalance)}</h2>

                <p className="muted">
                  Balance from your accounts
                </p>
              </div>

              <div className="summary-card">
                <div className="card-top">
                  <span>Total Income</span>
                  <span className="card-icon green">↗</span>
                </div>

                <h2>{formatCurrency(monthlyTotals.income)}</h2>

                <p className="muted">
                  Income this month
                </p>
              </div>

              <div className="summary-card">
                <div className="card-top">
                  <span>Total Expenses</span>
                  <span className="card-icon orange">↘</span>
                </div>

                <h2>{formatCurrency(monthlyTotals.expenses)}</h2>

                <p className="muted">
                  Expenses this month
                </p>
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <h2>Quick Actions</h2>
                  <p>Manage your money easily</p>
                </div>
              </div>

              <div className="actions-grid">
                {['Deposit', 'Withdraw', 'Transfer'].map((action) => (
                  <button
                    className="action-button"
                    key={action}
                    onClick={() => setActiveAction(action)}
                  >
                    <span className="action-symbol">
                      {action === 'Deposit'
                        ? '+'
                        : action === 'Withdraw'
                          ? '−'
                          : '⇄'}
                    </span>

                    <span>{action}</span>
                    <span className="action-arrow">→</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="section-block">
              <div className="section-heading">
                <div>
                  <h2>Recent Transactions</h2>
                  <p>Your latest account activity</p>
                </div>

                <button
                  className="text-button"
                  onClick={() => setActivePage('Transactions')}
                >
                  View all →
                </button>
              </div>

              {isLoadingAccounts ? (
                <p className="muted">
                  Loading recent transactions...
                </p>
              ) : recentTransactions.length > 0 ? (
                <div className="table-wrapper">
                  <table className="transaction-table">
                    <thead>
                      <tr>
                        <th>TRANSACTION</th>
                        <th>DATE</th>
                        <th>TYPE</th>
                        <th>AMOUNT</th>
                        <th>STATUS</th>
                      </tr>
                    </thead>

                    <tbody>
                      {recentTransactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td>
                            <strong>
                              Transaction #{transaction.id}
                            </strong>

                            <span className="transaction-id">
                              TXN{transaction.id}
                            </span>
                          </td>

                          <td>
                            {new Date(
                              transaction.createdAt
                            ).toLocaleString('en-IN')}
                          </td>

                          <td>{transaction.type}</td>

                          <td
                            className={
                              transaction.type === 'Credit'
                                ? 'credit'
                                : transaction.type === 'Debit'
                                  ? 'debit'
                                  : ''
                            }
                          >
                            {transaction.type === 'Credit'
                              ? '+ '
                              : transaction.type === 'Debit'
                                ? '- '
                                : ''}
                            {formatCurrency(transaction.amount)}
                          </td>

                          <td>
                            <span className="status">Posted</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="account-placeholder">
                  <h3>No transactions yet</h3>
                  <p>
                    Your recent account activity will appear here.
                  </p>
                </div>
              )}

              <p className="muted">
                Recent transactions retrieved from your account ledgers.
              </p>
            </section>
          </>
        )}

        {activePage === 'My Accounts' && (
          <section className="section-block page-card">
            <div className="section-heading">
              <div>
                <h2>My Accounts</h2>
                <p>View and manage your real accounts.</p>
              </div>

              <button
                className="primary-button"
                onClick={() => {
                  setShowAccountForm(!showAccountForm)
                  setAccountMessage('')
                }}
                disabled={isCreatingAccount}
              >
                {showAccountForm ? 'Cancel' : '+ Create Account'}
              </button>
            </div>

            {showAccountForm && (
              <form
                className="account-form"
                onSubmit={handleCreateAccount}
              >
                <h3>Create a New Account</h3>

                <p className="muted">
                  Your account number and starting balance will be
                  generated by the LedgerLine backend.
                </p>

                <button
                  className="primary-button"
                  type="submit"
                  disabled={isCreatingAccount}
                >
                  {isCreatingAccount
                    ? 'Creating...'
                    : 'Create Account'}
                </button>
              </form>
            )}

            {accountMessage && (
              <p className="money-message" role="status">
                {accountMessage}
              </p>
            )}

            {isLoadingAccounts && (
              <p className="muted">Loading your accounts...</p>
            )}

            {!isLoadingAccounts && accounts.length === 0 && (
              <p className="muted">
                No accounts found. Create your first account
                to get started.
              </p>
            )}

            <div className="accounts-grid">
              {accounts.map((account) => (
                <div className="account-card" key={account.id}>
                  <div className="account-card-top">
                    <span className="account-card-icon">₹</span>
                    <span className="status">{account.status}</span>
                  </div>

                  <h3>LedgerLine Account</h3>

                  <p className="muted">Account Number</p>
                  <strong>{account.accountNumber}</strong>

                  <div className="account-balance">
                    <p className="muted">Available Balance</p>

                    <h2>
                      {account.currency}{' '}
                      {formatBalance(account.balance)}
                    </h2>
                  </div>

                  <div className="account-card-footer">
                    <span>{account.currency}</span>
                    <span>Account ID: {account.id}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activePage === 'Transactions' && <Transactions />}

        {activePage === 'Ledger' && <Ledger />}

        <footer className="footer">
          LedgerLine © 2026 · Secure Money Movement
        </footer>
      </main>

      {activeAction && (
        <MoneyAction
          action={activeAction}
          accounts={accounts.map((account) => ({
            ...account,
            name: `Account ${account.accountNumber}`,
          }))}
          onClose={() => setActiveAction('')}
          onSuccess={fetchMyAccounts}
        />
      )}
    </div>
  )
}

export default App
