/**
 * Curated web GIF links for moves ExerciseDB does not cover well
 * (breathwork, sun salutation, etc.). Prefer these over wrong catalog poses.
 *
 * Sources: public Giphy media URLs (direct .gif).
 */
export type WebExerciseGif = {
  /** Match normalized mission title */
  test: RegExp;
  /** Optional animation key from roadmap */
  animations?: string[];
  name: string;
  /** Direct GIF url */
  url: string;
  credit?: string;
};

export const WEB_EXERCISE_GIFS: WebExerciseGif[] = [
  {
    test: /deep breath|box breathing|pranayama|breathwork|breath exercise|long exhale|body scan|nidra|nervous system|gratitude breathing|down-regulat|calm breath|grounding breath/,
    animations: ['breath'],
    name: 'Deep breathing',
    // YOGABODY – Deep Breath Relaxation
    url: 'https://media.giphy.com/media/whVGEJ7ieEU41Hx7q0/giphy.gif',
    credit: 'giphy.com/gifs/yogateacherscollege-lucas-rockwood-breathing-exercise-yoga-whVGEJ7ieEU41Hx7q0',
  },
  {
    test: /savasana|restorative floor|legs-?up|legs up/,
    animations: ['recover', 'breath'],
    name: 'Restorative calm',
    url: 'https://media.giphy.com/media/cOI6OPdjyvLH1k4Mh2/giphy.gif',
    credit: 'giphy.com/gifs/VOXTUR-zen-deep-breath-take-a-cOI6OPdjyvLH1k4Mh2',
  },
  {
    test: /sun.?salute|sun salute|vinyasa|slow vinyasa/,
    animations: ['flow'],
    name: 'Sun salutation flow',
    // Yoga stretch / flow demo
    url: 'https://media.giphy.com/media/l0HlNbeva0A6WZ8Zi/giphy.gif',
    credit: 'giphy.com',
  },
  {
    test: /tree pose|standing balance|balance series/,
    animations: ['flow'],
    name: 'Balance / tree pose',
    url: 'https://media.giphy.com/media/3o7TKMt1VV4DY3bXFy/giphy.gif',
    credit: 'giphy.com',
  },
  {
    test: /meditation|mindful|relax|zen/,
    animations: ['breath', 'recover'],
    name: 'Meditation breath',
    url: 'https://media.giphy.com/media/cOI6OPdjyvLH1k4Mh2/giphy.gif',
    credit: 'giphy.com/gifs/VOXTUR-zen-deep-breath-take-a-cOI6OPdjyvLH1k4Mh2',
  },
];

export function matchWebExerciseGif(title: string, animation?: string): WebExerciseGif | null {
  const key = title
    .toLowerCase()
    .replace(/^\d+\s*min\s+/, '')
    .replace(/\s+(home or gym|at the gym|at home)\s*$/i, '')
    .replace(/[^\w\s/+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const byTitle = WEB_EXERCISE_GIFS.find((item) => item.test.test(key));
  if (byTitle) return byTitle;

  if (animation) {
    const byAnim = WEB_EXERCISE_GIFS.find((item) => item.animations?.includes(animation));
    // Only use animation fallback for breath/recover — avoid stealing yoga flow GIFs for unrelated moves.
    if (byAnim && (animation === 'breath' || animation === 'recover')) return byAnim;
  }
  return null;
}
