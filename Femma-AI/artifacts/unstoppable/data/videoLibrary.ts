import type { Feather } from '@expo/vector-icons';

export type LibraryCategoryId = 'safety' | 'fitness';

export type VideoLesson = {
  id: string;
  title: string;
  durationMinutes: number;
  description: string;
  /** Add the final CDN/streaming URL here after the video is uploaded. */
  videoUrl: string | null;
  /** Stable object-storage path for a future CMS or upload API. */
  uploadKey: string;
  thumbnailUrl: string | null;
};

export type VideoModule = {
  id: string;
  title: string;
  description: string;
  lessons: VideoLesson[];
};

export type VideoCourse = {
  id: string;
  categoryId: LibraryCategoryId;
  title: string;
  shortTitle: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  gradient: readonly [string, string];
  level: string;
  equipment: string;
  disclaimer?: string;
  modules: VideoModule[];
};

export type VideoCategory = {
  id: LibraryCategoryId;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  gradient: readonly [string, string];
  courses: VideoCourse[];
};

const lesson = (
  courseId: string,
  slug: string,
  title: string,
  durationMinutes: number,
  description: string,
): VideoLesson => ({
  id: `${courseId}-${slug}`,
  title,
  durationMinutes,
  description,
  videoUrl: null,
  uploadKey: `video-library/${courseId}/${slug}.mp4`,
  thumbnailUrl: null,
});

const selfDefense: VideoCourse = {
  id: 'self-defense',
  categoryId: 'safety',
  title: 'Self-Defense',
  shortTitle: 'Self-Defense',
  description: 'Practical, repeatable responses that prioritize awareness, escape, and getting to safety.',
  icon: 'shield',
  color: '#8F7DE8',
  gradient: ['#8F7DE8', '#77CDED'],
  level: 'Beginner friendly',
  equipment: 'No equipment',
  disclaimer: 'Educational content only. This course is not a substitute for in-person self-defense training. In danger, escape and contact local emergency services.',
  modules: [
    {
      id: 'foundations',
      title: 'Foundations',
      description: 'Build the awareness, stance, and communication skills that come before physical techniques.',
      lessons: [
        lesson('self-defense', 'personal-safety-awareness', 'Understanding Personal Safety: Awareness & Prevention', 8, 'Recognize risk earlier and make practical choices that reduce exposure.'),
        lesson('self-defense', 'reading-danger-signals', 'Reading Danger Signals: Body Language & Environment', 7, 'Learn to notice changes in people, exits, distance, and surroundings.'),
        lesson('self-defense', 'ready-stance', 'The Ready Stance: Your Default Safe Position', 5, 'Practice a balanced, non-escalating position that keeps movement available.'),
        lesson('self-defense', 'verbal-deescalation', 'Verbal De-escalation: What to Say First', 7, 'Use clear boundaries and a calm, direct voice before contact occurs.'),
      ],
    },
    {
      id: 'core-techniques',
      title: 'Core Techniques',
      description: 'Practice simple movements designed to create a moment to escape.',
      lessons: [
        lesson('self-defense', 'wrist-grab-escapes', 'Breaking Free from Wrist Grabs', 8, 'Understand grip weak points and rehearse a direct escape path.'),
        lesson('self-defense', 'bear-hug-escapes', 'Escaping Bear Hugs (Front & Back)', 8, 'Use posture, base, and space-making movements to break contact.'),
        lesson('self-defense', 'palm-strikes', 'Palm Strikes & Target Zones', 10, 'Learn safer hand positioning and high-value target concepts for escape.'),
        lesson('self-defense', 'elbow-knee-strikes', 'Elbow & Knee Strikes', 10, 'Practice compact movements for close-range emergency situations.'),
      ],
    },
    {
      id: 'real-world-application',
      title: 'Real-World Application',
      description: 'Apply the foundations to common environments and changing situations.',
      lessons: [
        lesson('self-defense', 'ground-defense', 'Ground Defense Basics', 12, 'Protect key areas, create space, stand safely, and move away.'),
        lesson('self-defense', 'multiple-threats', 'Staying Aware of Multiple Threats', 10, 'Manage position and exits without becoming fixed on one person.'),
        lesson('self-defense', 'everyday-objects', 'Using Everyday Objects for Defense', 8, 'Use barriers and ordinary objects to support escape without escalating.'),
        lesson('self-defense', 'scenario-walkthroughs', 'Scenario Walkthroughs: Street, Parking Lot, Home', 15, 'Combine awareness, voice, movement, and exit planning in realistic walkthroughs.'),
      ],
    },
  ],
};

