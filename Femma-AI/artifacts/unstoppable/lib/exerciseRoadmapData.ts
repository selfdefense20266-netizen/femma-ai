export const ROADMAP_CATEGORIES = [
  'weight_loss',
  'tone',
  'muscle',
  'boxing',
  'mma',
  'karate',
  'selfdefense',
  'hiit',
  'yoga',
  'confidence',
  'pregnancy',
  'postpartum',
  'flexibility',
  'stress',
] as const;

export type RoadmapCategoryId = (typeof ROADMAP_CATEGORIES)[number];

export const ROADMAP_TIMES = ['15 min', '20–30 min', '30–45 min', '45–60 min', '60+ min'] as const;
export const ROADMAP_ENVIRONMENTS = ['home', 'gym', 'both'] as const;
export const ROADMAP_WEEKS = [4, 8, 12] as const;
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export type MissionSlot = 'course' | 'meal' | 'recipe' | 'exercise';
export type RoadmapMissionCategory = 'fitness' | 'yoga' | 'safety';

export type ExerciseMove = {
  title: string;
  animation: string;
  cue: string;
  steps: string[];
};

export type CategoryWeek = {
  id: RoadmapCategoryId;
  label: string;
  planName: string;
  missionCategory: RoadmapMissionCategory;
  href: string;
  courseId: string;
  courseIds: string[];
  courses: string[];
  home: [ExerciseMove, ExerciseMove][];
  gym: [ExerciseMove, ExerciseMove][];
};

export const ANIMATION_STEPS: Record<string, string[]> = {
  punch: [
    'Stand in a fighting stance, hands up by your cheeks.',
    'Snap a jab from the lead hand, then bring it straight back.',
    'Follow with a cross from the rear hand, rotating the hip.',
    'Reset your guard after every combo.',
  ],
  kick: [
    'Keep a soft bend in the standing leg.',
    'Chamber the kicking knee toward the target.',
    'Extend through the shin or ball of the foot, then chamber back.',
    'Land quietly and return both hands to guard.',
  ],
  squat: [
    'Feet about hip-width, chest tall.',
    'Sit the hips back and down until thighs are about parallel.',
    'Drive through the whole foot to stand.',
    'Keep knees tracking over the toes.',
  ],
  lunge: [
    'Step forward and lower the back knee toward the floor.',
    'Front knee stacks over the ankle.',
    'Push through the front heel to stand.',
    'Switch legs and keep the torso tall.',
  ],
  plank: [
    'Hands or forearms under the shoulders.',
    'Body in one line from head to heels.',
    'Squeeze glutes and brace the core.',
    'Breathe steadily without dropping the hips.',
  ],
  stretch: [
    'Move into the stretch slowly, never bouncing.',
    'Breathe out as the muscle lengthens.',
    'Hold with a 6 out of 10 intensity.',
    'Ease out and switch sides.',
  ],
  breath: [
    'Sit or stand tall, shoulders relaxed.',
    'Inhale through the nose for a count of 4.',
    'Exhale longer than the inhale, count of 6.',
    'Keep the jaw unclenched.',
  ],
  flow: [
    'Link each pose with the breath.',
    'Inhale to lengthen, exhale to fold or twist.',
    'Move at a pace you can control.',
    'Finish standing tall for one full breath.',
  ],
  walk: [
    'Stand tall, eyes forward.',
    'Roll heel to toe with a soft arm swing.',
    'Keep a brisk but sustainable pace.',
    'Reset posture every minute.',
  ],
  jump: [
    'Land softly through the whole foot.',
    'Keep knees slightly bent on every landing.',
    'Use the arms to help the jump.',
    'Stop if form gets sloppy.',
  ],
  core: [
    'Press the lower back gently toward the floor or wall.',
    'Exhale as you brace the core.',
    'Move slowly — no yanking the neck.',
    'Rest when the form fades.',
  ],
  guard: [
    'Hands by the cheeks, elbows in.',
    'Chin slightly tucked, eyes on the target.',
    'Step, then punch — never drop the rear hand.',
    'Reset after every drill.',
  ],
  hip: [
    'Keep the supporting knee soft.',
    'Open or circle the hip in a pain-free range.',
    'Move with the breath, not momentum.',
    'Switch sides and keep the ribs stacked.',
  ],
  prenatal: [
    'Stay in a comfortable range — no breath holding.',
    'Keep a slight bend in the knees.',
    'Support the belly if you need to.',
    'Stop for dizziness, pain, or spotting.',
  ],
  recover: [
    'Keep the effort easy and controlled.',
    'Focus on smooth breathing.',
    'Use a chair or wall if you need support.',
    'Stop before fatigue turns into strain.',
  ],
};

function move(title: string, animation: string, cue: string): ExerciseMove {
  return {
    title,
    animation,
    cue,
    steps: ANIMATION_STEPS[animation] || ANIMATION_STEPS.flow,
  };
}

function week(home: [ExerciseMove, ExerciseMove][], gym?: [ExerciseMove, ExerciseMove][]): {
  home: [ExerciseMove, ExerciseMove][];
  gym: [ExerciseMove, ExerciseMove][];
} {
  return { home, gym: gym || home };
}

