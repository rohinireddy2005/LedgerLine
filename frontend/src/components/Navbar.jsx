import { useState, useRef, useEffect } from 'react'
import {
  IconLogout,
  IconMenu,
  IconShield,
  IconBell,
  IconLock,
  IconChevronDown
} from './Icons'

export default function Navbar({ user, role, onLogout, onToggleSidebar, onOpenProfile }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [unreadCount, setUnreadCount] = useState(2)

  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: 'Security Verification',
      desc: 'Successful authentication verified from your current device.',
      time: 'Just now',
      unread: true,
      type: 'success'
    },
    {
      id: 2,
      title: 'Zero-Fee Transfers Active',
      desc: 'Instant peer-to-peer and account transfers are active with zero fees.',
      time: '1h ago',
      unread: true,
      type: 'info'
    },
    {
      id: 3,
      title: 'Monthly Statement Ready',
      desc: 'Your certified account statement is available to export as CSV or PDF.',
      time: 'Yesterday',
      unread: false,
      type: 'info'
    }
  ])

  const notifRef = useRef(null)
  const userMenuRef = useRef(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
    setUnreadCount(0)
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

        {/* Notification Bell Dropdown */}
        <div className="nav-dropdown-wrapper" ref={notifRef}>
          <button
            type="button"
            className="icon-action-btn"
            onClick={() => {
              setShowNotifications((prev) => !prev)
              setShowUserMenu(false)
            }}
            title="System & Account Alerts"
            aria-label="Notifications"
          >
            <IconBell className="w-5 h-5" />
            {unreadCount > 0 && <span className="notification-badge-dot" />}
          </button>

          {showNotifications && (
            <div className="dropdown-panel notifications-panel">
              <div className="dropdown-panel-header">
                <span className="panel-title">Notifications & Alerts</span>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    className="mark-all-read-btn"
                    onClick={handleMarkAllRead}
                  >
                    Mark read
                  </button>
                )}
              </div>
              <div className="notifications-list">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`notification-item ${n.unread ? 'unread' : ''}`}
                    onClick={() => {
                      setNotifications((prev) =>
                        prev.map((item) =>
                          item.id === n.id ? { ...item, unread: false } : item
                        )
                      )
                      setUnreadCount((c) => Math.max(0, c - (n.unread ? 1 : 0)))
                    }}
                  >
                    <div className="notif-indicator">
                      <span className={`notif-dot ${n.type}`} />
                    </div>
                    <div className="notif-body">
                      <span className="notif-title">{n.title}</span>
                      <p className="notif-desc">{n.desc}</p>
                      <span className="notif-time">{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="dropdown-panel-footer">
                <span className="text-xs text-muted">
                  <IconShield className="w-3 h-3 inline-icon text-emerald" /> 256-Bit SSL Secured Session
                </span>
              </div>
            </div>
          )}
        </div>

        {/* User Profile & Menu Dropdown */}
        <div className="nav-dropdown-wrapper" ref={userMenuRef}>
          <button
            type="button"
            className="user-profile-trigger"
            onClick={() => {
              setShowUserMenu((prev) => !prev)
              setShowNotifications(false)
            }}
            title="User Profile & Settings"
          >
            <div className="user-avatar">{getInitials(user?.fullName)}</div>
            <div className="user-info-text">
              <span className="user-name">{user?.fullName || 'Financial User'}</span>
              <span className="user-role-label">
                <IconShield className="w-3 h-3 inline-icon" />
                {roleLabels[role] || role || 'User'}
              </span>
            </div>
            <IconChevronDown className="w-3 h-3 text-muted ml-1" />
          </button>

          {showUserMenu && (
            <div className="dropdown-panel user-menu-panel">
              <div className="user-menu-header">
                <div className="user-avatar-lg">{getInitials(user?.fullName)}</div>
                <div className="user-menu-details">
                  <span className="user-menu-name">{user?.fullName || 'Financial User'}</span>
                  <span className="user-menu-email">{user?.email}</span>
                  <span className="badge-pill role-pill-sm">{roleLabels[role] || role}</span>
                </div>
              </div>

              <div className="dropdown-menu-items">
                <button
                  type="button"
                  className="dropdown-menu-item"
                  onClick={() => {
                    setShowUserMenu(false)
                    if (onOpenProfile) onOpenProfile()
                  }}
                >
                  <IconLock className="w-4 h-4 menu-item-icon" />
                  <span>Profile & Security</span>
                </button>

                <div className="dropdown-divider" />

                <button
                  type="button"
                  className="dropdown-menu-item text-danger"
                  onClick={() => {
                    setShowUserMenu(false)
                    onLogout()
                  }}
                >
                  <IconLogout className="w-4 h-4 menu-item-icon" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
