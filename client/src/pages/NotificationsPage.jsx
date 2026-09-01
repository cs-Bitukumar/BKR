import { Link } from 'react-router-dom'

function NotificationsPage() {
  const notifications = [['Live odds feed', 'Market data refresh is active for cricket and football.'], ['Wallet security', 'All wallet changes require an authenticated session.'], ['Responsible play', 'Set limits and take breaks whenever betting stops being enjoyable.']]
  return <main className="profile-page"><header className="profile-topbar glass"><div className="profile-topbar-inner"><div className="profile-topbar-left"><Link className="profile-back-btn" to="/dashboard">←</Link><h1>NOTIFICATIONS</h1></div></div></header><div className="profile-shell"><section className="profile-card glass">{notifications.map(([title, text]) => <article className="profile-bet-card glass" key={title}><div><h5>{title}</h5><p>{text}</p></div></article>)}</section></div></main>
}
export default NotificationsPage
