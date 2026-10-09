/**
 * Weight History Sub-Screen
 * 
 * Manages:
 * - Current weight display & unit switcher (kg / lb)
 * - Authentic SVG weight trend chart (actual data points only)
 * - Chronological list of recorded weight entries (newest to oldest)
 * - Add, Edit, and Delete weight actions with modal confirmation
 * - Strict empty state (no simulated or mock history)
 */

import { store } from '../../store/appState';
import { formatWeight, kgToLb } from '../../utils/unitConversions';
import { escapeHtml } from '../../utils/sanitize';

export function renderWeightHistoryScreen(): string {
  const state = store.getState();
  const history = state.weightHistory || [];
  const unit = state.userPreferences?.weightUnit || 'kg';
  const currentKg = state.userProfile?.currentWeightKg || (history.length > 0 ? history[0].weightKg : null);

  // Generate SVG trend chart if at least 2 points exist
  let chartHtml = '';
  if (history.length >= 2) {
    // Reverse for chronological left-to-right plotting
    const chronological = [...history].reverse();
    const weights = chronological.map(e => unit === 'lb' ? kgToLb(e.weightKg) : e.weightKg);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);
    const range = (maxW - minW) || 1;

    const width = 340;
    const height = 120;
    const padding = 16;
    const plotW = width - (padding * 2);
    const plotH = height - (padding * 2);

    const points = weights.map((w, idx) => {
      const x = padding + (idx / (weights.length - 1)) * plotW;
      const y = height - padding - ((w - minW) / range) * plotH;
      return { x, y, weight: w };
    });

    const pathData = points.reduce((acc, pt, idx) => {
      return `${acc} ${idx === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');

    chartHtml = `
      <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-2">
        <div class="flex items-center justify-between text-xs">
          <span class="font-heading font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Weight Trend</span>
          <span class="text-[11px] text-on-surface-variant dark:text-gray-400">Range: ${minW.toFixed(1)} - ${maxW.toFixed(1)} ${unit}</span>
        </div>

        <div class="w-full overflow-hidden flex items-center justify-center pt-2">
          <svg viewBox="0 0 ${width} ${height}" class="w-full h-28 text-primary overflow-visible">
            <!-- Background Grid lines -->
            <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="currentColor" stroke-dasharray="2,2" class="opacity-15" />
            <line x1="${padding}" y1="${height / 2}" x2="${width - padding}" y2="${height / 2}" stroke="currentColor" stroke-dasharray="2,2" class="opacity-15" />
            <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="currentColor" stroke-dasharray="2,2" class="opacity-15" />
            
            <!-- Trend Line -->
            <path d="${pathData}" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-primary" />

            <!-- Point Dots -->
            ${points.map(pt => `
              <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="4" fill="currentColor" class="text-primary" />
              <circle cx="${pt.x.toFixed(1)}" cy="${pt.y.toFixed(1)}" r="2" fill="white" />
            `).join('')}
          </svg>
        </div>
      </div>
    `;
  }

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
          <h1 class="font-heading font-bold text-base text-on-surface dark:text-white">Weight History</h1>
        </div>

        <button 
          type="button" 
          onclick="window.openWeightModal()"
          class="px-3.5 py-1.5 rounded-full bg-primary text-white text-xs font-bold shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-[16px]">add</span>
          <span>Log Weight</span>
        </button>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">

        <!-- Current Weight & Unit Toggle Banner -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex items-center justify-between">
          <div>
            <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 block">
              Current Weight
            </span>
            <span class="font-heading font-extrabold text-2xl text-on-surface dark:text-white block mt-0.5">
              ${formatWeight(currentKg, unit)}
            </span>
          </div>

          <!-- Unit Selector Switch -->
          <div class="flex rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 p-1">
            <button 
              type="button"
              onclick="window.toggleWeightDisplayUnit('kg')"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${unit === 'kg' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
            >
              kg
            </button>
            <button 
              type="button"
              onclick="window.toggleWeightDisplayUnit('lb')"
              class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${unit === 'lb' ? 'bg-primary text-white shadow-xs' : 'text-on-surface-variant hover:text-on-surface'}"
            >
              lb
            </button>
          </div>
        </div>

        <!-- Trend Chart Section -->
        ${chartHtml}

        <!-- Entries Timeline Section -->
        <div class="flex flex-col gap-2.5">
          <div class="flex items-center justify-between px-1">
            <h2 class="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
              Recorded Entries (${history.length})
            </h2>
          </div>

          ${history.length === 0 ? `
            <!-- Authentic Empty State -->
            <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-8 border border-outline-variant/30 text-center flex flex-col items-center justify-center gap-3">
              <div class="w-12 h-12 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant flex items-center justify-center">
                <span class="material-symbols-outlined text-[28px]">monitoring</span>
              </div>
              <div>
                <h3 class="font-heading font-bold text-sm text-on-surface dark:text-white">
                  No weight entries recorded yet
                </h3>
                <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-1 max-w-xs leading-relaxed">
                  Track your body weight progress over time by adding your measurements.
                </p>
              </div>
              <button 
                type="button" 
                onclick="window.openWeightModal()"
                class="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:brightness-105 active:scale-95 transition-all mt-1"
              >
                Add First Weight Entry
              </button>
            </div>
          ` : `
            <!-- Weight Entries List -->
            <div class="flex flex-col gap-2">
              ${history.map(entry => {
                const displayVal = unit === 'lb' ? kgToLb(entry.weightKg) : entry.weightKg;

                return `
                  <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 flex items-center justify-between shadow-ambient hover:border-primary/40 transition-colors">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-primary dark:text-primary-container font-extrabold text-xs">
                        <span class="material-symbols-outlined text-[20px]">monitor_weight</span>
                      </div>
                      <div>
                        <div class="flex items-baseline gap-1">
                          <span class="font-heading font-extrabold text-sm text-on-surface dark:text-white">
                            ${displayVal}
                          </span>
                          <span class="text-[11px] font-bold text-on-surface-variant dark:text-gray-400">
                            ${unit}
                          </span>
                        </div>
                        <div class="flex items-center gap-1.5 text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">
                          <span>${entry.date}</span>
                          <span>&bull;</span>
                          <span>${entry.time}</span>
                          ${entry.note ? `<span>&bull;</span> <span class="italic truncate max-w-[120px]">${escapeHtml(entry.note)}</span>` : ''}
                        </div>
                      </div>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center gap-1">
                      <button 
                        type="button" 
                        onclick="window.editWeightEntry('${entry.id}')"
                        aria-label="Edit entry"
                        class="w-8 h-8 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container flex items-center justify-center transition-colors"
                      >
                        <span class="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button 
                        type="button" 
                        onclick="window.confirmDeleteWeightEntry('${entry.id}')"
                        aria-label="Delete entry"
                        class="w-8 h-8 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 flex items-center justify-center transition-colors"
                      >
                        <span class="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </main>

    </div>
  `;
}
