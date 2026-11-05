import './DashboardFooter.css'
import { Link } from 'react-router-dom'

function DashboardFooter() {
  return (
    <footer className="dashboard-footer glass">
      <div className="footer-brand-block">
        <h3>BKR</h3>
        <p>
          A free-to-play gaming experience for players who value speed and precision,
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
        <Link to="/policies/terms">Terms & Conditions</Link>
        <Link to="/policies/privacy">Privacy Policy</Link>
        <Link to="/policies/refunds">Refunds</Link>
        <Link to="/policies/responsible">Responsible Gaming</Link>
        <Link to="/contact">Contact & Grievance</Link>
      </div>
    </footer>
  )
}

export default DashboardFooter
