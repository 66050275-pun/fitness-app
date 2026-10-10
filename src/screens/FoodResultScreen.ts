import { tr, trHtml } from '../i18n/index.ts';
import { demoFoodImage } from '../data/demoImage.ts';
import { htmlJsArg } from '../utils/sanitize.ts';
import { store } from '../store/appState';
import { MealType } from '../types/index.ts';
import { selectNutrientHighlights } from '../utils/nutrientCalculations';
import { DEMO_SALMON_BOWL_MICRONUTRIENTS } from '../data/demoNutritionData';

export function renderFoodResultScreen(): string {
  const { lastScannedFood } = store.getState();
  const food = lastScannedFood || {
    name: 'Mediterranean Poke Bowl',
    subtitle: tr("Wild Sashimi Tuna, Brown Rice & Greens"),
    calories: 540,
    protein: 38,
    carbs: 52,
    fat: 16,
    confidence: 0.98,
    glycemicIndex: 'Low' as const,
    ingredients: ['Wild Sashimi Tuna', 'Organic Brown Rice', 'Wakame Seaweed', 'Edamame', 'Sesame Seeds'],
    suggestedMealType: 'dinner' as const,
    micronutrients: DEMO_SALMON_BOWL_MICRONUTRIENTS
  };

  const highlights = selectNutrientHighlights(food.micronutrients || DEMO_SALMON_BOWL_MICRONUTRIENTS, 6);

  return `
    <div class="flex flex-col min-h-screen pb-10 bg-surface dark:bg-dark-surface transition-colors">
      
      <!-- Top Image Hero Banner -->
      <div class="relative w-full h-64 overflow-hidden bg-black">
        <img 
          src="${demoFoodImage}"
          class="w-full h-full object-cover" 
          alt="${trHtml(food.name)}"
        />
        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>

        <!-- Top Navigation -->
        <div class="absolute top-4 left-4 right-4 flex justify-between items-center z-10">
          <button onclick="window.navigateApp('scanner')" class="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all">
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div class="flex items-center gap-2">
            <button onclick="window.showToast('Food result shared')" class="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all">
              <span class="material-symbols-outlined text-[20px]">share</span>
            </button>
          </div>
        </div>

        <!-- Banner Bottom Overlay Info -->
        <div class="absolute bottom-4 left-4 right-4 text-white z-10">
          <div class="flex items-center gap-2 mb-1">
            <span class="px-2.5 py-0.5 rounded-full bg-primary-container text-on-primary-container text-[10px] font-extrabold uppercase flex items-center gap-1">
              <span class="material-symbols-outlined text-[12px]" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
              ${Math.round(food.confidence * 100)}${trHtml("% AI Confidence")}
            </span>
            <span class="px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[10px] font-semibold">
              ${trHtml("Glycemic:")} ${trHtml(food.glycemicIndex)}
            </span>
          </div>
          <h1 class="font-heading font-bold text-xl leading-tight text-white">${trHtml(food.name)}</h1>
          <p class="text-xs text-white/80 mt-0.5">${trHtml(food.subtitle)}</p>
        </div>
      </div>

      <!-- Main Result Content Sheet -->
      <main class="px-screen-gutter flex flex-col gap-4 -mt-3 relative z-20 bg-surface dark:bg-dark-surface rounded-t-3xl pt-5">
        
        <!-- Energy Summary Strip -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex items-center justify-between">
          <div>
            <span class="text-xs text-on-surface-variant dark:text-gray-400 font-medium">${trHtml("Estimated Caloric Intake")}</span>
            <div class="flex items-baseline gap-1 mt-0.5">
              <span class="font-display text-3xl font-extrabold text-on-surface dark:text-white leading-none">${food.calories}</span>
              <span class="text-xs font-bold text-on-surface-variant dark:text-gray-400">${trHtml("kcal")}</span>
            </div>
          </div>

          <div class="w-12 h-12 rounded-xl bg-primary/10 text-primary dark:text-primary-container flex items-center justify-center">
            <span class="material-symbols-outlined text-[28px]" style="font-variation-settings: 'FILL' 1;">restaurant</span>
          </div>
        </div>

        <!-- Macronutrients Distribution Dials -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient">
          <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-3">${trHtml("Macronutrient Profile")}</h3>
          
          <div class="grid grid-cols-3 gap-3">
            <!-- Protein -->
            <div class="flex flex-col items-center bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl">
              <span class="text-[11px] font-bold text-primary dark:text-primary-container">${trHtml("Protein")}</span>
              <span class="font-heading font-extrabold text-lg text-on-surface dark:text-white mt-0.5">${food.protein}${trHtml("g")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("32% of total")}</span>
            </div>

            <!-- Carbs -->
            <div class="flex flex-col items-center bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl">
              <span class="text-[11px] font-bold text-tertiary dark:text-tertiary-fixed">${trHtml("Carbs")}</span>
              <span class="font-heading font-extrabold text-lg text-on-surface dark:text-white mt-0.5">${food.carbs}${trHtml("g")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("44% of total")}</span>
            </div>

            <!-- Fat -->
            <div class="flex flex-col items-center bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl">
              <span class="text-[11px] font-bold text-amber-500">${trHtml("Healthy Fats")}</span>
              <span class="font-heading font-extrabold text-lg text-on-surface dark:text-white mt-0.5">${food.fat}${trHtml("g")}</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("24% of total")}</span>
            </div>
          </div>
        </div>

        <!-- Detected Ingredients Section -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient">
          <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400 mb-2.5">${trHtml("Detected Ingredients")}</h3>
          <div class="flex flex-wrap gap-1.5">
            ${food.ingredients.map(ing => `
              <span class="px-2.5 py-1 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs text-on-surface dark:text-gray-200 font-medium">
                ${trHtml(ing)}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Vitamins & Minerals Section -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-1.5">
                <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">${trHtml("Vitamins & Minerals")}</h3>
                <span class="px-1.5 py-0.2 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-extrabold">${trHtml("DEMO")}</span>
              </div>
              <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">${trHtml("Key nutrient highlights")}</p>
            </div>
            
            <button 
              type="button" 
              onclick="window.openNutrientsFromScanned()" 
              class="px-2.5 py-1 rounded-xl bg-primary/10 text-primary dark:text-primary-container text-xs font-bold hover:bg-primary/20 active:scale-95 transition-all flex items-center gap-1"
            >
              <span>${trHtml("View All Nutrients")}</span>
              <span class="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>

          <!-- Nutrient Highlights (4-6 items) -->
          <div class="grid grid-cols-2 gap-2">
            ${highlights.map(n => {
              const dv = n.dailyValuePercent;
              const progressWidth = dv !== null && dv !== undefined ? Math.min(100, Math.max(0, dv)) : 0;
              return `
                <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex flex-col gap-1.5">
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="font-heading font-bold text-xs text-on-surface dark:text-white block leading-tight">${trHtml(n.name)}</span>
                      <span class="text-[11px] font-extrabold text-primary dark:text-primary-container mt-0.5 block">${n.amount} ${trHtml(n.unit)}</span>
                    </div>
                    ${dv !== null && dv !== undefined ? `
                      <span class="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary dark:text-primary-container">
                        ${dv}${trHtml("% DV")}
                      </span>
                    ` : ''}
                  </div>

                  ${dv !== null && dv !== undefined ? `
                    <div 
                      class="w-full h-1 rounded-full bg-surface-container-lowest dark:bg-dark-surface-card overflow-hidden"
                      role="progressbar"
                      aria-valuenow="${dv}"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label="${trHtml(n.name)} ${dv} ${trHtml("percent daily value")}"
                    >
                      <div class="h-full rounded-full bg-primary" style="width: ${progressWidth}%;"></div>
                    </div>
                  ` : ''}

                  <div class="flex items-center justify-between text-[9px] text-on-surface-variant dark:text-gray-400 pt-0.5">
                    <span class="uppercase tracking-wider font-semibold">${trHtml(n.source || 'estimate')}</span>
                    ${n.confidence ? `<span>${Math.round(n.confidence * 100)}${trHtml("% conf")}</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Demo Disclaimer Notice -->
          <div class="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-[10px] text-amber-800 dark:text-amber-300">
            <span class="material-symbols-outlined text-[15px] shrink-0">info</span>
            <span>${trHtml("Sample nutrient data for UI preview. Analysis API is not connected yet.")}</span>
          </div>
        </div>

        <!-- Meal Type Selector -->
        <div class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-2">
          <h3 class="font-heading text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">${trHtml("Assign to Meal")}</h3>
          
          <div class="grid grid-cols-4 gap-2 mt-1">
            ${(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => `
              <button 
                id="meal-btn-${type}" 
                onclick="window.selectedMealType = ${htmlJsArg(type)}; document.querySelectorAll('[id^=meal-btn-]').forEach(b => b.classList.replace('bg-primary', 'bg-surface-container-low')); this.classList.replace('bg-surface-container-low', 'bg-primary');"
                class="py-2 px-1 text-center rounded-xl text-xs font-bold capitalize transition-all border border-outline-variant/30 ${type === food.suggestedMealType ? 'bg-primary text-white' : 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface dark:text-gray-300'}"
              >
                ${trHtml(type)}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Primary Confirm Action Button -->
        <div class="pt-2">
          <button 
            onclick="window.logCurrentFood()" 
            class="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-heading text-base font-bold shadow-glow-primary hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
          >
            <span class="material-symbols-outlined text-[22px]">check_circle</span>
            <span>${trHtml("Log Meal to Daily Diary")}</span>
          </button>
        </div>

      </main>

    </div>
  `;
}
