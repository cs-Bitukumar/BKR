import { Navigate } from 'react-router-dom'
import './SignupPage.css'
import { useAuth } from '../../context/AuthContext'
import SignupBrand from './components/SignupBrand'
import SignupCard from './components/SignupCard'

function SignupPage() {
  const { user } = useAuth()

  if (user) return <Navigate to="/dashboard" replace />

  return (
    <main className="signup-page">
      <div className="signup-atmosphere signup-atmosphere-top" />
      <div className="signup-atmosphere signup-atmosphere-bottom" />
      <div className="signup-shell">
        <SignupBrand />
        <SignupCard />
      </div>
      <footer className="signup-footer">
        <p>&copy; 2024 BKR Simulation. All rights reserved.</p>
        <p>Play Responsibly.</p>
      </footer>
    </main>
  )
}

export default SignupPage
