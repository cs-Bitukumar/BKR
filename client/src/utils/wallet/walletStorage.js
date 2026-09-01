import { walletTransactions as seedWalletTransactions } from './walletData'

const STORAGE_PREFIX = 'bkr_wallet_state'
const LEGACY_STORAGE_PREFIX = ['bet', 'x'].join('') + '_wallet_state'

function createTransactionId() {
  return `tx_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`
}

function getDefaultTransactions() {
  return seedWalletTransactions.map((transaction) => normalizeTransaction(transaction))
}

const DEFAULT_WALLET_STATE = {
  balance: 12450,
  monthlyDeposits: 45000,
  monthlyWinnings: 68200,
  lastDeposit: 0,
  lastDepositAt: null,
  lastWithdrawal: 0,
  lastWithdrawalAt: null,
  transactions: getDefaultTransactions(),
}

function createDefaultWalletState(user) {
  const balanceFromUser = Number(user?.balance)

  return {
    ...DEFAULT_WALLET_STATE,
    balance: Number.isFinite(balanceFromUser) ? balanceFromUser : DEFAULT_WALLET_STATE.balance,
  }
}

function getUserKey(user) {
  const rawKey = user?.email || user?.username || user?.name || user?.id || 'guest'
  return String(rawKey).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_') || 'guest'
}

function getStorageKey(user) {
  return `${STORAGE_PREFIX}:${getUserKey(user)}`
}

function getLegacyStorageKey(user) {
  return `${LEGACY_STORAGE_PREFIX}:${getUserKey(user)}`
}

function coerceNumber(value, fallback = 0) {
  const nextValue = Number(value)
  return Number.isFinite(nextValue) ? nextValue : fallback
}

function normalizeTransaction(value = {}) {
  return {
    id: value.id || createTransactionId(),
    title: value.title || 'Wallet Activity',
    date: value.date || value.at || new Date().toLocaleString('en-IN'),
    amount: value.amount || '₹0.00',
    status: value.status || 'SUCCESS',
    icon: value.icon || 'receipt_long',
    tone: value.tone || 'positive',
  }
}

function normalizeWalletState(value = {}) {
  const transactions = Array.isArray(value.transactions)
    ? value.transactions.map((transaction) => normalizeTransaction(transaction))
    : getDefaultTransactions()

  return {
    balance: coerceNumber(value.balance, DEFAULT_WALLET_STATE.balance),
    monthlyDeposits: coerceNumber(value.monthlyDeposits, DEFAULT_WALLET_STATE.monthlyDeposits),
    monthlyWinnings: coerceNumber(value.monthlyWinnings, DEFAULT_WALLET_STATE.monthlyWinnings),
    lastDeposit: coerceNumber(value.lastDeposit, DEFAULT_WALLET_STATE.lastDeposit),
    lastDepositAt: value.lastDepositAt || null,
    lastWithdrawal: coerceNumber(value.lastWithdrawal, DEFAULT_WALLET_STATE.lastWithdrawal),
    lastWithdrawalAt: value.lastWithdrawalAt || null,
    transactions,
  }
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(coerceNumber(amount))
}

export function readWalletState(user) {
  if (typeof window === 'undefined') {
    return createDefaultWalletState(user)
  }

  try {
    const raw = localStorage.getItem(getStorageKey(user)) || localStorage.getItem(getLegacyStorageKey(user))
    if (!raw) {
      return createDefaultWalletState(user)
    }

    return normalizeWalletState(JSON.parse(raw))
  } catch {
    return createDefaultWalletState(user)
  }
}

export function getWalletBalance(user) {
  return readWalletState(user).balance
}

export function getWalletTransactions(user) {
  const walletState = readWalletState(user)
  return Array.isArray(walletState.transactions) ? walletState.transactions : []
}

export function saveWalletState(user, state) {
  if (typeof window === 'undefined') {
    return normalizeWalletState(state)
  }

  const nextState = normalizeWalletState(state)
  localStorage.setItem(getStorageKey(user), JSON.stringify(nextState))
  return nextState
}

export function depositFunds(user, amount, details = {}) {
  const depositAmount = coerceNumber(amount)

  if (depositAmount <= 0) {
    return readWalletState(user)
  }

  const currentState = readWalletState(user)
  const methodTitle = details.methodTitle ? `${details.methodTitle} Deposit` : 'Confirmed Deposit'
  const now = new Date().toISOString()

  return saveWalletState(user, {
    ...currentState,
    balance: currentState.balance + depositAmount,
    monthlyDeposits: currentState.monthlyDeposits + depositAmount,
    lastDeposit: depositAmount,
    lastDepositAt: now,
    transactions: [
      normalizeTransaction({
        title: methodTitle,
        date: formatDepositTimestamp(now),
        amount: `+${formatCurrency(depositAmount)}`,
        status: 'SUCCESS',
        icon: 'add_card',
        tone: 'positive',
      }),
      ...currentState.transactions,
    ],
  })
}

export function withdrawFunds(user, amount, details = {}) {
  const withdrawalAmount = coerceNumber(amount)

  if (withdrawalAmount <= 0) {
    return readWalletState(user)
  }

  const currentState = readWalletState(user)
  const nextBalance = Math.max(0, currentState.balance - withdrawalAmount)
  const actualWithdrawal = Math.min(withdrawalAmount, currentState.balance)
  const methodTitle = details.methodTitle ? `${details.methodTitle} Withdrawal` : 'Withdrawal Request'
  const now = new Date().toISOString()

  return saveWalletState(user, {
    ...currentState,
    balance: nextBalance,
    lastWithdrawal: actualWithdrawal,
    lastWithdrawalAt: now,
    transactions: [
      normalizeTransaction({
        title: methodTitle,
        date: formatDepositTimestamp(now),
        amount: `-${formatCurrency(actualWithdrawal)}`,
        status: 'PENDING',
        icon: 'outbound',
        tone: 'pending',
      }),
      ...currentState.transactions,
    ],
  })
}

export function recordBetPlacement(user, amount, details = {}) {
  const betAmount = coerceNumber(amount)

  if (betAmount <= 0) {
    return readWalletState(user)
  }

  const currentState = readWalletState(user)
  const nextBalance = Math.max(0, currentState.balance - betAmount)
  const now = new Date().toISOString()
  const marketTitle = details.marketTitle || details.selection || 'Bet Placed'
  const matchTitle = details.matchTitle ? `${details.matchTitle} · ${marketTitle}` : marketTitle

  return saveWalletState(user, {
    ...currentState,
    balance: nextBalance,
    transactions: [
      normalizeTransaction({
        title: matchTitle,
        date: formatDepositTimestamp(now),
        amount: `-${formatCurrency(betAmount)}`,
        status: 'PENDING',
        icon: 'sports_handball',
        tone: 'pending',
      }),
      ...currentState.transactions,
    ],
  })
}

export function formatDepositTimestamp(value) {
  if (!value) {
    return 'Just now'
  }

  return new Date(value).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
