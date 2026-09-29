import { supabase } from '@/lib/supabase';

export type AppHomeTitles = {
  todayTasksTitle: string;
  recoveryTitle: string;
  foodTitle: string;
  programTitle: string;
};

export const DEFAULT_HOME_TITLES: AppHomeTitles = {
  todayTasksTitle: 'Today Tasks',
  recoveryTitle: 'Recovery',
  foodTitle: 'Food',
  programTitle: 'Program',
};

export async function fetchAppHomeTitles(): Promise<AppHomeTitles> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('today_tasks_title, recovery_title, food_title, program_title')
    .eq('id', 'default')
    .maybeSingle();

  if (error) throw error;

  return {
    todayTasksTitle: String(data?.today_tasks_title || '').trim() || DEFAULT_HOME_TITLES.todayTasksTitle,
    recoveryTitle: String(data?.recovery_title || '').trim() || DEFAULT_HOME_TITLES.recoveryTitle,
    foodTitle: String(data?.food_title || '').trim() || DEFAULT_HOME_TITLES.foodTitle,
    programTitle: String(data?.program_title || '').trim() || DEFAULT_HOME_TITLES.programTitle,
  };
}
