import { trHtml } from '../../i18n/index.ts';
/**
 * Legal Document Sub-Screen
 * 
 * Renders:
 * - Terms of Use (Draft)
 * - Privacy Policy (Draft)
 * - Health Disclaimer (Notice)
 */

import { 
  TERMS_OF_USE_DOC, 
  PRIVACY_POLICY_DOC, 
  HEALTH_DISCLAIMER_DOC, 
  type LegalDocument 
} from '../../data/appConfig';

export function renderLegalDocumentScreen(docType: 'terms_of_use' | 'privacy_policy' | 'health_disclaimer'): string {
  let doc: LegalDocument = TERMS_OF_USE_DOC;
  if (docType === 'privacy_policy') {
    doc = PRIVACY_POLICY_DOC;
  } else if (docType === 'health_disclaimer') {
    doc = HEALTH_DISCLAIMER_DOC;
  }

  return `
    <div class="flex flex-col min-h-screen pb-16 bg-surface dark:bg-dark-surface transition-colors animate-fade-in">
      
      <!-- App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <button 
            type="button" 
            onclick="window.goBackFromProfileSubpage()" 
            aria-label="${trHtml("Back to Profile")}"
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">${doc.title}</h1>
        </div>

        ${doc.status === 'draft' ? `
          <span class="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wider border border-amber-500/20">
            ${trHtml("Draft")}
          </span>
        ` : ''}
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Status / Summary Card -->
        <div class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 shadow-ambient flex flex-col gap-1.5">
          <div class="flex items-center justify-between">
            <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              ${trHtml("Document Status")}
            </span>
            <span class="text-[11px] text-on-surface-variant dark:text-gray-400">
              ${trHtml("Updated:")} ${trHtml(doc.lastUpdated)}
            </span>
          </div>
          <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
            ${doc.summary}
          </p>
        </div>

        <!-- Document Sections -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-4">
          ${doc.sections.map(s => `
            <div class="flex flex-col gap-1.5 border-b border-outline-variant/15 pb-3 last:border-b-0 last:pb-0">
              <h2 class="font-heading font-bold text-xs text-on-surface dark:text-white">
                ${s.title}
              </h2>
              <p class="text-xs text-on-surface-variant dark:text-gray-300 leading-relaxed">
                ${s.content}
              </p>
            </div>
          `).join('')}
        </div>

      </main>

    </div>
  `;
}
