import { EXERCISE_CATALOG, catalogExerciseById, findCatalogExercise, type CatalogExercise } from '../../data/exerciseCatalog.ts';
import { muscleLabels, type Muscle } from '../../data/exerciseMuscles.ts';
import { exerciseLabel, translatedMuscles } from '../../i18n/fitnessLabels.ts';
import { tr, trHtml, translatedLabel, labelSearchTerms } from '../../i18n/index.ts';
import { store } from '../../store/appState.ts';
import { isVaultUnlocked } from '../../services/privateStorage.ts';
import { escapeHtml, htmlJsArg } from '../../utils/sanitize.ts';
import { renderExerciseIllustration } from './ExerciseIllustration.ts';
import type { WorkoutExercise } from '../../types/index.ts';
import './exerciseCatalog.css';

declare global {
  interface Window {
    toggleExerciseCatalog: () => void;
    filterExerciseCatalog: (value: string) => void;
    filterExerciseMuscle: (value: string) => void;
    filterExerciseEquipment: (value: string) => void;
    clearExerciseCatalogFilters: () => void;
    exerciseCatalogPage: (delta: number) => void;
    addCatalogExercise: (id: string) => void;
  }
}

const PAGE_SIZE = 12;
const equipmentOptions = [...new Set(EXERCISE_CATALOG.map(exercise => exercise.equipment))].sort();
let query = '';
let muscle: Muscle | '' = '';
let equipment = '';
let page = 0;
let open = false;
let lastAdded = '';

/** Search/filter state is transient and never enters the health snapshot or network requests. */
export function resetExerciseCatalog(): void { query = ''; muscle = ''; equipment = ''; page = 0; open = false; lastAdded = ''; }

function active(): boolean {
  return isVaultUnlocked() && store.getState().currentScreen === 'fitness' && store.getState().fitnessSubView === 'setup';
}
function normalized(value: string): string { return value.normalize('NFKC').toLowerCase().replace(/[-_]+/g, ' ').trim(); }
function matches(): readonly CatalogExercise[] {
  const terms = normalized(query).split(/\s+/).filter(Boolean);
  return EXERCISE_CATALOG.filter(exercise => {
    if (muscle && !exercise.muscles.includes(muscle)) return false;
    if (equipment && exercise.equipment !== equipment) return false;
    const text = normalized([exercise.name, exercise.nameTh, exerciseLabel(exercise.name), ...exercise.aliases,
      ...labelSearchTerms(exercise.muscleGroup), ...labelSearchTerms(exercise.equipment),
      ...exercise.muscles.flatMap(key => labelSearchTerms(muscleLabels[key]))].join(' '));
    return terms.every(term => text.includes(term));
  });
}

