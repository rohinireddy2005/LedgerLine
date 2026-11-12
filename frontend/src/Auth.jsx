
import { useState } from 'react'
import './Auth.css'
import API_BASE_URL from './config'

function Auth({ onLogin }) {
  const [isRegister, setIsRegister] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (isRegister && !name.trim()) {
      setMessage('Please enter your full name.')
      return
    }

    if (!email.trim() || !password) {
      setMessage('Please enter your email and password.')
      return
    }

    if (isRegister && password.length < 12) {
      setMessage('Password must contain at least 12 characters.')
      return
    }

    if (isRegister && password.length > 72) {
      setMessage('Password cannot exceed 72 characters.')
      return
    }

    setIsLoading(true)

    try {
      const endpoint = isRegister
        ? '/api/auth/register'
        : '/api/auth/login'

      const requestBody = isRegister
        ? {
            fullName: name.trim(),
            email: email.trim(),
            password
          }
        : {
            email: email.trim(),
            password
          }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const errorMessage =
          data.message ||
          data.detail ||
          data.error ||
          'Request failed. Please check your details.'

        throw new Error(errorMessage)
      }

      if (isRegister) {
        setMessage('Registration successful! Please sign in.')
        setIsRegister(false)
        setName('')
        setPassword('')
      } else {
        if (!data.accessToken) {
          throw new Error('Login response did not contain an access token.')
        }

        // Keep the JWT only for this browser session.
        sessionStorage.setItem(
          'ledgerline_access_token',
          data.accessToken
        )

        onLogin()
      }
    } catch (error) {
      console.error('Authentication error:', error)

      if (error instanceof TypeError) {
        setMessage(
          'Unable to connect to banking service. Please check your network connection.'
        )
      } else {
        setMessage(error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-icon">L</div>
        <span>LedgerLine</span>
      </div>

      <div className="auth-card">
        <div className="auth-heading">
          <h1>{isRegister ? 'Create your account' : 'Welcome back'}</h1>

          <p>
            {isRegister
              ? 'Register to start managing your finances.'
              : 'Sign in to access your LedgerLine dashboard.'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="auth-field">
              <label htmlFor="fullName">Full Name</label>

              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={100}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email Address</label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              required
            />

            {isRegister && (
              <small>Password must contain 12-72 characters.</small>
            )}
          </div>

          {message && (
            <p className="auth-message" role="alert">
              {message}
            </p>
          )}

          <button
            className="auth-submit"
            type="submit"
            disabled={isLoading}
          >
            {isLoading
              ? 'Please wait...'
              : isRegister
                ? 'Create Account'
                : 'Sign In'}
          </button>
        </form>

        <div className="auth-switch">
          {isRegister
            ? 'Already have an account?'
            : "Don't have an account?"}

          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setIsRegister(!isRegister)
              setMessage('')
              setPassword('')
            }}
          >
            {isRegister ? 'Sign In' : 'Register'}
          </button>
        </div>

        <p className="auth-security">
          Secure authentication | Spring Boot API
        </p>
      </div>
    </div>
  )
}

export default Auth
