export const LOCAL_GIFS = {
  bike: require('../assets/exercises/bike.gif'),
  march: require('../assets/exercises/high-knees.gif'),
  jacks: require('../assets/exercises/jumping-jacks.gif'),
  rope: require('../assets/exercises/jump-rope.gif'),
  yoga: require('../assets/exercises/yoga.gif'),
  jog: require('../assets/exercises/jog.gif'),
  treadmill: require('../assets/exercises/treadmill.gif'),
  squat: require('../assets/exercises/squat.gif'),
  pushup: require('../assets/exercises/pushup.gif'),
} as const;

export type LocalGifKey = keyof typeof LOCAL_GIFS;
