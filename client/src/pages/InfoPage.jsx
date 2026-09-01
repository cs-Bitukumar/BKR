import { Link, useLocation } from 'react-router-dom'

function InfoPage() {
  const { pathname } = useLocation()
  const title = pathname.includes('privacy') ? 'Privacy Policy' : pathname.includes('terms') ? 'Terms of Service' : 'Password help'
  return <main className="login-page"><section className="login-card glass"><h1>{title}</h1><p className="login-card-header">{title === 'Password help' ? 'Contact support to complete secure identity verification for a password reset.' : 'BKR service policies and responsible-use guidelines will be published here before production launch.'}</p><Link className="primary-btn" to="/">Return to login</Link></section></main>
}
export default InfoPage
