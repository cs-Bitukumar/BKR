import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { post } from '../../api/api'
import './WalletDepositPage.css'
import { formatCurrency, readWalletState } from '../../utils/wallet'

const payoutMethods = [
  {
    id: 'bank',
    title: 'Bank Account',
    detail: 'Transfer to linked bank account',
    icon: 'account_balance',
  },
  {
    id: 'upi',
    title: 'UPI',
    detail: 'Send to UPI ID instantly',
    icon: 'phone_iphone',
  },
  {
    id: 'card',
    title: 'Card Payout',
    detail: 'Refund to debit or credit card',
    icon: 'payments',
  },
]

const withdrawalPresets = [500, 1000, 2500, 5000]

function WalletWithdrawPage() {
  const navigate = useNavigate()
  const { user, token, refreshUser } = useAuth()
  const walletState = readWalletState(user)
  const visibleBalance = walletState.balance
  const [payoutMethod, setPayoutMethod] = useState('bank')
  const [withdrawAmount, setWithdrawAmount] = useState('1000')
  const [status, setStatus] = useState('Select a payout method and amount, then confirm withdrawal.')

  async function handleConfirm() {
    const amount = Number(withdrawAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus('Please enter a valid withdrawal amount.')
      return
    }

    if (amount > visibleBalance) {
      setStatus('Withdrawal amount cannot be higher than available balance.')
      return
    }

    try {
      const method = payoutMethods.find((item) => item.id === payoutMethod)?.title || payoutMethod
      const response = await post('/api/wallet/withdraw', { amount, method }, token)
      if (response.user) refreshUser(response.user)
    } catch (error) {
      setStatus(error.message || 'Unable to withdraw funds.')
      return
    }
    setStatus(`${formatCurrency(amount)} withdrawn via ${payoutMethod.toUpperCase()}.`)
    navigate('/wallet')
  }

  return (
    <main className="wallet-deposit-page">
      <header className="wallet-deposit-topbar glass">
        <div className="wallet-deposit-topbar-inner">
          <Link className="wallet-deposit-back" to="/wallet" aria-label="Back to wallet">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <p>Withdrawal</p>
            <h1>Choose Payout Method</h1>
          </div>
        </div>
      </header>

      <section className="wallet-deposit-hero glass">
        <span className="wallet-deposit-kicker">Available Balance</span>
        <strong>{formatCurrency(visibleBalance)}</strong>
        <p>Pick a payout route, enter the amount, and confirm withdrawal instantly.</p>
      </section>

      <section className="wallet-deposit-methods">
        <div className="wallet-section-header">
          <h3>Payout Options</h3>
          <span>Fast withdrawal</span>
        </div>

        <div className="wallet-payment-grid">
          {payoutMethods.map((method) => (
            <button
              className={`wallet-payment-card glass${payoutMethod === method.id ? ' is-active' : ''}`}
              type="button"
              key={method.id}
              onClick={() => {
                setPayoutMethod(method.id)
                setStatus(`${method.title} selected.`)
              }}
            >
              <span className="material-symbols-outlined">{method.icon}</span>
              <strong>{method.title}</strong>
              <p>{method.detail}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="wallet-deposit-form glass">
        <div className="wallet-section-header">
          <h3>Withdrawal Amount</h3>
          <span>Balance limited</span>
        </div>

        <label className="wallet-amount-field" htmlFor="withdraw-amount">
          <span>Amount</span>
          <input
            id="withdraw-amount"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={withdrawAmount}
            onChange={(event) => setWithdrawAmount(event.target.value)}
          />
        </label>

        <div className="wallet-deposit-presets">
          {withdrawalPresets.map((amount) => (
            <button
              className="wallet-deposit-chip"
              type="button"
              key={amount}
              onClick={() => setWithdrawAmount(String(amount))}
            >
              {formatCurrency(amount)}
            </button>
          ))}
        </div>

        <button className="wallet-confirm-action wallet-confirm-action--wide" type="button" onClick={handleConfirm}>
          Confirm Withdrawal
        </button>

        <p className="wallet-deposit-note">{status}</p>
      </section>
    </main>
  )
}

export default WalletWithdrawPage
