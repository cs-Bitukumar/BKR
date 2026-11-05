import './FooterSection.css'
import { Link } from 'react-router-dom'

function FooterSection() {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-card glass">
          <div>
            <h4>BKR</h4>
            <p>
              Fast, premium, and built around live momentum. Designed to feel like a
              a free-to-play gaming experience with non-monetary virtual coins.
            </p>
          </div>

          <div>
            <h4>Quick Links</h4>
            <ul>
              <li>Live Matches</li>
              <li>Wallet</li>
              <li>Leaderboards</li>
            </ul>
          </div>

          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link to="/policies/terms">Terms & Conditions</Link></li>
              <li><Link to="/policies/responsible">Responsible Gaming</Link></li>
              <li><Link to="/policies/privacy">Privacy Policy</Link></li>
              <li><Link to="/policies/refunds">Refund & Cancellation</Link></li>
              <li><Link to="/contact">Contact & Grievance</Link></li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default FooterSection