function renderResults(draft: readonly WorkoutExercise[]): string {
  const filtered = matches();
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  page = Math.max(0, Math.min(page, pages - 1));
  const start = page * PAGE_SIZE;
  const shown = filtered.slice(start, start + PAGE_SIZE);
  const added = new Set(draft.map(exercise => findCatalogExercise(exercise.name)?.id));
  return `<p class="exercise-catalog-count" role="status">${filtered.length
    ? trHtml('Showing {0}–{1} of {2} exercises', start + 1, start + shown.length, filtered.length)
    : trHtml('No exercises match these filters.')}</p>
    ${filtered.length ? `
    <div id="exercise-catalog-scroll" class="exercise-catalog-scroll" role="list" aria-label="${trHtml('Exercise results')}">
      ${shown.map(exercise => `<article id="catalog-entry-${exercise.id}" class="exercise-catalog-item" role="listitem">
        <div class="exercise-catalog-item-heading">
          ${renderExerciseIllustration(exercise.name, true)}
          <div class="min-w-0 flex-1">
            <h4 class="font-heading font-bold text-sm">${escapeHtml(exerciseLabel(exercise.name))}</h4>
            <p class="phasic-tool-muted text-xs">${escapeHtml(translatedMuscles(exercise.muscleGroup))} · ${escapeHtml(translatedLabel(exercise.equipment))}</p>
          </div>
          <button type="button" id="catalog-add-${exercise.id}" class="exercise-catalog-add" onclick="window.addCatalogExercise(${htmlJsArg(exercise.id)})"
            aria-label="${trHtml(added.has(exercise.id) ? '{0} is in your workout' : 'Add {0} to workout', exerciseLabel(exercise.name))}" ${added.has(exercise.id) ? 'disabled' : ''}>
            ${added.has(exercise.id) ? `<span class="material-symbols-outlined" aria-hidden="true">check</span><span>${trHtml('Added to workout')}</span>` : trHtml('+ Add')}
          </button>
        </div>
        <details><summary>${trHtml('View exercise / ดูภาพท่า')}</summary>
          <div class="mt-2">${renderExerciseIllustration(exercise.name)}</div>
          <p class="phasic-tool-muted text-xs mt-2">${exercise.muscles.map(key => trHtml(muscleLabels[key])).join(' · ')}</p>
          <p class="phasic-tool-muted text-xs mt-2">${trHtml('Default: {0} sets × {1} reps · Rest {2} s', exercise.defaultSets, exercise.defaultReps, exercise.restSeconds)}</p>
          ${exercise.exerciseType !== 'weight_reps' || exercise.equipment === 'Bodyweight'
            ? `<p class="phasic-tool-muted text-xs mt-2">${trHtml('Repetition tracking; automatic load increases are disabled for this movement.')}</p>` : ''}
        </details>
      </article>`).join('')}
    </div>` : `<div class="exercise-catalog-empty"><span class="material-symbols-outlined" aria-hidden="true">search_off</span>
      <button type="button" class="exercise-catalog-clear" onclick="window.clearExerciseCatalogFilters()">${trHtml('Clear filters')}</button></div>`}
    ${filtered.length ? `<nav class="exercise-catalog-pages" aria-label="${trHtml('Exercise catalog pages')}">
      <button type="button" id="exercise-catalog-previous" class="phasic-tool-secondary" onclick="window.exerciseCatalogPage(-1)" ${page === 0 ? 'disabled' : ''}>${trHtml('Previous')}</button>
      <span class="text-xs font-bold text-center">${trHtml('Page {0} of {1}', page + 1, pages)}</span>
      <button type="button" id="exercise-catalog-next" class="phasic-tool-secondary" onclick="window.exerciseCatalogPage(1)" ${page === pages - 1 ? 'disabled' : ''}>${trHtml('Next')}</button>
    </nav>` : ''}`;
}

export function renderExerciseCatalog(draft: readonly WorkoutExercise[]): string {
  return `<section class="pt-1 exercise-catalog">
    <div id="add-exercise-accordion" class="${open ? '' : 'hidden'} phasic-tool-card mb-3 flex flex-col gap-3">
      <div><h3 class="font-heading font-bold text-sm">${trHtml('Select from Exercise Catalog')}</h3>
        <p class="phasic-tool-muted text-xs mt-1">${trHtml('{0} illustrated exercises', EXERCISE_CATALOG.length)}</p></div>
      <label for="exercise-catalog-search" class="text-sm font-heading font-bold">${trHtml('Search exercises')}
        <input id="exercise-catalog-search" type="search" class="phasic-tool-input w-full font-sans font-normal mt-2" autocomplete="off" maxlength="120"
          placeholder="${trHtml('Search by exercise, muscle or equipment')}" value="${escapeHtml(query)}" oninput="window.filterExerciseCatalog(this.value)" /></label>
      <div class="exercise-catalog-filters">
        <label for="exercise-catalog-muscle" class="font-heading font-bold min-w-0">${trHtml('Muscle group')}
          <select id="exercise-catalog-muscle" class="phasic-tool-input w-full mt-2" onchange="window.filterExerciseMuscle(this.value)">
            <option value="">${trHtml('All muscles')}</option>
            ${Object.entries(muscleLabels).map(([key, label]) => `<option value="${key}" ${muscle === key ? 'selected' : ''}>${trHtml(label)}</option>`).join('')}
          </select></label>
        <label for="exercise-catalog-equipment" class="font-heading font-bold min-w-0">${trHtml('Equipment')}
          <select id="exercise-catalog-equipment" class="phasic-tool-input w-full mt-2" onchange="window.filterExerciseEquipment(this.value)">
            <option value="">${trHtml('All equipment')}</option>
            ${equipmentOptions.map(value => `<option value="${escapeHtml(value)}" ${equipment === value ? 'selected' : ''}>${escapeHtml(translatedLabel(value))}</option>`).join('')}
          </select></label>
      </div>
      <button type="button" id="exercise-catalog-clear" class="exercise-catalog-clear" onclick="window.clearExerciseCatalogFilters()">${trHtml('Clear filters')}</button>
      <p id="exercise-catalog-feedback" class="text-sm text-primary empty:hidden" role="status">${lastAdded ? trHtml('{0} added to your workout.', exerciseLabel(lastAdded)) : ''}</p>
      <div id="exercise-catalog-results">${renderResults(draft)}</div>
      <p class="exercise-art-credit">${trHtml('Artwork: Bryl Lim / Everkinetic where credited.')} <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a></p>
    </div>
    <button type="button" id="exercise-catalog-toggle" onclick="window.toggleExerciseCatalog()" class="exercise-catalog-toggle" aria-controls="add-exercise-accordion" aria-expanded="${open}">
      <span id="exercise-catalog-toggle-icon" class="material-symbols-outlined" aria-hidden="true">${open ? 'expand_less' : 'add_circle'}</span>
      <span id="exercise-catalog-toggle-label">${trHtml(open ? 'Hide Exercise Catalog' : 'Add Exercise from Catalog')}</span>
    </button>
  </section>`;
}

