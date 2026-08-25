export const SEED_PLANS = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    priceLabel: '$0',
    description: 'Explore curated lessons and start your journey.',
    features: ['Access to selected free lessons', 'Daily mission basics', 'Progress tracking', 'Community tips'],
    highlighted: false
  },
  {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 14.99,
    priceLabel: '$14.99/mo',
    description: 'Unlock full video library, journeys, and coaching tools.',
    features: [
      'Full Safety & Fitness libraries',
      'Pregnancy, Cycle & Nutrition paths',
      'Meal Scanner & Planner',
      'Priority Coach support',
      'Premium journeys & badges'
    ],
    highlighted: true
  }
];

export const SEED_SUBSCRIPTIONS = [
  { id: 's1', userId: 'u1', planId: 'premium', status: 'active', renewDate: '2026-04-12', startedAt: '2026-01-12' },
  { id: 's2', userId: 'u2', planId: 'premium', status: 'active', renewDate: '2026-04-03', startedAt: '2025-11-03' },
  { id: 's3', userId: 'u3', planId: 'free', status: 'active', renewDate: null, startedAt: '2026-03-01' },
  { id: 's4', userId: 'u4', planId: 'premium', status: 'active', renewDate: '2026-04-18', startedAt: '2025-08-18' },
  { id: 's5', userId: 'u5', planId: 'free', status: 'active', renewDate: null, startedAt: '2026-02-14' },
  { id: 's6', userId: 'u6', planId: 'premium', status: 'trial', renewDate: '2026-04-04', startedAt: '2026-01-28' },
  { id: 's7', userId: 'u7', planId: 'premium', status: 'cancelled', renewDate: null, startedAt: '2025-10-09' },
  { id: 's8', userId: 'u8', planId: 'free', status: 'active', renewDate: null, startedAt: '2026-03-18' }
];