const BOXING = week(
  [
    [move('Jab-cross shadowboxing', 'punch', 'Snap the jab, then sit the cross into the hip.'), move('Guard-up footwork', 'walk', 'Step, reset, never drop the hands.')],
    [move('Hook and uppercut air combos', 'punch', 'Turn the hip into every hook.'), move('Slip-and-roll drill', 'guard', 'Slip left, slip right, then reset the guard.')],
    [move('3-minute round shadowboxing', 'punch', 'Keep a fight rhythm: work 20 seconds, breathe 10.'), move('Fast feet in-place ladder', 'walk', 'Light, quick steps on the balls of the feet.')],
    [move('Body-shot combos', 'punch', 'Drop the level, punch, then stand back to guard.'), move('Wall-sit fight stance', 'squat', 'Sit against a wall in your boxing stance.')],
    [move('Speed jab ladder', 'punch', '10 jabs, rest 10 seconds, repeat.'), move('Core braces between rounds', 'core', 'Exhale and hold a tight guard plank.')],
    [move('Pad-style combo practice', 'punch', '1-2, 1-2-3, then 1-2-3-4.'), move('Cool-down shoulder circles', 'stretch', 'Open the chest after all those punches.')],
    [move('Light technical shadowboxing', 'punch', 'Slow, clean punches — quality over power.'), move('Hip mobility for punch rotation', 'hip', 'Open the hips so the cross can turn.')],
  ],
  [
    [move('Heavy bag jab-cross', 'punch', 'Hit the bag, then snap the hands back to guard.'), move('Jump-rope rounds', 'jump', 'Easy bounce between bag rounds.')],
    [move('Bag hooks and uppercuts', 'punch', 'Step in, punch, step out.'), move('Medicine-ball rotational throws', 'core', 'Turn the same way you punch.')],
    [move('Interval bag rounds', 'punch', 'Hard 30 seconds, easy 30 seconds.'), move('Treadmill fight-pace walk', 'walk', 'Brisk walk to keep the heart rate up.')],
    [move('Mitt-style combo on bag', 'punch', 'Call the combo in your head, then throw it.'), move('Cable or band punch-outs', 'punch', 'Keep the elbow in on every rep.')],
    [move('Speed bag or fast taps', 'punch', 'Stay relaxed in the shoulders.'), move('Farmer-carry fight stance walk', 'walk', 'Tall posture, ribs down.')],
    [move('Power round on the bag', 'punch', 'Sit down on the cross without swinging wild.'), move('Bike or rower flush', 'walk', 'Easy spin to clear the legs.')],
    [move('Technical bag work', 'punch', 'Slow combos with perfect guard.'), move('Hip openers after boxing', 'hip', 'Recover the rotation you trained.')],
  ]
);

const MMA = week(
  [
    [move('MMA stance punches', 'punch', 'Hands high, level changes ready.'), move('Sprawl-to-stand drill', 'plank', 'Hips down, then stand back to stance.')],
    [move('Kick chamber practice', 'kick', 'Chamber, extend, chamber — never slap the leg down.'), move('Level-change shots in place', 'lunge', 'Drop the level, then recover tall.')],
    [move('Clinch-control posture', 'guard', 'Elbows in, head position strong.'), move('Hip escape on the floor', 'hip', 'Shrimp away, keep the guard active.')],
    [move('Combo: punch then kick', 'kick', 'Hands first, kick second, guard always.'), move('Ground bridge and recover', 'core', 'Bridge, turn, return to stance.')],
    [move('Defensive parry drill', 'guard', 'Parry, reset, do not reach.'), move('Fast sprawls', 'plank', 'Chest down, hips through, stand up.')],
    [move('Light MMA shadow flow', 'punch', 'Mix punches, kicks, and level changes.'), move('Wrist and shoulder mobility', 'stretch', 'Open what grappling tightens.')],
    [move('Technical kick and punch', 'kick', 'Slow motion, perfect chambers.'), move('Breath-down after intensity', 'breath', 'Long exhales to drop the heart rate.')],
  ],
  [
    [move('Bag MMA combos', 'punch', 'Punch, kick, circle off the bag.'), move('Sled or prowler short pushes', 'walk', 'Drive with the legs, stay compact.')],
    [move('Thai-pad style kicks on bag', 'kick', 'Turn the hip over on every kick.'), move('Row intervals', 'walk', 'Hard 20 seconds, easy 40.')],
    [move('Grappling hip drills', 'hip', 'Shrimps and technical stand-ups.'), move('Heavy bag level changes', 'lunge', 'Drop, shoot the hands, recover.')],
    [move('Clinch knees on bag', 'kick', 'Control, knee, reset the posture.'), move('Farmer carries', 'walk', 'Strong grip, quiet feet.')],
    [move('MMA round on the bag', 'punch', 'Mix striking with sprawl breaks.'), move('Bike flush', 'walk', 'Easy cadence to recover.')],
    [move('Power kicks on bag', 'kick', 'Chamber fully before you throw.'), move('Medicine-ball slams', 'core', 'Exhale on every slam.')],
    [move('Technical MMA bag work', 'punch', 'Clean entries and exits.'), move('Hip and groin stretch', 'stretch', 'Restore the range you used.')],
  ]
);

