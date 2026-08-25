-- Seed client course catalog for Fema AI
-- Structure from client brief (categories → courses → modules)

delete from public.lessons;
delete from public.modules;
delete from public.courses;
delete from public.categories;

-- ========== CATEGORIES ==========
insert into public.categories (id, title, subtitle, description, icon, color, status) values
  ('self-defence', 'Self Defence', 'Build confidence and personal safety skills', 'Foundational and style-based self-defence training for women.', 'shield', '#E11D48', 'published'),
  ('fitness', 'Fitness', 'Strength, cardio, and movement for every level', 'Structured fitness programs from foundations to endurance.', 'dumbbell', '#F26BB5', 'published'),
  ('cycle-pregnancy-health', 'Cycle, Pregnancy & Health', 'Train with your body through every life stage', 'Menstrual cycle, pregnancy, postpartum, and recovery-focused guidance.', 'heart', '#DB2777', 'published'),
  ('diet-nutrition', 'Diet & Nutrition', 'Fuel your body with smart nutrition tools', 'Meal planning, recipes, hydration, and nutrition education.', 'apple', '#EA580C', 'published');

-- ========== SELF DEFENCE COURSES ==========
insert into public.courses (id, category_id, title, short_title, description, icon, color, level, equipment, status, sort_order) values
  ('sd-foundations', 'self-defence', 'Foundations', 'Foundations', 'Core self-defence principles, awareness, and basic techniques.', 'shield', '#E11D48', 'Beginner', 'None', 'published', 1),
  ('sd-boxing', 'self-defence', 'Boxing', 'Boxing', 'Boxing fundamentals for fitness and self-defence.', 'fist', '#E11D48', 'All levels', 'Gloves optional', 'published', 2),
  ('sd-jiu-jitsu', 'self-defence', 'Jiu-Jitsu', 'Jiu-Jitsu', 'Ground control and leverage-based self-defence.', 'people', '#E11D48', 'All levels', 'Mat', 'published', 3),
  ('sd-taekwondo', 'self-defence', 'Taekwondo', 'Taekwondo', 'Kicks, stance work, and striking discipline.', 'kick', '#E11D48', 'All levels', 'None', 'published', 4),
  ('sd-karate', 'self-defence', 'Karate', 'Karate', 'Traditional striking, forms, and defence drills.', 'hand', '#E11D48', 'All levels', 'None', 'published', 5),
  ('sd-mma', 'self-defence', 'MMA', 'MMA', 'Mixed martial arts blending striking and grappling.', 'fight', '#E11D48', 'Intermediate', 'Gloves / mat', 'published', 6);

-- ========== FITNESS COURSES ==========
insert into public.courses (id, category_id, title, short_title, description, icon, color, level, equipment, status, sort_order) values
  ('fit-foundations', 'fitness', 'Foundations', 'Foundations', 'Build a strong fitness base with form and consistency.', 'dumbbell', '#F26BB5', 'Beginner', 'None', 'published', 1),
  ('fit-strength', 'fitness', 'Strength', 'Strength', 'Progressive strength training for power and resilience.', 'barbell', '#F26BB5', 'All levels', 'Weights optional', 'published', 2),
  ('fit-cardio', 'fitness', 'Cardio', 'Cardio', 'Heart-healthy cardio sessions for stamina.', 'heart-pulse', '#F26BB5', 'All levels', 'None', 'published', 3),
  ('fit-hiit', 'fitness', 'HIIT', 'HIIT', 'High-intensity interval training for efficient workouts.', 'bolt', '#F26BB5', 'Intermediate', 'None', 'published', 4),
  ('fit-yoga', 'fitness', 'Yoga', 'Yoga', 'Flexibility, balance, and mindful movement.', 'lotus', '#F26BB5', 'All levels', 'Mat', 'published', 5),
  ('fit-pilates', 'fitness', 'Pilates', 'Pilates', 'Core-focused control and body conditioning.', 'body', '#F26BB5', 'All levels', 'Mat', 'published', 6),
  ('fit-core', 'fitness', 'Core', 'Core', 'Targeted core strength and stability work.', 'circle', '#F26BB5', 'All levels', 'None', 'published', 7),
  ('fit-mobility', 'fitness', 'Mobility', 'Mobility', 'Joint mobility and movement quality sessions.', 'stretch', '#F26BB5', 'All levels', 'None', 'published', 8),
  ('fit-weight-loss', 'fitness', 'Weight-Loss Fitness', 'Weight-Loss', 'Training focused on fat loss and metabolic health.', 'scale', '#F26BB5', 'All levels', 'None', 'published', 9),
  ('fit-endurance', 'fitness', 'Endurance', 'Endurance', 'Build lasting stamina for longer efforts.', 'run', '#F26BB5', 'Intermediate', 'None', 'published', 10);

