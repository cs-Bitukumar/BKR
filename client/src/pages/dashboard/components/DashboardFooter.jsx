import './DashboardFooter.css'
import { Link } from 'react-router-dom'

function DashboardFooter() {
  return (
    <footer className="dashboard-footer glass">
      <div className="footer-brand-block">
        <h3>BKR</h3>
        <p>
          The premier sports betting simulation for players who value speed, precision,
          and absolute reliability in every bet.
        </p>
        <span className="footer-status">
          <span className="chip-dot" />
          Markets synced every 12s
        </span>
      </div>

      <div className="footer-links">
        <a href="#overview">Overview</a>
        <Link to="/live-markets">Live Markets</Link>
        <a href="#analytics">Analytics</a>
        <a href="#bet-history">History</a>
      </div>

      <div className="footer-legal">
        <button type="button">Terms of Service</button>
        <button type="button">Privacy Policy</button>
        <button type="button">Responsible Gaming</button>
      </div>
    </footer>
  )
}

export default DashboardFooter
