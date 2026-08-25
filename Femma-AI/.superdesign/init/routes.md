# Route map

Routing: Expo Router 6 file-based routing. The root stack is defined in artifacts/unstoppable/app/_layout.tsx. The main signed-in shell is artifacts/unstoppable/app/(tabs)/_layout.tsx.

## Entry and onboarding

| URL | File | Layout | Summary |
| --- | --- | --- | --- |
| / | artifacts/unstoppable/app/index.tsx | Root stack | Resolves first-run state and redirects to welcome or Today. |
| /welcome | artifacts/unstoppable/app/welcome.tsx | Root stack | Brand welcome and primary onboarding CTA. |
| /onboarding | artifacts/unstoppable/app/onboarding/index.tsx | Onboarding stack | Goal selection. |
| /onboarding/experience | artifacts/unstoppable/app/onboarding/experience.tsx | Onboarding stack | Experience level. |
| /onboarding/lifestyle | artifacts/unstoppable/app/onboarding/lifestyle.tsx | Onboarding stack | Time and lifestyle preferences. |
| /onboarding/cycle | artifacts/unstoppable/app/onboarding/cycle.tsx | Onboarding stack | Cycle/pregnancy preferences. |
| /onboarding/plan | artifacts/unstoppable/app/onboarding/plan.tsx | Onboarding stack | AI plan generation. |
| /onboarding/reveal | artifacts/unstoppable/app/onboarding/reveal.tsx | Onboarding stack | Personalized plan reveal. |

## Primary tabs

| URL | File | Layout | Summary |
| --- | --- | --- | --- |
| /(tabs) | artifacts/unstoppable/app/(tabs)/index.tsx | Five-tab shell | Today mission dashboard. |
| /(tabs)/explore | artifacts/unstoppable/app/(tabs)/explore.tsx | Five-tab shell | Current flat Train browse/search list. |
| /(tabs)/coach | artifacts/unstoppable/app/(tabs)/coach.tsx | Five-tab shell | AI coach conversation. |
| /(tabs)/progress | artifacts/unstoppable/app/(tabs)/progress.tsx | Five-tab shell | Levels, progress rings, badges. |
| /(tabs)/profile | artifacts/unstoppable/app/(tabs)/profile.tsx | Five-tab shell | Profile, preferences, settings. |

## Fitness and recovery

| URL | File | Layout | Summary |
| --- | --- | --- | --- |
| /fitness | artifacts/unstoppable/app/fitness/index.tsx | Fitness stack | Workout list and filters. |
| /fitness/[id] | artifacts/unstoppable/app/fitness/[id].tsx | Fitness stack | Program/workout details. |
| /fitness/player | artifacts/unstoppable/app/fitness/player.tsx | Fitness stack | Active workout player. |
| /yoga | artifacts/unstoppable/app/yoga/index.tsx | Yoga stack | Yoga sessions and filters. |
| /yoga/[id] | artifacts/unstoppable/app/yoga/[id].tsx | Yoga stack | Guided yoga session detail/player. |

## Safety, nutrition, cycle and recipes

| URL | File | Layout | Summary |
| --- | --- | --- | --- |
| /safety | artifacts/unstoppable/app/safety/index.tsx | Safety stack | Safety and self-defense learning paths. |
| /safety/[id] | artifacts/unstoppable/app/safety/[id].tsx | Safety stack | Technique/course lesson detail. |
| /scan-food | artifacts/unstoppable/app/scan-food.tsx | Root stack | Camera/photo food scanning. |
| /nutrition/result | artifacts/unstoppable/app/nutrition/result.tsx | Nutrition stack | Scan result and macro breakdown. |
| /recipe | artifacts/unstoppable/app/recipe/index.tsx | Recipe stack | Recipe browse and filters. |
| /recipe/[id] | artifacts/unstoppable/app/recipe/[id].tsx | Recipe stack | Recipe detail and cooking steps. |
| /cycle | artifacts/unstoppable/app/cycle/index.tsx | Cycle stack | Cycle overview, logging, insights. |

## Layout source

The complete root and tab router configs are included in layouts.md.
