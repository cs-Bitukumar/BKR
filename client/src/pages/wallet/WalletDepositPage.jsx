import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { post } from '../../api/api'
import './WalletDepositPage.css'
import { formatCurrency, readWalletState } from '../../utils/wallet'

const paymentMethods = [
  {
    id: 'upi',
    title: 'UPI',
    detail: 'Google Pay, PhonePe, Paytm',
    icon: 'account_balance',
  },
  {
    id: 'debit',
    title: 'Debit Card',
    detail: 'Visa, Mastercard, RuPay',
    icon: 'credit_card',
  },
  {
    id: 'credit',
    title: 'Credit Card',
    detail: 'Instant card authorization',
    icon: 'payments',
  },
]

const depositPresets = [500, 1000, 2500, 5000]

function WalletDepositPage() {
  const navigate = useNavigate()
  const { user, token, refreshUser } = useAuth()
  const walletState = readWalletState(user)
  const visibleBalance = walletState.balance
  const [paymentMethod, setPaymentMethod] = useState('upi')
  const [depositAmount, setDepositAmount] = useState('1000')
  const [status, setStatus] = useState('Select a payment method and amount, then confirm pay.')

  async function handleConfirm() {
    const amount = Number(depositAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setStatus('Please enter a valid deposit amount.')
      return
    }

    try {
      const method = paymentMethods.find((item) => item.id === paymentMethod)?.title || paymentMethod
      const response = await post('/api/wallet/deposit', { amount, method }, token)
      if (response.user) refreshUser(response.user)
    } catch (error) {
      setStatus(error.message || 'Unable to deposit funds.')
      return
    }
    setStatus(`${formatCurrency(amount)} credited using ${paymentMethod.toUpperCase()}.`)
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
            <p>Deposit Funds</p>
            <h1>Choose Payment Method</h1>
          </div>
        </div>
      </header>

      <section className="wallet-deposit-hero glass">
        <span className="wallet-deposit-kicker">Available Balance</span>
        <strong>{formatCurrency(visibleBalance)}</strong>
        <p>Pick a method, enter the amount, and confirm pay to add funds instantly.</p>
      </section>

      <section className="wallet-deposit-methods">
        <div className="wallet-section-header">
          <h3>Payment Options</h3>
          <span>Secure methods</span>
        </div>

        <div className="wallet-payment-grid">
          {paymentMethods.map((method) => (
            <button
              className={`wallet-payment-card glass${paymentMethod === method.id ? ' is-active' : ''}`}
              type="button"
              key={method.id}
              onClick={() => {
                setPaymentMethod(method.id)
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
          <h3>Deposit Amount</h3>
          <span>Instant credit</span>
        </div>

        <label className="wallet-amount-field" htmlFor="deposit-amount">
          <span>Amount</span>
          <input
            id="deposit-amount"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={depositAmount}
            onChange={(event) => setDepositAmount(event.target.value)}
          />
        </label>

        <div className="wallet-deposit-presets">
          {depositPresets.map((amount) => (
            <button
              className="wallet-deposit-chip"
              type="button"
              key={amount}
              onClick={() => setDepositAmount(String(amount))}
            >
              {formatCurrency(amount)}
            </button>
          ))}
        </div>

        <button className="wallet-confirm-action wallet-confirm-action--wide" type="button" onClick={handleConfirm}>
          Confirm Pay
        </button>

        <p className="wallet-deposit-note">{status}</p>
      </section>
    </main>
  )
}

export default WalletDepositPage