-- ========== CYCLE / PREGNANCY / HEALTH — COURSES ==========
insert into public.courses (id, category_id, title, short_title, description, icon, color, level, equipment, status, sort_order) values
  ('cph-menstrual-cycle', 'cycle-pregnancy-health', 'Menstrual Cycle', 'Cycle', 'Understand and train with each phase of your cycle.', 'calendar', '#DB2777', 'All levels', 'None', 'published', 1),
  ('cph-pregnancy', 'cycle-pregnancy-health', 'Pregnancy', 'Pregnancy', 'Safe prenatal movement and trimester guidance.', 'baby', '#DB2777', 'All levels', 'None', 'published', 2),
  ('cph-postpartum', 'cycle-pregnancy-health', 'Postpartum', 'Postpartum', 'Gentle recovery and return-to-training support.', 'heart', '#DB2777', 'All levels', 'None', 'published', 3),
  ('cph-recovery-wellness', 'cycle-pregnancy-health', 'Recovery & Wellness', 'Recovery', 'Stretching, sleep, stress, and injury prevention.', 'spa', '#DB2777', 'All levels', 'None', 'published', 4);

-- ========== DIET & NUTRITION COURSES ==========
insert into public.courses (id, category_id, title, short_title, description, icon, color, level, equipment, status, sort_order) values
  ('dn-meal-scanner', 'diet-nutrition', 'Meal Scanner', 'Scanner', 'Scan and analyze meals for nutrition insights.', 'scan', '#EA580C', 'All levels', 'None', 'published', 1),
  ('dn-ai-meal-planner', 'diet-nutrition', 'AI Meal Planner', 'AI Planner', 'Personalized meal plans powered by AI.', 'sparkles', '#EA580C', 'All levels', 'None', 'published', 2),
  ('dn-recipes', 'diet-nutrition', 'Recipes', 'Recipes', 'Curated recipes for everyday nutrition.', 'utensils', '#EA580C', 'All levels', 'None', 'published', 3),
  ('dn-nutrition-basics', 'diet-nutrition', 'Nutrition Basics', 'Basics', 'Foundational nutrition knowledge for women.', 'book', '#EA580C', 'Beginner', 'None', 'published', 4),
  ('dn-nutrition-by-goal', 'diet-nutrition', 'Nutrition by Goal', 'By Goal', 'Nutrition strategies tailored to your goals.', 'target', '#EA580C', 'All levels', 'None', 'published', 5),
  ('dn-grocery-planner', 'diet-nutrition', 'Grocery Planner', 'Grocery', 'Plan groceries around your meals and macros.', 'cart', '#EA580C', 'All levels', 'None', 'published', 6),
  ('dn-hydration', 'diet-nutrition', 'Hydration', 'Hydration', 'Build healthy hydration habits.', 'droplet', '#EA580C', 'All levels', 'None', 'published', 7),
  ('dn-saved-meals', 'diet-nutrition', 'Saved Meals', 'Saved', 'Save and reuse your favorite meals.', 'bookmark', '#EA580C', 'All levels', 'None', 'published', 8);