const KARATE = week(
  [
    [move('Karate stance and reverse punch', 'punch', 'Hips square, punch from the core.'), move('Front-stance stepping', 'walk', 'Long stance, rear heel down.')],
    [move('Front kick chamber drill', 'kick', 'Knee up first, then the kick.'), move('Knife-hand block practice', 'guard', 'Block, then immediately return to guard.')],
    [move('Kata-style combination', 'flow', 'Slow, precise lines — then a faster pass.'), move('Horse-stance holds', 'squat', 'Knees out, chest tall.')],
    [move('Roundhouse chamber practice', 'kick', 'Pivot the standing foot as you kick.'), move('Hikite pull-back punches', 'punch', 'The rear hand pulls as the lead hand lands.')],
    [move('Stepping punch across the room', 'punch', 'Step and punch land together.'), move('Balance kicks held at chamber', 'kick', 'Hold the knee up for 3 breaths.')],
  [move('Light kata flow', 'flow', 'Breathe with each movement.'), move('Hip rotation for kicks', 'hip', 'Open the hip without losing posture.')],
    [move('Precision reverse punches', 'punch', 'Slow, then snap.'), move('Lower-body stretch after stances', 'stretch', 'Open hips and calves.')],
  ],
  [
    [move('Pad reverse punches', 'punch', 'Hips first, fist second.'), move('Kettlebell goblet squats', 'squat', 'Elbows inside the knees.')],
    [move('Bag front kicks', 'kick', 'Recoil the kick as fast as you throw it.'), move('Farmer-carry stances', 'walk', 'Short steps, tall spine.')],
    [move('Bag mawashi geri', 'kick', 'Pivot, kick, re-chamber.'), move('Core anti-rotation holds', 'core', 'Do not let the ribs twist.')],
    [move('Stepping punch on pads', 'punch', 'Time the step with the punch.'), move('Split-stance lunges', 'lunge', 'Karate length in the stance.')],
    [move('Kata then bag', 'flow', 'One kata, then 2 minutes of bag work.'), move('Bike easy spin', 'walk', 'Flush the legs.')],
    [move('Power gyaku-zuki on bag', 'punch', 'Drive from the rear heel.'), move('Hip mobility flow', 'hip', 'Recover rotation.')],
    [move('Technical karate bag work', 'punch', 'Perfect lines, not wild power.'), move('Standing hamstring stretch', 'stretch', 'Long stances need long hamstrings.')],
  ]
);

const SELFDEFENSE = week(
  [
    [move('Boundary stance and palm strike', 'guard', 'Hands up, loud voice, strike through.'), move('Wrist-release practice', 'guard', 'Circle toward the thumb and step away.')],
    [move('Elbow strike on air', 'punch', 'Short, close-range, then create space.'), move('Exit footwork after a strike', 'walk', 'Strike, then move off the line.')],
    [move('Knee strike from clinch posture', 'kick', 'Pull the target in, drive the knee.'), move('Ground get-up to stance', 'lunge', 'Technical stand-up, eyes forward.')],
    [move('Block-and-counter drill', 'guard', 'Parry, palm strike, step off.'), move('Awareness turns in place', 'walk', 'Scan, then return to stance.')],
    [move('Hammer-fist combos', 'punch', 'Keep the elbow close, hit and retract.'), move('Hip escape if taken down', 'hip', 'Create space, get to a knee, stand.')],
    [move('Voice + strike practice', 'guard', 'Your voice is part of the technique.'), move('Shoulder and wrist mobility', 'stretch', 'Keep the striking joints happy.')],
    [move('Slow-motion full scenario', 'flow', 'See, stance, strike, leave.'), move('Down-regulate the nervous system', 'breath', 'Long exhales after intensity.')],
  ]
);

const WEIGHT_LOSS = week(
  [
    [move('Brisk march in place', 'walk', 'Pump the arms, land quietly.'), move('Bodyweight squat pulses', 'squat', 'Stay in the lower third and breathe.')],
    [move('Alternating reverse lunges', 'lunge', 'Long step back, tall chest.'), move('Standing core twists', 'core', 'Exhale as you rotate.')],
    [move('Fast feet + squat combo', 'jump', 'Quick steps, then 5 squats.'), move('Glute bridges', 'hip', 'Scoop the tailbone, squeeze at the top.')],
    [move('Low-impact jumping jacks', 'jump', 'Step the feet out if you need to.'), move('Forearm plank holds', 'plank', 'Short holds with perfect form.')],
    [move('Walk-out to plank', 'plank', 'Hands down, walk out, walk back.'), move('Hollow holds or dead bugs', 'core', 'Exhale as the ribs draw in.')],
    [move('Cardio burst: knees or marches', 'walk', 'Keep it sustainable, not sloppy.'), move('Side lunges', 'lunge', 'Sit into the hip, then push back.')],
    [move('Easy fat-burn walk', 'walk', 'Conversational pace, good posture.'), move('Full-body stretch', 'stretch', 'Hips, calves, and chest.')],
  ],
  [
    [move('Treadmill incline walk', 'walk', 'Brisk, no holding the rails.'), move('Goblet squats', 'squat', 'Weight at the chest, sit tall.')],
    [move('Bike intervals', 'walk', 'Hard 30, easy 60.'), move('Cable or band rows', 'core', 'Squeeze the shoulder blades.')],
    [move('Kettlebell deadlifts', 'hip', 'Hinge, do not round.'), move('Walking lunges', 'lunge', 'Short steps, control the knee.')],
    [move('Rower fat-burn', 'walk', 'Smooth strokes, tall chest.'), move('Dumbbell thrusters', 'squat', 'Squat then press in one piece.')],
    [move('Stair or step-ups', 'lunge', 'Whole foot on the step.'), move('Pallof press', 'core', 'Do not let the cable twist you.')],
    [move('Incline walk finisher', 'walk', 'Last 8 minutes slightly faster.'), move('Hip flexor stretch', 'stretch', 'Open what sitting tightens.')],
    [move('Easy machine circuit', 'walk', 'Keep moving, keep form.'), move('Long walk cool-down', 'walk', 'Drop the heart rate on purpose.')],
  ]
);

