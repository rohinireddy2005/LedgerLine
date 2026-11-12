import { useState } from 'react'
import API_BASE_URL from '../../config'
import { IconLock, IconShield } from '../../components/Icons'

export default function Auth({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
        setSuccess('Registration successful! Please sign in with your credentials.')
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
      setError(err.message || 'Unable to connect to banking service. Please check your network connection.')
    } finally {
      setLoading(false)
    }
  }

  function applyPreset(presetEmail, presetPassword, presetRole) {
    setIsRegister(false)
    setEmail(presetEmail)
    if (presetPassword) setPassword(presetPassword)
    setError('')
    setSuccess(`Credentials filled for ${presetRole} (${presetEmail}). Click 'Sign In' to proceed.`)
  }

  return (
    <div className="auth-page-container">
      <div className="auth-brand-badge">
        <div className="brand-logo-lg">LL</div>
        <h1 className="auth-title">LedgerLine</h1>
        <p className="auth-tagline">Precision Digital Banking & Financial Management</p>
      </div>

      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${!isRegister ? 'active' : ''}`}
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
            className={`auth-tab ${isRegister ? 'active' : ''}`}
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

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <div className="form-group">
              <label htmlFor="reg-fullname">Full Legal Name</label>
              <input
                id="reg-fullname"
                type="text"
                placeholder="e.g. Rohini Reddy"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              placeholder="e.g. user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">
              Password {isRegister && <span className="label-hint">(min 12 characters)</span>}
            </label>
            <input
              id="auth-password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <span className="btn-spinner">Processing...</span>
            ) : isRegister ? (
              'Create Account Holder Profile'
            ) : (
              'Sign In to LedgerLine'
            )}
          </button>
        </form>

        <div className="auth-footer-help">
          <div className="role-presets-header">
            <IconShield className="w-4 h-4 text-primary" />
            <span>Role-Based Access Presets</span>
          </div>
          <p className="presets-description">
            Sign in with your configured role credentials:
          </p>
          <div className="role-presets-chips">
            <button
              type="button"
              className="role-chip"
              onClick={() => applyPreset('admin@ledgerline.local', 'snovasys2014', 'Administrator')}
            >
              Admin Portal
            </button>
            <button
              type="button"
              className="role-chip"
              onClick={() => applyPreset('auditor@ledgerline.local', 'snovasysledger2014', 'Auditor')}
            >
              Auditor Portal
            </button>
          </div>
        </div>

        <div className="security-notice">
          <IconLock className="w-3.5 h-3.5 inline text-muted" />
          <span> 256-Bit SSL Encryption • Bank-Grade Security</span>
        </div>
      </div>
    </div>
  )
}

