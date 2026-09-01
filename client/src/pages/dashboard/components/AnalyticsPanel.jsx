import './AnalyticsPanel.css'

function AnalyticsPanel() {
  return (
    <section className="dashboard-panel glass" id="analytics">
      <div className="panel-header">
        <div>
          <h2>Winning Analytics</h2>
          <p>Performance trend across the last 30 days.</p>
        </div>
        <div className="analytics-legend"><span><i className="legend-profit" /> Profit</span><span><i className="legend-activity" /> Activity</span></div>
      </div>
      <div className="reference-chart" aria-label="Winning analytics chart">
        <svg viewBox="0 0 900 220" role="img" aria-label="Profit trend over the last 30 days" preserveAspectRatio="none">
          <defs><linearGradient id="profitFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#39ff14" stopOpacity=".26" /><stop offset="100%" stopColor="#39ff14" stopOpacity="0" /></linearGradient></defs>
          <path className="chart-area" d="M0 168 C90 140 150 155 220 176 S350 170 420 78 S530 44 610 164 S760 180 900 46 L900 220 L0 220 Z" />
          <path className="chart-line" d="M0 168 C90 140 150 155 220 176 S350 170 420 78 S530 44 610 164 S760 180 900 46" />
          <path className="chart-secondary" d="M0 190 C100 198 160 176 240 190 S390 205 480 190 S650 202 740 176 S840 185 900 195" />
        </svg>
        <div className="reference-chart-labels"><span>01 NOV</span><span>07 NOV</span><span>14 NOV</span><span>21 NOV</span><span>28 NOV</span></div>
      </div>
    </section>
  )
}

export default AnalyticsPanel

