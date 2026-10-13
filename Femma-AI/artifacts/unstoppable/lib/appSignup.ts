import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase';
import { getAccessToken } from '@/lib/memberAuth';

type AppSignupResponse = {
  ok?: boolean;
  error?: string;
  userId?: string;
};

export class AppSignupError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AppSignupError';
    this.status = status;
  }
}

/** Edge function `app-signup` is not deployed / unreachable — caller may fall back to auth.signUp. */
export function isAppSignupUnavailable(error: unknown) {
  return error instanceof AppSignupError && (error.status === 404 || error.status === 0);
}

export function isAppSignupConflict(error: unknown) {
  return error instanceof AppSignupError && error.status === 409;
}

/**
 * Creates a CONFIRMED Supabase auth user + members row (server side).
 * Returns { ok, userId }. Throws AppSignupError (409 = email already exists).
 */
export async function createConfirmedAccount(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<AppSignupResponse> {
  let response: Response;
  try {
    response = await fetch(`${supabaseUrl}/functions/v1/app-signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${await getAccessToken()}`,
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify({
        action: 'signup',
        email: input.email,
        password: input.password,
        firstName: input.firstName,
        lastName: input.lastName,
      }),
    });
  } catch {
    throw new AppSignupError('Could not reach the sign-up service. Check your connection.', 0);
  }

  let data: AppSignupResponse = {};
  try {
    data = (await response.json()) as AppSignupResponse;
  } catch {
    data = {};
  }

  if (!response.ok || data.error || data.ok === false) {
    throw new AppSignupError(data.error || `Unable to create account (${response.status})`, response.status);
  }
  return data;
}

export function isUnconfirmedError(error?: { message?: string; code?: string } | null) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code === 'email_not_confirmed' || /email not confirmed/i.test(message);
}