const TONE = week(
  [
    [move('Tempo squats', 'squat', '3 seconds down, 1 second up.'), move('Glute bridge marches', 'hip', 'Keep the hips high as you march.')],
    [move('Reverse lunges', 'lunge', 'Back knee kisses the floor.'), move('Standing kickbacks', 'hip', 'Squeeze at the end of the range.')],
    [move('Slow push-up or wall push-up', 'plank', 'Body in one line.'), move('Side-lying leg lifts', 'hip', 'Toes slightly down, waist long.')],
    [move('Pulse lunges', 'lunge', 'Tiny range, big control.'), move('Dead bug core', 'core', 'Lower back stays heavy.')],
    [move('Sumo squat holds', 'squat', 'Knees out, squeeze the inner thighs.'), move('Superman lifts', 'core', 'Long neck, lift the chest gently.')],
    [move('Curtsy lunge sculpt', 'lunge', 'Sit back into the hip.'), move('Standing oblique crunches', 'core', 'Exhale as the ribs draw in.')],
    [move('Light full-body tone flow', 'flow', 'Slow reps, perfect lines.'), move('Hip and chest stretch', 'stretch', 'Open what the sculpt work used.')],
  ],
  [
    [move('Goblet squat sculpt', 'squat', 'Pause 2 seconds at the bottom.'), move('Hip thrust or bridge with weight', 'hip', 'Ribs down, squeeze the glutes.')],
    [move('Walking lunges with dumbbells', 'lunge', 'Quiet landings.'), move('Cable kickbacks', 'hip', 'Do not swing the weight.')],
    [move('Incline dumbbell press', 'plank', 'Shoulders away from the ears.'), move('Lateral raises light', 'stretch', 'Soft elbows, stop at shoulder height.')],
    [move('Bulgarian split squat', 'lunge', 'Front heel heavy.'), move('Cable woodchops', 'core', 'Rotate from the ribs, not the arms.')],
    [move('Leg-press or squat machine', 'squat', 'Full foot, controlled.'), move('Back extension easy', 'core', 'Stop at a long spine.')],
    [move('Glute-finisher circuit', 'hip', 'Burn, but keep the form.'), move('Easy bike flush', 'walk', 'Spin the legs out.')],
    [move('Light pump session', 'squat', 'Higher reps, perfect control.'), move('Full stretch', 'stretch', 'Hips, quads, chest.')],
  ]
);

const MUSCLE = week(
  [
    [move('Hard bodyweight squats', 'squat', 'Full depth you can control.'), move('Push-up progressions', 'plank', 'Knees or wall if needed, full range.')],
    [move('Split squats', 'lunge', 'Back knee down, front heel down.'), move('Pike or downward-dog push-ups', 'plank', 'Shoulders work, neck long.')],
    [move('Slow hip hinges', 'hip', 'Push the hips back, feel the hamstrings.'), move('Backpack or book rows', 'core', 'Squeeze the shoulder blades.')],
    [move('Pause squats', 'squat', '2-second pause at the bottom.'), move('Side plank dips or holds', 'plank', 'Hips stacked.')],
    [move('Walking lunges', 'lunge', 'Drive up, do not bounce.'), move('Close-stance squats', 'squat', 'Stay tall through the chest.')],
    [move('Glute bridge strength', 'hip', 'Pause and squeeze.'), move('Hollow-body holds', 'core', 'Lower back glued down.')],
    [move('Full-body strength flow', 'flow', 'Quality reps only.'), move('Long stretch for trained muscles', 'stretch', 'Quads, chest, hamstrings.')],
  ],
  [
    [move('Barbell or goblet squat', 'squat', 'Brace, then sit.'), move('Bench or floor press', 'plank', 'Control the lowering.')],
    [move('Romanian deadlift', 'hip', 'Soft knees, long spine.'), move('Lat pulldown or pull-up hold', 'core', 'Pull the elbows down.')],
    [move('Walking lunges loaded', 'lunge', 'Trunk tall.'), move('Overhead press', 'plank', 'Ribs down as you press.')],
    [move('Hip thrust', 'hip', 'Chin tucked, squeeze at the top.'), move('Seated row', 'core', 'Do not shrug.')],
    [move('Leg press or hack squat', 'squat', 'Do not lock out sloppy.'), move('Triceps or close-grip press', 'plank', 'Elbows track, not flare wildly.')],
    [move('Top-set strength work', 'squat', 'Leave 1–2 reps in the tank.'), move('Easy walk between sets', 'walk', 'Recover so the next set is quality.')],
    [move('Light pump accessories', 'core', 'Higher reps, clean form.'), move('Full-body stretch', 'stretch', 'Get long after getting strong.')],
  ]
);

