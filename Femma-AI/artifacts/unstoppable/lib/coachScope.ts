/** Topics the Fema AI Coach is allowed to discuss. */
export const COACH_SCOPE_TOPICS = [
  'workouts & fitness',
  'yoga & stress relief',
  'nutrition & meals',
  'cycle-aware training',
  'pregnancy-safe wellness',
  'motivation & habits',
  'personal safety basics',
  'using Fema AI app features',
] as const;

export const COACH_OUT_OF_SCOPE_REPLY =
  "I'm your Fema AI wellness coach, so I can only help with workouts, nutrition, cycle-aware training, yoga, motivation, and safety. Try asking about one of those topics, or tap a suggestion below.";

const GREETING =
  /^(hi|hello|hey|thanks|thank you|good morning|good evening|good night|ok|okay|yes|no|help|yo)[!.?\s]*$/i;

const IN_SCOPE =
  /(?:workout|exercise|train|gym|fitness|yoga|stretch|pilates|cardio|hiit|squat|push.?up|plank|run|walk|steps?|lift|strength|muscle|weight|fat|tone|slim|calorie|macro|protein|carb|nutrition|meal|food|eat|diet|recipe|hydrat|water|scan|cycle|period|menstrua|ovulat|luteal|follicular|pms|hormone|pregnanc|prenatal|motivat|streak|habit|consisten|lazy|tired|stress|anxiet|sleep|calm|breath|meditat|relax|defense|defence|safety|protect|attack|escape|self.?def|fema|mission|journey|wellness|health|body|recovery|warm.?up|cool.?down|flexib|mobility|core|glute|energy|fatigue|vegan|vegetarian|snack|breakfast|lunch|dinner|iron|folate|magnesium|sore|injury|doctor|provider|coach|today|should i|how (?:much|many|long|do|can)|what (?:workout|should|can|food|eat)|best (?:yoga|workout|food)|help me|stay|feel)/i;

const OUT_OF_SCOPE =
  /(?:write (?:me )?(?:a )?(?:code|script|program|essay|email|letter|poem|story|song)|debug|javascript|typescript|python|java\b|c\+\+|react native|supabase|openai|chatgpt|politic|election|president|stock market|crypto|bitcoin|nft|forex|homework|assignment|solve this|math problem|capital of|who (?:is|was|are)|movie|netflix|game|fortnite|celebrity|gossip|dating tips|legal advice|lawyer|investment|trading|weather forecast|translate|joke about|tell me a story|write a|code for|api key|password|hack|illegal|weapon|bomb)/i;

export function checkCoachQuestionScope(text: string): { allowed: boolean; reply?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { allowed: false, reply: COACH_OUT_OF_SCOPE_REPLY };

  if (GREETING.test(trimmed)) return { allowed: true };

  if (OUT_OF_SCOPE.test(trimmed) && !IN_SCOPE.test(trimmed)) {
    return { allowed: false, reply: COACH_OUT_OF_SCOPE_REPLY };
  }

  if (IN_SCOPE.test(trimmed)) return { allowed: true };

  // Short ambiguous messages get a gentle nudge; longer off-topic ones are refused.
  if (trimmed.length <= 24) {
    return { allowed: true };
  }

  return { allowed: false, reply: COACH_OUT_OF_SCOPE_REPLY };
}
