import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import HomePage from './pages/homepage/HomePage'
import SignupPage from './pages/signup/SignupPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import AdminPage from './pages/admin/AdminPage'
import WalletPage from './pages/wallet/WalletPage'
import WalletDepositPage from './pages/wallet/WalletDepositPage'
import WalletWithdrawPage from './pages/wallet/WalletWithdrawPage'
import ProfilePage from './pages/profile/ProfilePage'
import LiveMarketPage from './pages/live/LiveMarketPage'
import LiveMatchDetail from './pages/live/LiveMatchDetail'
import LiveCricketPage from './pages/live/LiveCricketPage'
import LiveCricketDetail from './pages/live/LiveCricketDetail'
import LiveFootballPage from './pages/live/LiveFootballPage'
import LiveFootballDetail from './pages/live/LiveFootballDetail'
import SessionPage from './pages/live/SessionPage'
import LudoPage from './pages/ludo/LudoPage'
import HistoryPage from './pages/HistoryPage'
import InfoPage from './pages/InfoPage'
import NotificationsPage from './pages/NotificationsPage'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'

import Scorecard from './components/Scorecard'

function AppRoutes() {
  const { user, authReady } = useAuth()

  if (!authReady) {
    return (
      <div className="auth-loading" style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
        Verifying session...
      </div>
    )
  }

  const protect = (element) => (user ? element : <Navigate to="/" replace />)
  const protectAdmin = (element) => (user?.role === 'admin' ? element : <Navigate to="/dashboard" replace />)

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <HomePage />} />
      <Route path="/signup" element={user ? <Navigate to="/dashboard" replace /> : <SignupPage />} />
      <Route path="/dashboard" element={protect(<DashboardPage />)} />
      <Route path="/live-markets" element={protect(<LiveMarketPage />)} />
      <Route path="/live-cricket" element={protect(<LiveCricketPage />)} />
      <Route path="/live-cricket/:id" element={protect(<LiveCricketDetail />)} />
      <Route path="/session/:id" element={protect(<SessionPage />)} />
      <Route path="/ludo" element={protect(<LudoPage />)} />
      <Route path="/live-football" element={protect(<LiveFootballPage />)} />
      <Route path="/live-football/:id" element={protect(<LiveFootballDetail />)} />
      <Route path="/live/:id" element={protect(<LiveMatchDetail />)} />
      <Route path="/admin" element={protectAdmin(<AdminPage />)} />
      <Route path="/wallet" element={protect(<WalletPage />)} />
      <Route path="/wallet/deposit" element={protect(<WalletDepositPage />)} />
      <Route path="/wallet/withdraw" element={protect(<WalletWithdrawPage />)} />
      <Route path="/profile" element={protect(<ProfilePage />)} />
      <Route path="/history" element={protect(<HistoryPage />)} />
      <Route path="/bet-history" element={protect(<HistoryPage />)} />
      <Route path="/notifications" element={protect(<NotificationsPage />)} />
      <Route path="/help/forgot-password" element={<InfoPage />} />
      <Route path="/terms" element={<InfoPage />} />
      <Route path="/privacy" element={<InfoPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/scorecard/:matchId" element={protect(<Scorecard />)} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
