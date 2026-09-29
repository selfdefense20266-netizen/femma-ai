-- Default cover images for existing courses so the app shows real photos instead of icons.
-- Admins can replace any of these later from Content > Courses > Upload image.

update public.courses set image_url = case id
  -- Self Defence
  when 'sd-foundations' then 'https://images.unsplash.com/photo-1544033527-b192daee1f5b?w=600&q=80'
  when 'sd-boxing' then 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=600&q=80'
  when 'sd-jiu-jitsu' then 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=600&q=80'
  when 'sd-taekwondo' then 'https://images.unsplash.com/photo-1555597408-26bc8e548a46?w=600&q=80'
  when 'sd-karate' then 'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=600&q=80'
  when 'sd-mma' then 'https://images.unsplash.com/photo-1517438476312-10d79c077509?w=600&q=80'

  -- Fitness
  when 'fit-foundations' then 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80'
  when 'fit-strength' then 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80'
  when 'fit-cardio' then 'https://images.unsplash.com/photo-1538805060514-97d9cc17730c?w=600&q=80'
  when 'fit-hiit' then 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=600&q=80'
  when 'fit-yoga' then 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=600&q=80'
  when 'fit-pilates' then 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80'
  when 'fit-core' then 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=80'
  when 'fit-mobility' then 'https://images.unsplash.com/photo-1599058917765-a780eda07a3e?w=600&q=80'
  when 'fit-weight-loss' then 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=600&q=80'
  when 'fit-endurance' then 'https://images.unsplash.com/photo-1571008887538-b36bb32f4571?w=600&q=80'

  -- Cycle, Pregnancy & Health
  when 'cph-menstrual-cycle' then 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&q=80'
  when 'cph-pregnancy' then 'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=600&q=80'
  when 'cph-postpartum' then 'https://images.unsplash.com/photo-1544126592-807ade215a0b?w=600&q=80'
  when 'cph-recovery-wellness' then 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600&q=80'

  else image_url
end
where id in (
  'sd-foundations', 'sd-boxing', 'sd-jiu-jitsu', 'sd-taekwondo', 'sd-karate', 'sd-mma',
  'fit-foundations', 'fit-strength', 'fit-cardio', 'fit-hiit', 'fit-yoga', 'fit-pilates', 'fit-core', 'fit-mobility', 'fit-weight-loss', 'fit-endurance',
  'cph-menstrual-cycle', 'cph-pregnancy', 'cph-postpartum', 'cph-recovery-wellness'
)
and (image_url is null or image_url = '');
