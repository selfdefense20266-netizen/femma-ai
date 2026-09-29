/** Fixed Recovery options shown on Today home. Rest is special (skip day). */
export const RECOVERY_TYPES = [
  {
    id: 'rest',
    label: 'Rest',
    desc: 'Skip today’s tasks — no points',
    icon: 'moon' as const,
    color: '#A9E4D2',
  },
  {
    id: 'full-body',
    label: 'Full body stretch',
    desc: 'Whole-body recovery flow',
    icon: 'maximize-2' as const,
    color: '#B9A7F2',
  },
  {
    id: 'upper-body',
    label: 'Upper body stretch',
    desc: 'Neck, shoulders, arms & back',
    icon: 'arrow-up' as const,
    color: '#F26BB5',
  },
  {
    id: 'lower-body',
    label: 'Lower body stretch',
    desc: 'Hips, legs & ankles',
    icon: 'arrow-down' as const,
    color: '#FF928F',
  },
  {
    id: 'breath',
    label: 'Breath & calm',
    desc: 'Breathwork to reset',
    icon: 'wind' as const,
    color: '#7EB8DA',
  },
] as const;

export type RecoveryTypeId = (typeof RECOVERY_TYPES)[number]['id'];

export const STRETCH_RECOVERY_TYPES = RECOVERY_TYPES.filter((t) => t.id !== 'rest');

export function recoveryTypeLabel(id?: string | null) {
  return RECOVERY_TYPES.find((t) => t.id === id)?.label || id || 'Recovery';
}
