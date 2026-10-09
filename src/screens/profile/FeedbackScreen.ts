/**
 * Send Feedback & Suggest a Feature Sub-Screen
 * 
 * Manages:
 * - Category selector (Bug, Feature request, Design, Data issue, Other)
 * - Subject, Description, Contact email
 * - Diagnostic info consent
 * - Honest unconnected status (no fake submission)
 * - Local draft persistence in localStorage
 */

import { escapeHtml } from '../../utils/sanitize';

export function renderFeedbackScreen(defaultCategory: string = 'Bug'): string {
  let savedDraft = { category: defaultCategory, subject: '', description: '', email: '', diagnostics: false };
  try {
    const raw = localStorage.getItem('nutriai_feedback_draft');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        savedDraft = { ...savedDraft, ...parsed };
      }
    }
  } catch {}

  const categories = [
    'Bug Report',
    'Feature Request',
    'Design Feedback',
    'Nutritional Data Issue',
    'Other'
  ];

  return `
    <div class="flex flex-col min-h-screen pb-16 bg-surface dark:bg-dark-surface transition-colors animate-fade-in">
      
      <!-- App Bar -->
      <header class="sticky top-0 z-40 bg-surface/90 dark:bg-dark-surface/90 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20">
        <div class="flex items-center gap-2">
          <button 
            type="button" 
            onclick="window.goBackFromProfileSubpage()" 
            aria-label="Back to Profile"
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">
            ${defaultCategory === 'Feature Request' ? 'Suggest a Feature' : 'Send Feedback'}
          </h1>
        </div>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Honest Status Notice -->
        <div class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 flex items-start gap-3 shadow-ambient">
          <span class="material-symbols-outlined text-[20px] text-primary shrink-0 mt-0.5">mark_email_read</span>
          <div>
            <span class="font-heading font-bold text-xs text-on-surface dark:text-white block">
              Feedback Service Notice
            </span>
            <p class="text-xs text-on-surface-variant dark:text-gray-300 mt-0.5 leading-relaxed">
              Feedback submission is not connected yet in this offline build. Your draft is automatically saved locally on this device, and you can copy the text below.
            </p>
          </div>
        </div>

        <!-- Form Card -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-4">
          
          <!-- Category -->
          <div>
            <label for="feedback-category-input" class="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-1">
              Category
            </label>
            <select 
              id="feedback-category-input"
              onchange="window.saveFeedbackDraft()"
              class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:border-primary focus:outline-none"
            >
              ${categories.map(cat => `
                <option value="${cat}" ${savedDraft.category === cat ? 'selected' : ''}>${cat}</option>
              `).join('')}
            </select>
          </div>

          <!-- Subject -->
          <div>
            <label for="feedback-subject-input" class="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-1">
              Subject
            </label>
            <input 
              type="text" 
              id="feedback-subject-input"
              value="${escapeHtml(savedDraft.subject)}"
              placeholder="Brief summary of your feedback"
              oninput="window.saveFeedbackDraft()"
              maxlength="100"
              class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-medium text-on-surface dark:text-white focus:border-primary focus:outline-none"
            />
          </div>

          <!-- Description -->
          <div>
            <label for="feedback-description-input" class="block text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-1">
              Details
            </label>
            <textarea 
              id="feedback-description-input"
              rows="4"
              placeholder="What happened or what would you like to see improved?"
              oninput="window.saveFeedbackDraft()"
              class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs text-on-surface dark:text-white focus:border-primary focus:outline-none resize-none leading-relaxed"
            >${escapeHtml(savedDraft.description)}</textarea>
          </div>

          <!-- Optional Email -->
          <div>
            <div class="flex items-center justify-between mb-1">
              <label for="feedback-email-input" class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                Contact Email
              </label>
              <span class="text-[10px] text-on-surface-variant/70 dark:text-gray-500">Optional</span>
            </div>
            <input 
              type="email" 
              id="feedback-email-input"
              value="${escapeHtml(savedDraft.email)}"
              placeholder="your.email@example.com"
              oninput="window.saveFeedbackDraft()"
              class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs text-on-surface dark:text-white focus:border-primary focus:outline-none"
            />
          </div>

          <!-- Diagnostic Info Toggle -->
          <div class="flex items-center justify-between py-1 border-t border-outline-variant/20 pt-2.5">
            <div>
              <span class="text-xs font-semibold text-on-surface dark:text-gray-200 block">Include Anonymous Diagnostics</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">App version & device platform info</span>
            </div>

            <button 
              type="button"
              onclick="window.toggleFeedbackDiagnostics()"
              class="w-12 h-7 rounded-full transition-colors p-1 flex items-center ${savedDraft.diagnostics ? 'bg-primary justify-end' : 'bg-gray-300 dark:bg-gray-700 justify-start'}"
            >
              <div class="w-5 h-5 rounded-full bg-white shadow-sm"></div>
            </button>
            <input type="hidden" id="feedback-diagnostics-input" value="${savedDraft.diagnostics ? 'true' : 'false'}" />
          </div>

        </div>

        <!-- Action Buttons -->
        <div class="flex flex-col gap-2">
          <button 
            type="button" 
            onclick="window.copyFeedbackText()"
            class="w-full py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:brightness-105 active:scale-95 transition-all text-center flex items-center justify-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">content_copy</span>
            <span>Copy Message to Clipboard</span>
          </button>

          <button 
            type="button" 
            onclick="window.clearFeedbackDraft()"
            class="w-full py-2.5 rounded-xl border border-outline-variant/40 text-on-surface-variant dark:text-gray-400 text-xs font-bold hover:bg-surface-container transition-colors text-center"
          >
            Clear Draft
          </button>
        </div>

      </main>

    </div>
  `;
}
