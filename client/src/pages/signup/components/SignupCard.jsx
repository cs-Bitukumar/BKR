import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './SignupCard.css'
import { post } from '../../../api/api'
import { useAuth } from '../../../context/AuthContext'

function SignupCard() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [terms, setTerms] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const auth = useAuth()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    const usernameTrim = (username || '').trim()
    const emailTrim = (email || '').trim().toLowerCase()
    const gmailRe = /^[^\s@]+@gmail\.com$/i

    if (!terms) return setError('You must accept the terms')
    if (usernameTrim.length < 3) return setError('Username must be at least 3 characters')
    if (password.length < 8) return setError('Password must be at least 8 characters')
    if (password !== confirm) return setError('Passwords do not match')
    if (!gmailRe.test(emailTrim)) return setError('Please use a valid Gmail address')

    setLoading(true)
    try {
      const data = await post('/api/auth/register', { username: usernameTrim, email: emailTrim, phone: phone.trim(), password })
      auth.login(data.token, data.user)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="signup-card glass">
      <div className="signup-card-accent" />

      <header className="signup-card-header">
        <h2>Create Account</h2>
        <p>Join the elite rank of sports simulation.</p>
      </header>

      <form className="signup-form" onSubmit={handleSubmit}>
        <div className="field-group">
          <label htmlFor="username">Username</label>
          <div className="input-wrap">
            <input
              id="username"
              type="text"
              placeholder="Bitu Kumar"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="nickname"
              minLength={3}
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="signup-email">Email Address</label>
          <div className="input-wrap">
            <input
              id="signup-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="signup-phone">Mobile Number <span>(optional)</span></label>
          <div className="input-wrap">
            <input
              id="signup-phone"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              inputMode="tel"
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="signup-password">Password</label>
          <div className="input-wrap">
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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

        <div className="field-group">
          <label htmlFor="confirm-password">Confirm Password</label>
          <div className="input-wrap">
            <input
              id="confirm-password"
              type={showConfirm ? 'text' : 'password'}
              placeholder="********"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              required
            />
            <button
              className="password-toggle"
              type="button"
              onClick={() => setShowConfirm((current) => !current)}
              aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}
            >
              <span className="material-symbols-outlined">
                {showConfirm ? 'visibility_off' : 'visibility'}
              </span>
            </button>
          </div>
        </div>

        <label className="terms-label" htmlFor="terms">
          <input id="terms" type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
          <span>
            I agree to the <Link to="/terms">Terms of Service</Link> and <Link to="/privacy">Privacy Policy</Link>.
          </span>
        </label>

        {error && <p className="form-error">{error}</p>}

        <button className="signup-submit" type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Account'}
          <span className="material-symbols-outlined">double_arrow</span>
        </button>
      </form>

      <div className="divider">
        <span>OR</span>
      </div>

      <button className="social-login" type="button">
        <span className="social-icon">
          <img src="/assets/vite.svg" alt="" aria-hidden="true" />
        </span>
        <span>Continue with Google</span>
      </button>

      <div className="signin-row">
        <p>
          Already have an account? <Link to="/">Login</Link>
        </p>
      </div>
    </section>
  )
}

export default SignupCard
