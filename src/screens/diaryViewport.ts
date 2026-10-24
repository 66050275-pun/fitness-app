/** Center the selected day horizontally without scrolling the app vertically. */
export function refreshDiaryViewport(): void {
  const strip = document.getElementById('diary-week-dates');
  if (!strip || strip.dataset.scrollRestored === 'true') return;
  const selected = strip.querySelector<HTMLElement>('[aria-pressed="true"]');
  if (selected) {
    const item = selected.getBoundingClientRect();
    const bounds = strip.getBoundingClientRect();
    strip.scrollLeft += item.left - bounds.left - (bounds.width - item.width) / 2;
  }
  strip.dataset.scrollRestored = 'true';
}
