import { supabase } from 'lib/supabase';

export const DEFAULT_SETTINGS = {
  appName: 'Fema AI',
  tagline: "Women's Transformation Platform",
  primaryColor: '#F26BB5',
  featureFlags: {
    mealScanner: true,
    mealPlanner: true,
    coachChat: true,
    pregnancyContent: false,
    pushNotifications: true
  },
  adminEmail: 'admin@fema.ai'
};

export function mapSettings(row) {
  if (!row) return { ...DEFAULT_SETTINGS };
  return {
    appName: row.app_name || DEFAULT_SETTINGS.appName,
    tagline: row.tagline || DEFAULT_SETTINGS.tagline,
    primaryColor: row.primary_color || DEFAULT_SETTINGS.primaryColor,
    featureFlags: { ...DEFAULT_SETTINGS.featureFlags, ...(row.feature_flags || {}) },
    adminEmail: row.admin_email || DEFAULT_SETTINGS.adminEmail
  };
}

export async function fetchSettings() {
  const { data, error } = await supabase.from('app_settings').select('*').eq('id', 'default').maybeSingle();
  if (error) throw error;
  return mapSettings(data);
}

export async function saveAppSettings(partial) {
  const current = await fetchSettings();
  const next = {
    ...current,
    ...partial,
    featureFlags: { ...current.featureFlags, ...(partial.featureFlags || {}) }
  };

  const row = {
    id: 'default',
    app_name: next.appName,
    tagline: next.tagline,
    primary_color: next.primaryColor,
    feature_flags: next.featureFlags,
    admin_email: next.adminEmail,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await supabase.from('app_settings').upsert(row).select('*').single();
  if (error) throw error;
  return mapSettings(data);
}
