# Key page dependency trees

Local imports are traced recursively; package imports are omitted.

## /((tabs))/explore - Explore

Entry: artifacts/unstoppable/app/(tabs)/explore.tsx

Dependencies:
- artifacts/unstoppable/hooks/useColors.ts
  - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/app/(tabs)/_layout.tsx
  - artifacts/unstoppable/hooks/useColors.ts
  - artifacts/unstoppable/components/CoachIcon.tsx
- artifacts/unstoppable/app/_layout.tsx
  - artifacts/unstoppable/components/ErrorBoundary.tsx
    - artifacts/unstoppable/components/ErrorFallback.tsx
      - artifacts/unstoppable/hooks/useColors.ts
  - artifacts/unstoppable/context/AppContext.tsx
    - artifacts/unstoppable/constants/colors.ts

## /((tabs)) - Today

Entry: artifacts/unstoppable/app/(tabs)/index.tsx

Dependencies:
- artifacts/unstoppable/hooks/useColors.ts
  - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/context/AppContext.tsx
  - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/components/ProgressRing.tsx
  - artifacts/unstoppable/hooks/useColors.ts
- artifacts/unstoppable/components/MissionCard.tsx
  - artifacts/unstoppable/hooks/useColors.ts
  - artifacts/unstoppable/context/AppContext.tsx
- artifacts/unstoppable/app/(tabs)/_layout.tsx
  - artifacts/unstoppable/components/CoachIcon.tsx

## /fitness - Fitness hub

Entry: artifacts/unstoppable/app/fitness/index.tsx

Dependencies:
- artifacts/unstoppable/components/WorkoutCard.tsx
  - artifacts/unstoppable/hooks/useColors.ts
    - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/components/FilterChip.tsx
  - artifacts/unstoppable/hooks/useColors.ts
- artifacts/unstoppable/components/SectionHeader.tsx
  - artifacts/unstoppable/hooks/useColors.ts
- artifacts/unstoppable/app/fitness/_layout.tsx
  - artifacts/unstoppable/hooks/useColors.ts

## /fitness/[id] - Fitness course/workout detail

Entry: artifacts/unstoppable/app/fitness/[id].tsx

Dependencies:
- artifacts/unstoppable/hooks/useColors.ts
  - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/app/fitness/_layout.tsx

## /yoga - Yoga hub

Entry: artifacts/unstoppable/app/yoga/index.tsx

Dependencies:
- artifacts/unstoppable/components/FilterChip.tsx
  - artifacts/unstoppable/hooks/useColors.ts
    - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/components/SectionHeader.tsx
  - artifacts/unstoppable/hooks/useColors.ts
- artifacts/unstoppable/app/yoga/_layout.tsx

## /safety - Safety hub

Entry: artifacts/unstoppable/app/safety/index.tsx

Dependencies:
- artifacts/unstoppable/components/SectionHeader.tsx
  - artifacts/unstoppable/hooks/useColors.ts
    - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/app/safety/_layout.tsx

## /recipe - Recipe browse

Entry: artifacts/unstoppable/app/recipe/index.tsx

Dependencies:
- artifacts/unstoppable/components/FilterChip.tsx
  - artifacts/unstoppable/hooks/useColors.ts
    - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/components/SectionHeader.tsx
  - artifacts/unstoppable/hooks/useColors.ts
- artifacts/unstoppable/app/recipe/_layout.tsx

## /cycle - Cycle overview

Entry: artifacts/unstoppable/app/cycle/index.tsx

Dependencies:
- artifacts/unstoppable/hooks/useColors.ts
  - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/context/AppContext.tsx
  - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/app/cycle/_layout.tsx

## /((tabs))/progress - Progress

Entry: artifacts/unstoppable/app/(tabs)/progress.tsx

Dependencies:
- artifacts/unstoppable/hooks/useColors.ts
  - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/context/AppContext.tsx
- artifacts/unstoppable/components/ProgressRing.tsx
  - artifacts/unstoppable/hooks/useColors.ts
- artifacts/unstoppable/components/BadgeCard.tsx
  - artifacts/unstoppable/hooks/useColors.ts
- artifacts/unstoppable/components/SectionHeader.tsx
  - artifacts/unstoppable/hooks/useColors.ts
- artifacts/unstoppable/app/(tabs)/_layout.tsx

## /scan-food - Food scanner

Entry: artifacts/unstoppable/app/scan-food.tsx

Dependencies:
- artifacts/unstoppable/hooks/useColors.ts
  - artifacts/unstoppable/constants/colors.ts
- artifacts/unstoppable/app/_layout.tsx
