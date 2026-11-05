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
  const [showRecoveryInfo, setShowRecoveryInfo] = useState(false)
  const [recoveryRequested, setRecoveryRequested] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setShowRecoveryInfo(false)
    setRecoveryRequested(false)

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
      setShowRecoveryInfo(err.message.includes('already logged in on another device'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="login-card glass">
      <div className="login-card-accent" />

      <header className="login-card-header">
        <h2>Welcome Back</h2>
        <p>Access your dashboard, admin control panel, or virtual coins.</p>
      </header>

      <form className="login-form" onSubmit={handleSubmit}>
        <div className="field-group">
         
          <div className="input-wrap">
            <input
              id="email"
              type="email"
              placeholder=" "
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
            />
             <label htmlFor="email">Email Address</label>
          </div>
        </div>

        <div className="field-group">
          
          <div className="input-wrap">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder=" "
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              minLength={8}
              required
            />
            <label htmlFor="password">Password</label>
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

        {error && <p className="form-error" role="alert">{error}</p>}
        {showRecoveryInfo && (
          <div className="form-error" role="status">
            <button className="recovery-link" type="button" onClick={() => setRecoveryRequested(true)}>Recover Account</button>
            {recoveryRequested && <p>Secure recovery is not available yet because this account has no verified email or mobile recovery method. Please contact BKR support; your existing session remains active.</p>}
          </div>
        )}

        <button className="login-submit" type="submit" disabled={loading}>
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>

      <div className="portal-links">
        <Link className="portal-link" to="/dashboard">
          Open Dashboard
        </Link>
        <Link className="portal-link portal-link-admin" to="/admin">
           Admin Panel
        </Link>
        <Link className="portal-link portal-link-wallet" to="/wallet">
          Open Virtual Coins
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
