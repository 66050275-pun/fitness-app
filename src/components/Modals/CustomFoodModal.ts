import { tr, trHtml, translatedLabel } from '../../i18n/index.ts';
/**
 * Custom Food Creator & Editor 4-Step Wizard Modal
 * 
 * 4-Step Structure:
 * - Step 1: Basic Info (Name, Brand, Category Dropdown, Barcode, Duplicate Warning)
 * - Step 2: Nutrition Basis (Per 100g, Per 100ml, Per Serving)
 * - Step 3: Nutrition (Macros + Optional Collapsible Micronutrients, no blank green card)
 * - Step 4: Portions & Review (Portion Mappings + Review Summary + Save)
 * 
 * Rules:
 * 1. Clean 4-step progress indicator ("Step X of 4", checkmark for completed, primary for active).
 * 2. Back button never loses entered data.
 * 3. Empty numeric inputs store as null (not 0) to distinguish missing from zero.
 * 4. In-UI discard confirmation dialog when closing dirty drafts.
 * 5. Saves food to customFoods and immediately opens Set Portion modal.
 */

import { store } from '../../store/appState';
import { htmlJsArg, escapeHtml } from '../../utils/sanitize';
import { FOOD_CATEGORIES, getCategoryLabel } from '../../data/foodCategories';
import { 
  calculateCaloriesFromMacros, 
  checkCalorieConsistency, 
  getCalorieSourceLabel, 
  areMacrosCompleteAndValid,
  type MacroValues 
} from '../../utils/calorieCalculations';

