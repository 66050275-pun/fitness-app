import { trHtml, translatedLabel } from '../../i18n/index.ts';
import { findExerciseArtwork } from '../../data/exerciseArtwork';
import { escapeHtml } from '../../utils/sanitize';
import { exerciseImageUrl } from '../../utils/exerciseImageUrl.ts';

/** Local, unchanged artwork loads lazily from this app; no third-party image service is contacted. */
export function renderExerciseIllustration(name: string, compact = false): string {
  const artwork = findExerciseArtwork(name);
  if (!artwork) return ''; // Custom exercise names never get an unrelated stock image.
  if (compact) {
    return `<span class="exercise-art-thumbnail" aria-hidden="true"><img src="${escapeHtml(exerciseImageUrl(artwork.frames[0]))}" alt="" width="512" height="512" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="material-symbols-outlined" hidden>fitness_center</span></span>`;
  }
  return `<figure class="exercise-art" aria-label="${trHtml('Illustrations for {0}', translatedLabel(name))}">
    <div class="exercise-art-frames">
      ${artwork.frames.map((src, index) => `<div><img src="${escapeHtml(exerciseImageUrl(src))}" alt="${trHtml('Illustration of {0}, pose {1}', translatedLabel(name), index + 1)}" width="512" height="512" loading="lazy" decoding="async" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="exercise-art-unavailable" hidden>${trHtml('Illustration unavailable')}</span><span>${trHtml("Pose")} ${index + 1}</span></div>`).join('')}
    </div>
    <figcaption class="exercise-art-credit">
      ${artwork.note ? `<span class="block mb-1">${trHtml(artwork.note)}</span>` : ''}
      <a href="${escapeHtml(artwork.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(artwork.credit)}</a>
      · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
    </figcaption>
  </figure>`;
}
