import type { UserProfile } from '@/context/AppContext';
import { detectFocus } from '@/lib/dailyMissions';

export type YogaSession = {
  id: string;
  title: string;
  duration: number;
  level: string;
  desc: string;
  subtitle: string;
  colors: [string, string];
  filters: string[];
  poses: { name: string; duration: string }[];
};

export const YOGA_FILTERS = ['All', 'Beginner', 'Stress Relief', 'Sleep', 'Flexibility', 'Pregnancy', 'Recovery', 'Breathwork'];

const GENTLE_POSES = [
  { name: "Child's Pose", duration: '1-2 min' },
  { name: 'Cat-Cow Stretch', duration: '1-2 min' },
  { name: 'Seated Forward Fold', duration: '1-2 min' },
  { name: 'Supine Twist', duration: '1-2 min' },
  { name: 'Legs Up the Wall', duration: '2 min' },
  { name: 'Savasana', duration: '2 min' },
];

const PREGNANCY_POSES = [
  { name: 'Cat-Cow on all fours', duration: '1-2 min' },
  { name: 'Wide-knee Child’s Pose', duration: '1-2 min' },
  { name: 'Butterfly hips (supported)', duration: '2 min' },
  { name: 'Side-lying stretch', duration: '1-2 min' },
  { name: 'Wall calf stretch', duration: '1 min' },
  { name: 'Side-lying rest', duration: '2 min' },
];

const POSTPARTUM_POSES = [
  { name: 'Gentle Cat-Cow', duration: '1-2 min' },
  { name: 'Pelvic tilts', duration: '1-2 min' },
  { name: 'Supported Child’s Pose', duration: '2 min' },
  { name: 'Seated side stretch', duration: '1 min' },
  { name: 'Legs Up the Wall', duration: '2 min' },
  { name: 'Savasana', duration: '2 min' },
];

export const YOGA_SESSIONS: YogaSession[] = [
  {
    id: 'y1',
    title: 'Morning Energy Flow',
    duration: 20,
    level: 'Beginner',
    desc: 'Wake up your body gently',
    subtitle: '20 min · Beginner · Gentle wake-up',
    colors: ['#77CDED', '#B9A7F2'],
    filters: ['Beginner'],
    poses: GENTLE_POSES,
  },
  {
    id: 'y2',
    title: 'Stress Relief Sequence',
    duration: 15,
    level: 'All levels',
    desc: 'Release tension in 15 minutes',
    subtitle: '15 min · All levels · Release tension',
    colors: ['#B9A7F2', '#E9E2FC'],
    filters: ['Stress Relief', 'Recovery', 'Breathwork'],
    poses: GENTLE_POSES,
  },
  {
    id: 'y3',
    title: 'Deep Flexibility Flow',
    duration: 30,
    level: 'Intermediate',
    desc: 'Open hips, hamstrings & spine',
    subtitle: '30 min · Intermediate · Mobility',
    colors: ['#A9E4D2', '#77CDED'],
    filters: ['Flexibility'],
    poses: GENTLE_POSES,
  },
  {
    id: 'y4',
    title: 'Sleep Yoga',
    duration: 20,
    level: 'All levels',
    desc: 'Prepare your body for deep sleep',
    subtitle: '20 min · All levels · Wind down',
    colors: ['#1a1a2e', '#2d1b4e'],
    filters: ['Sleep', 'Breathwork'],
    poses: GENTLE_POSES,
  },
  {
    id: 'y5',
    title: 'Menstrual Comfort',
    duration: 20,
    level: 'Gentle',
    desc: 'Ease cramps and discomfort',
    subtitle: '20 min · Gentle · Cycle care',
    colors: ['#FF928F', '#F26BB5'],
    filters: ['Recovery'],
    poses: GENTLE_POSES,
  },
  {
    id: 'y6',
    title: 'Pregnancy Yoga',
    duration: 25,
    level: 'Gentle',
    desc: 'Safe & nurturing movement for pregnancy',
    subtitle: '25 min · Gentle · Prenatal-safe',
    colors: ['#FFD88A', '#FF928F'],
    filters: ['Pregnancy'],
    poses: PREGNANCY_POSES,
  },
  {
    id: 'y7',
    title: 'Prenatal Hip Openers',
    duration: 20,
    level: 'Gentle',
    desc: 'Create space in hips and low back',
    subtitle: '20 min · Gentle · Prenatal-safe',
    colors: ['#FF928F', '#B9A7F2'],
    filters: ['Pregnancy', 'Flexibility'],
    poses: PREGNANCY_POSES,
  },
  {
    id: 'y8',
    title: 'Prenatal Breath & Rest',
    duration: 15,
    level: 'Gentle',
    desc: 'Calm the nervous system and rest on your side',
    subtitle: '15 min · Gentle · Breathwork',
    colors: ['#A9E4D2', '#FFD88A'],
    filters: ['Pregnancy', 'Breathwork', 'Sleep'],
    poses: PREGNANCY_POSES,
  },
  {
    id: 'y9',
    title: 'Postpartum Gentle Rebuild',
    duration: 20,
    level: 'Gentle',
    desc: 'Slow core and mobility return after birth',
    subtitle: '20 min · Gentle · Recovery',
    colors: ['#A9E4D2', '#77CDED'],
    filters: ['Recovery'],
    poses: POSTPARTUM_POSES,
  },
];

export function recommendedYogaFilter(profile: UserProfile): string {
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  if (profile.isPregnant || focus === 'pregnancy') return 'Pregnancy';
  if (focus === 'postpartum') return 'Recovery';
  if (profile.cyclePhase === 'menstrual') return 'Recovery';
  if (focus === 'stress') return 'Stress Relief';
  if (focus === 'flexibility') return 'Flexibility';
  if (focus === 'yoga') return 'All';
  return 'Recovery';
}

export function recommendedYogaSessionId(profile: UserProfile): string {
  const focus = detectFocus(profile.goal, profile.isPregnant ? 'pregnancy' : '');
  if (profile.isPregnant || focus === 'pregnancy') return 'y6';
  if (focus === 'postpartum') return 'y9';
  if (profile.cyclePhase === 'menstrual') return 'y5';
  if (focus === 'stress') return 'y2';
  if (focus === 'flexibility') return 'y3';
  if (focus === 'yoga') return 'y1';
  return 'y2';
}

export function yogaSessionsForProfile(profile: UserProfile, filter: string): YogaSession[] {
  const recommendedId = recommendedYogaSessionId(profile);
  const list =
    filter === 'All'
      ? [...YOGA_SESSIONS]
      : YOGA_SESSIONS.filter((session) => session.filters.includes(filter));

  return list.sort((a, b) => {
    if (a.id === recommendedId) return -1;
    if (b.id === recommendedId) return 1;
    return 0;
  });
}

export function getYogaSession(id?: string): YogaSession | undefined {
  return YOGA_SESSIONS.find((session) => session.id === id);
}
