-- Attach media to existing yoga plan items
update public.daily_plan_items set media_url = 'https://static.exercisedb.dev/media/9gbyYKk.gif', updated_at = now() where id = 'yoga-daily-ex-1';
update public.daily_plan_items set media_url = 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800&q=80', updated_at = now() where id = 'yoga-daily-rest-1';
update public.daily_plan_items set media_url = 'https://static.exercisedb.dev/media/3xK09Sk.gif', updated_at = now() where id = 'yoga-daily-ex-2';
update public.daily_plan_items set media_url = 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80', updated_at = now() where id = 'yoga-daily-rec-1';
update public.daily_plan_items set media_url = 'https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?w=800&q=80', updated_at = now() where id = 'yoga-daily-food-1';
update public.daily_plan_items set media_url = 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&q=80', updated_at = now() where id = 'yoga-daily-food-2';

-- General fitness daily plan with default exercises + images
insert into public.daily_plans (id, title, description, user_type, status, sort_order)
values (
  'general-daily',
  'General Fitness Day',
  'Default exercises with images for all users without a specific plan.',
  'all',
  'published',
  1
)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  user_type = excluded.user_type,
  status = excluded.status,
  sort_order = excluded.sort_order;

insert into public.daily_plan_items (id, plan_id, item_type, title, tag, subtitle, scheduled_time, duration_minutes, rest_minutes, media_url, cue, sort_order)
values
  ('general-ex-1', 'general-daily', 'exercise', 'Bodyweight Squats', 'Fitness • Strength', 'Lower body', '07:00', 12, 4, 'https://static.exercisedb.dev/media/3xK09Sk.gif', 'Feet shoulder-width. Sit back, knees track toes.', 0),
  ('general-ex-2', 'general-daily', 'rest', 'Active Rest Walk', 'Rest • Reset', 'Easy pace', '07:12', 3, 0, 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?w=800&q=80', 'Breathe through the nose. Shake out the legs.', 1),
  ('general-ex-3', 'general-daily', 'exercise', 'Push-up Strength Set', 'Fitness • Upper', 'Chest & core', '07:15', 10, 5, 'https://static.exercisedb.dev/media/hoXt6wv.gif', 'Keep a straight line from head to heels.', 2),
  ('general-ex-4', 'general-daily', 'exercise', 'Jumping Jacks Cardio', 'Fitness • Cardio', 'Heart rate boost', '07:30', 8, 3, 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80', 'Land softly. Arms and legs move together.', 3),
  ('general-rec-1', 'general-daily', 'recovery', 'Cool-down Stretch Flow', 'Recovery • Guided', 'Full body unwind', '19:00', 12, 0, 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800&q=80', 'Slow stretches. Hold each pose 20–30 seconds.', 4),
  ('general-food-1', 'general-daily', 'food', 'High-Protein Breakfast Bowl', 'Food • Recipe', 'Morning fuel', '08:00', 15, 0, 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=800&q=80', 'Eggs, oats, fruit, and yogurt.', 5),
  ('general-food-2', 'general-daily', 'food', 'Grilled Chicken Salad', 'Food • Recipe', 'Lunch plate', '13:00', 20, 0, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80', 'Lean protein + colorful greens.', 6)
on conflict (id) do update set
  title = excluded.title,
  tag = excluded.tag,
  subtitle = excluded.subtitle,
  scheduled_time = excluded.scheduled_time,
  duration_minutes = excluded.duration_minutes,
  rest_minutes = excluded.rest_minutes,
  media_url = excluded.media_url,
  cue = excluded.cue,
  sort_order = excluded.sort_order;
