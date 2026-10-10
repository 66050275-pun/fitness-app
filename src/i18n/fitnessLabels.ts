import { musclesForExercise } from '../data/exerciseMuscles.ts';
import { translatedLabel } from './index.ts';
/** App-owned muscle lists have canonical labels; exercise IDs and matching never change. */
export function translatedMuscles(value: string): string {
  const translated = translatedLabel(value);
  return translated !== value ? translated : value.split(/([,/&+])/).map(part => {
    const token = part.trim();
    return token ? part.replace(token, translatedLabel(token)) : part;
  }).join('');
}

export function exerciseLabel(name: string): string {
  return musclesForExercise(name) ? translatedLabel(name) : name;
}
