/**
 * Profile Menu Section Component
 * 
 * Renders a grouped menu card section with a clear uppercase heading.
 */

export interface ProfileMenuSectionOptions {
  id?: string;
  title: string;
  rowsHtml: string;
  description?: string;
}

export function renderProfileMenuSection(options: ProfileMenuSectionOptions): string {
  const { id, title, rowsHtml, description } = options;

  return `
    <section ${id ? `id="${id}"` : ''} class="flex flex-col gap-2">
      <!-- Section Heading -->
      <div class="px-1 flex flex-col">
        <h2 class="font-heading text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
          ${title}
        </h2>
        ${description ? `
          <p class="text-[11px] text-on-surface-variant/80 dark:text-gray-500 mt-0.5">
            ${description}
          </p>
        ` : ''}
      </div>

      <!-- Grouped Menu Card -->
      <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl border border-outline-variant/30 divide-y divide-outline-variant/20 overflow-hidden shadow-ambient">
        ${rowsHtml}
      </div>
    </section>
  `;
}
