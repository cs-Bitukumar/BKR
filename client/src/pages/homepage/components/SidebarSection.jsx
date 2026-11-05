import './SidebarSection.css'
import { features } from '../homepageData'

function SidebarSection() {
  return <aside className="sidebar-card glass" id="features">
    <div className="wallet"><div className="wallet-top"><span>Virtual Coins</span><span className="chip-dot" style={{ boxShadow: '0 0 0 6px rgba(57,255,20,0.12)' }} /></div><h3>Free daily bonus</h3><p>Coins have no monetary value and cannot be redeemed.</p></div>
    <div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.title}><div className="feature-icon"><span className="material-symbols-outlined">{feature.icon}</span></div><h3>{feature.title}</h3><p>{feature.text}</p></article>)}</div>
  </aside>
}
export default SidebarSection
