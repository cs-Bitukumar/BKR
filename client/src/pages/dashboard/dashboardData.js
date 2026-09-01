export const dashboardUser = {
  name: 'Alex Rivera',
  role: 'Premium analyst',
  initials: 'AR',
}

export const dashboardNavigation = [
  { icon: 'space_dashboard', label: 'Overview', href: '#overview', active: true },
  { icon: 'sports_basketball', label: 'Live Markets', href: '/live-markets' },
  { icon: 'casino', label: 'Play Ludo', href: '/ludo' },
  { icon: 'insights', label: 'Analytics', href: '#analytics' },
  { icon: 'history', label: 'History', href: '#bet-history' },
  { icon: 'account_balance_wallet', label: 'Wallet', href: '/wallet' },
]

export const dashboardHeroStats = [
  {
    label: 'Wallet balance',
    value: '₹12,450.00',
    note: 'Available bankroll',
    icon: 'account_balance_wallet',
  },
  {
    label: 'Open slips',
    value: '06',
    note: '3 live • 3 pending',
    icon: 'receipt_long',
  },
  {
    label: 'Live markets',
    value: '18',
    note: 'Across 4 leagues',
    icon: 'sports_basketball',
  },
]

export const sidebarStats = [
  { label: 'Today P&L', value: '+₹842.00' },
  { label: 'Exposure', value: '18%' },
  { label: 'Cash-out', value: '72%' },
]

export const quickActions = [
  { label: 'Deposit', icon: 'add_card' },
  { label: 'Withdraw', icon: 'south' },
  { label: 'Reports', icon: 'file_download' },
]

export const summaryStats = [
  {
    title: 'Weekly profit',
    value: '+₹3,210.00',
    change: '+18.4%',
    note: '12.4% above target',
    icon: 'trending_up',
  },
  {
    title: 'Win rate',
    value: '89%',
    change: '+4.1%',
    note: 'Best streak this season',
    icon: 'emoji_events',
  },
  {
    title: 'Average stake',
    value: '₹186',
    change: '+11.2%',
    note: 'Risk adjusted',
    icon: 'analytics',
  },
  {
    title: 'Cash-out ratio',
    value: '72%',
    change: '+6.0%',
    note: 'Healthy exposure',
    icon: 'bolt',
  },
]

export const liveMatches = [
  {
    league: 'NBA · East Finals',
    status: 'Live',
    title: 'Lakers vs Celtics',
    score: '104 - 98',
    minute: 'Q4 03:11',
    trend: 'Sharp money on Lakers',
    volume: '₹14.5M traded',
    odds: [
      { label: 'LAL', value: '1.88' },
      { label: 'Spread', value: '3.20' },
      { label: 'BOS', value: '2.95' },
    ],
  },
  {
    league: 'Premier League · Football',
    status: 'Live',
    title: 'BKR FC vs Arsenal',
    score: '2 - 1',
    minute: '72nd Min',
    trend: 'Totals heating up',
    volume: '₹8.2M traded',
    odds: [
      { label: 'Home', value: '1.45' },
      { label: 'Draw', value: '4.72' },
      { label: 'Away', value: '7.89' },
    ],
  },
]

export const cricketMatches = [
  {
    league: 'IPL · Cricket',
    status: 'Live',
    title: 'Mumbai Indians vs Chennai Super Kings',
    score: '142/6 · 16.3',
    minute: '16.3 overs',
    trend: 'Runs flowing in powerplay',
    volume: '₹3.4M traded',
    odds: [
      { label: 'MI', value: '1.95' },
      { label: 'Draw', value: '3.78' },
      { label: 'CSK', value: '2.05' },
    ],
  },
  {
    league: 'Test · Domestic',
    status: 'Live',
    title: 'Delhi vs Rcb',
    score: '245 & 34/2',
    minute: 'Day 3',
    trend: 'Session favouring bowlers',
    volume: '₹420K traded',
    odds: [
      { label: 'Delhi', value: '1.60' },
      { label: 'Draw', value: '3.40' },
      { label: 'Rcb', value: '2.30' },
    ],
  },
]

export const footballMatches = [
  {
    league: 'Premier League · Football',
    status: 'Live',
    title: 'BKR FC vs Arsenal',
    score: '2 - 1',
    minute: '72nd Min',
    trend: 'Totals heating up',
    volume: '₹8.2M traded',
    odds: [
      { label: 'Home', value: '1.45' },
      { label: 'Draw', value: '4.72' },
      { label: 'Away', value: '7.89' },
    ],
  },
  {
    league: 'LaLiga · Football',
    status: 'Live',
    title: 'Real Madrid vs Barcelona',
    score: '1 - 0',
    minute: '58th Min',
    trend: 'Sharps piling on Real',
    volume: '₹6.1M traded',
    odds: [
      { label: 'Home', value: '1.95' },
      { label: 'Draw', value: '3.80' },
      { label: 'Away', value: '3.60' },
    ],
  },
]

export const analyticsSummary = [
  {
    label: 'Win rate',
    value: '89%',
    detail: '+4.1% from last month',
  },
  {
    label: 'ROI',
    value: '+14.8%',
    detail: 'Top 10% of active users',
  },
  {
    label: 'Risk score',
    value: 'Low',
    detail: 'Exposure under threshold',
  },
]

export const analyticsPoints = [
  { label: 'Mon', value: 32 },
  { label: 'Tue', value: 46 },
  { label: 'Wed', value: 38 },
  { label: 'Thu', value: 58 },
  { label: 'Fri', value: 49 },
  { label: 'Sat', value: 63 },
  { label: 'Sun', value: 71 },
  { label: 'Mon', value: 68 },
  { label: 'Tue', value: 82 },
  { label: 'Wed', value: 76 },
  { label: 'Thu', value: 88 },
  { label: 'Fri', value: 74 },
]

export const recentBets = [
  {
    match: 'Celtics vs Heat',
    market: 'Winner',
    odds: '1.88',
    stake: '₹250.00',
    result: 'Won',
    profit: '+₹220.00',
  },
  {
    match: 'PSG vs Inter',
    market: 'Over 2.5',
    odds: '1.52',
    stake: '₹180.00',
    result: 'Won',
    profit: '+₹93.60',
  },
  {
    match: 'Lakers vs Warriors',
    market: 'Spread',
    odds: '2.10',
    stake: '₹300.00',
    result: 'Live',
    profit: 'In play',
  },
  {
    match: 'Milan vs Napoli',
    market: 'Both teams score',
    odds: '1.72',
    stake: '₹150.00',
    result: 'Lost',
    profit: '-₹150.00',
  },
]

export const betSlipItems = [
  { market: 'Los Angeles Lakers', detail: 'Moneyline · NBA Finals', odds: '1.86' },
  { market: 'Total Points', detail: 'Over 211.5 · Q4 Live', odds: '1.92' },
]

