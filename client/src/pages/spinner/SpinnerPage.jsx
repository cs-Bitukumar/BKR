import { useState } from 'react'
import { Link } from 'react-router-dom'
import '../dashboard/DashboardPage.css'
import DashboardTopBar from '../dashboard/components/DashboardTopBar'
import DashboardBottomNav from '../dashboard/components/DashboardBottomNav'
import './SpinnerPage.css'

const segments = [
  { label: '10 pts', value: 10, color: '#ffb84d' },
  { label: '25 pts', value: 25, color: '#f76c5e' },
  { label: '50 pts', value: 50, color: '#51c7a3' },
  { label: 'Try again', value: 0, color: '#4c6fff' },
  { label: '100 pts', value: 100, color: '#f28f3b' },
  { label: '75 pts', value: 75, color: '#b07cff' },
  { label: '25 pts', value: 25, color: '#ef5da8' },
  { label: 'Jackpot', value: 250, color: '#62d5ff' },
]

function SpinnerPage() {
  const [rotation, setRotation] = useState(0)
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [score, setScore] = useState(0)
  const [spinCount, setSpinCount] = useState(0)
  const [bestWin, setBestWin] = useState(0)

  function spinWheel() {
    if (isSpinning) return
    const index = Math.floor(Math.random() * segments.length)
    const landed = segments[index]
    const segmentAngle = 360 / segments.length
    const targetAngle = 360 - (index * segmentAngle + segmentAngle / 2)
    const nextRotation = rotation + 360 * 6 + ((targetAngle - (rotation % 360) + 360) % 360)

    setIsSpinning(true)
    setResult(null)
    setRotation(nextRotation)
    window.setTimeout(() => {
      setResult(landed)
      setScore((current) => current + landed.value)
      setSpinCount((current) => current + 1)
      setBestWin((current) => Math.max(current, landed.value))
      setHistory((current) => [{ ...landed, id: Date.now() }, ...current].slice(0, 5))
      setIsSpinning(false)
    }, 4200)
  }

  function resetGame() {
    setRotation(0)
    setResult(null)
    setHistory([])
    setScore(0)
    setSpinCount(0)
    setBestWin(0)
  }

  const wheelBackground = `conic-gradient(${segments.map((segment, index) => `${segment.color} ${index * 12.5}% ${(index + 1) * 12.5}%`).join(', ')})`

  return (
    <main className="dashboard-page spinner-page">
      <DashboardTopBar />
      <div className="spinner-shell">
        <div className="spinner-route-head"><div><span className="spinner-kicker">Dashboard / Quick play</span><h1>Lucky Spinner</h1><p>Points challenge · no wallet balance or stake involved</p></div><Link className="spinner-back" to="/dashboard"><span className="material-symbols-outlined">arrow_back</span><span>Dashboard</span></Link></div>

        <section className="spinner-layout">
          <div className="spinner-card spinner-stage">
            <div className="spinner-heading"><div><span className="spinner-kicker">Points challenge</span><h2>Give it a spin</h2><p>Build your score with one lucky turn at a time.</p></div><div className="spinner-score"><span>Your score</span><strong>{score}</strong><small>points</small></div></div>
            <div className="spinner-stats" aria-label="Spinner stats"><span><b>{spinCount}</b> turns</span><span><b>{bestWin}</b> best win</span><span><b>250</b> jackpot</span></div>
            <div className="wheel-wrap">
              <div className="wheel-glow" aria-hidden="true" />
              <span className="wheel-pointer" aria-hidden="true" />
              <div className={`spinner-wheel${isSpinning ? ' is-spinning' : ''}`} style={{ '--wheel-background': wheelBackground, transform: `rotate(${rotation}deg)` }} aria-label="Lucky spinner wheel">
                {segments.map((segment, index) => <span className="wheel-label" style={{ transform: `rotate(${index * 45 + 22.5}deg)` }} key={`${segment.label}-${index}`}><b>{segment.label}</b></span>)}
                <div className="wheel-center"><span>SPIN</span></div>
              </div>
            </div>
            <div className="spinner-action"><button className="spin-button" type="button" onClick={spinWheel} disabled={isSpinning}><span className="material-symbols-outlined">autorenew</span>{isSpinning ? 'Spinning...' : 'Spin the wheel'}</button>{result && <div className="spinner-result" role="status"><span className="result-spark">✦</span><p>You landed on <strong>{result.label}</strong>{result.value > 0 ? ` and earned ${result.value} points.` : '.'}</p></div>}</div>
          </div>

          <aside className="spinner-card spinner-history">
            <div className="history-heading"><div><span className="spinner-kicker">Recent turns</span><h2>Your trail</h2></div><button className="reset-button" type="button" onClick={resetGame} disabled={isSpinning}><span className="material-symbols-outlined">restart_alt</span>Reset</button></div>
            {history.length ? <div className="turn-list">{history.map((turn, index) => <div className="turn-row" key={turn.id}><span className="turn-number">{history.length - index}</span><span className="turn-color" style={{ background: turn.color }} /><strong>{turn.label}</strong><span>{turn.value ? `+${turn.value}` : '—'}</span></div>)}</div> : <div className="empty-history"><span className="material-symbols-outlined">history</span><p>Your turns will appear here.</p><small>Spin the wheel to start your run.</small></div>}
            <div className="spinner-rules"><h3>How to play</h3><p>Every spin is for points only. No wallet balance or stake is involved.</p></div>
          </aside>
        </section>
      </div>
      <DashboardBottomNav activeLabel="Spin" />
    </main>
  )
}

export default SpinnerPage
