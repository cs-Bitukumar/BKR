import './WinnersSection.css'
import { winners } from '../homepageData'

function WinnersSection() {
  return (
    <section className="section" id="winners">
      <div className="container">
        <div className="section-title">
          <div>
            <h2>Community</h2>
            <p>Friendly play and free predictions. No cash prizes are offered.</p>
          </div>
        </div>

        <div className="winner-list">
          {winners.map((winner, index) => (
            <article className="winner-card glass" key={winner.name}>
              <div className="winner-rank">{index + 1}</div>
              <div>
                <h3>{winner.name}</h3>
                <p>{winner.note}</p>
              </div>
              <div className="winner-stats">
                <strong>{winner.score}</strong>
                <span>game score</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default WinnersSection
