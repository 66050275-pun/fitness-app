import type { AppState } from '../types/index.ts';

type Route = { key: string; root: string; depth: number };
function routeFor(state: AppState): Route {
  const parts: (string | number)[] = [state.currentScreen];
  if (state.currentScreen === 'profile' && state.profileSubpage) parts.push(state.profileSubpage);
  if (state.currentScreen === 'onboarding') parts.push(state.onboardingState.currentStep);
  if (state.currentScreen === 'fitness') {
    parts.push(state.fitnessSubView);
    if (state.fitnessSubView === 'home') parts.push(state.fitnessPlannerMode);
    if (state.fitnessSubView === 'setup') parts.push(state.selectedPresetId || 'custom');
    if (state.fitnessSubView === 'active') parts.push(state.activeWorkout?.currentExerciseIndex || 0);
  }
  if (state.currentScreen === 'workoutDetail') parts.push(state.selectedWorkoutHistoryId || '');
  if (state.currentScreen === 'personalRecordDetail') parts.push(state.selectedPersonalRecordExerciseId || '');
  return { key: JSON.stringify(parts), root: state.currentScreen,
    depth: state.currentScreen === 'profile' && state.profileSubpage ? 1 : state.currentScreen === 'fitness' ? ['home', 'setup', 'active', 'summary'].indexOf(state.fitnessSubView) : 0 };
}

/** Animate only the newly mounted view. No screenshots or previous private DOM are retained. */
export class ScreenTransitions {
  private current: Route | null = null;
  private history: string[] = [];
  private scrollPositions = new Map<string, number>();
  private animations: Animation[] = [];
  private screenHtml = '';
  private navigationHtml = '';
  private overlaysHtml = '';
  private media = window.matchMedia('(prefers-reduced-motion: reduce)');

  constructor() {
    this.media.addEventListener('change', () => {
      if (this.media.matches) this.cancel();
    });
  }
  private cancel() { this.animations.forEach(animation => animation.cancel()); this.animations = []; }
  reset() {
    this.cancel(); this.current = null; this.history = []; this.scrollPositions.clear();
    this.screenHtml = ''; this.navigationHtml = ''; this.overlaysHtml = '';
  }
  render(app: HTMLElement, state: AppState, screenHtml: string, navigationHtml: string, overlaysHtml: string) {
    const route = routeFor(state);
    const changed = route.key !== this.current?.key;
    const reduced = state.userPreferences.reduceMotion || this.media.matches;
    document.documentElement.classList.toggle('reduce-motion', state.userPreferences.reduceMotion);
    if (reduced) this.cancel();
    let screen = app.querySelector<HTMLElement>('#app-screen');
    if (!screen) {
      app.innerHTML = '<div id="app-screen" class="app-screen"></div><div id="app-navigation"></div><div id="app-overlays"></div>';
      screen = app.querySelector<HTMLElement>('#app-screen')!;
      this.screenHtml = ''; this.navigationHtml = ''; this.overlaysHtml = '';
    }
    let back = false;
    if (changed) {
      this.cancel();
      if (this.current) this.scrollPositions.set(this.current.key, window.scrollY);
      const previousIndex = this.history.lastIndexOf(route.key);
      back = previousIndex >= 0 || (!!this.current && route.root === this.current.root && route.depth < this.current.depth);
      if (previousIndex >= 0) this.history.length = previousIndex + 1;
      else { this.history.push(route.key); if (this.history.length > 40) this.history.shift(); }
      // Scroll cache stays bounded and is cleared when locking the vault.
      if (this.scrollPositions.size > 40) this.scrollPositions.delete(this.scrollPositions.keys().next().value!);
      screen.dataset.motion = back ? 'back' : 'forward';
      screen.dataset.route = route.key;
    }
    if (changed || screenHtml !== this.screenHtml) {
      const focused = !changed && screen.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
      const id = focused?.id;
      const selection = focused instanceof HTMLInputElement || focused instanceof HTMLTextAreaElement
        ? { start: focused.selectionStart, end: focused.selectionEnd } : null;
      const openDetails = !changed ? Array.from(screen.querySelectorAll('details')).map(element => element.open) : [];
      const accordion = !changed ? screen.querySelector('#add-exercise-accordion')?.classList.contains('hidden') : undefined;
      screen.innerHTML = screenHtml; this.screenHtml = screenHtml;
      if (!changed) {
        screen.querySelectorAll('details').forEach((element, i) => { element.open = openDetails[i] || false; });
        if (accordion !== undefined) screen.querySelector('#add-exercise-accordion')?.classList.toggle('hidden', accordion);
        const nextFocus = id ? document.getElementById(id) : null;
        nextFocus?.focus({ preventScroll: true });
        if (selection && selection.start !== null && selection.end !== null &&
          (nextFocus instanceof HTMLInputElement || nextFocus instanceof HTMLTextAreaElement)) {
          try { nextFocus.setSelectionRange(selection.start, selection.end); } catch { /* Number/date inputs have no text selection. */ }
        }
      }
    }
    const nav = app.querySelector<HTMLElement>('#app-navigation')!;
    if (navigationHtml !== this.navigationHtml) { nav.innerHTML = navigationHtml; this.navigationHtml = navigationHtml; }
    const overlays = app.querySelector<HTMLElement>('#app-overlays')!;
    if (overlaysHtml !== this.overlaysHtml) { overlays.innerHTML = overlaysHtml; this.overlaysHtml = overlaysHtml; }
    if (changed) {
      window.scrollTo({ top: back ? this.scrollPositions.get(route.key) || 0 : 0, behavior: 'instant' as ScrollBehavior });
      const heading = screen.querySelector<HTMLElement>('h1, h2');
      if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
      if (!reduced && typeof screen.animate === 'function') {
        this.animations.push(screen.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' }));
        const panel = screen.querySelector<HTMLElement>('main');
        // Transforming a containing block would move its fixed controls; leave those views stationary.
        if (panel && !Array.from(panel.querySelectorAll('*')).some(element => getComputedStyle(element).position === 'fixed')) {
          this.animations.push(panel.animate([
            { transform: `translate3d(${back ? -14 : 14}px,0,0)` }, { transform: 'translate3d(0,0,0)' },
          ], { duration: 220, easing: 'cubic-bezier(0.2,0.8,0.2,1)' }));
        }
      }
    }
    this.current = route;
  }
}
