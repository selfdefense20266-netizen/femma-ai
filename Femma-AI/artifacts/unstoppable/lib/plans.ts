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
    id: 'premium',
    name: 'Premium Plan',
    price_monthly: 14.99,
    price_label: '$14.99/mo',
    description: 'Full access for 30 days. If renewal fails, a 3-day trial applies — then pay to resume.',
    features: [
      'Full multi-week personalized roadmap',
      'Unlimited video library & exercise guides',
      'Unlimited AI coach chat with custom guidance',
      'AI diet plan, recipes & meal scanner',
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
