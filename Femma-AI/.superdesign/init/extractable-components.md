# Extractable Superdesign components

## TabBar

- Source: artifacts/unstoppable/app/(tabs)/_layout.tsx
- Category: layout
- Description: Five-item Today, Explore, Coach, Progress, Profile bottom navigation with native and classic renderers.
- Extractable props: activeItem (string, default Explore), useNativeStyle (boolean, default false)
- Hardcoded: item labels, icon names, Manrope label styling, pink active token, tab order.

## CategoryCard

- Source: artifacts/unstoppable/components/CategoryCard.tsx
- Category: basic
- Description: Pastel gradient navigation card suitable for Explore pillars.
- Extractable props: title, subtitle, gradientStart, gradientEnd, fullWidth
- Hardcoded: arrow icon, 20px radius, white content styling, internal spacing.

## FilterChip

- Source: artifacts/unstoppable/components/FilterChip.tsx
- Category: basic
- Description: Pill-shaped selected/unselected filter.
- Extractable props: label, selected, color
- Hardcoded: border radius, typography, padding.

## SectionHeader

- Source: artifacts/unstoppable/components/SectionHeader.tsx
- Category: basic
- Description: Section label with optional See all action.
- Extractable props: title, showSeeAll
- Hardcoded: typography, action label, layout.

## WorkoutCard

- Source: artifacts/unstoppable/components/WorkoutCard.tsx
- Category: basic
- Description: Course/workout card with gradient, duration, level, calories, tag and premium lock.
- Extractable props: title, subtitle, duration, level, calories, tag, locked, wide
- Hardcoded: metadata icons, radii, typography, gradient direction.

## ProgressRing

- Source: artifacts/unstoppable/components/ProgressRing.tsx
- Category: basic
- Description: Circular progress indicator for course completion and learning paths.
- Extractable props: progress, size, strokeWidth, label, sublabel, color
- Hardcoded: round stroke, track token, centered label layout.

## MissionCard

- Source: artifacts/unstoppable/components/MissionCard.tsx
- Category: basic
- Description: Unified daily mission row with category accent, metadata and completion state.
- Extractable props: category, title, duration, difficulty, calories, completed, accentColor
- Hardcoded: category icon mapping, stripe, completion control, typography.

## CoachIcon

- Source: artifacts/unstoppable/components/CoachIcon.tsx
- Category: basic
- Description: Custom chat-bubble C logo used in the primary tab bar.
- Extractable props: size, color, strokeWidth
- Hardcoded: SVG paths and eye geometry.
