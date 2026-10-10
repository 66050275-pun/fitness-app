import { foodLabel, portionLabel } from '../i18n/foodLabels.ts';
import { tr, trHtml, getLocale } from '../i18n/index.ts';
import { store } from '../store/appState';
import type { FoodDefinition, RecentFoodEntry } from '../types/index.ts';
import { htmlJsArg, escapeHtml } from '../utils/sanitize';

function formatRelativeTime(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    if (diffMs < 0) return tr("Just now");
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return tr("Just now");
    if (diffMins < 60) return tr("{0}m ago", diffMins);
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return tr("{0}h ago", diffHours);
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return tr("Yesterday");
    if (diffDays < 7) return tr("{0}d ago", diffDays);
    return new Date(isoString).toLocaleDateString(getLocale(), { month: 'short', day: 'numeric' });
  } catch {
    return tr("Recently");
  }
}

export function renderFoodSearchScreen(): string {
  const state = store.getState();
  const activeTab = state.foodSearchTab || 'recent';
  const recentFoods = store.getRecentFoods();
  const frequentlyUsed = store.getFrequentlyUsedFoods();
  const customFoods = store.getCustomFoods();

  return `
    <div class="flex flex-col min-h-screen pb-28 bg-surface dark:bg-dark-surface transition-colors">
      
      <!-- Top App Bar -->
      <header class="sticky top-0 z-40 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20 shadow-sm">
        <div class="flex items-center gap-2.5">
          <button 
            onclick="window.navigateApp('dashboard')" 
            aria-label="${trHtml("Back to Dashboard")}"
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 class="font-heading font-bold text-base text-on-surface dark:text-white leading-tight">${trHtml("Food Database")}</h1>
            <p class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("Recents, custom foods & verified catalog")}</p>
          </div>
        </div>

        <button 
          type="button" 
          onclick="window.openCreateCustomFood()"
          class="px-3 py-1.5 rounded-full bg-primary/10 text-primary dark:text-primary-container text-xs font-bold border border-primary/30 flex items-center gap-1 active:scale-95 transition-all hover:bg-primary/20"
        >
          <span class="material-symbols-outlined text-[16px]">add</span>
          <span>${trHtml("New Food")}</span>
        </button>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">
        
        <!-- Live Search Input -->
        <div class="relative">
          <span class="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant">search</span>
          <input 
            type="text" 
            id="food-search-input"
            placeholder="${trHtml("Search by name, brand, barcode, category...")}"
            oninput="window.handleFoodSearchInput(this.value)"
            class="w-full pl-10 pr-10 py-3 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 text-xs font-medium text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary shadow-sm placeholder:text-on-surface-variant/60"
          />
          <button 
            type="button" 
            onclick="const inp = document.getElementById('food-search-input'); if(inp){ inp.value = ''; window.handleFoodSearchInput(''); }"
            aria-label="${trHtml("Clear search")}"
            class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant hover:text-on-surface"
          >
            close
          </button>
        </div>

        <!-- 3-Segment Tab Bar (Recent | My Foods | All Foods) -->
        <div class="grid grid-cols-3 p-1 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 text-center">
          <button 
            type="button" 
            onclick="window.setFoodSearchTab('recent')"
            class="py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'recent'
                ? 'bg-surface-container-lowest dark:bg-dark-surface-card-high text-primary dark:text-primary-container shadow-xs'
                : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface'}"
          >
            <span>${trHtml("Recent")}</span>
            ${recentFoods.length > 0 ? `
              <span class="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                activeTab === 'recent' ? 'bg-primary/15 text-primary' : 'bg-outline-variant/30 text-on-surface-variant'
              }">${recentFoods.length}</span>
            ` : ''}
          </button>

          <button 
            type="button" 
            onclick="window.setFoodSearchTab('myFoods')"
            class="py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activeTab === 'myFoods'
                ? 'bg-surface-container-lowest dark:bg-dark-surface-card-high text-primary dark:text-primary-container shadow-xs'
                : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface'}"
          >
            <span>${trHtml("My Foods")}</span>
            ${customFoods.length > 0 ? `
              <span class="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold ${
                activeTab === 'myFoods' ? 'bg-primary/15 text-primary' : 'bg-outline-variant/30 text-on-surface-variant'
              }">${customFoods.length}</span>
            ` : ''}
          </button>

          <button 
            type="button" 
            onclick="window.setFoodSearchTab('allFoods')"
            class="py-2 px-1 rounded-xl text-xs font-bold transition-all ${activeTab === 'allFoods'
                ? 'bg-surface-container-lowest dark:bg-dark-surface-card-high text-primary dark:text-primary-container shadow-xs'
                : 'text-on-surface-variant dark:text-gray-400 hover:text-on-surface'}"
          >
            <span>${trHtml("All Foods")}</span>
          </button>
        </div>

        <!-- Dynamic Results / Tab Content Container -->
        <div id="food-search-content-area" class="flex flex-col gap-4">
          ${renderTabContent(activeTab, recentFoods, frequentlyUsed, customFoods)}
        </div>

      </main>

    </div>
  `;
}

