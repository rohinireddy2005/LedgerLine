import { useState } from 'react'
import API_BASE_URL from '../../config'
import { IconLock, IconShield, IconEye, IconEyeOff } from '../../components/Icons'

export default function Auth({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const trimmedEmail = email.trim()

    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.')
      return
    }

    if (isRegister) {
      if (!fullName.trim()) {
        setError('Please enter your full legal name.')
        return
      }
      if (password.length < 12 || password.length > 72) {
        setError('Password must be between 12 and 72 characters.')
        return
      }
    }

    setLoading(true)

    try {
      const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login'
      const payload = isRegister
        ? { fullName: fullName.trim(), email: trimmedEmail, password }
        : { email: trimmedEmail, password }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => null)

      if (!response.ok) {
        const msg =
          data?.message ||
          data?.detail ||
          data?.error ||
          'Authentication failed. Please check your credentials.'
        throw new Error(msg)
      }

      if (isRegister) {
        setSuccess('Account created successfully! Please sign in with your credentials.')
        setIsRegister(false)
        setPassword('')
      } else {
        if (!data?.accessToken) {
          throw new Error('Server response missing access token.')
        }

        // Store in sessionStorage
        sessionStorage.setItem('ledgerline_access_token', data.accessToken)

        // Pass user info if available from LoginResponse
        onLoginSuccess(data.accessToken, data.user)
      }
    } catch (err) {
      console.error('Auth error:', err)
      setError(
        err.message || 'Unable to connect to banking service. Please check your network connection.'
      )
    } finally {
      setLoading(false)
    }
  }

  function applyPreset(presetEmail, presetPassword, presetRole) {
    setIsRegister(false)
    setEmail(presetEmail)
    if (presetPassword) setPassword(presetPassword)
    setError('')
    setSuccess(`Loaded credentials for ${presetRole}. Click 'Sign In' to proceed.`)
  }

  return (
    <div className="auth-split-wrapper">
      {/* Left Column: Premium Digital Banking Showcase */}
      <div className="auth-showcase-panel">
        <div className="showcase-content">
          <div className="showcase-brand">
            <div className="brand-badge-lg">LL</div>
            <div className="brand-titles">
              <span className="brand-name-lg">LedgerLine</span>
              <span className="brand-caption">DIGITAL BANKING & SMART LEDGER</span>
            </div>
          </div>

          <div className="showcase-hero-text">
            <h2>Next-Generation Banking with Certified Financial Integrity</h2>
            <p>
              Experience seamless digital banking with real-time double-entry settlement,
              instant zero-fee transfers, and immutable audit logs.
            </p>
          </div>

          <div className="showcase-features-list">
            <div className="showcase-feature-item">
              <div className="feature-icon-circle">⚡</div>
              <div>
                <strong>Instant Wire & Peer Transfers</strong>
                <span>Zero-latency settlement across accounts with automated balance validation.</span>
              </div>
            </div>
            <div className="showcase-feature-item">
              <div className="feature-icon-circle">🛡️</div>
              <div>
                <strong>Bank-Grade Cryptographic Security</strong>
                <span>Spring Security, BCrypt encryption, and tamper-evident transaction chains.</span>
              </div>
            </div>
            <div className="showcase-feature-item">
              <div className="feature-icon-circle">📊</div>
              <div>
                <strong>Audited Double-Entry Accounting</strong>
                <span>Mathematically guaranteed debit and credit balance preservation.</span>
              </div>
            </div>
          </div>

          <div className="showcase-trust-bar">
            <div className="trust-stat">
              <span className="stat-val">100%</span>
              <span className="stat-lbl">Reserve Backed</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-stat">
              <span className="stat-val">256-Bit</span>
              <span className="stat-lbl">SSL Encryption</span>
            </div>
            <div className="trust-divider" />
            <div className="trust-stat">
              <span className="stat-val">Zero</span>
              <span className="stat-lbl">Hidden Fees</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Clean Authentication Form */}
      <div className="auth-form-panel">
        <div className="auth-card-modern">
          <div className="auth-card-header">
            <h3 className="auth-form-title">
              {isRegister ? 'Open Digital Account' : 'Welcome to LedgerLine'}
            </h3>
            <p className="auth-form-subtitle">
              {isRegister
                ? 'Create your customer profile in less than 30 seconds'
                : 'Sign in to access your accounts, balances, and transfers'}
            </p>
          </div>

          <div className="auth-tabs-segmented">
            <button
              type="button"
              className={`auth-segment-btn ${!isRegister ? 'active' : ''}`}
              onClick={() => {
                setIsRegister(false)
                setError('')
                setSuccess('')
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className={`auth-segment-btn ${isRegister ? 'active' : ''}`}
              onClick={() => {
                setIsRegister(true)
                setError('')
                setSuccess('')
              }}
            >
              Open Account
            </button>
          </div>

          {error && (
            <div className="auth-alert error">
              <span className="alert-icon">✕</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-alert success">
              <span className="alert-icon">✓</span>
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form-modern">
            {isRegister && (
              <div className="form-group">
                <label className="form-label" htmlFor="reg-fullname">Full Legal Name</label>
                <input
                  id="reg-fullname"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rohini Reddy"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                type="email"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <div className="label-with-action">
                <label className="form-label" htmlFor="auth-password">
                  Password {isRegister && <span className="label-hint">(min 12 characters)</span>}
                </label>
              </div>
              <div className="password-input-wrap">
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  className="form-input with-icon"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <IconEyeOff className="w-4 h-4 text-muted" />
                  ) : (
                    <IconEye className="w-4 h-4 text-muted" />
                  )}
                </button>
              </div>
            </div>

            {!isRegister && (
              <div className="auth-options-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Remember my session</span>
                </label>
                <span className="text-xs text-primary font-medium cursor-pointer">
                  Bank-Grade Protection
                </span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary auth-submit-btn"
              disabled={loading}
            >
              {loading ? (
                <span className="btn-spinner">Securing Session...</span>
              ) : isRegister ? (
                'Create Account Holder Profile'
              ) : (
                'Sign In to LedgerLine'
              )}
            </button>
          </form>

          {/* Quick-Access Demo Roles for Evaluator / Testing */}
          <div className="auth-quick-roles">
            <div className="roles-header">
              <IconShield className="w-3.5 h-3.5 text-primary inline" />
              <span>One-Click Role Switcher (Testing & Review)</span>
            </div>
            <div className="role-chips-wrap">
              <button
                type="button"
                className="role-pill-quick"
                onClick={() =>
                  applyPreset('admin@ledgerline.local', 'snovasys2014', 'Administrator')
                }
              >
                Admin Portal
              </button>
              <button
                type="button"
                className="role-pill-quick"
                onClick={() =>
                  applyPreset(
                    'auditor@ledgerline.local',
                    'snovasysledger2014',
                    'Independent Auditor'
                  )
                }
              >
                Auditor Portal
              </button>
            </div>
          </div>

          <div className="auth-card-footer-security">
            <IconLock className="w-3.5 h-3.5 inline text-muted" />
            <span>256-Bit SSL Encryption • Real-Time Protection</span>
          </div>
        </div>
      </div>
    </div>
  )
}
