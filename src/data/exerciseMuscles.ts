import { EXERCISE_CATALOG, normalizeExerciseName } from './exerciseCatalog.ts';

/** Major movers and common assisting muscles; generic source stability tags are excluded. */
export const muscleLabels = {
  chest: 'Chest', frontDelts: 'Front shoulders', sideDelts: 'Side shoulders', rearDelts: 'Rear shoulders',
  biceps: 'Biceps', triceps: 'Triceps', forearms: 'Forearms', traps: 'Traps / upper back',
  midBack: 'Mid back', lats: 'Lats', lowerBack: 'Lower back', abs: 'Abdominals',
  obliques: 'Obliques', hipFlexors: 'Hip flexors', glutes: 'Glutes',
  quads: 'Quadriceps', hamstrings: 'Hamstrings', adductors: 'Inner thighs', calves: 'Calves',
} as const;
export type Muscle = keyof typeof muscleLabels;
export const exerciseMuscles: Record<string, readonly Muscle[]> = {
  ...Object.fromEntries(EXERCISE_CATALOG.flatMap(exercise => [exercise.name, ...exercise.aliases]
    .map(name => [name, exercise.muscles]))),
  'Plank': ['abs', 'obliques'],
};
const byName = new Map(Object.entries(exerciseMuscles).map(([name, muscles]) => [normalizeExerciseName(name), muscles]));
export function musclesForExercise(name: string): readonly Muscle[] | undefined {
  return byName.get(normalizeExerciseName(name));
}
