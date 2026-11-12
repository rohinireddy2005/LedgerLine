import { IconLogout, IconMenu, IconShield } from './Icons'

export default function Navbar({ user, role, onLogout, onToggleSidebar }) {
  const getInitials = (name) => {
    if (!name) return 'LL'
    const parts = name.trim().split(' ')
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const roleLabels = {
    ACCOUNT_HOLDER: 'Account Holder',
    ADMIN: 'System Administrator',
    AUDITOR: 'Independent Auditor'
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle navigation menu"
        >
          <IconMenu className="w-6 h-6" />
        </button>
        <div className="brand-mobile">
          <div className="brand-icon-sm">LL</div>
          <span className="brand-title">LedgerLine</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="system-status-indicator">
          <span className="live-pulse" />
          <span className="status-text">Core Banking Online</span>
        </div>

        <div className="user-profile-badge">
          <div className="user-avatar" title={user?.email || 'User'}>
            {getInitials(user?.fullName)}
          </div>
          <div className="user-info-text">
            <span className="user-name">{user?.fullName || 'Financial User'}</span>
            <span className="user-role-label">
              <IconShield className="w-3 h-3 inline-icon" />
              {roleLabels[role] || role || 'User'}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="btn-ghost logout-btn"
          onClick={onLogout}
          title="Sign out of LedgerLine"
        >
          <IconLogout className="w-4 h-4" />
          <span className="logout-text">Logout</span>
        </button>
      </div>
    </header>
  )
}

