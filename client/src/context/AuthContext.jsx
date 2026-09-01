/* eslint-disable react-refresh/only-export-components */
import { createContext, useEffect, useContext, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { get } from '../api/api'

const AuthContext = createContext(null)
const AUTH_STORAGE_KEY = 'bkr_auth'
const LEGACY_AUTH_STORAGE_KEY = ['bet', 'x'].join('') + '_auth'

function normalizeUser(userData) {
  if (!userData) return null

  return {
    id: userData.id ?? userData._id ?? null,
    username: userData.username ?? '',
    email: userData.email ?? '',
    role: userData.role ?? 'user',
    balance: userData.balance ?? 0,
    phone: userData.phone ?? '',
    profileImage: userData.profileImage ?? '',
    createdAt: userData.createdAt ?? null,
  }
}

function readStoredAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)
    if (!raw) return { token: null, user: null }
    const parsed = JSON.parse(raw)
    return {
      token: parsed.token ?? null,
      user: normalizeUser(parsed.user),
    }
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return { token: null, user: null }
  }
}

export function AuthProvider({ children }) {
  const [{ token, user }, setSession] = useState(readStoredAuth)
  const [authReady, setAuthReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    async function verifySession() {
      if (!token) {
        if (!cancelled) setAuthReady(true)
        return
      }

      try {
        const data = await get('/api/users/me', token)
        if (cancelled) return

        const nextSession = { token, user: normalizeUser(data.user || data) }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
        setSession(nextSession)
      } catch {
        if (cancelled) return
        localStorage.removeItem(AUTH_STORAGE_KEY)
        setSession({ token: null, user: null })
      } finally {
        if (!cancelled) setAuthReady(true)
      }
    }

    verifySession()

    return () => {
      cancelled = true
    }
  }, [token])

  function saveAuth(token, userData) {
    const nextSession = { token, user: normalizeUser(userData) }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
    setAuthReady(true)
  }

  const refreshUser = useCallback((userData) => {
    if (!token) return
    const nextSession = { token, user: normalizeUser(userData) }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession))
    setSession(nextSession)
  }, [token])

  function logout() {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setSession({ token: null, user: null })
    setAuthReady(true)
    navigate('/')
  }

  function getToken() {
    return token
  }

  return (
    <AuthContext.Provider value={{ user, token, authReady, login: saveAuth, logout, getToken, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export default AuthContext
