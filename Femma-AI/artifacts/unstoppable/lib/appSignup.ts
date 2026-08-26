import { supabase } from '@/lib/supabase';

type AppSignupResponse = {
  ok?: boolean;
  error?: string;
  existing?: boolean;
  userId?: string;
};

async function invokeAppSignup(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke<AppSignupResponse>('app-signup', { body });
  if (error) {
    throw new Error(error.message || 'Unable to create account');
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function createConfirmedAccount(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  return invokeAppSignup({
    action: 'signup',
    email: input.email,
    password: input.password,
    firstName: input.firstName,
    lastName: input.lastName,
  });
}

export async function confirmExistingAccount(email: string) {
  return invokeAppSignup({ action: 'confirm', email });
}

export function isUnconfirmedError(error?: { message?: string; code?: string } | null) {
  const code = error?.code || '';
  const message = error?.message || '';
  return code === 'email_not_confirmed' || /email not confirmed/i.test(message);
}
