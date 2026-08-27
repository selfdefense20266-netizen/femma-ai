import { supabase, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import type { UserProfile } from '@/context/AppContext';
import { LEVEL_NAMES } from '@/context/AppContext';
import { checkCoachQuestionScope } from '@/lib/coachScope';

export type CoachChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type CoachResponse = {
  ok?: boolean;
  reply?: string;
  error?: string;
  model?: string;
};

async function authToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token || supabaseAnonKey;
}

function profilePayload(profile: UserProfile) {
  return {
    name: profile.name || undefined,
    goal: profile.goal || undefined,
    fitnessLevel: profile.fitnessLevel || undefined,
    environment: profile.environment || undefined,
    dailyTime: profile.dailyTime || undefined,
    foodPreference: profile.foodPreference || undefined,
    planName: profile.planName || undefined,
    journeyDay: profile.journeyDay || undefined,
    streak: profile.streak || undefined,
    levelName: LEVEL_NAMES[profile.level] || undefined,
    points: profile.points || undefined,
    cyclePhase: profile.cyclePhase !== 'none' ? profile.cyclePhase : undefined,
    cycleDay: profile.cycleDay || undefined,
    isPregnant: profile.isPregnant || undefined,
    pregnancyWeek: profile.isPregnant ? profile.pregnancyWeek || undefined : undefined,
  };
}

export async function sendCoachMessage(
  messages: CoachChatMessage[],
  profile: UserProfile
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured.');
  }

  const latest = messages[messages.length - 1]?.content || '';
  const scope = checkCoachQuestionScope(latest);
  if (!scope.allowed && scope.reply) {
    return scope.reply;
  }

  const payload = {
    messages: messages.slice(-20),
    profile: profilePayload(profile),
  };

  const post = async (token: string) => {
    const response = await fetch(`${supabaseUrl}/functions/v1/openai-coach`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let data: CoachResponse = {};
    try {
      data = text ? (JSON.parse(text) as CoachResponse) : {};
    } catch {
      data = { error: text || 'Coach request failed' };
    }
    return { response, data };
  };

  let token = await authToken();
  let result: { response: Response; data: CoachResponse };
  try {
    result = await post(token);
  } catch {
    throw new Error('Could not reach AI Coach. Check your connection and try again.');
  }

  if (result.response.status === 401 && token !== supabaseAnonKey) {
    try {
      result = await post(supabaseAnonKey);
    } catch {
      throw new Error('Could not reach AI Coach. Check your connection and try again.');
    }
  }

  const { response, data } = result;
  if (!response.ok || data.error) {
    throw new Error(data.error || `Coach request failed (${response.status})`);
  }
  if (!data.reply?.trim()) {
    throw new Error('AI Coach returned an empty reply.');
  }

  return data.reply.trim();
}