export function renderCustomFoodModal(): string {
  const state = store.getState();
  if (!state.isCustomFoodModalOpen) {
    return '';
  }

  const isEditing = !!state.editingCustomFoodId;
  const currentStep = state.customFoodStep;
  const draft = state.customFoodDraft;
  const errors = state.customFoodValidationErrors;
  const isSaving = state.customFoodIsSaving;
  const showDiscardConfirm = state.customFoodShowDiscardConfirm;
  const dupWarning = state.customFoodDuplicateWarning;

  const stepTitles = [
    'Basic Info',
    'Nutrition Basis',
    'Nutrition',
    'Portions & Review'
  ];

  return `
    <div id="custom-food-modal-backdrop" class="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-fade-in">
      <div 
        class="w-full max-w-lg max-h-[92vh] flex flex-col bg-surface-container-lowest dark:bg-dark-surface-card rounded-t-[28px] border-t border-outline-variant/30 shadow-modal overflow-hidden animate-slide-up relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-food-modal-title"
      >
        <!-- In-UI Discard Confirmation Dialog -->
        ${showDiscardConfirm ? `
          <div class="absolute inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-5 animate-fade-in">
            <div class="w-full max-w-sm bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-2xl flex flex-col gap-3 animate-scale-in">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
                  <span class="material-symbols-outlined text-[24px]">warning</span>
                </div>
                <div>
                  <h3 class="font-heading font-extrabold text-sm text-on-surface dark:text-white">${trHtml("Discard Changes?")}</h3>
                  <p class="text-xs text-on-surface-variant dark:text-gray-400 mt-0.5">
                    ${trHtml("You have unsaved changes. Leaving now will discard your custom food draft.")}
                  </p>
                </div>
              </div>

              <div class="flex items-center gap-2.5 pt-2">
                <button 
                  type="button" 
                  onclick="window.cancelDiscardCustomFood()"
                  class="flex-1 py-2.5 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface dark:text-white hover:bg-surface-container-low transition-colors"
                >
                  ${trHtml("Keep Editing")}
                </button>
                <button 
                  type="button" 
                  onclick="window.confirmDiscardCustomFood()"
                  class="flex-1 py-2.5 rounded-xl bg-error text-white text-xs font-bold shadow-xs hover:brightness-105 transition-all"
                >
                  ${trHtml("Discard")}
                </button>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- Sheet Drag Handle -->
        <div class="pt-3 pb-1 flex justify-center">
          <div class="w-10 h-1 rounded-full bg-outline-variant/40"></div>
        </div>

        <!-- Header -->
        <div class="px-5 py-3 flex items-center justify-between border-b border-outline-variant/20">
          <div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] font-extrabold uppercase tracking-widest text-primary dark:text-primary-container">
                ${trHtml("Step")} ${currentStep} ${trHtml("of 4 •")} ${trHtml(stepTitles[currentStep - 1])}
              </span>
              ${isEditing ? `
                <span class="px-1.5 py-0.5 rounded-md bg-secondary/15 text-secondary text-[9px] font-extrabold uppercase">
                  ${trHtml("Edit Mode")}
                </span>
              ` : ''}
            </div>
            <h2 id="custom-food-modal-title" class="font-heading font-extrabold text-base text-on-surface dark:text-white mt-0.5">
              ${isEditing ? tr("Edit Custom Food") : tr("Create Custom Food")}
            </h2>
          </div>

          <button 
            type="button" 
            onclick="window.closeCustomFoodModal()" 
            aria-label="${trHtml("Close")}"
            class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span class="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <!-- 4-Step Progress Indicator -->
        <div class="px-5 pt-3 pb-2 bg-surface-container-lowest dark:bg-dark-surface-card border-b border-outline-variant/15">
          <div class="grid grid-cols-4 gap-2">
            ${[1, 2, 3, 4].map(stepNum => {
              const isCompleted = stepNum < currentStep;
              const isActive = stepNum === currentStep;
              const labels = ['Basic', 'Basis', 'Nutrition', 'Review'];
              const label = labels[stepNum - 1];

              let badgeClasses = 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant border border-outline-variant/30';
              let textClasses = 'text-on-surface-variant dark:text-gray-400 font-medium';

              if (isActive) {
                badgeClasses = 'bg-primary text-white border-primary shadow-xs ring-2 ring-primary/20';
                textClasses = 'text-primary dark:text-primary-container font-extrabold';
              } else if (isCompleted) {
                badgeClasses = 'bg-primary/15 text-primary dark:text-primary-container border-primary/30';
                textClasses = 'text-on-surface dark:text-gray-200 font-bold';
              }

              return `
                <button 
                  type="button"
                  onclick="window.setCustomFoodStep(${stepNum})"
                  ${stepNum > currentStep ? '' : ''}
                  class="flex flex-col items-center gap-1 group focus:outline-none transition-all"
                  aria-label="${trHtml("Step")} ${stepNum}: ${trHtml(label)} ${isCompleted ? trHtml('(Completed)') : (isActive ? trHtml('(Current)') : '')}"
                >
                  <div class="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold transition-all ${badgeClasses}">
                    ${isCompleted ? '<span class="material-symbols-outlined text-[16px]">check</span>' : stepNum}
                  </div>
                  <span class="text-[10px] tracking-tight ${textClasses}">${trHtml(label)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Step Content (Scrollable Body) -->
        <div class="px-5 py-4 overflow-y-auto flex-1 flex flex-col gap-4">
          ${renderStepContent(currentStep, draft, errors, isEditing, dupWarning)}
        </div>

        <!-- Bottom Action Bar -->
        <div class="px-5 py-3 border-t border-outline-variant/20 bg-surface-container-lowest dark:bg-dark-surface-card flex items-center gap-2.5">
          ${currentStep > 1 ? `
            <button 
              type="button" 
              onclick="window.prevCustomFoodStep()" 
              class="flex-1 py-3 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface dark:text-white hover:bg-surface-container-low transition-colors flex items-center justify-center gap-1.5"
            >
              <span class="material-symbols-outlined text-[16px]">arrow_back</span>
              <span>${trHtml("Back")}</span>
            </button>
          ` : `
            <button 
              type="button" 
              onclick="window.closeCustomFoodModal()" 
              class="flex-1 py-3 rounded-xl border border-outline-variant/40 text-xs font-bold text-on-surface dark:text-white hover:bg-surface-container-low transition-colors"
            >
              ${trHtml("Cancel")}
            </button>
          `}

          ${currentStep < 4 ? `
            <button 
              type="button" 
              onclick="window.nextCustomFoodStep()" 
              class="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-ambient hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5"
            >
              <span>${trHtml("Continue")}</span>
              <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
            </button>
          ` : `
            <button 
              type="button" 
              onclick="window.saveCustomFoodDraft()" 
              ${isSaving ? 'disabled' : ''}
              class="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold shadow-ambient hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-1.5 ${isSaving ? 'opacity-60 cursor-not-allowed' : ''}"
            >
              <span class="material-symbols-outlined text-[16px]">${isSaving ? 'hourglass_empty' : 'check_circle'}</span>
              <span>${isSaving ? tr("Saving...") : (isEditing ? tr("Save Changes") : tr("Save Food"))}</span>
            </button>
          `}
        </div>

      </div>
    </div>
  `;
}

function renderStepContent(
  step: 1 | 2 | 3 | 4, 
  draft: ReturnType<typeof store.getState>['customFoodDraft'], 
  errors: Record<string, string>,
  isEditing: boolean,
  dupWarning: ReturnType<typeof store.getState>['customFoodDuplicateWarning']
): string {
  switch (step) {
    case 1:
      return renderStep1(draft, errors, dupWarning);
    case 2:
      return renderStep2(draft, errors);
    case 3:
      return renderStep3(draft, errors);
    case 4:
      return renderStep4(draft, errors, isEditing);
  }
}

/**
 * Step 1: Basic Information
 */
function renderStep1(
  draft: ReturnType<typeof store.getState>['customFoodDraft'],
  errors: Record<string, string>,
  dupWarning: ReturnType<typeof store.getState>['customFoodDuplicateWarning']
): string {
  return `
    <!-- Duplicate Warning Banner -->
    ${dupWarning ? `
      <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col gap-2 animate-fade-in">
        <div class="flex items-start gap-2.5">
          <span class="material-symbols-outlined text-[20px] text-amber-600 shrink-0 mt-0.5">warning</span>
          <div>
            <p class="font-bold text-on-surface dark:text-gray-200 leading-tight">${trHtml("Similar Food Found")}</p>
            <p class="text-on-surface-variant dark:text-gray-400 text-[11px] mt-0.5 leading-snug">
              ${escapeHtml(dupWarning.message)}
            </p>
          </div>
        </div>
        ${dupWarning.duplicateFood ? `
          <div class="flex items-center gap-2 pt-1">
            <button 
              type="button" 
              onclick="window.useExistingFoodFromDuplicate(${htmlJsArg(dupWarning.duplicateFood.id)})"
              class="px-3 py-1.5 rounded-xl bg-primary text-white text-[11px] font-bold shadow-xs hover:brightness-105 transition-all"
            >
              ${trHtml("Use Existing Food")}
            </button>
            <span class="text-[10px] text-on-surface-variant">${trHtml("or continue below")}</span>
          </div>
        ` : ''}
      </div>
    ` : ''}

    <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-3.5">
      <div>
        <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
          ${trHtml("General Details")}
        </span>
        <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">
          ${trHtml("Enter the essential identity of this food item.")}
        </p>
      </div>

      <!-- Food Name (Required) -->
      <div>
        <label for="cf-name" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
          ${trHtml("Food Name")} <span class="text-error">*</span>
        </label>
        <input 
          type="text" 
          id="cf-name"
          required
          value="${escapeHtml(draft.name)}"
          placeholder="${trHtml("e.g. Homemade Sourdough Loaf")}"
          oninput="window.updateCustomFoodDraftField('name', this.value)"
          class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border ${errors.name ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'} text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
        ${errors.name ? `
          <p class="text-error text-[11px] font-semibold mt-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[13px]">error</span>
            <span>${escapeHtml(translatedLabel(errors.name))}</span>
          </p>
        ` : ''}
      </div>

      <!-- Brand (Optional) -->
      <div>
        <label for="cf-brand" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
          ${trHtml("Brand")} <span class="text-on-surface-variant text-[10px] font-normal">${trHtml("(Optional)")}</span>
        </label>
        <input 
          type="text" 
          id="cf-brand"
          value="${escapeHtml(draft.brand)}"
          placeholder="${trHtml("e.g. Artisan Bakery or Homemade")}"
          oninput="window.updateCustomFoodDraftField('brand', this.value)"
          class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <!-- Food Category (Required Dropdown) -->
      <div>
        <label for="cf-category" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
          ${trHtml("Food Category")} <span class="text-error">*</span>
        </label>
        <div class="relative">
          <select 
            id="cf-category"
            required
            onchange="window.updateCustomFoodDraftField('category', this.value)"
            class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border ${errors.category ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'} text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer pr-9"
          >
            <option value="" disabled ${!draft.category ? 'selected' : ''}>${trHtml("Select category...")}</option>
            ${FOOD_CATEGORIES.map(cat => `
              <option value="${escapeHtml(cat.value)}" ${draft.category === cat.value ? 'selected' : ''}>
                ${cat.label}
              </option>
            `).join('')}
          </select>
          <span class="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-[18px]">
            arrow_drop_down
          </span>
        </div>
        ${errors.category ? `
          <p class="text-error text-[11px] font-semibold mt-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[13px]">error</span>
            <span>${escapeHtml(translatedLabel(errors.category))}</span>
          </p>
        ` : ''}
      </div>

      <!-- Barcode (Optional) -->
      <div>
        <label for="cf-barcode" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
          ${trHtml("Barcode / UPC")} <span class="text-on-surface-variant text-[10px] font-normal">${trHtml("(Optional)")}</span>
        </label>
        <input 
          type="text" 
          id="cf-barcode"
          value="${escapeHtml(draft.barcode)}"
          placeholder="${trHtml("e.g. 012345678905")}"
          oninput="window.updateCustomFoodDraftField('barcode', this.value)"
          class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border ${errors.barcode ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'} text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
        />
        ${errors.barcode ? `
          <p class="text-error text-[11px] font-semibold mt-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[13px]">error</span>
            <span>${escapeHtml(translatedLabel(errors.barcode))}</span>
          </p>
        ` : ''}
      </div>

    </div>
  `;
}

/**
 * Step 2: Nutrition Basis
 */
function renderStep2(
  draft: ReturnType<typeof store.getState>['customFoodDraft'],
  errors: Record<string, string>
): string {
  const basisType = draft.basisType;

  return `
    <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-3.5">
      <div>
        <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
          ${trHtml("Serving & Measurement Basis")}
        </span>
        <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">
          ${trHtml("Select what the nutritional values in Step 3 represent.")}
        </p>
      </div>

      <!-- Basis Options Radio Cards -->
      <div class="grid grid-cols-3 gap-2">
        <button 
          type="button"
          onclick="window.setCustomFoodBasisType('per_100g')"
          class="p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${basisType === 'per_100g' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-outline-variant/40 bg-surface-container-lowest dark:bg-dark-surface-card hover:border-outline-variant'}"
        >
          <div>
            <span class="font-heading font-extrabold text-xs text-on-surface dark:text-white block">${trHtml("Per 100 g")}</span>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block mt-0.5">${trHtml("Weight")}</span>
          </div>
          <span class="text-[9px] text-on-surface-variant dark:text-gray-400 mt-2 block leading-tight">${trHtml("Solids & ingredients")}</span>
        </button>

        <button 
          type="button"
          onclick="window.setCustomFoodBasisType('per_100ml')"
          class="p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${basisType === 'per_100ml' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-outline-variant/40 bg-surface-container-lowest dark:bg-dark-surface-card hover:border-outline-variant'}"
        >
          <div>
            <span class="font-heading font-extrabold text-xs text-on-surface dark:text-white block">${trHtml("Per 100 ml")}</span>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block mt-0.5">${trHtml("Volume")}</span>
          </div>
          <span class="text-[9px] text-on-surface-variant dark:text-gray-400 mt-2 block leading-tight">${trHtml("Liquids & beverages")}</span>
        </button>

        <button 
          type="button"
          onclick="window.setCustomFoodBasisType('per_serving')"
          class="p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${basisType === 'per_serving' ? 'border-primary bg-primary/10 ring-1 ring-primary' : 'border-outline-variant/40 bg-surface-container-lowest dark:bg-dark-surface-card hover:border-outline-variant'}"
        >
          <div>
            <span class="font-heading font-extrabold text-xs text-on-surface dark:text-white block">${trHtml("Per Serving")}</span>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block mt-0.5">${trHtml("Portion")}</span>
          </div>
          <span class="text-[9px] text-on-surface-variant dark:text-gray-400 mt-2 block leading-tight">${trHtml("Single slice, pack, etc.")}</span>
        </button>
      </div>

      <!-- Specific Fields when Per Serving is Selected -->
      ${basisType === 'per_serving' ? `
        <div class="p-3.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 flex flex-col gap-3 animate-fade-in">
          <div class="flex items-center gap-1.5">
            <span class="material-symbols-outlined text-[16px] text-primary">lunch_dining</span>
            <span class="text-[11px] font-bold text-on-surface dark:text-white">${trHtml("Define This Serving")}</span>
          </div>

          <!-- Serving Description (Required) -->
          <div>
            <label for="cf-serving-desc" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
              ${trHtml("Serving Description")} <span class="text-error">*</span>
            </label>
            <input 
              type="text" 
              id="cf-serving-desc"
              required
              value="${escapeHtml(draft.servingDescription)}"
              placeholder="${trHtml("e.g. 1 slice, 1 scoop, 1 prepared bowl")}"
              oninput="window.updateCustomFoodDraftField('servingDescription', this.value)"
              class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border ${errors.servingDescription ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'} text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
            ${errors.servingDescription ? `
              <p class="text-error text-[11px] font-semibold mt-1 flex items-center gap-1">
                <span class="material-symbols-outlined text-[13px]">error</span>
                <span>${escapeHtml(translatedLabel(errors.servingDescription))}</span>
              </p>
            ` : ''}
          </div>

          <!-- Quantity & Unit -->
          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label for="cf-serving-qty" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
                ${trHtml("Quantity")} <span class="text-error">*</span>
              </label>
              <input 
                type="number" 
                step="any"
                inputmode="decimal"
                id="cf-serving-qty"
                required
                value="${escapeHtml(draft.servingQuantity)}"
                oninput="window.updateCustomFoodDraftNumeric('servingQuantity', this.value)"
                class="w-full px-3.5 py-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border ${errors.servingQuantity ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'} text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              ${errors.servingQuantity ? `
                <p class="text-error text-[10px] font-semibold mt-1 leading-tight">${escapeHtml(translatedLabel(errors.servingQuantity))}</p>
              ` : ''}
            </div>

            <div>
              <label for="cf-serving-unit" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
                ${trHtml("Unit")} <span class="text-error">*</span>
              </label>
              <select 
                id="cf-serving-unit"
                onchange="window.updateCustomFoodDraftField('servingUnit', this.value)"
                class="w-full px-3 py-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary capitalize"
              >
                ${['serving', 'slice', 'scoop', 'piece', 'bowl', 'cup', 'tbsp', 'tsp', 'pack', 'bar', 'g', 'ml'].map(u => `
                  <option value="${escapeHtml(u)}" ${draft.servingUnit === u ? 'selected' : ''}>${trHtml(u)}</option>
                `).join('')}
              </select>
            </div>
          </div>

          <!-- Equivalent Base Amount (Optional) -->
          <div>
            <label for="cf-serving-equiv" class="text-[11px] font-semibold text-on-surface-variant dark:text-gray-400 block mb-1">
              ${trHtml("Equivalent Mass / Volume")} <span class="text-[10px] font-normal">${trHtml("(Optional)")}</span>
            </label>
            <div class="flex items-center gap-2">
              <input 
                type="number" 
                step="any"
                inputmode="decimal"
                id="cf-serving-equiv"
                value="${escapeHtml(draft.servingEquivalentAmount !== null ? draft.servingEquivalentAmount : '')}"
                placeholder="${trHtml("e.g. 35")}"
                oninput="window.updateCustomFoodDraftNumeric('servingEquivalentAmount', this.value)"
                class="flex-1 px-3.5 py-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span class="text-xs font-bold text-on-surface-variant px-2">${trHtml("grams (g)")}</span>
            </div>
            <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-1">
              ${trHtml("Provides auto-conversions when logged in grams.")}
            </p>
          </div>
        </div>
      ` : `
        <!-- Optional Serving Description for 100g / 100ml -->
        <div>
          <label for="cf-serving-desc-opt" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
            ${trHtml("Common Serving Description")} <span class="text-on-surface-variant text-[10px] font-normal">${trHtml("(Optional)")}</span>
          </label>
          <input 
            type="text" 
            id="cf-serving-desc-opt"
            value="${escapeHtml(draft.servingDescription)}"
            placeholder="${trHtml("e.g. 1 can (330ml) or 1 bar (45g)")}"
            oninput="window.updateCustomFoodDraftField('servingDescription', this.value)"
            class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      `}
    </div>
  `;
}

/**
 * Step 3: Nutrition
 */
function renderStep3(
  draft: ReturnType<typeof store.getState>['customFoodDraft'],
  errors: Record<string, string>
): string {
  const basisSummary = draft.basisType === 'per_100g' 
    ? tr("per 100 grams")
    : (draft.basisType === 'per_100ml' ? tr("per 100 milliliters") : tr("per {0}", draft.servingDescription || tr("1 serving")));

  const macros: MacroValues = {
    protein: draft.protein,
    carbs: draft.carbs,
    fat: draft.fat
  };

  const macrosComplete = areMacrosCompleteAndValid(macros);
  const breakdown = calculateCaloriesFromMacros(macros);
  const consistency = checkCalorieConsistency(draft.calories, macros);
  const sourceLabel = getCalorieSourceLabel(draft.calorieSource);
  const isStale = draft.calorieSource === 'calculated_from_macros' && !draft.caloriesSyncedWithMacros;
  const shouldWarn = consistency?.shouldWarn ?? false;

  return `
    <!-- Basis indicator reminder -->
    <div class="px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
      <span class="text-primary dark:text-primary-container font-bold">${trHtml("Nutrition Basis:")}</span>
      <span class="font-extrabold text-on-surface dark:text-white capitalize">${escapeHtml(basisSummary)}</span>
    </div>

    <!-- Macronutrients & Calories Section -->
    <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-3.5">
      <div>
        <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
          ${trHtml("Macronutrients & Energy")}
        </span>
        <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">
          ${trHtml("Enter Protein, Carbs, and Fat first, then calculate or verify calories.")}
        </p>
      </div>

      <!-- 1. Protein, Carbs, Fat Inputs -->
      <div class="grid grid-cols-3 gap-2.5">
        <!-- Protein -->
        <div>
          <label for="cf-protein" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
            ${trHtml("Protein (g)")} <span class="text-error">*</span>
          </label>
          <input 
            type="number" 
            step="any"
            inputmode="decimal"
            id="cf-protein"
            required
            value="${escapeHtml(draft.protein !== null ? draft.protein : '')}"
            placeholder="0"
            oninput="window.updateCustomFoodDraftNumeric('protein', this.value)"
            class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border ${errors.protein ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'} text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          ${errors.protein ? `
            <p class="text-error text-[10px] font-semibold mt-1 leading-tight flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[12px]">error</span>
              <span>${escapeHtml(translatedLabel(errors.protein))}</span>
            </p>
          ` : ''}
        </div>

        <!-- Carbs -->
        <div>
          <label for="cf-carbs" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
            ${trHtml("Carbs (g)")} <span class="text-error">*</span>
          </label>
          <input 
            type="number" 
            step="any"
            inputmode="decimal"
            id="cf-carbs"
            required
            value="${escapeHtml(draft.carbs !== null ? draft.carbs : '')}"
            placeholder="0"
            oninput="window.updateCustomFoodDraftNumeric('carbs', this.value)"
            class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border ${errors.carbs ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'} text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          ${errors.carbs ? `
            <p class="text-error text-[10px] font-semibold mt-1 leading-tight flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[12px]">error</span>
              <span>${escapeHtml(translatedLabel(errors.carbs))}</span>
            </p>
          ` : ''}
        </div>

        <!-- Fat -->
        <div>
          <label for="cf-fat" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
            ${trHtml("Fat (g)")} <span class="text-error">*</span>
          </label>
          <input 
            type="number" 
            step="any"
            inputmode="decimal"
            id="cf-fat"
            required
            value="${escapeHtml(draft.fat !== null ? draft.fat : '')}"
            placeholder="0"
            oninput="window.updateCustomFoodDraftNumeric('fat', this.value)"
            class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border ${errors.fat ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'} text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
          />
          ${errors.fat ? `
            <p class="text-error text-[10px] font-semibold mt-1 leading-tight flex items-center gap-0.5">
              <span class="material-symbols-outlined text-[12px]">error</span>
              <span>${escapeHtml(translatedLabel(errors.fat))}</span>
            </p>
          ` : ''}
        </div>
      </div>

      <!-- 2. Formula Info & Calculate Calories Action Bar -->
      <div class="flex flex-col gap-2 p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30">
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <span class="material-symbols-outlined text-[16px]">calculate</span>
            </div>
            <div>
              <span class="text-xs font-bold text-on-surface dark:text-white block leading-tight">${trHtml("4-4-9 Standard Formula")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block leading-tight">${trHtml("P × 4 + C × 4 + F × 9 kcal")}</span>
            </div>
          </div>
          <button 
            type="button" 
            id="btn-calc-calories"
            ${!macrosComplete ? 'disabled' : ''}
            onclick="window.calculateCustomFoodCalories()"
            class="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all ${macrosComplete ? 'bg-primary text-white shadow-xs hover:brightness-105 active:scale-95 cursor-pointer' : 'bg-surface-container dark:bg-gray-800 text-on-surface-variant/40 cursor-not-allowed'}"
            title="${macrosComplete ? tr("Calculate calories using the 4-4-9 method") : tr("Please enter valid Protein, Carbs, and Fat first")}"
          >
            <span class="material-symbols-outlined text-[15px]">functions</span>
            <span>${trHtml("Calculate Calories")}</span>
          </button>
        </div>

        ${isStale ? `
          <div class="p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 text-[11px] font-semibold flex items-center justify-between animate-fade-in">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[14px]">sync_problem</span>
              <span>${trHtml("Macros updated — calories out of sync")}</span>
            </div>
            <button 
              type="button" 
              onclick="window.calculateCustomFoodCalories()"
              class="text-[10px] font-extrabold underline hover:no-underline ml-2"
            >
              ${trHtml("Recalculate")}
            </button>
          </div>
        ` : ''}
      </div>

      <!-- 3. Calories Input with Calorie Source Tag -->
      <div>
        <div class="flex items-center justify-between mb-1">
          <label for="cf-calories" class="text-xs font-bold text-on-surface dark:text-white">
            ${trHtml("Calories (kcal)")} <span class="text-error">*</span>
          </label>
          <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold ${draft.calorieSource === 'calculated_from_macros' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface-container dark:bg-dark-surface-card-high text-on-surface-variant dark:text-gray-300 border border-outline-variant/30'} flex items-center gap-1">
            <span class="material-symbols-outlined text-[12px]">${draft.calorieSource === 'calculated_from_macros' ? 'auto_awesome' : 'edit'}</span>
            <span>${trHtml(sourceLabel)}</span>
          </span>
        </div>
        <input 
          type="number" 
          step="any"
          inputmode="decimal"
          id="cf-calories"
          required
          value="${escapeHtml(draft.calories !== null ? draft.calories : '')}"
          placeholder="0"
          oninput="window.updateCustomFoodDraftNumeric('calories', this.value)"
          class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border ${errors.calories ? 'border-error ring-1 ring-error' : 'border-outline-variant/40'} text-base font-extrabold text-primary dark:text-primary-container focus:outline-none focus:ring-2 focus:ring-primary"
        />
        ${errors.calories ? `
          <p class="text-error text-[11px] font-semibold mt-1 flex items-center gap-1">
            <span class="material-symbols-outlined text-[13px]">error</span>
            <span>${escapeHtml(translatedLabel(errors.calories))}</span>
          </p>
        ` : ''}
      </div>

      <!-- 4. Inline Calorie Consistency Warning / Acknowledged Banner -->
      ${shouldWarn && !draft.calorieWarningAcknowledged && consistency ? `
        <div class="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2 animate-fade-in text-xs">
          <div class="flex items-start gap-2">
            <span class="material-symbols-outlined text-[20px] text-amber-600 shrink-0 mt-0.5">warning</span>
            <div class="flex-1">
              <p class="font-bold text-on-surface dark:text-gray-200 leading-tight">${trHtml("Calorie Variance Detected")}</p>
              <p class="text-on-surface-variant dark:text-gray-400 text-[11px] mt-0.5 leading-snug">
                ${trHtml("Entered:")} <strong class="text-on-surface dark:text-white">${draft.calories} ${trHtml("kcal")}</strong> ${trHtml("vs Calculated:")} <strong class="text-on-surface dark:text-white">${consistency.calculatedCalories} ${trHtml("kcal")}</strong>
                ${trHtml("(difference of")} ${Math.round(consistency.differenceCalories)} ${trHtml("kcal /")} ${consistency.differencePercent !== null ? consistency.differencePercent.toFixed(1) : '0'}%).
              </p>
              <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-1">
                ${trHtml("Nutrition labels can differ due to rounding or dietary fiber, but large differences may indicate a typo.")}
              </p>
            </div>
          </div>
          <div class="flex items-center gap-2 pt-1">
            <button 
              type="button" 
              onclick="window.useCalculatedCustomFoodCalories()"
              class="px-2.5 py-1.5 rounded-lg bg-primary text-white text-[11px] font-bold shadow-xs hover:brightness-105 transition-all flex items-center gap-1"
            >
              <span class="material-symbols-outlined text-[14px]">check</span>
              <span>${trHtml("Use Calculated (")}${consistency.calculatedCalories} ${trHtml("kcal)")}</span>
            </button>
            <button 
              type="button" 
              onclick="window.keepEnteredCustomFoodCalories()"
              class="px-2.5 py-1.5 rounded-lg border border-outline-variant/50 text-on-surface dark:text-gray-200 text-[11px] font-bold hover:bg-surface-container transition-all"
            >
              ${trHtml("Keep Entered (")}${draft.calories} ${trHtml("kcal)")}
            </button>
          </div>
          ${(errors.calorieConsistency || errors.calories_consistency) ? `
            <p class="text-error text-[10px] font-semibold mt-0.5 flex items-center gap-1">
              <span class="material-symbols-outlined text-[12px]">error</span>
              <span>${escapeHtml(errors.calorieConsistency || errors.calories_consistency)}</span>
            </p>
          ` : ''}
        </div>
      ` : ''}

      ${shouldWarn && draft.calorieWarningAcknowledged && consistency ? `
        <div class="px-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-between text-xs animate-fade-in">
          <div class="flex items-center gap-1.5 text-[11px] text-on-surface-variant dark:text-gray-400">
            <span class="material-symbols-outlined text-[14px] text-amber-500">info</span>
            <span>${trHtml("Entered calories kept (")}${draft.calories} ${trHtml("kcal,")} <strong class="text-on-surface dark:text-white">${Math.round(consistency.differenceCalories)} ${trHtml("kcal")}</strong> ${trHtml("diff)")}</span>
          </div>
          <button 
            type="button" 
            onclick="window.useCalculatedCustomFoodCalories()"
            class="text-[10px] font-bold text-primary dark:text-primary-container underline hover:no-underline ml-2 shrink-0"
          >
            ${trHtml("Use")} ${consistency.calculatedCalories} ${trHtml("kcal")}
          </button>
        </div>
      ` : ''}

      <!-- 5. Macro Energy Breakdown & Visual Bar -->
      <div class="p-3 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 flex flex-col gap-2.5">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-on-surface dark:text-white text-[11px]">${trHtml("Macro Energy Ratio")}</span>
          <span class="text-[11px] font-bold text-on-surface-variant dark:text-gray-400">
            ${breakdown && breakdown.totalCalories > 0 ? tr("Total: {0} kcal", breakdown.totalCalories) : tr("No macros calculated")}
          </span>
        </div>

        <!-- Proportional stacked horizontal visual bar -->
        <div class="h-2.5 w-full rounded-full overflow-hidden flex bg-surface-container dark:bg-gray-800">
          ${breakdown && breakdown.totalCalories > 0 ? `
            <div class="h-full bg-blue-500 transition-all duration-300" style="width: ${breakdown.proteinPercent}%;" title="${trHtml("Protein:")} ${breakdown.proteinPercent.toFixed(1)}%"></div>
            <div class="h-full bg-amber-500 transition-all duration-300" style="width: ${breakdown.carbsPercent}%;" title="${trHtml("Carbs:")} ${breakdown.carbsPercent.toFixed(1)}%"></div>
            <div class="h-full bg-rose-500 transition-all duration-300" style="width: ${breakdown.fatPercent}%;" title="${trHtml("Fat:")} ${breakdown.fatPercent.toFixed(1)}%"></div>
          ` : `
            <div class="h-full w-full bg-outline-variant/30"></div>
          `}
        </div>

        <!-- Macro Breakdown Legend & Values -->
        <div class="grid grid-cols-3 gap-2 text-center text-xs">
          <div class="p-1.5 rounded-lg bg-surface-container-low dark:bg-dark-surface-card-high flex flex-col items-center">
            <div class="flex items-center gap-1 mb-0.5">
              <span class="w-2 h-2 rounded-full bg-blue-500"></span>
              <span class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400">${trHtml("Protein")}</span>
            </div>
            <span class="font-extrabold text-xs text-on-surface dark:text-white">
              ${draft.protein !== null ? `${draft.protein} ${trHtml("g")}` : '-'}
            </span>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400">
              ${breakdown ? tr("{0} kcal ({1}%)", breakdown.proteinCalories, breakdown.proteinPercent.toFixed(0)) : '-'}
            </span>
          </div>

          <div class="p-1.5 rounded-lg bg-surface-container-low dark:bg-dark-surface-card-high flex flex-col items-center">
            <div class="flex items-center gap-1 mb-0.5">
              <span class="w-2 h-2 rounded-full bg-amber-500"></span>
              <span class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400">${trHtml("Carbs")}</span>
            </div>
            <span class="font-extrabold text-xs text-on-surface dark:text-white">
              ${draft.carbs !== null ? `${draft.carbs} ${trHtml("g")}` : '-'}
            </span>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400">
              ${breakdown ? tr("{0} kcal ({1}%)", breakdown.carbohydrateCalories, breakdown.carbsPercent.toFixed(0)) : '-'}
            </span>
          </div>

          <div class="p-1.5 rounded-lg bg-surface-container-low dark:bg-dark-surface-card-high flex flex-col items-center">
            <div class="flex items-center gap-1 mb-0.5">
              <span class="w-2 h-2 rounded-full bg-rose-500"></span>
              <span class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400">${trHtml("Fat")}</span>
            </div>
            <span class="font-extrabold text-xs text-on-surface dark:text-white">
              ${draft.fat !== null ? `${draft.fat} ${trHtml("g")}` : '-'}
            </span>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400">
              ${breakdown ? tr("{0} kcal ({1}%)", breakdown.fatCalories, breakdown.fatPercent.toFixed(0)) : '-'}
            </span>
          </div>
        </div>
      </div>

      <!-- 6. Secondary Macros (Fiber, Sugar, Sodium) -->
      <div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 block mb-2">
          ${trHtml("Secondary Macros (Optional)")}
        </span>
        <div class="grid grid-cols-3 gap-2.5">
          <!-- Fiber -->
          <div>
            <label for="cf-fiber" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
              ${trHtml("Fiber (g)")}
            </label>
            <input 
              type="number" 
              step="any"
              inputmode="decimal"
              id="cf-fiber"
              value="${escapeHtml(draft.fiber !== null ? draft.fiber : '')}"
              placeholder="0"
              oninput="window.updateCustomFoodDraftNumeric('fiber', this.value)"
              class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Sugar -->
          <div>
            <label for="cf-sugar" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
              ${trHtml("Sugar (g)")}
            </label>
            <input 
              type="number" 
              step="any"
              inputmode="decimal"
              id="cf-sugar"
              value="${escapeHtml(draft.sugar !== null ? draft.sugar : '')}"
              placeholder="0"
              oninput="window.updateCustomFoodDraftNumeric('sugar', this.value)"
              class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Sodium -->
          <div>
            <label for="cf-sodium" class="text-xs font-bold text-on-surface dark:text-white block mb-1">
              ${trHtml("Sodium (mg)")}
            </label>
            <input 
              type="number" 
              step="any"
              inputmode="decimal"
              id="cf-sodium"
              value="${escapeHtml(draft.sodium !== null ? draft.sodium : '')}"
              placeholder="0"
              oninput="window.updateCustomFoodDraftNumeric('sodium', this.value)"
              class="w-full px-3 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Part B: Micronutrients (Optional, Collapsible, NO blank green card!) -->
    <div class="rounded-2xl border border-outline-variant/30 overflow-hidden bg-surface-container-low dark:bg-dark-surface-card-high">
      <button 
        type="button" 
        onclick="window.toggleDraftMicronutrients()"
        class="w-full p-4 flex items-center justify-between text-left hover:bg-surface-container transition-colors focus:outline-none"
      >
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <span class="material-symbols-outlined text-[18px]">science</span>
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <span class="font-bold text-xs text-on-surface dark:text-white">${trHtml("Micronutrients")}</span>
              <span class="text-[10px] font-semibold text-on-surface-variant dark:text-gray-400 bg-surface-container-lowest dark:bg-dark-surface-card px-1.5 py-0.5 rounded-md">${trHtml("Optional")}</span>
            </div>
            <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">
              ${draft.isMicronutrientsExpanded ? tr("Tap to collapse") : tr("Tap to add vitamins & minerals if known")}
            </p>
          </div>
        </div>

        <span class="material-symbols-outlined text-[20px] text-on-surface-variant transition-transform duration-200 ${draft.isMicronutrientsExpanded ? 'rotate-180' : ''}">
          expand_more
        </span>
      </button>

      ${draft.isMicronutrientsExpanded ? `
        <div class="px-4 pb-4 pt-2 border-t border-outline-variant/20 grid grid-cols-2 gap-2.5 animate-fade-in text-xs">
          <div>
            <label for="cf-vit-c" class="text-[10px] font-semibold text-on-surface-variant dark:text-gray-400 block mb-1">${trHtml("Vitamin C (mg)")}</label>
            <input 
              type="number" 
              step="any" 
              inputmode="decimal"
              id="cf-vit-c" 
              value="${escapeHtml(draft.vitaminC !== null ? draft.vitaminC : '')}"
              placeholder="0" 
              oninput="window.updateCustomFoodDraftNumeric('vitaminC', this.value)"
              class="w-full px-2.5 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white" 
            />
          </div>

          <div>
            <label for="cf-vit-d" class="text-[10px] font-semibold text-on-surface-variant dark:text-gray-400 block mb-1">${trHtml("Vitamin D (mcg)")}</label>
            <input 
              type="number" 
              step="any" 
              inputmode="decimal"
              id="cf-vit-d" 
              value="${escapeHtml(draft.vitaminD !== null ? draft.vitaminD : '')}"
              placeholder="0" 
              oninput="window.updateCustomFoodDraftNumeric('vitaminD', this.value)"
              class="w-full px-2.5 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white" 
            />
          </div>

          <div>
            <label for="cf-calcium" class="text-[10px] font-semibold text-on-surface-variant dark:text-gray-400 block mb-1">${trHtml("Calcium (mg)")}</label>
            <input 
              type="number" 
              step="any" 
              inputmode="decimal"
              id="cf-calcium" 
              value="${escapeHtml(draft.calcium !== null ? draft.calcium : '')}"
              placeholder="0" 
              oninput="window.updateCustomFoodDraftNumeric('calcium', this.value)"
              class="w-full px-2.5 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white" 
            />
          </div>

          <div>
            <label for="cf-iron" class="text-[10px] font-semibold text-on-surface-variant dark:text-gray-400 block mb-1">${trHtml("Iron (mg)")}</label>
            <input 
              type="number" 
              step="any" 
              inputmode="decimal"
              id="cf-iron" 
              value="${escapeHtml(draft.iron !== null ? draft.iron : '')}"
              placeholder="0" 
              oninput="window.updateCustomFoodDraftNumeric('iron', this.value)"
              class="w-full px-2.5 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white" 
            />
          </div>

          <div>
            <label for="cf-potassium" class="text-[10px] font-semibold text-on-surface-variant dark:text-gray-400 block mb-1">${trHtml("Potassium (mg)")}</label>
            <input 
              type="number" 
              step="any" 
              inputmode="decimal"
              id="cf-potassium" 
              value="${escapeHtml(draft.potassium !== null ? draft.potassium : '')}"
              placeholder="0" 
              oninput="window.updateCustomFoodDraftNumeric('potassium', this.value)"
              class="w-full px-2.5 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white" 
            />
          </div>

          <div>
            <label for="cf-magnesium" class="text-[10px] font-semibold text-on-surface-variant dark:text-gray-400 block mb-1">${trHtml("Magnesium (mg)")}</label>
            <input 
              type="number" 
              step="any" 
              inputmode="decimal"
              id="cf-magnesium" 
              value="${escapeHtml(draft.magnesium !== null ? draft.magnesium : '')}"
              placeholder="0" 
              oninput="window.updateCustomFoodDraftNumeric('magnesium', this.value)"
              class="w-full px-2.5 py-2 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white" 
            />
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

/**
 * Step 4: Portions & Review
 */
function renderStep4(
  draft: ReturnType<typeof store.getState>['customFoodDraft'],
  _errors: Record<string, string>,
  isEditing: boolean
): string {
  const defaultEquivUnit = draft.basisType === 'per_100ml' ? 'ml' : 'g';

  const basisSummary = draft.basisType === 'per_100g' 
    ? tr("Per 100 g")
    : (draft.basisType === 'per_100ml' ? tr("Per 100 ml") : tr("Per Serving ({0})", draft.servingDescription || tr("1 serving")));

  const categoryLabel = getCategoryLabel(draft.category);

  // Count micronutrients provided
  const microCount = [
    draft.vitaminC,
    draft.vitaminD,
    draft.calcium,
    draft.iron,
    draft.potassium,
    draft.magnesium
  ].filter(v => v !== null).length;

  return `
    <!-- 1. Portion Options Mapping Builder -->
    <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-3">
      <div>
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
            ${trHtml("Portion Mappings")}
          </span>
          <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("Optional")}</span>
        </div>
        <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">
          ${trHtml("Add custom conversions (e.g. 1 scoop = 30 g, 1 slice = 28 g).")}
        </p>
      </div>

      <!-- Current mappings list -->
      <div id="cf-portions-list" class="flex flex-col gap-2">
        ${draft.portionOptions.length === 0 ? `
          <div class="p-3 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-dashed border-outline-variant/30 text-center text-on-surface-variant dark:text-gray-400 text-[11px]">
            ${trHtml("No custom portion mappings added yet.")}
          </div>
        ` : draft.portionOptions.map((opt, idx) => `
          <div class="p-2.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-on-surface dark:text-white">${escapeHtml(opt.label)}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">
                ${opt.quantity} ${trHtml(opt.unit)} = ${opt.equivalentBaseAmount} ${trHtml(opt.equivalentBaseUnit)}
              </span>
            </div>
            <button 
              type="button" 
              onclick="window.removeCustomFoodDraftPortion(${idx})"
              aria-label="${trHtml("Remove portion mapping")}"
              class="text-on-surface-variant hover:text-error transition-colors p-1"
            >
              <span class="material-symbols-outlined text-[16px]">delete</span>
            </button>
          </div>
        `).join('')}
      </div>

      <!-- Inline Add Portion Form -->
      <div class="p-3 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-dashed border-outline-variant/40 flex flex-col gap-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
          ${trHtml("+ Add New Mapping")}
        </span>

        <div class="grid grid-cols-12 gap-1.5 items-center">
          <div class="col-span-3">
            <input 
              type="number" 
              step="any"
              inputmode="decimal"
              id="cf-new-portion-qty"
              placeholder="${trHtml("Qty (1)")}"
              value="1"
              class="w-full px-2 py-1.5 rounded-lg bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white"
            />
          </div>

          <div class="col-span-4">
            <select 
              id="cf-new-portion-unit"
              class="w-full px-2 py-1.5 rounded-lg bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white capitalize"
            >
              <option value="scoop">${trHtml("scoop")}</option>
              <option value="slice">${trHtml("slice")}</option>
              <option value="bowl">${trHtml("bowl")}</option>
              <option value="piece">${trHtml("piece")}</option>
              <option value="cup">${trHtml("cup")}</option>
              <option value="tbsp">${trHtml("tbsp")}</option>
              <option value="tsp">${trHtml("tsp")}</option>
              <option value="can">${trHtml("can")}</option>
              <option value="bar">${trHtml("bar")}</option>
              <option value="pack">${trHtml("pack")}</option>
              <option value="serving">${trHtml("serving")}</option>
            </select>
          </div>

          <div class="col-span-3">
            <input 
              type="number" 
              step="any"
              inputmode="decimal"
              id="cf-new-portion-equiv"
              placeholder="= (${defaultEquivUnit})"
              class="w-full px-2 py-1.5 rounded-lg bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/40 text-xs font-semibold text-on-surface dark:text-white"
            />
          </div>

          <div class="col-span-2">
            <button 
              type="button" 
              onclick="window.addCustomFoodDraftPortion()"
              class="w-full py-1.5 rounded-lg bg-primary/15 text-primary dark:text-primary-container font-bold text-xs hover:bg-primary/25 transition-colors text-center"
            >
              ${trHtml("Add")}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. Review Summary Card -->
    <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-4 rounded-2xl border border-outline-variant/30 flex flex-col gap-3">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
          ${trHtml("Food Summary")}
        </span>
        <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-extrabold">
          ${trHtml("Ready to Save")}
        </span>
      </div>

      <div class="p-3.5 rounded-xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/20 flex flex-col gap-2.5">
        <div>
          <h3 class="font-heading font-extrabold text-sm text-on-surface dark:text-white">
            ${escapeHtml(draft.name || tr("Unnamed Food"))}
          </h3>
          <p class="text-[11px] text-on-surface-variant dark:text-gray-400">
            ${draft.brand ? escapeHtml(draft.brand) + ' • ' : ''}${escapeHtml(categoryLabel)}
          </p>
        </div>

        <div class="h-px bg-outline-variant/20"></div>

        <div class="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Basis")}</span>
            <span class="font-bold text-on-surface dark:text-white">${escapeHtml(basisSummary)}</span>
          </div>
          <div>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Calories & Source")}</span>
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="font-extrabold text-primary dark:text-primary-container">${draft.calories ?? 0} ${trHtml("kcal")}</span>
              <span class="px-1.5 py-0.5 rounded text-[9px] font-bold ${draft.calorieSource === 'calculated_from_macros' ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface-container dark:bg-dark-surface-card-high text-on-surface-variant dark:text-gray-300 border border-outline-variant/30'}">
                ${trHtml(getCalorieSourceLabel(draft.calorieSource))}
              </span>
            </div>
          </div>
          <div>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Protein / Carbs / Fat")}</span>
            <span class="font-bold text-on-surface dark:text-white">
              ${draft.protein !== null ? `${draft.protein} ${trHtml("g")}` : '-'} /
              ${draft.carbs !== null ? `${draft.carbs} ${trHtml("g")}` : '-'} /
              ${draft.fat !== null ? `${draft.fat} ${trHtml("g")}` : '-'}
            </span>
          </div>
          <div>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Energy Ratio (P / C / F)")}</span>
            <span class="font-bold text-on-surface dark:text-white">
              ${(() => {
                const b = calculateCaloriesFromMacros({ protein: draft.protein, carbs: draft.carbs, fat: draft.fat });
                return b && b.totalCalories > 0 
                  ? `${b.proteinPercent.toFixed(0)}% / ${b.carbsPercent.toFixed(0)}% / ${b.fatPercent.toFixed(0)}%` 
                  : '-';
              })()}
            </span>
          </div>
          <div>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Micronutrients")}</span>
            <span class="font-semibold text-on-surface dark:text-white">
              ${microCount > 0 ? tr("{0} specified", microCount) : tr("None (optional)")}
            </span>
          </div>
          ${draft.fiber !== null || draft.sugar !== null || draft.sodium !== null ? `
            <div>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Secondary Macros")}</span>
              <span class="font-semibold text-on-surface dark:text-white text-[11px]">
                ${draft.fiber !== null ? tr("Fib: {0}g", draft.fiber) : ''}${draft.sugar !== null ? tr("Sug: {0}g", draft.sugar) : ''}${draft.sodium !== null ? tr("Sod: {0}mg", draft.sodium) : ''}
              </span>
            </div>
          ` : ''}
        </div>

        ${(() => {
          const c = checkCalorieConsistency(draft.calories, { protein: draft.protein, carbs: draft.carbs, fat: draft.fat });
          if (draft.calorieWarningAcknowledged && c && c.shouldWarn) {
            return `
              <div class="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-700 dark:text-amber-400 flex items-start gap-1.5 mt-1">
                <span class="material-symbols-outlined text-[14px] shrink-0 mt-0.5">info</span>
                <span>${trHtml("Note: Entered calories (")}${draft.calories} ${trHtml("kcal) kept by user; differs by")} ${Math.round(c.differenceCalories)} ${trHtml("kcal (")}${c.differencePercent !== null ? c.differencePercent.toFixed(1) : '0'}${trHtml("%) from 4-4-9 formula.")}</span>
              </div>
            `;
          }
          return '';
        })()}

        ${draft.portionOptions.length > 0 ? `
          <div class="pt-1">
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${trHtml("Custom Portions (")}${draft.portionOptions.length})</span>
            <div class="flex flex-wrap gap-1 mt-1">
              ${draft.portionOptions.map(p => `
                <span class="px-2 py-0.5 rounded-md bg-surface-container-low dark:bg-dark-surface-card-high text-[10px] font-semibold text-on-surface-variant">
                  ${escapeHtml(p.label)} (${p.equivalentBaseAmount}${p.equivalentBaseUnit})
                </span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    </div>

    <!-- 3. Delete Option (If in Edit Mode) -->
    ${isEditing ? `
      <div class="pt-1 flex justify-between items-center px-1">
        <span class="text-[10px] text-on-surface-variant dark:text-gray-400">
          ${trHtml("Deleting will not alter past diary history.")}
        </span>
        <button 
          type="button" 
          onclick="window.confirmDeleteCustomFood(${htmlJsArg(draft.name ? draft.name : '')})"
          class="px-3 py-1.5 rounded-xl bg-error/10 text-error font-bold text-xs hover:bg-error/20 transition-colors flex items-center gap-1"
        >
          <span class="material-symbols-outlined text-[16px]">delete</span>
          <span>${trHtml("Delete Food")}</span>
        </button>
      </div>
    ` : ''}
  `;
}
