import './FooterSection.css'

function FooterSection() {
  return (
    <footer className="footer" id="footer">
      <div className="container">
        <div className="footer-card glass">
          <div>
            <h4>BKR</h4>
            <p>
              Fast, premium, and built around live momentum. Designed to feel like a
              serious sports desk, not a generic betting site.
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
              <li>Terms of Service</li>
              <li>Responsible Play</li>
              <li>Privacy Policy</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default FooterSection
