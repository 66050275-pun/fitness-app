import { htmlJsArg } from '../../utils/sanitize.ts';
/**
 * Full-height / Slide-up Sheet: View All Nutrients Modal
 * 
 * Features:
 * - Tabs / Category filter: All | Vitamins | Minerals | Other Nutrients
 * - Search filter input for rapid lookup
 * - Expandable / collapsible sections
 * - Progress bar with accessible aria-label, clamped at 100% width, displaying real % (e.g. 145%)
 * - Explicit distinction between minimum targets, maximum limits, and informational nutrients
 * - Unavailable nutrients section collapsed by default
 * - Prominent demo notice: "Sample nutrient data for UI preview. Analysis API is not connected yet."
 */

import { store } from '../../store/appState';
import { getNutrientReference } from '../../data/nutrientReferenceValues';
import type { NutrientValue } from '../../types/index.ts';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function renderNutrientDetailModal(): string {
  const state = store.getState();
  const modalData = store.getActiveNutrientModalData();
  if (!modalData) return '';

  const activeCategory = state.nutrientModalCategoryFilter;
  const profile = modalData.profile;
  const isDemo = modalData.sourceBadge.includes('DEMO');

  const vitamins = profile?.vitamins || [];
  const minerals = profile?.minerals || [];
  const otherNutrients = profile?.otherNutrients || [];

  return `
    <div 
      id="nutrient-detail-modal-backdrop"
      onclick="if(event.target === this) window.closeNutrientModal()"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nutrient-modal-title"
    >
      <div 
        class="w-full max-w-lg mx-auto bg-surface dark:bg-dark-surface rounded-t-3xl border-t border-outline-variant/30 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-slide-up"
      >
        <!-- Drag Handle & Header -->
        <div class="px-5 pt-3 pb-2.5 border-b border-outline-variant/20 flex flex-col gap-2 shrink-0 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md">
          <div class="w-12 h-1.5 rounded-full bg-outline-variant/40 mx-auto"></div>
          
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-2">
                <h2 id="nutrient-modal-title" class="font-heading font-bold text-base text-on-surface dark:text-white leading-tight">
                  ${escapeHtml(modalData.title)}
                </h2>
                <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider uppercase border ${
                  isDemo 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' 
                    : 'bg-primary/10 text-primary dark:text-primary-container border-primary/20'
                }">
                  ${escapeHtml(modalData.sourceBadge)}
                </span>
              </div>
              <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5">
                ${escapeHtml(modalData.subtitle)}
              </p>
            </div>

            <button 
              type="button" 
              onclick="window.closeNutrientModal()" 
              aria-label="Close Nutrients Sheet"
              class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
            >
              <span class="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <!-- Demo Disclaimer Notice -->
          ${isDemo ? `
            <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
              <span class="material-symbols-outlined text-[16px] shrink-0 mt-0.5">info</span>
              <span>Sample nutrient data for UI preview. Analysis API is not connected yet.</span>
            </div>
          ` : ''}

          <!-- Search & Filter Bar -->
          <div class="relative mt-1">
            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">search</span>
            <input 
              type="text" 
              id="nutrient-modal-search"
              placeholder="Search vitamins, minerals, fiber..."
              oninput="window.filterNutrientList(this.value)"
              class="w-full pl-9 pr-8 py-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs text-on-surface dark:text-white placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button 
              type="button"
              onclick="const inp = document.getElementById('nutrient-modal-search'); if(inp){ inp.value = ''; window.filterNutrientList(''); }"
              class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant hover:text-on-surface"
            >
              close
            </button>
          </div>

          <!-- Category Filter Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
            ${(['all', 'vitamins', 'minerals', 'other'] as const).map(cat => {
              const isActive = activeCategory === cat;
              const label = cat === 'all' ? 'All' : cat === 'vitamins' ? 'Vitamins' : cat === 'minerals' ? 'Minerals' : 'Other Nutrients';
              return `
                <button 
                  type="button"
                  onclick="window.setNutrientCategoryFilter(${htmlJsArg(cat)})"
                  class="px-3 py-1 rounded-full text-[11px] font-bold whitespace-nowrap transition-all border ${
                    isActive 
                      ? 'bg-primary text-white border-primary shadow-xs' 
                      : 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant border-outline-variant/30 hover:border-primary/40'
                  }"
                >
                  ${label}
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Scrollable Content Canvas -->
        <div id="nutrient-modal-scroll-container" class="px-5 py-4 overflow-y-auto flex flex-col gap-4">
          
          <!-- Macronutrients Section (if calories or macros available) -->
          ${(activeCategory === 'all' && (modalData.calories !== undefined || modalData.protein !== undefined)) ? `
            <section class="nutrient-section flex flex-col gap-2">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                  Core Energy &amp; Macronutrients
                </span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">Primary Fuel</span>
              </div>
              <div class="grid grid-cols-4 gap-2">
                <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high text-center">
                  <span class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400 block uppercase">Energy</span>
                  <span class="font-heading font-extrabold text-sm text-primary dark:text-primary-container">${modalData.calories || 0} kcal</span>
                </div>
                <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high text-center">
                  <span class="text-[10px] font-bold text-primary dark:text-primary-container block uppercase">Protein</span>
                  <span class="font-heading font-extrabold text-sm text-on-surface dark:text-white">${modalData.protein || 0}g</span>
                </div>
                <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high text-center">
                  <span class="text-[10px] font-bold text-tertiary dark:text-tertiary-fixed block uppercase">Carbs</span>
                  <span class="font-heading font-extrabold text-sm text-on-surface dark:text-white">${modalData.carbs || 0}g</span>
                </div>
                <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high text-center">
                  <span class="text-[10px] font-bold text-amber-500 block uppercase">Fat</span>
                  <span class="font-heading font-extrabold text-sm text-on-surface dark:text-white">${modalData.fat || 0}g</span>
                </div>
              </div>
            </section>
          ` : ''}

          <!-- Vitamins Category -->
          ${(activeCategory === 'all' || activeCategory === 'vitamins') ? renderNutrientCategoryBlock('Vitamins', vitamins) : ''}

          <!-- Minerals Category -->
          ${(activeCategory === 'all' || activeCategory === 'minerals') ? renderNutrientCategoryBlock('Minerals & Trace Elements', minerals) : ''}

          <!-- Other Nutrients Category -->
          ${(activeCategory === 'all' || activeCategory === 'other') ? renderNutrientCategoryBlock('Other Nutrients & Lipids', otherNutrients) : ''}

          <!-- Unavailable Nutrients Collapsible -->
          ${renderUnavailableNutrientsBlock(profile)}

        </div>

        <!-- Footer Dismiss Button -->
        <div class="p-4 border-t border-outline-variant/20 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md">
          <button 
            type="button" 
            onclick="window.closeNutrientModal()" 
            class="w-full py-3 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface dark:text-white font-heading font-bold text-xs border border-outline-variant/30 active:scale-95 transition-all shadow-sm"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  `;
}

function renderNutrientCategoryBlock(title: string, list: NutrientValue[]): string {
  const available = list.filter(n => n.amount !== null && !isNaN(n.amount));
  if (available.length === 0) return '';

  return `
    <section class="nutrient-category-block flex flex-col gap-2">
      <div class="flex items-center justify-between">
        <h3 class="font-heading font-bold text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
          ${title} (${available.length})
        </h3>
        <span class="text-[10px] text-on-surface-variant dark:text-gray-400">Per Serving</span>
      </div>

      <div class="flex flex-col gap-1.5">
        ${available.map(n => renderNutrientRow(n)).join('')}
      </div>
    </section>
  `;
}

function renderNutrientRow(item: NutrientValue): string {
  const config = getNutrientReference(item.key);
  const safeName = escapeHtml(item.name);
  const amountStr = item.amount !== null ? `${item.amount} ${item.unit}` : 'Not available';
  const dv = item.dailyValuePercent;
  const isMaxLimit = config?.direction === 'maximum_limit';
  const hasDV = config?.hasDailyValuePercent ?? (dv !== null && dv !== undefined);

  // Bar progress: visually clamped to 100%, but text shows real value
  const progressWidth = dv !== null && dv !== undefined ? Math.min(100, Math.max(0, dv)) : 0;
  
  // Status badge styling
  let statusBadgeHtml = '';
  if (isMaxLimit && dv !== null && dv !== undefined) {
    if (dv > 100) {
      statusBadgeHtml = `<span class="px-1.5 py-0.2 rounded-full bg-error/10 text-error text-[9px] font-extrabold">Above Limit</span>`;
    } else if (dv >= 80) {
      statusBadgeHtml = `<span class="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold">Near Limit</span>`;
    }
  }

  return `
    <div class="nutrient-row p-3 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 shadow-xs flex flex-col gap-1.5" data-nutrient-name="${safeName.toLowerCase()}">
      <div class="flex items-start justify-between">
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-heading font-bold text-xs text-on-surface dark:text-white">${safeName}</span>
            ${statusBadgeHtml}
          </div>
          <span class="text-[11px] font-extrabold text-primary dark:text-primary-container mt-0.5 block">${amountStr}</span>
        </div>

        <div class="text-right">
          ${hasDV && dv !== null && dv !== undefined ? `
            <span class="font-heading font-extrabold text-xs text-on-surface dark:text-white">${dv}% DV</span>
            <span class="text-[9px] text-on-surface-variant dark:text-gray-400 block">${isMaxLimit ? 'Max Daily Ref' : 'Daily Value'}</span>
          ` : `
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 font-semibold italic">Informational</span>
          `}
        </div>
      </div>

      <!-- Accessible Progress Bar -->
      ${hasDV && dv !== null && dv !== undefined ? `
        <div 
          class="w-full h-1.5 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high overflow-hidden" 
          role="progressbar" 
          aria-valuenow="${dv}" 
          aria-valuemin="0" 
          aria-valuemax="100"
          aria-label="${safeName} ${dv} percent of daily reference"
        >
          <div 
            class="h-full rounded-full transition-all duration-500 ${
              isMaxLimit && dv > 100 
                ? 'bg-error' 
                : isMaxLimit && dv >= 80 
                  ? 'bg-amber-500' 
                  : dv >= 100 
                    ? 'bg-gradient-to-r from-primary to-[#27C4B2]' 
                    : 'bg-primary'
            }"
            style="width: ${progressWidth}%;"
          ></div>
        </div>
      ` : ''}
    </div>
  `;
}

function renderUnavailableNutrientsBlock(profile: any): string {
  if (!profile) return '';
  const allList: NutrientValue[] = [
    ...(profile.vitamins || []),
    ...(profile.minerals || []),
    ...(profile.otherNutrients || [])
  ];

  const unavail = allList.filter(n => n.amount === null);
  if (unavail.length === 0) return '';

  return `
    <details class="group mt-2 border border-outline-variant/20 rounded-2xl bg-surface-container-low/50 dark:bg-dark-surface-card/50 overflow-hidden">
      <summary class="p-3 cursor-pointer select-none text-[11px] font-bold text-on-surface-variant flex items-center justify-between hover:text-on-surface">
        <div class="flex items-center gap-1.5">
          <span class="material-symbols-outlined text-[16px]">help_outline</span>
          <span>Unavailable / Unreported Nutrients (${unavail.length})</span>
        </div>
        <span class="material-symbols-outlined text-[18px] group-open:rotate-180 transition-transform">expand_more</span>
      </summary>

      <div class="px-3.5 pb-3 pt-1 flex flex-wrap gap-1.5 border-t border-outline-variant/20">
        ${unavail.map(n => `
          <span class="px-2 py-0.5 rounded-lg bg-surface-container dark:bg-dark-surface-card-high text-[10px] text-on-surface-variant font-medium">
            ${escapeHtml(n.name)}: Not available
          </span>
        `).join('')}
      </div>
    </details>
  `;
}
