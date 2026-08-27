import type { UserProfile } from '@/context/AppContext';
import { CYCLE_PHASE_INFO } from '@/context/AppContext';

const FALLBACK_SUGGESTIONS = [
  'What workout should I do today?',
  'How do I stay motivated?',
  'Best yoga for stress relief?',
  'How much protein do I need?',
];

function unique(items: string[]) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function goalQuestions(profile: UserProfile): string[] {
  const goal = profile.goal.toLowerCase();
  const time = profile.dailyTime ? ` in ${profile.dailyTime}` : '';
  const env =
    profile.environment === 'Home'
      ? ' at home'
      : profile.environment === 'Gym'
        ? ' at the gym'
        : profile.environment === 'Both'
          ? ' at home or the gym'
          : '';
  const level = profile.fitnessLevel ? ` as a ${profile.fitnessLevel.toLowerCase()}` : '';

  if (goal.includes('weight loss')) {
    return [`What's the best fat-burning workout${time}${env}${level}?`, 'How can I eat for weight loss without feeling hungry?'];
  }
  if (goal.includes('tone') || goal.includes('sculpt')) {
    return [`What toning workout should I do${time}${env}?`, 'How do I build lean muscle while staying toned?'];
  }
  if (goal.includes('muscle') || goal.includes('build muscle')) {
    return [`What strength workout fits${time}${env}${level}?`, 'How much protein do I need to build muscle?'];
  }
  if (goal.includes('boxing')) {
    return [`Suggest a boxing workout${time}${env}`, 'How do I improve footwork and conditioning?'];
  }
  if (goal.includes('self-defense') || goal.includes('self defence')) {
    return ['What self-defense skills should I practice first?', 'How do I stay aware and safe in public?'];
  }
  if (goal.includes('hiit')) {
    return [`Plan a HIIT session${time}${env}${level}`, 'How often should I do HIIT for results?'];
  }
  if (goal.includes('yoga')) {
    return [`What yoga flow suits me${time}${level}?`, 'Which yoga poses help flexibility and strength?'];
  }
  if (goal.includes('confidence')) {
    return ['How can training build my confidence?', `What workout${time}${env} makes me feel strong?`];
  }
  if (goal.includes('pregnancy')) {
    return ['What pregnancy-safe workout can I do today?', 'What nutrients matter most during pregnancy?'];
  }
  if (goal.includes('postpartum')) {
    return ['What gentle postpartum exercises are safe to start?', 'How do I rebuild core strength after birth?'];
  }
  if (goal.includes('flexibility')) {
    return [`Best stretching routine${time}${level}?`, 'How do I improve mobility without getting sore?'];
  }
  if (goal.includes('stress')) {
    return ['What yoga or breathing helps stress relief?', 'How should I train on high-stress days?'];
  }

  return [`What workout supports my ${profile.goal.toLowerCase()} goal${time}?`];
}

function cycleQuestions(profile: UserProfile): string[] {
  if (profile.isPregnant) {
    const week = profile.pregnancyWeek > 0 ? ` at week ${profile.pregnancyWeek}` : '';
    return [
      `What's a safe workout for me${week}?`,
      'What pregnancy-safe meals should I eat today?',
    ];
  }

  if (profile.cyclePhase && profile.cyclePhase !== 'none') {
    const phase = CYCLE_PHASE_INFO[profile.cyclePhase].name.toLowerCase();
    return [
      `What workout fits my ${phase} phase?`,
      `What should I eat during my ${phase} phase?`,
    ];
  }

  return [];
}

function lifestyleQuestions(profile: UserProfile): string[] {
  const items: string[] = [];

  if (profile.environment === 'Home') {
    items.push(
      profile.dailyTime
        ? `Best no-equipment workout for ${profile.dailyTime}?`
        : 'Best no-equipment workout for home?'
    );
  } else if (profile.environment === 'Gym') {
    items.push(
      profile.dailyTime
        ? `What should I do at the gym in ${profile.dailyTime}?`
        : 'What gym workout should I start with?'
    );
  }

  const food = profile.foodPreference?.trim();
  if (food && food !== 'No preference') {
    items.push(`Give me ${food.toLowerCase()} meal ideas for my goal`);
  }

  if (profile.dailyTime && !profile.environment) {
    items.push(`How do I make the most of ${profile.dailyTime} per day?`);
  }

  return items;
}

function habitQuestions(profile: UserProfile): string[] {
  if (profile.streak >= 3) {
    return [`How do I protect my ${profile.streak}-day streak?`];
  }
  if (profile.journeyDay <= 7) {
    return ["I'm new — where should I start today?"];
  }
  return ['How do I stay consistent when life gets busy?'];
}

/** Personalized coach chips from onboarding profile answers. */
export function buildCoachSuggestions(profile: UserProfile): string[] {
  const suggestions = unique([
    ...cycleQuestions(profile),
    ...goalQuestions(profile),
    ...lifestyleQuestions(profile),
    ...habitQuestions(profile),
  ]);

  for (const fallback of FALLBACK_SUGGESTIONS) {
    if (suggestions.length >= 6) break;
    if (!suggestions.includes(fallback)) suggestions.push(fallback);
  }

  return suggestions.slice(0, 6);
}
