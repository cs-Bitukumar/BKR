export const dashboardUser = { name: 'BKR Player', role: 'Player', initials: 'BK' }
export const dashboardNavigation = [
  { icon: 'space_dashboard', label: 'Overview', href: '#overview', active: true },
  { icon: 'sports_basketball', label: 'Live scores', href: '/live-markets' },
  { icon: 'sports_esports', label: 'Play Ludo', href: '/ludo' },
  { icon: 'autorenew', label: 'Spin Game', href: '/spinner' },
  { icon: 'history', label: 'Predictions', href: '#bet-history' },
  { icon: 'token', label: 'Virtual coins', href: '/wallet' },
]
export const sidebarStats = [
  { label: 'Coin purchases', value: 'Unavailable' },
  { label: 'Transfers', value: 'Unavailable' },
  { label: 'Redemption', value: 'Unavailable' },
]
export const quickActions = [
  { label: 'Daily bonus', icon: 'redeem' },
  { label: 'Coin history', icon: 'history' },
]
export const liveMatches = [
  { league: 'NBA · East Finals', status: 'Live', title: 'Lakers vs Celtics', score: '104 - 98', minute: 'Q4 03:11', trend: 'Lakers leading', volume: 'Free prediction', odds: [{ label: 'LAL', value: '1.88' }, { label: 'Spread', value: '3.20' }, { label: 'BOS', value: '2.95' }] },
  { league: 'Premier League · Football', status: 'Live', title: 'BKR FC vs Arsenal', score: '2 - 1', minute: '72nd Min', trend: 'Live match', volume: 'Free prediction', odds: [{ label: 'Home', value: '1.45' }, { label: 'Draw', value: '4.72' }, { label: 'Away', value: '7.89' }] },
]
export const cricketMatches = [
  { league: 'IPL · Cricket', status: 'Live', title: 'Mumbai Indians vs Chennai Super Kings', score: '142/6 · 16.3', minute: '16.3 overs', trend: 'Live match', volume: 'Free prediction', odds: [{ label: 'MI', value: '1.95' }, { label: 'Draw', value: '3.78' }, { label: 'CSK', value: '2.05' }] },
  { league: 'Test · Domestic', status: 'Live', title: 'Delhi vs Rcb', score: '245 & 34/2', minute: 'Day 3', trend: 'Live match', volume: 'Free prediction', odds: [{ label: 'Delhi', value: '1.60' }, { label: 'Draw', value: '3.40' }, { label: 'Rcb', value: '2.30' }] },
]
export const footballMatches = [
  { league: 'Premier League · Football', status: 'Live', title: 'BKR FC vs Arsenal', score: '2 - 1', minute: '72nd Min', trend: 'Live match', volume: 'Free prediction', odds: [{ label: 'Home', value: '1.45' }, { label: 'Draw', value: '4.72' }, { label: 'Away', value: '7.89' }] },
  { league: 'LaLiga · Football', status: 'Live', title: 'Real Madrid vs Barcelona', score: '1 - 0', minute: '58th Min', trend: 'Live match', volume: 'Free prediction', odds: [{ label: 'Home', value: '1.95' }, { label: 'Draw', value: '3.80' }, { label: 'Away', value: '3.60' }] },
]
export const betSlipItems = [
  { market: 'Los Angeles Lakers', detail: 'Winner prediction · NBA', odds: '1.86' },
  { market: 'Total Points', detail: 'Over 211.5 · Q4', odds: '1.92' },
]
export const recentBets = []
