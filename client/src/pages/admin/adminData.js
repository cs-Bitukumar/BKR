export const adminUser = {
  name: 'Maya Chen',
  role: 'Operations lead',
  initials: 'MC',
}

export const adminNavigation = [
  { icon: 'space_dashboard', label: 'Overview', href: '#admin-overview', active: true },
  { icon: 'groups', label: 'Users', href: '#admin-users' },
  { icon: 'report', label: 'Moderation', href: '#admin-moderation' },
  { icon: 'memory', label: 'System Health', href: '#admin-health' },
  { icon: 'history', label: 'Audit Trail', href: '#admin-audit' },
]

export const adminStats = [
  { label: 'Active users', value: '24,861', note: '+12% this week', icon: 'groups' },
  { label: 'Pending reviews', value: '38', note: '12 urgent', icon: 'fact_check' },
  { label: 'Flagged bets', value: '09', note: '3 high risk', icon: 'warning' },
  { label: 'Revenue today', value: '₹182K', note: '+7.4% from yesterday', icon: 'payments' },
]

export const adminActions = [
  { label: 'Create alert', icon: 'campaign' },
  { label: 'Export report', icon: 'download' },
  { label: 'Broadcast notice', icon: 'send' },
]

export const adminUsers = [
  {
    name: 'Alex Rivera',
    email: 'alex@bkr.com',
    role: 'Premium trader',
    segment: 'Sportsbook',
    balance: '₹12,450',
    status: 'Verified',
  },
  {
    name: 'Jordan Lee',
    email: 'jordan@bkr.com',
    role: 'High risk',
    segment: 'Live markets',
    balance: '₹8,240',
    status: 'Review',
  },
  {
    name: 'Sofia Patel',
    email: 'sofia@bkr.com',
    role: 'VIP',
    segment: 'Casino + Sports',
    balance: '₹26,780',
    status: 'Priority',
  },
  {
    name: 'Dylan Brooks',
    email: 'dylan@bkr.com',
    role: 'Standard',
    segment: 'Sportsbook',
    balance: '₹3,560',
    status: 'Verified',
  },
]

export const moderationQueue = [
  {
    title: 'Unusual bet cluster',
    detail: 'Three large same-market wagers placed within 4 minutes.',
    owner: 'Jordan Lee',
    priority: 'High',
  },
  {
    title: 'Withdrawal threshold alert',
    detail: 'A ₹6,200 withdrawal is pending compliance review.',
    owner: 'Sofia Patel',
    priority: 'Medium',
  },
  {
    title: 'Duplicate account check',
    detail: 'Shared device fingerprint detected across two profiles.',
    owner: 'Dylan Brooks',
    priority: 'Low',
  },
]

export const systemHealth = [
  { label: 'API uptime', value: '99.98%', status: 'Healthy' },
  { label: 'Socket latency', value: '38ms', status: 'Good' },
  { label: 'Risk engine', value: 'Online', status: 'Healthy' },
  { label: 'Payment rails', value: '2 alerts', status: 'Attention' },
]

export const auditTrail = [
  { time: '12:41', event: 'Odds feed recalibrated', detail: 'NBA live market cluster refreshed.' },
  { time: '12:33', event: 'User flagged', detail: 'Jordan Lee marked for manual review.' },
  { time: '12:21', event: 'Payout released', detail: '₹4,250 processed successfully.' },
  { time: '12:09', event: 'Promo published', detail: 'Weekend boost campaign pushed live.' },
]
