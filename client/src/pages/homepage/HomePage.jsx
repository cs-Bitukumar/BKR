import { Navigate } from 'react-router-dom'
import './HomePage.css'
import { useAuth } from '../../context/AuthContext'
import LoginBrand from './components/LoginBrand'
import LoginCard from './components/LoginCard'

function HomePage() {
  const { user } = useAuth()

  if (user) return <Navigate to="/dashboard" replace />

  return (
    <main className="login-page">
      <div className="login-atmosphere login-atmosphere-top" />
      <div className="login-atmosphere login-atmosphere-bottom" />
      <div className="login-shell">
        <LoginBrand />
        <LoginCard />
      </div>
    </main>
  )
}

export default HomePage
