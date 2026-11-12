import { useState } from 'react'
import Modal from './Modal'
import API_BASE_URL from '../config'
import { IconShield, IconLock, IconCheck, IconAlertTriangle } from './Icons'

export default function ProfileModal({ user, role, isOpen, onClose, onPasswordChanged }) {
  const [activeTab, setActiveTab] = useState('profile') // 'profile' | 'password'
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (!isOpen) return null

  const roleLabels = {
    ACCOUNT_HOLDER: 'Account Holder',
    ADMIN: 'System Administrator',
    AUDITOR: 'Independent Auditor'
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!currentPassword) {
      setError('Please enter your current password.')
      return
    }

    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters long for security.')
      return
    }

    if (newPassword.length > 72) {
      setError('New password cannot exceed 72 characters.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    if (currentPassword === newPassword) {
      setError('New password cannot be the same as your current password.')
      return
    }

    setLoading(true)
    try {
      const token = sessionStorage.getItem('ledgerline_access_token')
      const response = await fetch(`${API_BASE_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.message || 'Failed to update password. Please check your credentials.')
      }

      setSuccess('Your password has been changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (onPasswordChanged) onPasswordChanged()
    } catch (err) {
      setError(err.message || 'Error changing password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="User Profile & Security"
      subtitle="Manage your credentials, account identity, and security settings"
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="520px"
    >
      <div className="profile-tabs">
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('profile')
            setError('')
            setSuccess('')
          }}
        >
          <IconShield className="w-4 h-4 inline-icon" />
          Account Profile
        </button>
        <button
          type="button"
          className={`profile-tab-btn ${activeTab === 'password' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('password')
            setError('')
            setSuccess('')
          }}
        >
          <IconLock className="w-4 h-4 inline-icon" />
          Change Password
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="profile-details-content">
          <div className="profile-avatar-card">
            <div className="profile-avatar-circle">
              {user?.fullName
                ? user.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'LL'}
            </div>
            <div className="profile-card-info">
              <h4 className="profile-display-name">{user?.fullName || 'Financial User'}</h4>
              <p className="profile-email-text">{user?.email}</p>
              <span className="badge-pill role-pill">{roleLabels[role] || role}</span>
            </div>
          </div>

          <div className="profile-meta-grid">
            <div className="profile-meta-item">
              <span className="meta-label">User ID</span>
              <span className="meta-value font-mono">#{user?.id || '—'}</span>
            </div>
            <div className="profile-meta-item">
              <span className="meta-label">Security Role</span>
              <span className="meta-value">{roleLabels[role] || role}</span>
            </div>
            <div className="profile-meta-item">
              <span className="meta-label">Authentication Status</span>
              <span className="meta-value text-emerald font-semibold">Active Session (JWT)</span>
            </div>
            <div className="profile-meta-item">
              <span className="meta-label">Encryption Level</span>
              <span className="meta-value font-mono">BCrypt + TLS 1.3</span>
            </div>
          </div>

          <div className="security-notice-box">
            <IconShield className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="text-xs text-muted mb-0">
              Your identity is protected by Spring Security role-based access control. All session
              tokens are cryptographically signed and verified on every ledger operation.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="change-password-form">
          {error && (
            <div className="alert-banner alert-danger">
              <IconAlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="alert-banner alert-success">
              <IconCheck className="w-4 h-4 flex-shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="currentPassword">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              className="form-input"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="newPassword">
              New Password <span className="text-xs text-muted">(Minimum 12 characters)</span>
            </label>
            <input
              id="newPassword"
              type="password"
              className="form-input"
              placeholder="Enter new strong password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={12}
              maxLength={72}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              placeholder="Re-enter new password to confirm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              minLength={12}
              maxLength={72}
              required
            />
          </div>

          <div className="password-policy-checklist">
            <span className="policy-title">Password Requirements:</span>
            <ul>
              <li className={newPassword.length >= 12 ? 'met' : ''}>
                At least 12 characters in length
              </li>
              <li className={newPassword && confirmPassword && newPassword === confirmPassword ? 'met' : ''}>
                Passwords must match
              </li>
              <li className={newPassword && currentPassword && newPassword !== currentPassword ? 'met' : ''}>
                Cannot be identical to current password
              </li>
            </ul>
          </div>

          <div className="modal-actions-bar">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !currentPassword || !newPassword || newPassword.length < 12}
            >
              {loading ? 'Updating Password...' : 'Save New Password'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}

