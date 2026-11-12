import {
  IconDashboard,
  IconAccounts,
  IconTransactions,
  IconLedger,
  IconReconciliation,
  IconUsers,
  IconAudit,
  IconShield,
  IconClose
} from './Icons'

export default function Sidebar({ role, activeTab, onSelectTab, isOpen, onClose }) {
  const accountHolderNav = [
    { id: 'overview', label: 'Overview', icon: IconDashboard },
    { id: 'accounts', label: 'My Accounts', icon: IconAccounts },
    { id: 'transactions', label: 'Transactions', icon: IconTransactions },
    { id: 'ledger', label: 'Ledger Records', icon: IconLedger },
  ]

  const adminNav = [
    { id: 'admin-overview', label: 'Admin Overview', icon: IconDashboard },
    { id: 'admin-accounts', label: 'Account Controls', icon: IconAccounts },
    { id: 'admin-reconciliation', label: 'Reconciliation', icon: IconReconciliation },
    { id: 'admin-users', label: 'User Directory', icon: IconUsers },
    { id: 'admin-audits', label: 'Status Audits', icon: IconAudit },
  ]

  const auditorNav = [
    { id: 'auditor-overview', label: 'Auditor Overview', icon: IconDashboard },
    { id: 'auditor-accounts', label: 'All Accounts', icon: IconAccounts },
    { id: 'auditor-transactions', label: 'System Transactions', icon: IconTransactions },
    { id: 'auditor-ledger', label: 'Ledger Inspector', icon: IconLedger },
  ]

  let navItems = accountHolderNav
  let portalTitle = 'PERSONAL BANKING'

  if (role === 'ADMIN') {
    navItems = adminNav
    portalTitle = 'ADMINISTRATOR PORTAL'
  } else if (role === 'AUDITOR') {
    navItems = auditorNav
    portalTitle = 'INDEPENDENT AUDITOR'
  }

  function handleNavClick(tabId) {
    onSelectTab(tabId)
    if (onClose) onClose()
  }

  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand-wrapper">
          <div className="sidebar-brand">
            <div className="brand-logo">LL</div>
            <div className="brand-text">
              <span className="brand-name">LedgerLine</span>
              <span className="brand-tagline">FINANCIAL LEDGER</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-close-mobile"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        <div className="sidebar-section-label">{portalTitle}</div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const IconComponent = item.icon
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-button ${isActive ? 'active' : ''}`}
                onClick={() => handleNavClick(item.id)}
              >
                <IconComponent className="nav-icon" />
                <span className="nav-label">{item.label}</span>
                {isActive && <span className="active-pill" />}
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="security-card">
            <div className="security-card-header">
              <IconShield className="w-4 h-4 text-emerald" />
              <span>Bank-Grade Security</span>
            </div>
            <p className="security-card-text">
              All transactions are encrypted and secured with real-time audit protection.
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}

