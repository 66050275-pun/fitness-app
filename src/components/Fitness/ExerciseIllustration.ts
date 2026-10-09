import { findExerciseArtwork } from '../../data/exerciseArtwork';
import { escapeHtml } from '../../utils/sanitize';

/** Images are bundled data URLs, including inside Streamlit; no image service receives a request. */
export function renderExerciseIllustration(name: string, compact = false): string {
  const artwork = findExerciseArtwork(name);
  if (!artwork) return ''; // Custom exercise names never get an unrelated stock image.
  if (compact) {
    return `<span class="exercise-art-thumbnail" aria-hidden="true"><img src="${artwork.frames[0]}" alt="" width="512" height="512" loading="lazy" decoding="async"></span>`;
  }
  return `<figure class="exercise-art" aria-label="${escapeHtml(name)} illustrations">
    <div class="exercise-art-frames">
      ${artwork.frames.map((src, index) => `<div><img src="${src}" alt="${escapeHtml(name)} — pose ${index + 1}" width="512" height="512" loading="lazy" decoding="async"><span>Pose ${index + 1}</span></div>`).join('')}
    </div>
    <figcaption class="exercise-art-credit">
      ${artwork.note ? `<span class="block mb-1">${escapeHtml(artwork.note)}</span>` : ''}
      <a href="${escapeHtml(artwork.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(artwork.credit)}</a>
      · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 4.0</a>
    </figcaption>
  </figure>`;
}
