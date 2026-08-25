const lesson = (courseId, slug, title, durationMinutes, description, uploaded = false) => ({
  id: `${courseId}-${slug}`,
  title,
  durationMinutes,
  description,
  videoUrl: uploaded ? `https://cdn.fema.ai/${courseId}/${slug}.mp4` : null,
  uploadKey: `video-library/${courseId}/${slug}.mp4`,
  thumbnailUrl: uploaded ? `https://cdn.fema.ai/${courseId}/${slug}-thumb.jpg` : null
});

const selfDefense = {
  id: 'self-defense',
  categoryId: 'safety',
  title: 'Self-Defense',
  shortTitle: 'Self-Defense',
  description: 'Practical, repeatable responses that prioritize awareness, escape, and getting to safety.',
  icon: 'shield',
  color: '#8F7DE8',
  level: 'Beginner friendly',
  equipment: 'No equipment',
  status: 'published',
  disclaimer:
    'Educational content only. This course is not a substitute for in-person self-defense training. In danger, escape and contact local emergency services.',
  modules: [
    {
      id: 'self-defense-foundations',
      title: 'Foundations',
      description: 'Build the awareness, stance, and communication skills that come before physical techniques.',
      lessons: [
        lesson('self-defense', 'personal-safety-awareness', 'Understanding Personal Safety: Awareness & Prevention', 8, 'Recognize risk earlier and make practical choices that reduce exposure.', true),
        lesson('self-defense', 'reading-danger-signals', 'Reading Danger Signals: Body Language & Environment', 7, 'Learn to notice changes in people, exits, distance, and surroundings.', true),
        lesson('self-defense', 'ready-stance', 'The Ready Stance: Your Default Safe Position', 5, 'Practice a balanced, non-escalating position that keeps movement available.'),
        lesson('self-defense', 'verbal-deescalation', 'Verbal De-escalation: What to Say First', 7, 'Use clear boundaries and a calm, direct voice before contact occurs.')
      ]
    },
    {
      id: 'self-defense-core',
      title: 'Core Techniques',
      description: 'Practice simple movements designed to create a moment to escape.',
      lessons: [
        lesson('self-defense', 'wrist-grab-escapes', 'Breaking Free from Wrist Grabs', 8, 'Understand grip weak points and rehearse a direct escape path.'),
        lesson('self-defense', 'bear-hug-escapes', 'Escaping Bear Hugs (Front & Back)', 8, 'Use posture, base, and space-making movements to break contact.'),
        lesson('self-defense', 'palm-strikes', 'Palm Strikes & Target Zones', 10, 'Learn safer hand positioning and high-value target concepts for escape.'),
        lesson('self-defense', 'elbow-knee-strikes', 'Elbow & Knee Strikes', 10, 'Practice compact movements for close-range emergency situations.')
      ]
    },
    {
      id: 'self-defense-real-world',
      title: 'Real-World Application',
      description: 'Apply the foundations to common environments and changing situations.',
      lessons: [
        lesson('self-defense', 'ground-defense', 'Ground Defense Basics', 12, 'Protect key areas, create space, stand safely, and move away.'),
        lesson('self-defense', 'multiple-threats', 'Staying Aware of Multiple Threats', 10, 'Manage position and exits without becoming fixed on one person.'),
        lesson('self-defense', 'everyday-objects', 'Using Everyday Objects for Defense', 8, 'Use barriers and ordinary objects to support escape without escalating.'),
        lesson('self-defense', 'scenario-walkthroughs', 'Scenario Walkthroughs: Street, Parking Lot, Home', 15, 'Combine awareness, voice, movement, and exit planning in realistic walkthroughs.')
      ]
    }
  ]
};

