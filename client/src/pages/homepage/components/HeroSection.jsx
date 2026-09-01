import './HeroSection.css'

function HeroSection() {
  return (
    <section className="hero">
      <div className="container hero-grid">
        <article className="glass hero-copy">
          <div className="chip eyebrow">
            <span className="chip-dot" />
            <span>High-stakes kinetic system</span>
          </div>

          <h1>
            Bet faster.
            <br />
            Read the <span>live edge</span>.
          </h1>

          <p>
            A premium sports betting simulation built for momentum. Keep one eye on the
            scoreboard, one eye on the odds board, and move instantly when the market
            opens up.
          </p>

          <div className="hero-actions">
            <button className="primary-btn" type="button">
              Start Playing
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
            <button className="secondary-btn" type="button">
              View Live Odds
            </button>
          </div>

          <div className="hero-stats">
            <div className="stat-card">
              <strong>+18.4%</strong>
              <span>win rate trend</span>
            </div>
            <div className="stat-card">
              <strong>1.2s</strong>
              <span>odds update latency</span>
            </div>
            <div className="stat-card">
              <strong>24/7</strong>
              <span>live market access</span>
            </div>
          </div>
        </article>

        <aside className="glass hero-visual" aria-label="Featured betting visual">
          <div className="visual-top">
            <div>
              <h3>Trending Matches</h3>
              <p>Fresh boards with aggressive live movement</p>
            </div>
            <span className="visual-badge">Live</span>
          </div>

          <div className="hero-art">
            <img src="/assets/hero.png" alt="BKR sports betting visual" />

            <div className="floating-card">
              <div className="floating-card-top">
                <strong>Tonight&apos;s Hotline</strong>
                <span className="live-pill">
                  <span className="chip-dot" />
                  Active feed
                </span>
              </div>

              <div className="floating-grid">
                <div>
                  <span>Football</span>
                  <strong>1.84</strong>
                </div>
                <div>
                  <span>Basketball</span>
                  <strong>1.61</strong>
                </div>
                <div>
                  <span>Tennis</span>
                  <strong>2.24</strong>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  )
}

export default HeroSection
