import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './LoginCard.css'
import { post } from '../../../api/api'
import { useAuth } from '../../../context/AuthContext'

function LoginCard() {
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const emailTrim = (email || '').trim().toLowerCase()
    const gmailRe = /^[^\s@]+@gmail\.com$/i
    if (!gmailRe.test(emailTrim)) return setError('Please use a valid Gmail address')

    setLoading(true)
    try {
      const data = await post('/api/auth/login', { email: emailTrim, password })
      auth.login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="login-card glass">
      <div className="login-card-accent" />

      <header className="login-card-header">
        <h2>Welcome Back</h2>
        <p>Access your dashboard, admin control panel, or wallet.</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="email">Email Address</label>
          <div className="input-wrap">
            <input
              id="email"
              type="email"
              placeholder="name@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="password">Password</label>
          <div className="input-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <span className="material-symbols-outlined">
                {showPassword ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <div className="form-row">
          <label className="remember-label" htmlFor="remember">
            <input id="remember" type="checkbox" />
            <span>Remember Me</span>
          </label>
          <Link className="forgot-link" to="/help/forgot-password">
            Forgot Password?
          </Link>
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="login-submit" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <div className="portal-links">
        <Link className="portal-link" to="/dashboard">
          Open Dashboard
        </Link>
        <Link className="portal-link portal-link-admin" to="/admin">
          Open Admin Panel
        </Link>
        <Link className="portal-link portal-link-wallet" to="/wallet">
          Open Wallet
        </Link>
      </div>

      <div className="divider">
        <span>OR</span>
      </div>

      <button className="social-login" type="button">
        <span className="social-icon">
          <img src="/assets/vite.svg" alt="" aria-hidden="true" />
        </span>
        <span>Continue with Google</span>
      </button>

      <div className="signup-row">
        <p>
          Don&apos;t have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </section>
  )
}

export default LoginCard