const confidenceDrills = {
  id: 'confidence-drills',
  categoryId: 'safety',
  title: 'Confidence Drills',
  shortTitle: 'Confidence',
  description: 'Build calm, assertive body language and daily habits that strengthen your presence.',
  icon: 'zap',
  color: '#F26BB5',
  level: 'All levels',
  equipment: 'No equipment',
  status: 'published',
  modules: [
    {
      id: 'confidence-mindset',
      title: 'Mindset Foundations',
      description: 'Create a grounded base for confident decisions and movement.',
      lessons: [
        lesson('confidence-drills', 'situational-confidence', 'Building Situational Confidence', 6, 'Replace freezing and overthinking with a simple awareness routine.', true),
        lesson('confidence-drills', 'power-posture', 'Power Posture & Body Language', 5, 'Practice open, balanced posture and purposeful movement.', true),
        lesson('confidence-drills', 'calm-breathing', 'Breathing to Stay Calm Under Pressure', 6, 'Use short breathing drills to regulate your response under stress.')
      ]
    },
    {
      id: 'confidence-assertiveness',
      title: 'Assertiveness Training',
      description: 'Strengthen your voice, boundaries, and communication.',
      lessons: [
        lesson('confidence-drills', 'say-no', 'Saying No With Confidence', 7, 'Deliver a clear refusal without over-explaining or apologizing.'),
        lesson('confidence-drills', 'daily-boundaries', 'Setting Boundaries in Daily Life', 8, 'Use repeatable language for work, family, social, and public settings.'),
        lesson('confidence-drills', 'voice-projection', 'Voice Projection & Commanding Presence', 6, 'Practice volume, pacing, and concise commands.')
      ]
    },
    {
      id: 'confidence-applied',
      title: 'Applied Confidence',
      description: 'Bring the skills into everyday spaces and challenging conversations.',
      lessons: [
        lesson('confidence-drills', 'public-spaces', 'Confidence in Public Spaces', 8, 'Move with awareness and reduce distraction in unfamiliar places.'),
        lesson('confidence-drills', 'confrontation-calm', 'Staying Calm in Confrontation', 9, 'Use a clear mental sequence when a conversation becomes tense.'),
        lesson('confidence-drills', 'daily-habit', 'Building a Daily Confidence Habit', 7, 'Create a short routine that turns practice into durable confidence.')
      ]
    }
  ]
};

const makeFitnessCourse = (id, title, color, level, equipment, lessonPrefix) => ({
  id,
  categoryId: 'fitness',
  title,
  shortTitle: title,
  description: `Progressive ${title.toLowerCase()} path for Fema AI members.`,
  icon: 'activity',
  color,
  level,
  equipment,
  status: 'published',
  modules: [
    {
      id: `${id}-foundations`,
      title: 'Foundations',
      description: 'Build the basics safely.',
      lessons: [
        lesson(id, `${lessonPrefix}-1`, `${title} Fundamentals`, 12, `Core concepts for ${title}.`, true),
        lesson(id, `${lessonPrefix}-2`, `Beginner ${title} Session`, 20, `Accessible starter workout.`),
        lesson(id, `${lessonPrefix}-3`, `${title} Form & Safety`, 8, `Alignment and recovery cues.`)
      ]
    },
    {
      id: `${id}-building`,
      title: 'Building',
      description: 'Increase intensity and consistency.',
      lessons: [
        lesson(id, `${lessonPrefix}-4`, `${title} Progress Session`, 25, `Build capacity and control.`),
        lesson(id, `${lessonPrefix}-5`, `${title} Strength Block`, 25, `Focused muscular endurance.`),
        lesson(id, `${lessonPrefix}-6`, `${title} Conditioning`, 20, `Heart-rate and stamina work.`)
      ]
    },
    {
      id: `${id}-advanced`,
      title: 'Advanced',
      description: 'Challenge work capacity with strong form.',
      lessons: [
        lesson(id, `${lessonPrefix}-7`, `Advanced ${title} Circuit`, 30, `Higher intensity mixed session.`),
        lesson(id, `${lessonPrefix}-8`, `${title} Plateau Breaker`, 20, `Adjust load and recovery.`),
        lesson(id, `${lessonPrefix}-9`, `${title} Finale Challenge`, 30, `Celebrate progression.`)
      ]
    }
  ]
});

const cycleSync = {
  id: 'cycle-sync',
  categoryId: 'pregnancy-cycle',
  title: 'Cycle Sync',
  shortTitle: 'Cycle Sync',
  description: 'Understand your cycle phases and align movement, recovery, and energy.',
  icon: 'moon',
  color: '#B9A7F2',
  level: 'All levels',
  equipment: 'None',
  status: 'draft',
  modules: [
    {
      id: 'cycle-understanding',
      title: 'Understanding Your Cycle',
      description: 'Learn the four phases and what they mean for energy.',
      lessons: [
        lesson('cycle-sync', 'cycle-basics', 'Cycle Basics', 10, 'Overview of menstrual cycle phases.'),
        lesson('cycle-sync', 'tracking', 'Tracking Your Cycle', 8, 'Simple tracking habits.'),
        lesson('cycle-sync', 'energy-map', 'Energy Mapping', 9, 'Match effort to phase.')
      ]
    }
  ]
};

