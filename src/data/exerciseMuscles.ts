/** Major movers and common assisting muscles; stabilizers are deliberately excluded. */
export const muscleLabels = {
  chest: 'Chest', frontDelts: 'Front shoulders', sideDelts: 'Side shoulders', rearDelts: 'Rear shoulders',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', traps: 'Traps / upper back',
  midBack: 'Mid back', lats: 'Lats', lowerBack: 'Lower back', abs: 'Abdominals',
  obliques: 'Obliques', hipFlexors: 'Hip flexors', glutes: 'Glutes',
  quads: 'Quadriceps', hamstrings: 'Hamstrings', adductors: 'Inner thighs', calves: 'Calves',
} as const;
export type Muscle = keyof typeof muscleLabels;
export const exerciseMuscles: Record<string, readonly Muscle[]> = {
  'Barbell Squat': ['quads', 'glutes', 'adductors'],
  'Bench Press': ['chest', 'frontDelts', 'triceps'],
  'Barbell Bench Press': ['chest', 'frontDelts', 'triceps'],
  'Incline Dumbbell Press': ['chest', 'frontDelts', 'triceps'],
  'Overhead Press': ['frontDelts', 'sideDelts', 'triceps'],
  'Lateral Raise': ['sideDelts'], 'Cable Lateral Raise': ['sideDelts'],
  'Triceps Pushdown': ['triceps'], 'Skull Crushers': ['triceps'],
  'Lat Pulldown': ['lats', 'midBack', 'biceps'],
  'Barbell Row': ['lats', 'midBack', 'traps', 'rearDelts', 'biceps'],
  'Seated Cable Row': ['lats', 'midBack', 'traps', 'rearDelts', 'biceps'],
  'Face Pull': ['rearDelts', 'midBack', 'traps'],
  'Dumbbell Curl': ['biceps'], 'Preacher Curl': ['biceps'], 'Hammer Curl': ['biceps', 'forearms'],
  'Romanian Deadlift': ['hamstrings', 'glutes', 'lowerBack'],
  'Leg Press': ['quads', 'glutes', 'adductors'], 'Leg Curl': ['hamstrings'],
  'Standing Calf Raise': ['calves'], 'Seated Calf Raise': ['calves'],
  'Plank': ['abs', 'obliques'], 'Dumbbell Incline Fly': ['chest', 'frontDelts'],
  'Dips (Chest / Triceps)': ['chest', 'triceps', 'frontDelts'],
  'Bulgarian Split Squat': ['quads', 'glutes', 'adductors'],
  'Hanging Leg Raise': ['abs', 'hipFlexors'], 'Cable Woodchopper': ['obliques', 'abs'],
};
export function musclesForExercise(name: string): readonly Muscle[] | undefined {
  const normalized = name.trim().toLowerCase().replace(/[ -]+/g, ' ');
  return Object.entries(exerciseMuscles).find(([label]) => label.toLowerCase().replace(/[ -]+/g, ' ') === normalized)?.[1];
}