function renderTabContent(
  activeTab: 'recent' | 'myFoods' | 'allFoods',
  recentFoods: RecentFoodEntry[],
  frequentlyUsed: { food: FoodDefinition; entry: RecentFoodEntry }[],
  customFoods: FoodDefinition[]
): string {
  if (activeTab === 'recent') {
    return renderRecentFoodsTab(recentFoods, frequentlyUsed);
  } else if (activeTab === 'myFoods') {
    return renderMyFoodsTab(customFoods);
  } else {
    return renderAllFoodsTab();
  }
}

/**
 * Tab 1: Recent Foods & Frequently Used
 */
function renderRecentFoodsTab(
  recentFoods: RecentFoodEntry[], 
  frequentlyUsed: { food: FoodDefinition; entry: RecentFoodEntry }[]
): string {
  if (recentFoods.length === 0) {
    return `
      <div class="p-8 text-center bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center">
        <div class="w-12 h-12 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant flex items-center justify-center mb-2.5">
          <span class="material-symbols-outlined text-[26px]">history</span>
        </div>
        <h4 class="font-heading font-bold text-sm text-on-surface dark:text-white">${trHtml("No Recent Foods")}</h4>
        <p class="text-xs text-on-surface-variant dark:text-gray-400 max-w-xs mt-1 leading-relaxed">
          ${trHtml("Foods you log to your diary will automatically appear here with your customized portions for quick 1-tap logging.")}
        </p>
        <button 
          type="button" 
          onclick="window.setFoodSearchTab('allFoods')" 
          class="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
        >
          ${trHtml("Explore All Foods")}
        </button>
      </div>
    `;
  }

  return `
    <div class="flex flex-col gap-4">
      
      <!-- Frequently Used Section (Shown if >= 2 entries with multiple uses) -->
      ${frequentlyUsed.length >= 2 ? `
        <section class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[16px] text-primary">trending_up</span>
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
                ${trHtml("Frequently Used")}
              </span>
            </div>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("Based on your logs")}</span>
          </div>

          <div class="flex gap-2.5 overflow-x-auto pb-1 scrollbar-none">
            ${frequentlyUsed.map(({ food, entry }) => {
              return `
                <div class="min-w-[190px] max-w-[210px] p-3 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 shadow-xs flex flex-col justify-between shrink-0">
                  <div>
                    <div class="flex items-center justify-between">
                      <span class="px-1.5 py-0.2 rounded-md bg-primary/10 text-primary dark:text-primary-container text-[9px] font-extrabold">
                        ${entry.useCount}${trHtml("x logged")}
                      </span>
                    </div>
                    <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white mt-1.5 truncate">
                      ${escapeHtml(foodLabel(food, food.name))}
                    </h4>
                    <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5 truncate">
                      ${escapeHtml(portionLabel(entry.lastPortion, food.source === 'built_in' || food.source === 'demo') || `${entry.lastPortion.quantity} ${tr(entry.lastPortion.unit)}`)}
                    </p>
                  </div>

                  <div class="mt-3 pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                    <span class="text-xs font-heading font-extrabold text-primary dark:text-primary-container">
                      ${food.nutrition.calories ? Math.round(food.nutrition.calories * (entry.lastPortion.quantity / (food.nutritionBasis.amount || 1))) : '—'} ${trHtml("kcal")}
                    </span>
                    <button 
                      type="button" 
                      onclick="window.openSetPortion(${htmlJsArg(entry.foodId)})"
                      class="px-2.5 py-1 rounded-lg bg-primary text-white text-[10px] font-bold shadow-xs active:scale-95 transition-all"
                    >
                      ${trHtml("Add Again")}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </section>
      ` : ''}

      <!-- Recent Foods List -->
      <section class="flex flex-col gap-2.5">
        <div class="flex items-center justify-between">
          <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">
            ${trHtml("Recent Foods (")}${recentFoods.length})
          </span>
          <button 
            type="button" 
            onclick="window.clearRecentFoods()" 
            class="text-[10px] text-error hover:underline font-semibold"
          >
            ${trHtml("Clear Recents")}
          </button>
        </div>

        <div class="flex flex-col gap-2">
          ${recentFoods.map(entry => renderRecentFoodCard(entry)).join('')}
        </div>
      </section>

    </div>
  `;
}

function renderRecentFoodCard(entry: RecentFoodEntry): string {
  const food = store.getFoodDefinitionById(entry.foodId);
  const foodName = food ? foodLabel(food, food.name) : tr("Logged Food");
  const brand = food?.brand;
  const relativeTime = formatRelativeTime(entry.lastUsedAt);

  // Calculate calories for the last portion
  let lastCal = 0;
  if (food && food.nutrition.calories !== null) {
    const basisAmount = food.nutritionBasis.amount || 1;
    lastCal = Math.round(food.nutrition.calories * (entry.lastPortion.quantity / basisAmount));
  }

  const portionDesc = portionLabel(entry.lastPortion, food?.source === 'built_in' || food?.source === 'demo') || `${entry.lastPortion.quantity} ${tr(entry.lastPortion.unit)}`;

  return `
    <div class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 shadow-xs flex items-center justify-between gap-3 hover:border-primary/40 transition-all group">
      
      <div 
        onclick="window.openSetPortion(${htmlJsArg(entry.foodId)})"
        class="flex-1 min-w-0 cursor-pointer"
        role="button"
        tabindex="0"
        aria-label="${trHtml("Log {0} again", foodName)}"
      >
        <div class="flex items-center gap-1.5">
          <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white truncate group-hover:text-primary transition-colors">
            ${escapeHtml(foodName)}
          </h4>
          ${brand ? `
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400 shrink-0">
              &bull; ${escapeHtml(brand)}
            </span>
          ` : ''}
        </div>

        <div class="flex items-center gap-2 mt-1 text-[10px] text-on-surface-variant dark:text-gray-400">
          <span class="font-semibold text-on-surface dark:text-gray-200">
            ${escapeHtml(portionDesc)}
          </span>
          <span>&bull;</span>
          <span class="font-bold text-primary dark:text-primary-container">
            ${lastCal > 0 ? tr("{0} kcal", lastCal) : ''}
          </span>
          <span>&bull;</span>
          <span>${relativeTime}</span>
        </div>

        <div class="flex items-center gap-2 mt-1.5">
          <span class="px-2 py-0.2 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high text-[9px] font-semibold text-on-surface-variant dark:text-gray-300">
            ${trHtml(entry.useCount === 1 ? "Logged {0} time" : "Logged {0} times", entry.useCount)}
          </span>
          <span class="text-[9px] font-medium text-on-surface-variant capitalize">
            ${trHtml("Default:")} ${trHtml(entry.lastMealType)}
          </span>
        </div>
      </div>

      <div class="flex items-center gap-1.5 shrink-0">
        <button 
          type="button" 
          onclick="window.openSetPortion(${htmlJsArg(entry.foodId)})"
          class="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1"
          aria-label="${trHtml("Add {0} again", foodName)}"
        >
          <span>${trHtml("Add Again")}</span>
        </button>

        <button 
          type="button" 
          onclick="window.removeRecentFood(${htmlJsArg(entry.foodId)})"
          class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
          aria-label="${trHtml("Remove from recents")}"
        >
          <span class="material-symbols-outlined text-[16px]">close</span>
        </button>
      </div>

    </div>
  `;
}

/**
 * Tab 2: My Foods (Custom Foods created by user)
 */
function renderMyFoodsTab(customFoods: FoodDefinition[]): string {
  return `
    <div class="flex flex-col gap-3.5">
      
      <!-- Create Custom Food CTA Header Banner -->
      <div class="p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/25 flex items-center justify-between">
        <div>
          <h3 class="font-heading font-bold text-xs text-on-surface dark:text-white">${trHtml("Custom Foods & Recipes")}</h3>
          <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">
            ${trHtml("Create foods with custom portions (e.g. scoops, bowls, slices)")}
          </p>
        </div>

        <button 
          type="button" 
          onclick="window.openCreateCustomFood()"
          class="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs hover:brightness-105 active:scale-95 transition-all flex items-center gap-1 shrink-0"
        >
          <span class="material-symbols-outlined text-[16px]">add</span>
          <span>${trHtml("Create Food")}</span>
        </button>
      </div>

      ${customFoods.length === 0 ? `
        <div class="p-8 text-center bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl border border-dashed border-outline-variant/40 flex flex-col items-center justify-center">
          <div class="w-12 h-12 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant flex items-center justify-center mb-2.5">
            <span class="material-symbols-outlined text-[26px]">restaurant_menu</span>
          </div>
          <h4 class="font-heading font-bold text-sm text-on-surface dark:text-white">${trHtml("No Custom Foods Yet")}</h4>
          <p class="text-xs text-on-surface-variant dark:text-gray-400 max-w-xs mt-1 leading-relaxed">
            ${trHtml("Save your homemade meals, meal prep, or special recipes to quickly log them with customized portion options.")}
          </p>
          <button 
            type="button" 
            onclick="window.openCreateCustomFood()"
            class="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-all flex items-center gap-1.5"
          >
            <span class="material-symbols-outlined text-[16px]">add</span>
            <span>${trHtml("Create First Custom Food")}</span>
          </button>
        </div>
      ` : `
        <div class="flex flex-col gap-2.5">
          ${customFoods.map(food => renderCustomFoodCard(food)).join('')}
        </div>
      `}

    </div>
  `;
}

function renderCustomFoodCard(food: FoodDefinition): string {
  const basis = food.nutritionBasis.servingDescription 
    ? food.nutritionBasis.servingDescription 
    : tr("per {0} {1}", food.nutritionBasis.amount, food.nutritionBasis.unit);

  const cal = food.nutrition.calories ?? '—';
  const pro = food.nutrition.protein !== null && food.nutrition.protein !== undefined ? `${food.nutrition.protein} ${trHtml("g")}` : '—';
  const carb = food.nutrition.carbs !== null && food.nutrition.carbs !== undefined ? `${food.nutrition.carbs} ${trHtml("g")}` : '—';
  const fat = food.nutrition.fat !== null && food.nutrition.fat !== undefined ? `${food.nutrition.fat} ${trHtml("g")}` : '—';

  return `
    <div class="p-4 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 shadow-xs flex flex-col gap-2.5 hover:border-primary/40 transition-all">
      
      <div class="flex items-start justify-between">
        <div class="flex-1 min-w-0 pr-2">
          <div class="flex items-center gap-1.5">
            <span class="px-2 py-0.2 rounded-md bg-tertiary/10 text-tertiary dark:text-tertiary-fixed text-[9px] font-extrabold uppercase tracking-wider">
              ${trHtml("Custom")}
            </span>
            ${food.brand ? `
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 truncate">
                ${escapeHtml(foodLabel(food, food.brand))}
              </span>
            ` : ''}
          </div>

          <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white mt-1 truncate">
            ${escapeHtml(foodLabel(food, food.name))}
          </h4>

          <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5">
            ${trHtml("Basis:")} <span class="font-medium text-on-surface dark:text-gray-200">${escapeHtml(basis)}</span>
            ${food.barcode ? tr("&bull; Barcode: {0}", escapeHtml(food.barcode)) : ''}
          </p>
        </div>

        <div class="flex items-center gap-1 shrink-0">
          <button 
            type="button" 
            onclick="window.openCreateCustomFood(${htmlJsArg(food.id)})"
            class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            aria-label="${trHtml("Edit")} ${escapeHtml(foodLabel(food, food.name))}"
          >
            <span class="material-symbols-outlined text-[16px]">edit</span>
          </button>

          <button 
            type="button" 
            onclick="window.confirmDeleteCustomFood(${htmlJsArg(food.id)})"
            class="w-8 h-8 rounded-full bg-surface-container-low dark:bg-dark-surface-card-high flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
            aria-label="${trHtml("Delete")} ${escapeHtml(foodLabel(food, food.name))}"
          >
            <span class="material-symbols-outlined text-[16px]">delete</span>
          </button>
        </div>
      </div>

      <!-- Macro Strip -->
      <div class="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high text-center text-xs">
        <div>
          <span class="text-[9px] font-bold text-on-surface-variant dark:text-gray-400 block uppercase">${trHtml("Calories")}</span>
          <span class="font-heading font-extrabold text-primary dark:text-primary-container">${cal}</span>
        </div>
        <div>
          <span class="text-[9px] font-bold text-on-surface-variant dark:text-gray-400 block uppercase">${trHtml("Protein")}</span>
          <span class="font-bold text-on-surface dark:text-white">${pro}</span>
        </div>
        <div>
          <span class="text-[9px] font-bold text-on-surface-variant dark:text-gray-400 block uppercase">${trHtml("Carbs")}</span>
          <span class="font-bold text-on-surface dark:text-white">${carb}</span>
        </div>
        <div>
          <span class="text-[9px] font-bold text-on-surface-variant dark:text-gray-400 block uppercase">${trHtml("Fat")}</span>
          <span class="font-bold text-on-surface dark:text-white">${fat}</span>
        </div>
      </div>

      <!-- Portion Options Chips (if any) -->
      ${food.portionOptions.length > 0 ? `
        <div class="flex flex-wrap gap-1 items-center">
          <span class="text-[9px] font-bold uppercase text-on-surface-variant mr-1">${trHtml("Portions:")}</span>
          ${food.portionOptions.map(opt => `
            <span class="px-2 py-0.5 rounded-md bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-[10px] font-medium text-on-surface dark:text-gray-300">
              ${escapeHtml(foodLabel(food, opt.label))}
            </span>
          `).join('')}
        </div>
      ` : ''}

      <!-- Set Portion Action Button -->
      <button 
        type="button" 
        onclick="window.openSetPortion(${htmlJsArg(food.id)})"
        class="w-full py-2.5 rounded-xl bg-primary/10 hover:bg-primary text-primary hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-[0.99]"
      >
        <span class="material-symbols-outlined text-[16px]">tune</span>
        <span>${trHtml("Set Portion & Log to Diary")}</span>
      </button>

    </div>
  `;
}

/**
 * Tab 3: All Foods (Built-in + Custom Foods)
 */
function renderAllFoodsTab(searchQuery = ''): string {
  const allFoods = store.searchFoods(searchQuery, undefined, 'allFoods');

  return `
    <div class="flex flex-col gap-2.5">
      <div class="flex items-center justify-between">
        <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400" id="all-foods-counter">
          ${trHtml("Verified Catalog & Custom Foods (")}${allFoods.length})
        </span>
        <span class="text-[10px] text-on-surface-variant dark:text-gray-400">${trHtml("Tap to set portion")}</span>
      </div>

      <div id="all-foods-list-container" class="flex flex-col gap-2">
        ${allFoods.map(food => renderFoodDefinitionCard(food)).join('')}
      </div>
    </div>
  `;
}

export function renderFoodDefinitionCard(food: FoodDefinition): string {
  const isCustom = food.source === 'custom';
  const basisText = food.nutritionBasis.servingDescription 
    ? food.nutritionBasis.servingDescription 
    : tr("per {0} {1}", food.nutritionBasis.amount, food.nutritionBasis.unit);

  const cal = food.nutrition.calories ?? '—';
  const pro = food.nutrition.protein !== null && food.nutrition.protein !== undefined ? tr("{0}g P", food.nutrition.protein) : '';
  const carb = food.nutrition.carbs !== null && food.nutrition.carbs !== undefined ? tr("{0}g C", food.nutrition.carbs) : '';
  const fat = food.nutrition.fat !== null && food.nutrition.fat !== undefined ? tr("{0}g F", food.nutrition.fat) : '';
  const macrosSummary = [pro, carb, fat].filter(Boolean).join(' • ');

  return `
    <button 
      type="button" 
      onclick="window.openSetPortion(${htmlJsArg(food.id)})"
      aria-label="${trHtml("Configure portion for")} ${escapeHtml(foodLabel(food, food.name))}"
      class="w-full text-left bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-xs hover:border-primary/50 active:scale-[0.99] transition-all flex items-center justify-between group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary min-h-[64px]"
    >
      <div class="flex items-center gap-3 min-w-0">
        <div class="w-10 h-10 rounded-xl ${isCustom ? 'bg-tertiary/10 text-tertiary dark:text-tertiary-fixed' : 'bg-primary/10 text-primary dark:text-primary-container'} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
          <span class="material-symbols-outlined text-[20px]">${escapeHtml(food.icon || (isCustom ? 'restaurant_menu' : 'nutrition'))}</span>
        </div>
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white group-hover:text-primary transition-colors truncate">
              ${escapeHtml(foodLabel(food, food.name))}
            </h4>
            ${isCustom ? `
              <span class="px-1.5 py-0.2 rounded bg-tertiary/10 text-tertiary dark:text-tertiary-fixed text-[8px] font-extrabold uppercase">
                ${trHtml("Custom")}
              </span>
            ` : ''}
          </div>

          <p class="text-[10px] text-on-surface-variant dark:text-gray-400 mt-0.5 truncate">
            ${escapeHtml(foodLabel(food, basisText))} ${macrosSummary ? tr("&bull; {0}", macrosSummary) : ''}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <div class="text-right">
          <span class="font-heading font-extrabold text-xs text-on-surface dark:text-white block">
            ${cal} ${trHtml("kcal")}
          </span>
          <span class="text-[9px] text-primary dark:text-primary-container font-semibold">
            ${trHtml("Set Portion &rarr;")}
          </span>
        </div>
      </div>
    </button>
  `;
}