const pregnancy = {
  id: 'pregnancy',
  categoryId: 'pregnancy-cycle',
  title: 'Pregnancy',
  shortTitle: 'Pregnancy',
  description: 'Trimester-based movement guidance with medical clearance notes.',
  icon: 'heart',
  color: '#77CDED',
  level: 'Guided',
  equipment: 'Mat',
  status: 'draft',
  disclaimer: 'Get clearance from a doctor or midwife before starting or continuing an exercise program.',
  modules: [
    {
      id: 'pregnancy-first',
      title: 'First Trimester',
      description: 'Gentle foundations.',
      lessons: [
        lesson('pregnancy', 't1-breath', 'Breath & Pelvic Awareness', 12, 'Calm breathwork and posture.'),
        lesson('pregnancy', 't1-mobility', 'Gentle Mobility', 15, 'Low-impact mobility flow.'),
        lesson('pregnancy', 't1-rest', 'Rest & Recovery', 10, 'Supportive recovery practices.')
      ]
    }
  ]
};

const postpartum = {
  id: 'postpartum',
  categoryId: 'pregnancy-cycle',
  title: 'Postpartum',
  shortTitle: 'Postpartum',
  description: 'Early recovery through rebuilding and return to fitness.',
  icon: 'sunrise',
  color: '#A9E4D2',
  level: 'Guided',
  equipment: 'Mat',
  status: 'draft',
  disclaimer: 'Get clearance from a doctor or midwife before starting or continuing an exercise program.',
  modules: [
    {
      id: 'postpartum-early',
      title: 'Early Recovery',
      description: 'Rebuild gently.',
      lessons: [
        lesson('postpartum', 'core-reconnect', 'Core Reconnect', 12, 'Gentle core activation.'),
        lesson('postpartum', 'breath-reset', 'Breath Reset', 10, 'Diaphragmatic breathing.'),
        lesson('postpartum', 'walk-prep', 'Walk Prep Mobility', 12, 'Prep for daily movement.')
      ]
    }
  ]
};

const diet = {
  id: 'diet',
  categoryId: 'nutrition',
  title: 'Diet',
  shortTitle: 'Diet',
  description: 'Nutrition basics, approaches, and sustainable habits.',
  icon: 'apple',
  color: '#FFD88A',
  level: 'All levels',
  equipment: 'None',
  status: 'draft',
  modules: [
    {
      id: 'diet-basics',
      title: 'Nutrition Basics',
      description: 'Foundations for sustainable eating.',
      lessons: [
        lesson('diet', 'macros', 'Understanding Macros', 10, 'Protein, carbs, and fats simply.'),
        lesson('diet', 'portions', 'Portions Without Obsession', 8, 'Practical portion awareness.'),
        lesson('diet', 'habits', 'Sustainable Habit Building', 9, 'Small changes that stick.')
      ]
    }
  ]
};

const mealScanner = {
  id: 'meal-scanner',
  categoryId: 'nutrition',
  title: 'Meal Scanner',
  shortTitle: 'Scanner',
  description: 'Feature tutorials for the in-app meal scanner.',
  icon: 'camera',
  color: '#77CDED',
  level: 'Tutorial',
  equipment: 'Phone camera',
  status: 'draft',
  modules: [
    {
      id: 'scanner-tutorials',
      title: 'Feature Tutorials',
      description: 'How to use Meal Scanner.',
      lessons: [
        lesson('meal-scanner', 'scan-intro', 'Scanning Your First Meal', 5, 'Camera tips and results.'),
        lesson('meal-scanner', 'edit-result', 'Editing Scan Results', 4, 'Correct and save entries.'),
        lesson('meal-scanner', 'history', 'Using Scan History', 4, 'Review past scans.'),
        lesson('meal-scanner', 'tips', 'Better Scan Accuracy', 5, 'Lighting and framing tips.')
      ]
    }
  ]
};

