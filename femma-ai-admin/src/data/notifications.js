export const SEED_NOTIFICATIONS = [
  {
    id: 'n1',
    title: 'New Self-Defense lessons live',
    body: 'Foundations module videos are ready — invite members to continue their Safety path.',
    audience: 'all',
    status: 'sent',
    createdAt: '2026-03-10T09:00:00.000Z',
    sentAt: '2026-03-10T09:05:00.000Z'
  },
  {
    id: 'n2',
    title: 'Premium weekend challenge',
    body: 'Complete 3 Fat Loss lessons this weekend and earn bonus streak protection.',
    audience: 'premium',
    status: 'sent',
    createdAt: '2026-03-15T14:00:00.000Z',
    sentAt: '2026-03-15T14:10:00.000Z'
  },
  {
    id: 'n3',
    title: 'Cycle Sync draft preview',
    body: 'Internal draft — review before publishing Pregnancy & Cycle content.',
    audience: 'category:pregnancy-cycle',
    status: 'draft',
    createdAt: '2026-03-20T11:30:00.000Z',
    sentAt: null
  }
];

export const SEED_SETTINGS = {
  appName: 'Fema AI',
  tagline: "Women's Transformation Platform",
  primaryColor: '#F26BB5',
  featureFlags: {
    mealScanner: true,
    mealPlanner: true,
    coachChat: true,
    pregnancyContent: false,
    pushNotifications: true
  },
  adminEmail: 'admin@fema.ai'
};

export const SEED_ANALYTICS = {
  weeklyCompletions: [42, 58, 61, 74, 69, 88, 95],
  weekLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  completionsByCategory: [
    { id: 'safety', label: 'Safety', value: 210 },
    { id: 'fitness', label: 'Fitness', value: 480 },
    { id: 'pregnancy-cycle', label: 'Cycle', value: 64 },
    { id: 'nutrition', label: 'Nutrition', value: 92 }
  ],
  streakBuckets: [
    { label: '0 days', value: 18 },
    { label: '1–3', value: 34 },
    { label: '4–7', value: 28 },
    { label: '8–14', value: 16 },
    { label: '15+', value: 12 }
  ],
  premiumConversion: 42
};
