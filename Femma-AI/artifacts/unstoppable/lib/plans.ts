import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export interface PlanDefinition {
  id: string;
  name: string;
  price_monthly: number;
  price_label: string;
  description: string;
  features: string[];
  highlighted: boolean;
}

export const FALLBACK_PLANS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free Plan',
    price_monthly: 0,
    price_label: '$0',
    description: 'Start your journey with basic daily plan features.',
    features: [
      'Access to Day 1 daily plan',
      'Basic exercise guides & workouts',
      'Standard meal logging & recipes',
      '5 AI coach messages per day',
      'Progress tracking basics',
    ],
    highlighted: false,
  },
  {
    id: 'premium',
    name: 'Premium Plan',
    price_monthly: 14.99,
    price_label: '$14.99/mo',
    description: 'Unlock complete transformation paths and AI coaching tools.',
    features: [
      'Full multi-week personalized roadmap',
      'Unlimited video library & exercise guides',
      'Unlimited AI coach chat with custom guidance',
      'Unlimited AI recipes & instant meal scanner',
      'Cycle & pregnancy tailored tracking',
      'Priority support & premium badges',
    ],
    highlighted: true,
  },
];

export async function fetchDbPlans(): Promise<PlanDefinition[]> {
  if (!isSupabaseConfigured) return FALLBACK_PLANS;
  try {
    const { data, error } = await supabase.from('plans').select('*');
    if (error || !data || data.length === 0) return FALLBACK_PLANS;

    return data.map((row) => ({
      id: String(row.id || 'free'),
      name: String(row.name || (row.id === 'premium' ? 'Premium' : 'Free')),
      price_monthly: Number(row.price_monthly || 0),
      price_label: String(row.price_label || (row.id === 'premium' ? '$14.99/mo' : '$0')),
      description: String(row.description || ''),
      features: Array.isArray(row.features)
        ? row.features.map(String)
        : FALLBACK_PLANS.find((p) => p.id === row.id)?.features || [],
      highlighted: Boolean(row.highlighted),
    }));
  } catch (err) {
    console.warn('Failed to fetch plans from DB:', err);
    return FALLBACK_PLANS;
  }
}