const HIIT = week(
  [
    [move('40-on / 20-off squat pulses', 'squat', 'Keep moving, keep breathing.'), move('Mountain-climber or march intervals', 'plank', 'Quiet hips, fast feet.')],
    [move('Lunge jumps or reverse lunges', 'lunge', 'Land softly every time.'), move('Fast punches between legs', 'punch', 'Hands up, breathe out on the punch.')],
    [move('Burpee step-backs or full burpees', 'plank', 'Chest to the floor, stand tall.'), move('High-knee or fast march', 'walk', 'Drive the knee, land light.')],
    [move('Squat to reach', 'squat', 'Stand and reach without losing the core.'), move('Plank shoulder taps', 'plank', 'Hips stay still.')],
    [move('Speed skaters or lateral steps', 'lunge', 'Sit into the hip, then push.'), move('Fast mountain climbers', 'plank', 'Quiet hips, quick feet.')],
    [move('Tabata-style squats', 'squat', '20 seconds work, 10 seconds breathe.'), move('Core flutter or dead bug bursts', 'core', 'Small range, tight belly.')],
    [move('Easy interval walk', 'walk', 'Clear the lactic acid.'), move('Downshift breathing', 'breath', 'In 4, out 6.')],
  ],
  [
    [move('Bike or rower sprints', 'walk', 'Hard, then fully easy.'), move('Kettlebell swings', 'hip', 'Hinge, snap, do not squat the swing.')],
    [move('Treadmill incline intervals', 'walk', 'Fast walk, not a sloppy run.'), move('Dumbbell thrusters', 'squat', 'One piece: squat then press.')],
    [move('Battle-rope or slam intervals', 'core', 'Exhale every wave.'), move('Box step-overs', 'lunge', 'Stay light on the feet.')],
    [move('Assault-bike or fan-bike bursts', 'walk', 'Arms and legs together.'), move('Med-ball slams', 'core', 'Pick it up with a hinge.')],
    [move('Sled pushes', 'walk', 'Low, drive, short rest.'), move('Jump-rope rounds', 'jump', 'Easy bounce between efforts.')],
    [move('Mixed-modal finisher', 'jump', 'Keep transitions tight.'), move('Easy spin cool-down', 'walk', 'Let the heart rate fall.')],
    [move('Light skill intervals', 'walk', 'Technique at 70% effort.'), move('Breathing reset', 'breath', 'You earned the downshift.')],
  ]
);

const YOGA = week(
  [
    [move('Sun-salutation warm-up', 'flow', 'Inhale to lengthen, exhale to fold.'), move('Down-dog to plank flow', 'plank', 'Press the floor away.')],
    [move('Standing balance series', 'flow', 'Eyes on one point, breath steady.'), move('Hip-opening lunges', 'lunge', 'Sink as you exhale.')],
    [move('Seated twist and fold', 'stretch', 'Lengthen first, then twist.'), move('Bridge or wheel prep', 'hip', 'Lift on an inhale.')],
    [move('Core boat or forearm flow', 'core', 'Keep the waist long.'), move('Warrior sequence', 'lunge', 'Strong legs, soft jaw.')],
    [move('Slow vinyasa', 'flow', 'One breath, one movement.'), move('Pigeon or figure-four', 'hip', 'Support with a cushion if you need.')],
    [move('Inversions or legs-up-wall', 'recover', 'Let the nervous system settle.'), move('Shoulder-opener flow', 'stretch', 'Do not force the elbows.')],
    [move('Restorative floor sequence', 'breath', 'Stay longer than you think.'), move('Savasana breathing', 'breath', 'Body heavy, breath light.')],
  ]
);

const FLEXIBILITY = week(
  [
    [move('Hamstring fold with bent knees', 'stretch', 'Hinge from the hips.'), move('Hip-flexor kneeling stretch', 'lunge', 'Tuck the pelvis slightly.')],
    [move('90/90 hip switches', 'hip', 'Tall spine as you rotate.'), move('Calf and ankle rocks', 'stretch', 'Knee tracks over the toes.')],
    [move('Couch or quad stretch', 'stretch', 'Keep the ribs down.'), move('Seated straddle reach', 'stretch', 'Lead with the chest, not the head.')],
    [move('World’s-greatest-stretch flow', 'flow', 'Open thoracic as you rotate.'), move('Pigeon both sides', 'hip', 'Breathe into the outer hip.')],
    [move('Shoulder dislocates or band pass-throughs', 'stretch', 'Soft elbows, slow range.'), move('Cat-cow to child’s pose', 'flow', 'Move with the breath.')],
    [move('Deep squat hold', 'squat', 'Heels down if you can, support if not.'), move('Spinal twist on the floor', 'stretch', 'Let the shoulder melt down.')],
    [move('Long passive stretch', 'stretch', 'Hold, breathe, do not bounce.'), move('Legs-up recovery', 'recover', 'Soften the face.')],
  ]
);