-- ========== MODULES: Menstrual Cycle ==========
insert into public.modules (id, course_id, title, description, sort_order) values
  ('mod-cycle-basics', 'cph-menstrual-cycle', 'Cycle Basics', 'Overview of the menstrual cycle and what to expect.', 1),
  ('mod-menstrual-phase', 'cph-menstrual-cycle', 'Menstrual Phase', 'Training and recovery during menstruation.', 2),
  ('mod-follicular-phase', 'cph-menstrual-cycle', 'Follicular Phase', 'Energy and training in the follicular phase.', 3),
  ('mod-ovulation', 'cph-menstrual-cycle', 'Ovulation', 'Performance and awareness around ovulation.', 4),
  ('mod-luteal-phase', 'cph-menstrual-cycle', 'Luteal Phase', 'Supportive training through the luteal phase.', 5),
  ('mod-cycle-aware-training', 'cph-menstrual-cycle', 'Cycle-Aware Training', 'How to adapt workouts to your cycle.', 6),
  ('mod-symptoms-recovery', 'cph-menstrual-cycle', 'Symptoms & Recovery', 'Manage symptoms and recover well.', 7);

-- ========== MODULES: Pregnancy ==========
insert into public.modules (id, course_id, title, description, sort_order) values
  ('mod-pregnancy-basics', 'cph-pregnancy', 'Pregnancy Basics', 'Safe movement foundations in pregnancy.', 1),
  ('mod-trimester-1', 'cph-pregnancy', 'Trimester 1', 'Guidance and training for the first trimester.', 2),
  ('mod-trimester-2', 'cph-pregnancy', 'Trimester 2', 'Guidance and training for the second trimester.', 3),
  ('mod-trimester-3', 'cph-pregnancy', 'Trimester 3', 'Guidance and training for the third trimester.', 4),
  ('mod-prenatal-strength', 'cph-pregnancy', 'Prenatal Strength', 'Strength work designed for pregnancy.', 5),
  ('mod-prenatal-yoga', 'cph-pregnancy', 'Prenatal Yoga', 'Gentle prenatal yoga flows.', 6),
  ('mod-pelvic-floor', 'cph-pregnancy', 'Pelvic Floor', 'Pelvic floor awareness and exercises.', 7),
  ('mod-birth-preparation', 'cph-pregnancy', 'Birth Preparation', 'Movement and breath for birth prep.', 8);

-- ========== MODULES: Postpartum ==========
insert into public.modules (id, course_id, title, description, sort_order) values
  ('mod-postpartum-basics', 'cph-postpartum', 'Postpartum Basics', 'Foundations for postpartum recovery.', 1),
  ('mod-early-recovery', 'cph-postpartum', 'Early Recovery', 'Gentle early postpartum support.', 2),
  ('mod-core-pelvic-floor', 'cph-postpartum', 'Core & Pelvic Floor', 'Rebuild core and pelvic floor safely.', 3),
  ('mod-pp-mobility', 'cph-postpartum', 'Mobility', 'Restore mobility after birth.', 4),
  ('mod-pp-strength', 'cph-postpartum', 'Strength', 'Progressive postpartum strength.', 5),
  ('mod-pp-cardio', 'cph-postpartum', 'Cardio', 'Return to cardio at a safe pace.', 6),
  ('mod-return-to-training', 'cph-postpartum', 'Return to Training', 'Plan your return to full training.', 7);

-- ========== MODULES: Recovery & Wellness ==========
insert into public.modules (id, course_id, title, description, sort_order) values
  ('mod-rw-stretching', 'cph-recovery-wellness', 'Stretching', 'Daily and recovery stretching routines.', 1),
  ('mod-rw-mobility', 'cph-recovery-wellness', 'Mobility', 'Mobility work for longevity.', 2),
  ('mod-rw-breathing', 'cph-recovery-wellness', 'Breathing', 'Breathing techniques for calm and recovery.', 3),
  ('mod-rw-sleep', 'cph-recovery-wellness', 'Sleep', 'Sleep habits that support recovery.', 4),
  ('mod-rw-stress', 'cph-recovery-wellness', 'Stress', 'Stress management for wellness.', 5),
  ('mod-rw-injury-prevention', 'cph-recovery-wellness', 'Injury Prevention', 'Reduce injury risk with smart habits.', 6);