const mealPlanner = {
  id: 'meal-planner',
  categoryId: 'nutrition',
  title: 'Meal Planner',
  shortTitle: 'Planner',
  description: 'Feature tutorials for weekly meal planning.',
  icon: 'calendar',
  color: '#A9E4D2',
  level: 'Tutorial',
  equipment: 'None',
  status: 'draft',
  modules: [
    {
      id: 'planner-tutorials',
      title: 'Feature Tutorials',
      description: 'Plan your week with confidence.',
      lessons: [
        lesson('meal-planner', 'week-setup', 'Setting Up Your Week', 5, 'Create a weekly plan.'),
        lesson('meal-planner', 'add-meals', 'Adding Meals', 4, 'Search and pin meals.'),
        lesson('meal-planner', 'grocery', 'Grocery List Export', 4, 'Generate a shopping list.'),
        lesson('meal-planner', 'prefs', 'Preferences & Goals', 5, 'Align plan to goals.')
      ]
    }
  ]
};

const recipes = {
  id: 'recipes',
  categoryId: 'nutrition',
  title: 'Recipes',
  shortTitle: 'Recipes',
  description: 'Video recipe library across breakfast, lunch, snacks, and swaps.',
  icon: 'book',
  color: '#FF928F',
  level: 'All levels',
  equipment: 'Kitchen',
  status: 'draft',
  modules: [
    {
      id: 'recipes-breakfast',
      title: 'Breakfast',
      description: 'Start-the-day recipes.',
      lessons: [
        lesson('recipes', 'oat-bowl', 'Protein Oat Bowl', 8, 'Balanced breakfast bowl.'),
        lesson('recipes', 'egg-wrap', 'Veggie Egg Wrap', 10, 'Quick savory wrap.'),
        lesson('recipes', 'smoothie', 'Green Smoothie', 6, 'Simple blender recipe.'),
        lesson('recipes', 'yogurt-parfait', 'Yogurt Parfait', 5, 'Layered breakfast cup.')
      ]
    }
  ]
};

export const SEED_CATEGORIES = [
  {
    id: 'safety',
    title: 'Safety',
    subtitle: 'Awareness, confidence & self-defense',
    description: 'Build calm awareness, clear boundaries, and practical escape-first skills.',
    icon: 'shield',
    color: '#8F7DE8',
    status: 'published'
  },
  {
    id: 'fitness',
    title: 'Fitness',
    subtitle: 'Progressive training for every level',
    description: 'Follow structured paths for fat loss, sculpting, strength, and yoga.',
    icon: 'activity',
    color: '#F26BB5',
    status: 'published'
  },
  {
    id: 'pregnancy-cycle',
    title: 'Pregnancy, Postpartum & Cycle',
    subtitle: 'Life-stage guided support',
    description: 'Cycle sync, pregnancy trimesters, and postpartum recovery paths.',
    icon: 'heart',
    color: '#77CDED',
    status: 'draft'
  },
  {
    id: 'nutrition',
    title: 'Nutrition',
    subtitle: 'Diet, scanning, planning & recipes',
    description: 'Nutrition education plus Meal Scanner, Meal Planner, and recipe videos.',
    icon: 'apple',
    color: '#FFD88A',
    status: 'draft'
  }
];

export const SEED_COURSES = [
  selfDefense,
  confidenceDrills,
  makeFitnessCourse('fat-loss', 'Fat Loss', '#F26BB5', 'Beginner to advanced', 'Optional mat', 'fl'),
  makeFitnessCourse('sculpt', 'Sculpt', '#FF928F', 'All levels', 'Mat; optional bands', 'sc'),
  makeFitnessCourse('strength', 'Strength', '#8F7DE8', 'Beginner to advanced', 'Bodyweight; optional weights', 'st'),
  makeFitnessCourse('yoga', 'Yoga', '#77CDED', 'All levels', 'Yoga mat', 'yg'),
  cycleSync,
  pregnancy,
  postpartum,
  diet,
  mealScanner,
  mealPlanner,
  recipes
];

export function flattenLessons(courses = SEED_COURSES) {
  return courses.flatMap((course) =>
    (course.modules || []).flatMap((module) =>
      (module.lessons || []).map((item) => ({
        ...item,
        courseId: course.id,
        courseTitle: course.title,
        categoryId: course.categoryId,
        moduleId: module.id,
        moduleTitle: module.title
      }))
    )
  );
}

export function countCourseStats(course) {
  const modules = course.modules?.length || 0;
  const lessons = course.modules?.reduce((sum, m) => sum + (m.lessons?.length || 0), 0) || 0;
  const awaiting =
    course.modules?.reduce(
      (sum, m) =>
        sum +
        (m.lessons || []).filter((l) => {
          const status = l.videoStatus || (l.videoUrl ? 'ready' : 'awaiting');
          return status !== 'ready';
        }).length,
      0
    ) || 0;
  return { modules, lessons, awaiting };
}
