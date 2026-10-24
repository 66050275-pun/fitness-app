/** Measures public navigation geometry only; no profile or screen markup is retained. */
export class NavigationLayout {
  private navigation: HTMLElement | null = null;
  private observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measure());

  private measure() {
    const height = this.navigation?.getBoundingClientRect().height ?? 0;
    document.documentElement.style.setProperty('--ui-bottom-nav-height', `${Math.ceil(height)}px`);
  }

  sync(app: HTMLElement) {
    const next = app.querySelector<HTMLElement>('#app-navigation nav');
    app.classList.toggle('has-bottom-navigation', !!next);
    if (next !== this.navigation) {
      this.observer?.disconnect();
      this.navigation = next;
      if (next) this.observer?.observe(next, { box: 'border-box' });
    }
    this.measure();
  }

  reset() {
    this.observer?.disconnect();
    this.navigation = null;
    document.getElementById('app')?.classList.remove('has-bottom-navigation');
    document.documentElement.style.removeProperty('--ui-bottom-nav-height');
  }
}
