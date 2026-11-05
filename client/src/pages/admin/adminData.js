export const adminUser = { name: 'BKR Admin', role: 'Operations lead', initials: 'BK' }

export const adminNavigation = [
  { icon: 'space_dashboard', label: 'Overview', href: '#admin-overview', active: true },
  { icon: 'groups', label: 'Users', href: '#admin-users' },
  { icon: 'report', label: 'Moderation', href: '#admin-moderation' },
  { icon: 'memory', label: 'System Health', href: '#admin-health' },
  { icon: 'history', label: 'Audit Trail', href: '#admin-audit' },
]

export const adminStats = [
  { label: 'Active users', value: '—', note: 'Current accounts', icon: 'groups' },
  { label: 'Pending reviews', value: '—', note: 'Needs attention', icon: 'fact_check' },
  { label: 'Flagged activity', value: '—', note: 'Review required', icon: 'warning' },
  { label: 'Virtual coin accounts', value: '—', note: 'Non-monetary', icon: 'token' },
]

export const adminActions = [
  { label: 'Create alert', icon: 'campaign' },
  { label: 'Export report', icon: 'download' },
  { label: 'Broadcast notice', icon: 'send' },
]

export const adminUsers = []
export const moderationQueue = []
export const systemHealth = [
  { label: 'API uptime', value: '—', status: 'Healthy' },
  { label: 'Socket latency', value: '—', status: 'Good' },
  { label: 'Virtual coin service', value: 'Available', status: 'Healthy' },
]
export const auditTrail = []
