import './DashboardPage.css'
import DashboardTopBar from './components/DashboardTopBar'
import DashboardSidebar from './components/DashboardSidebar'
import DashboardSummary from './components/DashboardSummary'
import LiveCricketPanel from './components/LiveCricketPanel'
import LiveFootballPanel from './components/LiveFootballPanel'
import AnalyticsPanel from './components/AnalyticsPanel'
import RecentBetsPanel from './components/RecentBetsPanel'
import DashboardBottomNav from './components/DashboardBottomNav'
import DashboardFooter from './components/DashboardFooter'

function DashboardPage() {
  return (
    <main className="dashboard-page">
      <DashboardTopBar />

      <div className="dashboard-shell">
        <DashboardSidebar />

        <div className="dashboard-main">
          <DashboardSummary />

          <section className="dashboard-grid">
            <div className="dashboard-column">
              <section className="dashboard-panel live-dashboard-panel glass" id="live-matches">
                <div className="panel-header live-dashboard-heading">
                  <div>
                    <h2><span className="material-symbols-outlined">sensors</span>Live Matches</h2>
                  </div>
                  <a className="panel-link" href="#analytics">View All</a>
                </div>
                <div className="dashboard-match-grid">
                  <LiveCricketPanel />
                  <LiveFootballPanel />
                </div>
              </section>
              <AnalyticsPanel />
              <RecentBetsPanel />
            </div>
          </section>

          <DashboardFooter />
        </div>
      </div>

      <DashboardBottomNav />
    </main>
  )
}

export default DashboardPage
