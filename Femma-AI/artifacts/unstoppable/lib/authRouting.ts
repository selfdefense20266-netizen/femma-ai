import { router } from 'expo-router';
import type { AuthUser } from '@/context/AuthContext';

/**
 * After login/signup — always land on entry so AppContext can finish cloud sync
 * and route by DB onboarding_completed (avoids restarting onboarding after logout).
 */
export async function routeAfterAuth(
  user: AuthUser,
  options: {
    updateProfile: (updates: { name: string }) => void;
    onboardingCompleted?: boolean;
    accountReady?: boolean;
  }
) {
  options.updateProfile({ name: `${user.firstName} ${user.lastName}`.trim() });
  router.replace('/');
}