const confidenceDrills: VideoCourse = {
  id: 'confidence-drills',
  categoryId: 'safety',
  title: 'Confidence Drills',
  shortTitle: 'Confidence',
  description: 'Build calm, assertive body language and daily habits that strengthen your presence.',
  icon: 'zap',
  color: '#F26BB5',
  gradient: ['#B9A7F2', '#F26BB5'],
  level: 'All levels',
  equipment: 'No equipment',
  modules: [
    {
      id: 'mindset-foundations',
      title: 'Mindset Foundations',
      description: 'Create a grounded base for confident decisions and movement.',
      lessons: [
        lesson('confidence-drills', 'situational-confidence', 'Building Situational Confidence', 6, 'Replace freezing and overthinking with a simple awareness routine.'),
        lesson('confidence-drills', 'power-posture', 'Power Posture & Body Language', 5, 'Practice open, balanced posture and purposeful movement.'),
        lesson('confidence-drills', 'calm-breathing', 'Breathing to Stay Calm Under Pressure', 6, 'Use short breathing drills to regulate your response under stress.'),
      ],
    },
    {
      id: 'assertiveness-training',
      title: 'Assertiveness Training',
      description: 'Strengthen your voice, boundaries, and communication.',
      lessons: [
        lesson('confidence-drills', 'say-no', 'Saying No With Confidence', 7, 'Deliver a clear refusal without over-explaining or apologizing.'),
        lesson('confidence-drills', 'daily-boundaries', 'Setting Boundaries in Daily Life', 8, 'Use repeatable language for work, family, social, and public settings.'),
        lesson('confidence-drills', 'voice-projection', 'Voice Projection & Commanding Presence', 6, 'Practice volume, pacing, and concise commands.'),
      ],
    },
    {
      id: 'applied-confidence',
      title: 'Applied Confidence',
      description: 'Bring the skills into everyday spaces and challenging conversations.',
      lessons: [
        lesson('confidence-drills', 'public-spaces', 'Confidence in Public Spaces', 8, 'Move with awareness and reduce distraction in unfamiliar places.'),
        lesson('confidence-drills', 'confrontation-calm', 'Staying Calm in Confrontation', 9, 'Use a clear mental sequence when a conversation becomes tense.'),
        lesson('confidence-drills', 'daily-habit', 'Building a Daily Confidence Habit', 7, 'Create a short routine that turns practice into durable confidence.'),
      ],
    },
  ],
};