function refreshResults(): void {
  if (!active()) return;
  const results = document.getElementById('exercise-catalog-results');
  const focused = document.activeElement?.id;
  if (results) results.innerHTML = renderResults(store.getState().draftWorkout ?? []);
  if (focused?.startsWith('exercise-catalog-')) {
    const target = document.getElementById(focused);
    if (target instanceof HTMLButtonElement && target.disabled) {
      const alternative = focused === 'exercise-catalog-next' ? 'exercise-catalog-previous' : 'exercise-catalog-next';
      const fallback = document.getElementById(alternative);
      if (fallback instanceof HTMLButtonElement && !fallback.disabled) fallback.focus({ preventScroll: true });
      else document.getElementById('exercise-catalog-search')?.focus({ preventScroll: true });
    } else target?.focus({ preventScroll: true });
  }
}

export function bindExerciseCatalogHandlers(): void {
  document.addEventListener('nutriai:lock-start', resetExerciseCatalog);
  window.addEventListener('pagehide', resetExerciseCatalog);
  window.toggleExerciseCatalog = () => {
    if (!active()) return;
    open = !open;
    document.getElementById('add-exercise-accordion')?.classList.toggle('hidden', !open);
    document.getElementById('exercise-catalog-toggle')?.setAttribute('aria-expanded', String(open));
    const label = document.getElementById('exercise-catalog-toggle-label');
    if (label) label.textContent = tr(open ? 'Hide Exercise Catalog' : 'Add Exercise from Catalog');
    const icon = document.getElementById('exercise-catalog-toggle-icon');
    if (icon) icon.textContent = open ? 'expand_less' : 'add_circle';
  };
  window.filterExerciseCatalog = value => { if (active()) { query = value.slice(0, 120); page = 0; refreshResults(); } };
  window.filterExerciseMuscle = value => { if (active() && (value === '' || Object.hasOwn(muscleLabels, value))) { muscle = value as Muscle | ''; page = 0; refreshResults(); } };
  window.filterExerciseEquipment = value => { if (active() && (value === '' || equipmentOptions.includes(value))) { equipment = value; page = 0; refreshResults(); } };
  window.clearExerciseCatalogFilters = () => {
    if (!active()) return;
    query = ''; muscle = ''; equipment = ''; page = 0;
    for (const id of ['exercise-catalog-search', 'exercise-catalog-muscle', 'exercise-catalog-equipment']) {
      const input = document.getElementById(id); if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) input.value = '';
    }
    refreshResults(); document.getElementById('exercise-catalog-search')?.focus();
  };
  window.exerciseCatalogPage = delta => {
    if (!active() || (delta !== -1 && delta !== 1)) return;
    page += delta; refreshResults();
  };
  window.addCatalogExercise = id => {
    if (!active()) return;
    const exercise = catalogExerciseById(id); const draft = store.getState().draftWorkout;
    if (!exercise || !draft || draft.some(item => findCatalogExercise(item.name)?.id === id)) return;
    const previousTop = document.getElementById('add-exercise-accordion')?.getBoundingClientRect().top ?? 0;
    const previousScroll = document.getElementById('exercise-catalog-scroll')?.scrollTop ?? 0;
    lastAdded = exercise.name;
    store.addExerciseToDraft(exercise.name, exercise.muscleGroup, exercise.defaultSets, exercise.defaultReps, exercise.restSeconds);
    // Adding a routine card above the catalog must keep the user's catalog position in view.
    const currentTop = document.getElementById('add-exercise-accordion')?.getBoundingClientRect().top ?? previousTop;
    const list = document.getElementById('exercise-catalog-scroll'); if (list) list.scrollTop = previousScroll;
    window.scrollBy({ top: currentTop - previousTop, behavior: 'instant' as ScrollBehavior });
    document.getElementById(`catalog-entry-${exercise.id}`)?.querySelector('summary')?.focus({ preventScroll: true });
  };
}
