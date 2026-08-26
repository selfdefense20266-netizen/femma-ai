import { supabase } from 'lib/supabase';

async function authHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data.session?.access_token;
  if (!token) throw new Error('You must be signed in');
  return { Authorization: `Bearer ${token}` };
}

export async function scanMealImage({ imageBase64, mimeType = 'image/jpeg', goal }) {
  const { data, error } = await supabase.functions.invoke('openai-meal-scan', {
    body: { imageBase64, mimeType, goal },
    headers: await authHeaders()
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function generateMealPlan(payload = {}) {
  const { data, error } = await supabase.functions.invoke('openai-meal-plan', {
    body: payload,
    headers: await authHeaders()
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}
