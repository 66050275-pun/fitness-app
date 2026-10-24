/** Retains only public widget geometry. Disconnect whenever the pill unmounts or the vault locks. */
class FoodScanActivityLayout {
  private element: HTMLElement | null = null;
  private observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.measure());

  private measure(): void {
    const height = this.element?.getBoundingClientRect().height ?? 0;
    document.documentElement.style.setProperty('--food-scan-activity-height', `${Math.ceil(height)}px`);
  }

  sync(): void {
    const next = document.getElementById('food-scan-activity');
    if (!next) { this.reset(); return; }
    if (next !== this.element) {
      this.observer?.disconnect(); this.element = next;
      this.observer?.observe(next, { box: 'border-box' }); this.measure();
    }
    if (!this.observer) this.measure();
  }

  reset(): void {
    this.observer?.disconnect(); this.element = null;
    document.documentElement.style.removeProperty('--food-scan-activity-height');
  }
}

export const foodScanActivityLayout = new FoodScanActivityLayout();