const STRESS = week(
  [
    [move('Box breathing standing', 'breath', 'In 4, hold 4, out 4, hold 4.'), move('Gentle neck rolls', 'stretch', 'Stay in a tiny, comfortable range.')],
    [move('Walk-and-breathe outside or in place', 'walk', 'Match steps to the breath.'), move('Forward fold hang', 'stretch', 'Bend the knees, let the head hang.')],
    [move('Legs-up or reclined bound-angle', 'recover', 'Support the knees with pillows.'), move('Long exhale counting', 'breath', 'Make the exhale longer than the inhale.')],
    [move('Easy full-body mobility', 'flow', 'No strain, just oil the joints.'), move('Jaw and shoulder release', 'stretch', 'Unclench, then drop the shoulders.')],
    [move('Grounding squat hold', 'squat', 'Hold the floor, breathe into the belly.'), move('Seated side stretches', 'stretch', 'Keep both sit bones down.')],
    [move('Yoga nidra-style body scan', 'breath', 'Notice, do not fix.'), move('Child’s pose holds', 'recover', 'Forehead down, slow breaths.')],
    [move('Restorative Sunday reset', 'recover', 'Stay longer than is comfortable in a good way.'), move('Gratitude breathing', 'breath', 'Inhale receive, exhale release.')],
  ]
);

const CONFIDENCE = week(
  [
    [move('Power-stance shadowboxing', 'punch', 'Stand tall, punch like you mean it.'), move('Voice + strike practice', 'guard', 'Say “back” as you strike.')],
    [move('Strong squat stands', 'squat', 'Stand up like you own the room.'), move('Wall push-ups with a pause', 'plank', 'Press away with intent.')],
    [move('Self-defense palm strikes', 'guard', 'Hips through, then create space.'), move('Posture walks', 'walk', 'Crown up, ribs stacked.')],
    [move('Victory pose holds', 'stretch', 'Arms up, breathe into the chest.'), move('Core braces', 'core', 'Strong middle, easy face.')],
    [move('Combo: squat then strike', 'punch', 'Stand from the squat into a palm strike.'), move('Balance holds', 'flow', 'Eyes forward, one point.')],
    [move('Light fight-stance rounds', 'guard', 'You look ready even when you rest.'), move('Chest-opening stretch', 'stretch', 'Open the front body.')],
    [move('Confidence flow', 'flow', 'Move slowly, take up space.'), move('Grounding breath', 'breath', 'Long exhale, shoulders down.')],
  ]
);

const PREGNANCY = week(
  [
    [move('Supported squat to a chair', 'prenatal', 'Sit and stand with control.'), move('Wall push-ups', 'plank', 'Hands at chest height.')],
    [move('Side-lying clams', 'hip', 'Do not roll the pelvis back.'), move('Standing hip circles', 'prenatal', 'Small, comfortable range.')],
    [move('Cat-cow on all fours', 'flow', 'Keep a long neck.'), move('Pelvic tilts', 'core', 'Gentle, no breath holding.')],
    [move('Walking intervals easy', 'walk', 'Talk test: you can still speak.'), move('Calf raises holding a chair', 'prenatal', 'Slow up, slow down.')],
    [move('Band or towel rows', 'core', 'Squeeze the shoulder blades.'), move('Adductor or butterfly stretch', 'stretch', 'Support the knees.')],
    [move('Prenatal sun-salute modified', 'flow', 'Skip belly-down poses.'), move('Side-lying rest pose', 'recover', 'Pillow between the knees.')],
    [move('Easy prenatal mobility', 'prenatal', 'Nothing heroic today.'), move('Breathing for calm', 'breath', 'Inhale wide, exhale long.')],
  ]
);

const POSTPARTUM = week(
  [
    [move('Heel slides and core reconnection', 'recover', 'Exhale, then slide the heel.'), move('Glute bridges tiny range', 'hip', 'Ribs down, gentle squeeze.')],
    [move('Wall sit or chair sit-to-stand', 'squat', 'Stop before the pelvic floor strains.'), move('Shoulder blade squeezes', 'stretch', 'Open the chest after feeding posture.')],
    [move('Short easy walk', 'walk', 'Build minutes, not intensity.'), move('Cat-cow', 'flow', 'Move with the breath.')],
    [move('Side-lying leg lifts small', 'hip', 'Keep the waist long.'), move('Dead bug with exhale', 'core', 'Only as far as the back stays quiet.')],
    [move('Band rows', 'core', 'Posture first, load second.'), move('Hip-flexor stretch supported', 'stretch', 'Tuck the pelvis gently.')],
    [move('Standing march with core', 'walk', 'Exhale as the knee lifts.'), move('Chest opener on a wall', 'stretch', 'Soft knees.')],
    [move('Recovery mobility', 'recover', 'You are rebuilding, not rushing.'), move('Down-regulating breath', 'breath', 'Longer exhales.')],
  ]
);

function pack(
  id: RoadmapCategoryId,
  label: string,
  planName: string,
  missionCategory: RoadmapMissionCategory,
  href: string,
  courseId: string,
  courseIds: string[],
  courseTopics: string[],
  block: { home: [ExerciseMove, ExerciseMove][]; gym: [ExerciseMove, ExerciseMove][] }
): CategoryWeek {
  return {
    id,
    label,
    planName,
    missionCategory,
    href,
    courseId,
    courseIds,
    courses: courseTopics.map((topic) => `Watch: ${label} — ${topic}`),
    ...block,
  };
}