const fatLoss: VideoCourse = {
  id: 'fat-loss',
  categoryId: 'fitness',
  title: 'Fat Loss',
  shortTitle: 'Fat Loss',
  description: 'Progressive conditioning and sustainable fundamentals for building a consistent fat-loss routine.',
  icon: 'activity',
  color: '#F26BB5',
  gradient: ['#F26BB5', '#D94A9A'],
  level: 'Beginner to advanced',
  equipment: 'Optional mat',
  modules: [
    {
      id: 'foundations',
      title: 'Foundations',
      description: 'Understand the basics and establish a safe movement routine.',
      lessons: [
        lesson('fat-loss', 'fundamentals', 'Fat Loss Fundamentals: How It Actually Works', 8, 'Learn the roles of nutrition, movement, recovery, and consistency.'),
        lesson('fat-loss', 'beginner-burn', 'Full-Body Beginner Fat-Burn Workout', 20, 'A low-complexity full-body workout with scalable intensity.'),
        lesson('fat-loss', 'calorie-deficit', 'Understanding Calorie Deficit Safely', 7, 'Use a moderate, sustainable approach instead of extreme restriction.'),
      ],
    },
    {
      id: 'building-momentum',
      title: 'Building Momentum',
      description: 'Increase conditioning with structured cardio and strength intervals.',
      lessons: [
        lesson('fat-loss', 'low-impact-hiit', 'Low-Impact HIIT', 25, 'Raise your heart rate without jumping or high-impact transitions.'),
        lesson('fat-loss', 'high-intensity-hiit', 'High-Intensity HIIT', 25, 'Use challenging work intervals with clear recovery windows.'),
        lesson('fat-loss', 'core-cardio', 'Core & Cardio Combo', 20, 'Alternate trunk stability with simple cardio blocks.'),
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Challenge work capacity while keeping form and recovery central.',
      lessons: [
        lesson('fat-loss', 'metabolic-circuit', 'Metabolic Conditioning Circuit', 30, 'A longer mixed-modal circuit for experienced users.'),
        lesson('fat-loss', 'break-plateau', 'Breaking Through a Plateau', 20, 'Adjust training, steps, recovery, and intake using practical signals.'),
        lesson('fat-loss', 'advanced-burn', 'Full-Body Advanced Burn', 30, 'A demanding full-body session with modifications built in.'),
      ],
    },
  ],
};

const sculpt: VideoCourse = {
  id: 'sculpt',
  categoryId: 'fitness',
  title: 'Sculpt',
  shortTitle: 'Sculpt',
  description: 'Focused sessions for muscular endurance, control, and full-body definition.',
  icon: 'target',
  color: '#FF928F',
  gradient: ['#FF928F', '#F26BB5'],
  level: 'All levels',
  equipment: 'Mat; optional bands',
  modules: [
    {
      id: 'foundations',
      title: 'Foundations',
      description: 'Build control and learn the movement patterns used throughout the course.',
      lessons: [
        lesson('sculpt', 'sculpt-basics', 'Sculpt Basics: Toning Principles', 15, 'Learn tempo, range of motion, alignment, and effective effort.'),
        lesson('sculpt', 'upper-body', 'Upper Body Sculpt', 20, 'Target shoulders, arms, chest, and back with controlled repetitions.'),
        lesson('sculpt', 'lower-body', 'Lower Body Sculpt', 20, 'Train glutes, thighs, and calves with joint-friendly options.'),
      ],
    },
    {
      id: 'building',
      title: 'Building',
      description: 'Add volume and focused sessions as your control improves.',
      lessons: [
        lesson('sculpt', 'glute-focus', 'Glute Focus', 20, 'Combine activation and strength-endurance work for the glutes.'),
        lesson('sculpt', 'arms-back', 'Arms & Back Definition', 20, 'Use posture-focused pulling and pressing patterns.'),
        lesson('sculpt', 'core-definition', 'Core Sculpt & Definition', 15, 'Train rotation control, flexion, and deep core stability.'),
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Use longer sequences and resistance to finish the progression.',
      lessons: [
        lesson('sculpt', 'full-body-challenge', 'Full-Body Sculpt Challenge', 30, 'Link upper, lower, and core blocks into one continuous session.'),
        lesson('sculpt', 'resistance-bands', 'Sculpt with Resistance Bands', 25, 'Add portable resistance while maintaining controlled form.'),
        lesson('sculpt', 'progression-finale', '30-Day Sculpt Progression Finale', 30, 'Revisit the course patterns in a celebratory final session.'),
      ],
    },
  ],
};

const strength: VideoCourse = {
  id: 'strength',
  categoryId: 'fitness',
  title: 'Strength',
  shortTitle: 'Strength',
  description: 'Build foundational strength with clear form instruction and progressive resistance.',
  icon: 'trending-up',
  color: '#8F7DE8',
  gradient: ['#8F7DE8', '#B9A7F2'],
  level: 'Beginner to advanced',
  equipment: 'Bodyweight; optional weights',
  modules: [
    {
      id: 'foundations',
      title: 'Foundations',
      description: 'Learn safe form and the principles that make strength training effective.',
      lessons: [
        lesson('strength', 'basics-form', 'Strength Training Basics & Form', 12, 'Set up stable positions, breathing, bracing, and controlled reps.'),
        lesson('strength', 'bodyweight-starter', 'Bodyweight Strength Starter', 20, 'Practice essential patterns using bodyweight-only variations.'),
        lesson('strength', 'progressive-overload', 'Understanding Progressive Overload', 7, 'Progress repetitions, resistance, range, and tempo responsibly.'),
      ],
    },
    {
      id: 'building',
      title: 'Building',
      description: 'Develop strength across the major lower, upper, and core patterns.',
      lessons: [
        lesson('strength', 'lower-body-form', 'Lower Body Strength: Squat, Lunge, Deadlift Form', 25, 'Break down three essential lower-body patterns and modifications.'),
        lesson('strength', 'upper-body-basics', 'Upper Body Strength: Push/Pull Basics', 25, 'Balance pressing and pulling work for stronger shoulders and back.'),
        lesson('strength', 'core-stability', 'Core Strength & Stability', 20, 'Build anti-extension, anti-rotation, and carrying strength.'),
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Combine patterns and resistance in challenging, efficient sessions.',
      lessons: [
        lesson('strength', 'full-body-circuit', 'Full-Body Strength Circuit', 30, 'Move through compound exercises with planned recovery.'),
        lesson('strength', 'dumbbells-resistance', 'Strength with Dumbbells/Resistance', 30, 'Use load selection and rep targets to progress safely.'),
        lesson('strength', 'compound-movements', 'Advanced Compound Movements', 30, 'Practice complex patterns only after mastering the foundations.'),
      ],
    },
  ],
};

const yoga: VideoCourse = {
  id: 'yoga',
  categoryId: 'fitness',
  title: 'Yoga',
  shortTitle: 'Yoga',
  description: 'Progress from breath and alignment to stronger flows, balance, and deep recovery.',
  icon: 'wind',
  color: '#77CDED',
  gradient: ['#77CDED', '#8F7DE8'],
  level: 'All levels',
  equipment: 'Yoga mat',
  modules: [
    {
      id: 'foundations',
      title: 'Foundations',
      description: 'Learn breath, alignment, and accessible flow patterns.',
      lessons: [
        lesson('yoga', 'breath-alignment', 'Yoga Basics: Breath & Alignment', 15, 'Coordinate breath with stable, comfortable positions.'),
        lesson('yoga', 'morning-flow', 'Morning Stretch Flow', 15, 'Gently mobilize the body and begin the day with intention.'),
        lesson('yoga', 'sun-salutations', 'Beginner Sun Salutations', 20, 'Learn a repeatable sequence with step-by-step modifications.'),
      ],
    },
    {
      id: 'building',
      title: 'Building',
      description: 'Develop flexibility, strength, and recovery through longer practices.',
      lessons: [
        lesson('yoga', 'strength-flexibility', 'Strength & Flexibility Flow', 25, 'Use flowing transitions to build mobility and muscular endurance.'),
        lesson('yoga', 'restorative-evening', 'Restorative Evening Yoga', 20, 'Downshift with supported shapes and slower breathing.'),
        lesson('yoga', 'stress-relief', 'Yoga for Stress Relief', 20, 'Release common tension areas with a calm, accessible sequence.'),
      ],
    },
    {
      id: 'advanced',
      title: 'Advanced',
      description: 'Explore stronger flows, balance, and longer recovery holds.',
      lessons: [
        lesson('yoga', 'power-flow', 'Power Yoga Flow', 30, 'Move through a faster strength-focused flow with options.'),
        lesson('yoga', 'balance-poses', 'Balance & Advanced Poses', 25, 'Build toward challenging shapes through safe progressions.'),
        lesson('yoga', 'deep-stretch', 'Deep Stretch & Recovery Yoga', 25, 'Use longer holds and breath to support recovery and mobility.'),
      ],
    },
  ],
};

export const VIDEO_CATEGORIES: VideoCategory[] = [
  {
    id: 'safety',
    title: 'Safety',
    subtitle: 'Awareness, confidence & self-defense',
    description: 'Build calm awareness, clear boundaries, and practical escape-first skills.',
    icon: 'shield',
    color: '#8F7DE8',
    gradient: ['#8F7DE8', '#77CDED'],
    courses: [selfDefense, confidenceDrills],
  },
  {
    id: 'fitness',
    title: 'Fitness',
    subtitle: 'Progressive training for every level',
    description: 'Follow structured paths for fat loss, sculpting, strength, and yoga.',
    icon: 'activity',
    color: '#F26BB5',
    gradient: ['#F26BB5', '#8F7DE8'],
    courses: [fatLoss, sculpt, strength, yoga],
  },
];

export const VIDEO_COURSES = VIDEO_CATEGORIES.flatMap((category) => category.courses);
export const VIDEO_LESSONS = VIDEO_COURSES.flatMap((course) =>
  course.modules.flatMap((module) => module.lessons),
);

export const getVideoCategory = (id: LibraryCategoryId) =>
  VIDEO_CATEGORIES.find((category) => category.id === id);

export const getVideoCourse = (id: string) =>
  VIDEO_COURSES.find((course) => course.id === id);

export const getCourseLessons = (course: VideoCourse) =>
  course.modules.flatMap((module) => module.lessons);

export const getVideoLessonContext = (lessonId: string) => {
  for (const course of VIDEO_COURSES) {
    for (const module of course.modules) {
      const lessonIndex = module.lessons.findIndex((item) => item.id === lessonId);
      if (lessonIndex >= 0) {
        const courseLessons = getCourseLessons(course);
        const flatIndex = courseLessons.findIndex((item) => item.id === lessonId);
        return {
          category: getVideoCategory(course.categoryId)!,
          course,
          module,
          lesson: module.lessons[lessonIndex],
          previousLesson: courseLessons[flatIndex - 1] ?? null,
          nextLesson: courseLessons[flatIndex + 1] ?? null,
          lessonNumber: flatIndex + 1,
          lessonCount: courseLessons.length,
        };
      }
    }
  }
  return null;
};

