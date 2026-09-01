import { Link } from 'react-router-dom'
import './NavBar.css'

function NavBar() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="brand" href="#home" aria-label="BKR home">
          <span className="brand-mark">BX</span>
          <span>BKR</span>
        </a>

        <nav className="nav-links" aria-label="Primary navigation">
          <a href="#matches">Live Matches</a>
          <a href="#features">Features</a>
          <a href="#winners">Top Winners</a>
          <a href="#footer">Quick Links</a>
        </nav>

        <div className="nav-actions">
          <button className="icon-btn" type="button" aria-label="Open search">
            <span className="material-symbols-outlined">search</span>
          </button>
          <Link className="secondary-btn" to="/dashboard">
            Sign In
          </Link>
          <Link className="primary-btn" to="/signup">
            Join Now
          </Link>
        </div>
      </div>
    </header>
  )
}

export default NavBar
