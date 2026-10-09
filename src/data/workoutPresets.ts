import type { WorkoutPreset, WorkoutExercise } from '../types/index.ts';

export const WORKOUT_PRESETS: WorkoutPreset[] = [
  {
    id: 'full-body',
    title: 'Full Body',
    subtitle: 'Balanced Compound Foundation',
    primaryMuscles: 'Legs, Chest, Back & Core',
    estimatedMinutes: 45,
    intensity: 'Moderate',
    icon: 'accessibility_new',
    exercises: [
      { name: 'Barbell Squat', muscleGroup: 'Quads & Glutes', defaultSets: 3, defaultReps: 8, restSeconds: 90 },
      { name: 'Bench Press', muscleGroup: 'Chest & Triceps', defaultSets: 3, defaultReps: 10, restSeconds: 90 },
      { name: 'Lat Pulldown', muscleGroup: 'Lats & Upper Back', defaultSets: 3, defaultReps: 10, restSeconds: 60 },
      { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings & Glutes', defaultSets: 3, defaultReps: 10, restSeconds: 90 },
      { name: 'Plank', muscleGroup: 'Core Stability', defaultSets: 3, defaultReps: 45, restSeconds: 45 }
    ]
  },
  {
    id: 'push-day',
    title: 'Push Day',
    subtitle: 'Anterior Chain Hypertrophy',
    primaryMuscles: 'Chest, Shoulders & Triceps',
    estimatedMinutes: 50,
    intensity: 'High',
    icon: 'fitness_center',
    exercises: [
      { name: 'Barbell Bench Press', muscleGroup: 'Chest', defaultSets: 4, defaultReps: 8, restSeconds: 90 },
      { name: 'Incline Dumbbell Press', muscleGroup: 'Upper Chest', defaultSets: 3, defaultReps: 10, restSeconds: 75 },
      { name: 'Overhead Press', muscleGroup: 'Anterior Deltoids', defaultSets: 3, defaultReps: 8, restSeconds: 75 },
      { name: 'Lateral Raise', muscleGroup: 'Lateral Deltoids', defaultSets: 3, defaultReps: 12, restSeconds: 60 },
      { name: 'Triceps Pushdown', muscleGroup: 'Triceps', defaultSets: 3, defaultReps: 12, restSeconds: 60 }
    ]
  },
  {
    id: 'pull-day',
    title: 'Pull Day',
    subtitle: 'Posterior Upper Body Density',
    primaryMuscles: 'Back, Biceps & Rear Delts',
    estimatedMinutes: 48,
    intensity: 'High',
    icon: 'rowing',
    exercises: [
      { name: 'Lat Pulldown', muscleGroup: 'Lats', defaultSets: 4, defaultReps: 10, restSeconds: 75 },
      { name: 'Barbell Row', muscleGroup: 'Mid Back & Rhomboids', defaultSets: 3, defaultReps: 8, restSeconds: 90 },
      { name: 'Seated Cable Row', muscleGroup: 'Middle Traps & Lats', defaultSets: 3, defaultReps: 10, restSeconds: 60 },
      { name: 'Face Pull', muscleGroup: 'Rear Delts & Rotators', defaultSets: 3, defaultReps: 12, restSeconds: 60 },
      { name: 'Dumbbell Curl', muscleGroup: 'Biceps', defaultSets: 3, defaultReps: 12, restSeconds: 60 }
    ]
  },
  {
    id: 'leg-day',
    title: 'Leg Day',
    subtitle: 'Lower Body Strength & Power',
    primaryMuscles: 'Quads, Hamstrings & Calves',
    estimatedMinutes: 55,
    intensity: 'Very High',
    icon: 'directions_run',
    exercises: [
      { name: 'Barbell Squat', muscleGroup: 'Quads & Glutes', defaultSets: 4, defaultReps: 8, restSeconds: 90 },
      { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings & Posterior Chain', defaultSets: 3, defaultReps: 10, restSeconds: 90 },
      { name: 'Leg Press', muscleGroup: 'Quads', defaultSets: 3, defaultReps: 12, restSeconds: 75 },
      { name: 'Leg Curl', muscleGroup: 'Hamstrings', defaultSets: 3, defaultReps: 12, restSeconds: 60 },
      { name: 'Standing Calf Raise', muscleGroup: 'Calves', defaultSets: 4, defaultReps: 15, restSeconds: 45 }
    ]
  }
];

export const AVAILABLE_EXERCISE_POOL: { name: string; muscleGroup: string; defaultSets: number; defaultReps: number; restSeconds: number }[] = [
  { name: 'Dumbbell Incline Fly', muscleGroup: 'Chest', defaultSets: 3, defaultReps: 12, restSeconds: 60 },
  { name: 'Dips (Chest / Triceps)', muscleGroup: 'Chest & Arms', defaultSets: 3, defaultReps: 10, restSeconds: 75 },
  { name: 'Cable Lateral Raise', muscleGroup: 'Side Delts', defaultSets: 3, defaultReps: 15, restSeconds: 60 },
  { name: 'Hammer Curl', muscleGroup: 'Brachialis & Biceps', defaultSets: 3, defaultReps: 12, restSeconds: 60 },
  { name: 'Preacher Curl', muscleGroup: 'Biceps Short Head', defaultSets: 3, defaultReps: 10, restSeconds: 60 },
  { name: 'Skull Crushers', muscleGroup: 'Triceps Long Head', defaultSets: 3, defaultReps: 10, restSeconds: 60 },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Quads & Glutes', defaultSets: 3, defaultReps: 10, restSeconds: 75 },
  { name: 'Hanging Leg Raise', muscleGroup: 'Abs & Hip Flexors', defaultSets: 3, defaultReps: 12, restSeconds: 45 },
  { name: 'Cable Woodchopper', muscleGroup: 'Obliques', defaultSets: 3, defaultReps: 12, restSeconds: 45 },
  { name: 'Seated Calf Raise', muscleGroup: 'Soleus', defaultSets: 3, defaultReps: 15, restSeconds: 45 }
];

export function createWorkoutExercisesFromPreset(preset: WorkoutPreset): WorkoutExercise[] {
  return preset.exercises.map((ex, exIdx) => ({
    id: `ex-${preset.id}-${exIdx}-${Date.now()}`,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    targetSets: ex.defaultSets,
    targetReps: ex.defaultReps,
    restSeconds: ex.restSeconds,
    sets: Array.from({ length: ex.defaultSets }, (_, sIdx) => ({
      setNumber: sIdx + 1,
      targetReps: ex.defaultReps,
      actualReps: ex.defaultReps,
      weightKg: 0,
      completed: false
    }))
  }));
}
