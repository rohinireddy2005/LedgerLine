import { useMemo, useState } from 'react'
import StatusBadge from '../../components/StatusBadge'
import {
  IconDeposit,
  IconTransfer,
  IconPlus,
  IconCopy,
  IconCheck,
  IconAccounts,
  IconEye,
  IconEyeOff
} from '../../components/Icons'

function formatBalance(num) {
  return Number(num || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function maskAccountNumber(accNum) {
  if (!accNum) return '—'
  if (accNum.length <= 6) return accNum
  const prefix = accNum.slice(0, 3)
  const suffix = accNum.slice(-4)
  return `${prefix} •••• •••• ${suffix}`
}

export default function AccountHolderDashboard({
  user,
  accounts,
  transactions,
  isLoading,
  onOpenMoneyAction,
  onCreateAccount,
  onNavigateTab
}) {
  const [copiedId, setCopiedId] = useState('')
  const [selectedAccountIdx, setSelectedAccountIdx] = useState(0)
  const [isCardMasked, setIsCardMasked] = useState(true)

  function copyToClipboard(text, id) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(''), 2000)
    }
  }

  const totalBalance = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0)
  }, [accounts])

  const activeAccountsCount = useMemo(() => {
    return accounts.filter((acc) => acc.status === 'ACTIVE').length
  }, [accounts])

  const monthlyTotals = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    let totalInflow = 0
    let totalOutflow = 0

    transactions.forEach((tx) => {
      if (tx.status !== 'SUCCESS') return
      const d = new Date(tx.createdAt)
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        const amt = Number(tx.amount || 0)
        if (tx.type === 'DEPOSIT') {
          totalInflow += amt
        } else if (tx.type === 'WITHDRAWAL') {
          totalOutflow += amt
        } else if (tx.type === 'TRANSFER') {
          const userAccountIds = new Set(accounts.map((a) => a.id))
          const isDest = userAccountIds.has(tx.destinationAccountId)
          const isSource = userAccountIds.has(tx.sourceAccountId)
          if (isDest && !isSource) totalInflow += amt
          else if (isSource && !isDest) totalOutflow += amt
        }
      }
    })

    return { totalInflow, totalOutflow }
  }, [transactions, accounts])

  const safeIdx = Math.min(selectedAccountIdx, Math.max(0, accounts.length - 1))
  const currentCard = accounts[safeIdx] || null

  const recentTransactions = transactions.slice(0, 6)

  const todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  // Quick Payees extracted from past transfers or realistic presets
  const quickPayees = [
    { name: 'Rohini R.', initials: 'RR', acc: 'LL019283746501' },
    { name: 'Priya S.', initials: 'PS', acc: 'LL982347102938' },
    { name: 'Arun K.', initials: 'AK', acc: 'LL483920194820' },
    { name: 'Amit M.', initials: 'AM', acc: 'LL728193049281' }
  ]

  return (
    <div className="dashboard-content">
      {/* Welcome Banner */}
      <div className="welcome-banner-card">
        <div className="welcome-text-group">
          <span className="welcome-date">{todayFormatted}</span>
          <h2 className="welcome-heading">
            Welcome back, {user?.fullName || 'Valued Customer'}
          </h2>
          <p className="welcome-subtext">
            Manage your accounts, transfer funds instantly, and review your latest activity.
          </p>
        </div>

        <div className="welcome-quick-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onOpenMoneyAction('Transfer')}
            disabled={accounts.length === 0}
          >
            <IconTransfer className="w-4 h-4 mr-1.5" />
            Send Money
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => onOpenMoneyAction('Deposit')}
            disabled={accounts.length === 0}
          >
            <IconDeposit className="w-4 h-4 mr-1.5" />
            Add Funds
          </button>
        </div>
      </div>

      {/* Primary Financial Metric Cards */}
      <div className="metrics-grid">
        <div className="metric-card primary">
          <div className="metric-card-header">
            <span className="metric-label">Total Balance</span>
            <span className="metric-icon-badge primary">₹</span>
          </div>
          <div className="metric-value font-mono">
            ₹ {formatBalance(totalBalance)}
          </div>
          <div className="metric-footer">
            <span className="metric-pill success">Active</span>
            <span className="metric-sub">{accounts.length} Total Accounts</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Active Accounts</span>
            <span className="metric-icon-badge">
              <IconAccounts className="w-4 h-4 text-primary" />
            </span>
          </div>
          <div className="metric-value font-mono">{activeAccountsCount}</div>
          <div className="metric-footer">
            <span className="metric-sub">
              {accounts.length - activeAccountsCount === 0
                ? 'All accounts operational'
                : `${accounts.length - activeAccountsCount} Inactive`}
            </span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Money In (This Month)</span>
            <span className="metric-icon-badge success">↗</span>
          </div>
          <div className="metric-value text-emerald font-mono">
            + ₹ {formatBalance(monthlyTotals.totalInflow)}
          </div>
          <div className="metric-footer">
            <span className="metric-sub">Incoming deposits & credits</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-card-header">
            <span className="metric-label">Money Out (This Month)</span>
            <span className="metric-icon-badge danger">↘</span>
          </div>
          <div className="metric-value text-danger font-mono">
            - ₹ {formatBalance(monthlyTotals.totalOutflow)}
          </div>
          <div className="metric-footer">
            <span className="metric-sub">Outbound payments & transfers</span>
          </div>
        </div>
      </div>

      {/* Quick Payees Bar (Real-World Fintech Feature) */}
      <div className="quick-payees-card">
        <div className="payees-header">
          <span className="payees-title">Quick Payees</span>
          <span className="payees-subtitle">Instant transfers to favorite contacts</span>
        </div>
        <div className="payees-avatars-row">
          {quickPayees.map((p, idx) => (
            <div
              key={idx}
              className="payee-item"
              onClick={() => onOpenMoneyAction('Transfer')}
              title={`Send to ${p.name}`}
            >
              <div className="payee-avatar">{p.initials}</div>
              <span className="payee-name">{p.name}</span>
            </div>
          ))}
          <div
            className="payee-item new-payee"
            onClick={() => onOpenMoneyAction('Transfer')}
            title="Send to another account"
          >
            <div className="payee-avatar plus">+</div>
            <span className="payee-name">New Payee</span>
          </div>
        </div>
      </div>

      {/* ACCOUNTS SECTION: REDESIGNED WITH CARD SWITCHER (No more repeating huge cards!) */}
      <div className="section-block">
        <div className="section-header-row">
          <div>
            <h3 className="section-title">My Digital Accounts</h3>
            <p className="section-subtitle">Select an account to view details, transfer, or check statements</p>
          </div>
          <div className="section-actions-group">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onNavigateTab('accounts')}
            >
              All Accounts ({accounts.length}) →
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="loading-placeholder">Loading account records...</div>
        ) : accounts.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-icon-circle">▤</div>
            <h4>No Accounts Found</h4>
            <p>You have not opened a LedgerLine account yet. Create your first account in seconds.</p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onCreateAccount}
            >
              + Open First Account
            </button>
          </div>
        ) : (
          <div className="account-switcher-layout">
            {/* Left: Featured Virtual Debit Card */}
            {currentCard && (
              <div className="featured-card-wrapper">
                <div className="virtual-bank-card featured">
                  <div className="card-top-row">
                    <div className="card-brand-tag">
                      <span className="card-brand-logo">LL</span>
                      <span className="card-brand-title">LEDGERLINE</span>
                    </div>
                    <div className="card-top-controls">
                      {accounts.length > 1 && (
                        <span className="card-counter-tag">
                          {safeIdx + 1} of {accounts.length}
                        </span>
                      )}
                      <StatusBadge status={currentCard.status} />
                    </div>
                  </div>

                  <div className="card-chip-row">
                    <div className="emv-chip" />
                    <span className="contactless-icon">))))</span>
                  </div>

                  <div className="card-balance-block">
                    <span className="card-balance-label">AVAILABLE BALANCE</span>
                    <div className="card-balance-val font-mono">
                      <span className="currency-sign">₹</span> {formatBalance(currentCard.balance)}
                    </div>
                  </div>

                  <div className="card-number-row">
                    <span className="card-number font-mono">
                      {isCardMasked
                        ? maskAccountNumber(currentCard.accountNumber)
                        : currentCard.accountNumber}
                    </span>
                    <div className="card-actions-mini">
                      <button
                        type="button"
                        className="card-mini-btn"
                        onClick={() => setIsCardMasked((prev) => !prev)}
                        title={isCardMasked ? 'Reveal Account Number' : 'Mask Account Number'}
                      >
                        {isCardMasked ? (
                          <IconEye className="w-4 h-4" />
                        ) : (
                          <IconEyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="card-mini-btn"
                        onClick={() => copyToClipboard(currentCard.accountNumber, currentCard.id)}
                        title="Copy Account Number"
                      >
                        {copiedId === currentCard.id ? (
                          <IconCheck className="w-4 h-4 text-emerald" />
                        ) : (
                          <IconCopy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="card-bottom-actions">
                    <button
                      type="button"
                      className="card-quick-action"
                      onClick={() => onOpenMoneyAction('Transfer')}
                      disabled={currentCard.status !== 'ACTIVE'}
                    >
                      Send
                    </button>
                    <button
                      type="button"
                      className="card-quick-action"
                      onClick={() => onOpenMoneyAction('Deposit')}
                      disabled={currentCard.status !== 'ACTIVE'}
                    >
                      Add Funds
                    </button>
                    <button
                      type="button"
                      className="card-quick-action"
                      onClick={() => onNavigateTab('ledger')}
                    >
                      Statement →
                    </button>
                  </div>
                </div>

                {/* Carousel Controls if multiple accounts */}
                {accounts.length > 1 && (
                  <div className="card-carousel-navigator">
                    <button
                      type="button"
                      className="carousel-arrow-btn"
                      onClick={() =>
                        setSelectedAccountIdx((prev) => (prev > 0 ? prev - 1 : accounts.length - 1))
                      }
                      title="Previous Account"
                    >
                      ‹
                    </button>
                    <div className="carousel-dots">
                      {accounts.map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          className={`carousel-dot ${i === safeIdx ? 'active' : ''}`}
                          onClick={() => setSelectedAccountIdx(i)}
                          title={`Account ${i + 1}`}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      className="carousel-arrow-btn"
                      onClick={() =>
                        setSelectedAccountIdx((prev) => (prev < accounts.length - 1 ? prev + 1 : 0))
                      }
                      title="Next Account"
                    >
                      ›
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Right: Compact Account Portfolio Selector List */}
            <div className="account-portfolio-sidebar">
              <div className="portfolio-sidebar-header">
                <span className="sidebar-title">All Accounts Portfolio</span>
                <span className="sidebar-count">{accounts.length} total</span>
              </div>

              <div className="portfolio-accounts-list">
                {accounts.map((acc, idx) => (
                  <div
                    key={acc.id}
                    className={`portfolio-item ${idx === safeIdx ? 'selected' : ''}`}
                    onClick={() => setSelectedAccountIdx(idx)}
                  >
                    <div className="portfolio-item-left">
                      <span className="portfolio-acc-title">
                        Account #{idx + 1}
                        {idx === 0 && <span className="primary-pill">Primary</span>}
                      </span>
                      <span className="portfolio-acc-num font-mono">
                        {maskAccountNumber(acc.accountNumber)}
                      </span>
                    </div>
                    <div className="portfolio-item-right">
                      <span className="portfolio-acc-balance font-mono">
                        ₹ {formatBalance(acc.balance)}
                      </span>
                      <StatusBadge status={acc.status} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="portfolio-sidebar-actions">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm w-full"
                  onClick={onCreateAccount}
                >
                  <IconPlus className="w-3.5 h-3.5 mr-1" />
                  Open New Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Latest Transactions Section */}
      <div className="section-block">
        <div className="section-header-row">
          <div>
            <h3 className="section-title">Latest Transactions</h3>
            <p className="section-subtitle">Recent activity across your accounts</p>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateTab('transactions')}
          >
            View All ({transactions.length}) →
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="empty-state-card">
            <p className="muted">No transactions recorded yet. Perform a deposit or transfer to see activity.</p>
          </div>
        ) : (
          <div className="table-responsive-container">
            <table className="banking-table">
              <thead>
                <tr>
                  <th>TRANSACTION</th>
                  <th>DATE & TIME</th>
                  <th>TYPE</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => {
                  const isCredit = tx.type === 'DEPOSIT'
                  const isDebit = tx.type === 'WITHDRAWAL'
                  return (
                    <tr key={tx.id}>
                      <td>
                        <div className="tx-cell-with-icon">
                          <div className={`tx-flow-icon ${tx.type.toLowerCase()}`}>
                            {tx.type === 'DEPOSIT' ? '↓' : tx.type === 'WITHDRAWAL' ? '↑' : '⇄'}
                          </div>
                          <div className="tx-cell-title">
                            <span className="tx-id font-mono">#{tx.id}</span>
                            <span className="tx-type-text">
                              {tx.type === 'DEPOSIT'
                                ? 'Account Deposit'
                                : tx.type === 'WITHDRAWAL'
                                  ? 'Cash Withdrawal'
                                  : 'Account Transfer'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="text-muted text-xs">{formatDate(tx.createdAt)}</td>
                      <td>
                        <span className="tx-type-pill">{tx.type}</span>
                      </td>
                      <td className="font-mono font-medium">
                        <span className={isCredit ? 'text-emerald font-bold' : isDebit ? 'text-danger font-bold' : ''}>
                          {isCredit ? '+ ' : isDebit ? '- ' : ''}₹ {formatBalance(tx.amount)}
                        </span>
                      </td>
                      <td>
                        <StatusBadge status={tx.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