export const CATEGORY_WEEKS: Record<RoadmapCategoryId, CategoryWeek> = {
  boxing: pack(
    'boxing',
    'Boxing',
    'Boxing Power Plan',
    'safety',
    '/library/self-defence/sd-boxing',
    'sd-boxing',
    ['sd-boxing'],
    ['stance and jab', 'cross and guard', 'footwork', 'hooks', 'round timing', 'bag combos', 'technical reset'],
    BOXING
  ),
  mma: pack(
    'mma',
    'MMA',
    'MMA Fighter Plan',
    'safety',
    '/library/self-defence/sd-mma',
    'sd-mma',
    ['sd-mma', 'sd-boxing'],
    ['stance and sprawl', 'kick chambers', 'clinch posture', 'level changes', 'defense', 'mixed flow', 'recovery skill'],
    MMA
  ),
  karate: pack(
    'karate',
    'Karate',
    'Karate Plan',
    'safety',
    '/library/self-defence/sd-karate',
    'sd-karate',
    ['sd-karate'],
    ['reverse punch', 'front kick', 'kata lines', 'roundhouse', 'stepping punch', 'forms', 'precision'],
    KARATE
  ),
  selfdefense: pack(
    'selfdefense',
    'Self-Defense',
    'Self-Defense Plan',
    'safety',
    '/library/self-defence/sd-foundations',
    'sd-foundations',
    ['sd-foundations', 'sd-boxing'],
    ['stance and voice', 'releases', 'elbows', 'get-ups', 'block and counter', 'awareness', 'scenario'],
    SELFDEFENSE
  ),
  weight_loss: pack(
    'weight_loss',
    'Weight Loss',
    'Weight Loss Plan',
    'fitness',
    '/library/fitness/fit-weight-loss',
    'fit-weight-loss',
    ['fit-weight-loss', 'fit-hiit', 'fit-cardio'],
    ['easy burn', 'lower-body engine', 'core and walk', 'intervals', 'full-body move', 'weekend burn', 'active recovery'],
    WEIGHT_LOSS
  ),
  tone: pack(
    'tone',
    'Tone & Sculpt',
    'Tone & Sculpt Plan',
    'fitness',
    '/library/fitness/fit-core',
    'fit-core',
    ['fit-core', 'fit-strength', 'fit-pilates'],
    ['glute sculpt', 'leg lines', 'upper-body tone', 'core control', 'inner-thigh', 'full sculpt', 'recovery tone'],
    TONE
  ),
  muscle: pack(
    'muscle',
    'Build Muscle',
    'Strength Plan',
    'fitness',
    '/library/fitness/fit-strength',
    'fit-strength',
    ['fit-strength', 'fit-core'],
    ['squat pattern', 'push strength', 'hinge', 'pause work', 'lunges', 'posterior chain', 'accessories'],
    MUSCLE
  ),
  hiit: pack(
    'hiit',
    'HIIT',
    'HIIT Burn Plan',
    'fitness',
    '/library/fitness/fit-hiit',
    'fit-hiit',
    ['fit-hiit', 'fit-cardio'],
    ['squat intervals', 'lunge bursts', 'burpee engine', 'core finishers', 'lateral power', 'tabata', 'flush day'],
    HIIT
  ),
  yoga: pack(
    'yoga',
    'Yoga',
    'Yoga Flow Plan',
    'yoga',
    '/library/fitness/fit-yoga',
    'fit-yoga',
    ['fit-yoga'],
    ['sun salutations', 'balance', 'twists', 'core flow', 'hips', 'restorative', 'savasana'],
    YOGA
  ),
  flexibility: pack(
    'flexibility',
    'Flexibility',
    'Flexibility Plan',
    'yoga',
    '/library/fitness/fit-mobility',
    'fit-mobility',
    ['fit-yoga', 'fit-mobility'],
    ['hamstrings', 'hips', 'quads', 'full-body open', 'shoulders', 'deep squat', 'passive hold'],
    FLEXIBILITY
  ),
  stress: pack(
    'stress',
    'Stress Relief',
    'Calm Body Plan',
    'yoga',
    '/library/fitness/fit-yoga',
    'fit-yoga',
    ['fit-yoga', 'fit-mobility'],
    ['box breathing', 'walk and breathe', 'restore', 'easy mobility', 'grounding', 'nidra', 'sunday reset'],
    STRESS
  ),
  confidence: pack(
    'confidence',
    'Confidence',
    'Confidence Plan',
    'safety',
    '/library/self-defence/sd-foundations',
    'sd-foundations',
    ['sd-foundations', 'sd-boxing', 'fit-foundations'],
    ['power stance', 'strong stands', 'palm strike', 'posture', 'combo presence', 'fight stance', 'take up space'],
    CONFIDENCE
  ),
  pregnancy: pack(
    'pregnancy',
    'Pregnancy Wellness',
    'Pregnancy Wellness Plan',
    'yoga',
    '/library/cycle-pregnancy/cph-pregnancy',
    'cph-pregnancy',
    ['cph-pregnancy', 'fit-yoga'],
    ['supported squat', 'side-lying strength', 'cat-cow', 'easy walk', 'posture', 'modified flow', 'calm breath'],
    PREGNANCY
  ),
  postpartum: pack(
    'postpartum',
    'Postpartum Recovery',
    'Postpartum Recovery Plan',
    'yoga',
    '/library/cycle-pregnancy/cph-postpartum',
    'cph-postpartum',
    ['cph-postpartum', 'cph-recovery-wellness'],
    ['core reconnect', 'sit to stand', 'easy walk', 'gentle hip', 'posture rows', 'march and breathe', 'recovery'],
    POSTPARTUM
  ),
};

