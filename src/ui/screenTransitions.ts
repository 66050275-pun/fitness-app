import type { AppState } from '../types/index.ts';
import { Dialogs } from './dialogs.ts';
import { NavigationLayout } from './navigationLayout.ts';

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
  private dialogs = new Dialogs();
  private navigation = new NavigationLayout();
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
    this.dialogs.reset();
    this.navigation.reset();
    this.cancel(); this.current = null; this.history = []; this.scrollPositions.clear();
    this.screenHtml = ''; this.navigationHtml = ''; this.overlaysHtml = '';
  }
  render(app: HTMLElement, state: AppState, screenHtml: string, navigationHtml: string, overlaysHtml: string) {
    this.dialogs.capture();
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
      const drafts = !changed ? Array.from(screen.querySelectorAll<HTMLFormElement>('form[data-preserve-draft]')).map(form => ({
        id: form.id, validated: form.dataset.validated,
        fields: Array.from(form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('input:not([type="file"]):not([type="password"]), select'))
          .filter(field => field.id).map(field => ({ id: field.id, value: field.value, checked: field instanceof HTMLInputElement ? field.checked : false })),
      })) : [];
      const scrollAreas = !changed ? Array.from(screen.querySelectorAll<HTMLElement>('[data-scroll-key]')).map(area => ({
        key: area.dataset.scrollKey, left: area.scrollLeft, top: area.scrollTop,
      })) : [];
      screen.innerHTML = screenHtml; this.screenHtml = screenHtml;
      if (!changed) {
        for (const draft of drafts) {
          const form = document.getElementById(draft.id);
          if (!form?.matches('form[data-preserve-draft]')) continue;
          if (draft.validated) form.dataset.validated = draft.validated;
          for (const field of draft.fields) {
            const restored = document.getElementById(field.id);
            if (restored instanceof HTMLInputElement || restored instanceof HTMLSelectElement) {
              restored.value = field.value;
              if (restored instanceof HTMLInputElement) restored.checked = field.checked;
            }
          }
        }
        for (const area of screen.querySelectorAll<HTMLElement>('[data-scroll-key]')) {
          const previous = scrollAreas.find(item => item.key === area.dataset.scrollKey);
          if (previous) { area.scrollLeft = previous.left; area.scrollTop = previous.top; area.dataset.scrollRestored = 'true'; }
        }
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
    if (navigationHtml !== this.navigationHtml) {
      const focusedId = nav.contains(document.activeElement) ? (document.activeElement as HTMLElement).id : '';
      nav.innerHTML = navigationHtml; this.navigationHtml = navigationHtml;
      if (!changed && !state.quickAddOpen && focusedId) document.getElementById(focusedId)?.focus({ preventScroll: true });
    }
    this.navigation.sync(app);
    const overlays = app.querySelector<HTMLElement>('#app-overlays')!;
    if (overlaysHtml !== this.overlaysHtml) { overlays.innerHTML = overlaysHtml; this.overlaysHtml = overlaysHtml; }
    this.dialogs.sync(changed);
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

  closeDialog() { return this.dialogs.closeTop(); }

  /** The close binding commits its state change after the mounted sheet exits. */
  dismissDialog(id: string, afterClose: () => void, replacePending = false) {
    return this.dialogs.dismiss(id, afterClose, replacePending);
  }
}
