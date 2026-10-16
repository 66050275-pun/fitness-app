import catalog from './exerciseCatalog.json' with { type: 'json' };
import type { Muscle } from './exerciseMuscles.ts';

export interface CatalogExercise {
  id: string;
  name: string;
  nameTh: string;
  aliases: readonly string[];
  artworkSlug: string;
  artworkNote?: string;
  exerciseType: 'weight_reps' | 'bodyweight_reps' | 'assisted_bodyweight';
  equipment: string;
  muscleGroup: string;
  muscles: readonly Muscle[];
  defaultSets: number;
  defaultReps: number;
  restSeconds: number;
}

/** Repetition-based movements only. Duration/distance entries need a different workout logging model. */
export const EXERCISE_CATALOG: readonly CatalogExercise[] = catalog as readonly CatalogExercise[];
export const normalizeExerciseName = (name: string): string => name.normalize('NFKC').trim().toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
const byName = new Map(EXERCISE_CATALOG.flatMap(exercise => [exercise.name, ...exercise.aliases]
  .map(name => [normalizeExerciseName(name), exercise] as const)));
const byId = new Map(EXERCISE_CATALOG.map(exercise => [exercise.id, exercise]));

export function findCatalogExercise(name: string): CatalogExercise | undefined { return byName.get(normalizeExerciseName(name)); }
export function catalogExerciseById(id: string): CatalogExercise | undefined { return byId.get(id); }