export const FOOD_MEALS: Record<string, string[]> = {
  'Eat everything': [
    'Scan your lunch',
    'Scan a balanced plate',
    'Scan today’s main meal',
    'Scan a protein-forward meal',
    'Scan your dinner',
    'Scan a snack with protein',
    'Scan a weekend meal',
  ],
  Vegetarian: [
    'Scan your vegetarian lunch',
    'Scan a vegetarian protein plate',
    'Scan today’s vegetarian meal',
    'Scan vegetarian eggs or dairy protein',
    'Scan a vegetarian dinner',
    'Scan a vegetarian snack',
    'Scan a weekend vegetarian meal',
  ],
  Vegan: [
    'Scan your vegan lunch',
    'Scan a vegan protein bowl',
    'Scan today’s vegan meal',
    'Scan vegan legumes or tofu',
    'Scan a vegan dinner',
    'Scan a vegan snack',
    'Scan a weekend vegan meal',
  ],
  'Gluten-free': [
    'Scan your gluten-free lunch',
    'Scan a gluten-free plate',
    'Scan today’s gluten-free meal',
    'Scan a naturally GF protein',
    'Scan gluten-free dinner',
    'Scan a gluten-free snack',
    'Scan a weekend GF meal',
  ],
  'Dairy-free': [
    'Scan your dairy-free lunch',
    'Scan a dairy-free plate',
    'Scan today’s dairy-free meal',
    'Scan a dairy-free protein',
    'Scan dairy-free dinner',
    'Scan a dairy-free snack',
    'Scan a weekend dairy-free meal',
  ],
  'High protein': [
    'Scan a high-protein lunch',
    'Scan a protein-packed plate',
    'Scan today’s high-protein meal',
    'Scan your protein source',
    'Scan a high-protein dinner',
    'Scan a protein snack',
    'Scan a weekend protein meal',
  ],
  'Low carb': [
    'Scan a low-carb lunch',
    'Scan a low-carb plate',
    'Scan today’s low-carb meal',
    'Scan a protein-and-veg plate',
    'Scan a low-carb dinner',
    'Scan a low-carb snack',
    'Scan a weekend low-carb meal',
  ],
};

export const FOOD_RECIPES: Record<string, string[]> = {
  'Eat everything': [
    'Cook a balanced dinner',
    'Make a 20-minute protein bowl',
    'Prep a simple sheet-pan meal',
    'Cook a high-protein breakfast idea',
    'Make a colourful dinner plate',
    'Prep tomorrow’s lunch',
    'Cook a weekend comfort meal',
  ],
  Vegetarian: [
    'Cook a vegetarian dinner',
    'Make a vegetarian chickpea bowl',
    'Prep a vegetarian sheet-pan meal',
    'Cook a vegetarian breakfast',
    'Make a vegetarian lentil dinner',
    'Prep a vegetarian lunchbox',
    'Cook a weekend vegetarian meal',
  ],
  Vegan: [
    'Cook a vegan dinner',
    'Make a vegan tofu bowl',
    'Prep a vegan sheet-pan meal',
    'Cook a vegan breakfast',
    'Make a vegan lentil dinner',
    'Prep a vegan lunchbox',
    'Cook a weekend vegan meal',
  ],
  'Gluten-free': [
    'Cook a gluten-free dinner',
    'Make a rice or potato protein bowl',
    'Prep a gluten-free sheet-pan meal',
    'Cook a gluten-free breakfast',
    'Make a naturally GF dinner',
    'Prep a gluten-free lunch',
    'Cook a weekend gluten-free meal',
  ],
  'Dairy-free': [
    'Cook a dairy-free dinner',
    'Make a dairy-free protein bowl',
    'Prep a dairy-free sheet-pan meal',
    'Cook a dairy-free breakfast',
    'Make a dairy-free dinner plate',
    'Prep a dairy-free lunch',
    'Cook a weekend dairy-free meal',
  ],
  'High protein': [
    'Cook a high-protein dinner',
    'Make a high-protein bowl',
    'Prep a high-protein sheet-pan meal',
    'Cook a high-protein breakfast',
    'Make a high-protein dinner plate',
    'Prep a high-protein lunch',
    'Cook a weekend high-protein meal',
  ],
  'Low carb': [
    'Cook a low-carb dinner',
    'Make a protein-and-veg bowl',
    'Prep a low-carb sheet-pan meal',
    'Cook a low-carb breakfast',
    'Make a low-carb dinner plate',
    'Prep a low-carb lunch',
    'Cook a weekend low-carb meal',
  ],
};
