import { store } from '../store/appState';
import type { MealType } from '../types/index.ts';

export function renderQuickLogScreen(): string {
  const state = store.getState();
  const activeDate = state.selectedDate;
  const nowTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return `
    <div class="flex flex-col min-h-screen pb-28 bg-surface dark:bg-dark-surface transition-colors">
      
      <!-- Top App Bar -->
      <header class="sticky top-0 z-40 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20 shadow-sm">
        <div class="flex items-center gap-2.5">
          <button 
            onclick="window.navigateApp('dashboard')" 
            aria-label="Back to Dashboard" 
            class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
          >
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <h1 class="font-heading font-bold text-base text-on-surface dark:text-white leading-tight">Quick Food Log</h1>
            <p class="text-[10px] text-on-surface-variant dark:text-gray-400">Enter custom calories and macronutrients</p>
          </div>
        </div>

        <span class="px-2 py-0.5 rounded-full bg-primary/10 text-primary dark:text-primary-container text-[10px] font-extrabold uppercase border border-primary/20">
          Manual Entry
        </span>
      </header>

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-4">
        
        <!-- Validation Error Banner (hidden by default) -->
        <div id="quicklog-error-banner" class="hidden p-3 rounded-2xl bg-error/10 border border-error/30 text-error flex items-center gap-2.5 text-xs animate-shake">
          <span class="material-symbols-outlined text-[20px] shrink-0">error</span>
          <span id="quicklog-error-message" class="font-medium">Please enter a valid food name and positive calorie count.</span>
        </div>

        <!-- Form Card -->
        <form id="quicklog-form" onsubmit="event.preventDefault(); window.submitQuickLog();" class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-5 border border-outline-variant/30 shadow-ambient flex flex-col gap-4">
          
          <!-- Food Name -->
          <div class="flex flex-col gap-1.5">
            <label for="ql-food-name" class="text-xs font-bold text-on-surface dark:text-white flex items-center justify-between">
              <span>Food Name <span class="text-error">*</span></span>
              <span class="text-[10px] text-on-surface-variant font-normal">e.g. Grilled Chicken Salad</span>
            </label>
            <input 
              type="text" 
              id="ql-food-name" 
              required
              placeholder="Enter meal or item name"
              class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs font-medium text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Meal Type Selection -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-bold text-on-surface dark:text-white">Meal Category <span class="text-error">*</span></label>
            <div class="grid grid-cols-4 gap-1.5">
              ${(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map((type, idx) => `
                <label class="cursor-pointer">
                  <input type="radio" name="ql-meal-type" value="${type}" ${idx === 1 ? 'checked' : ''} class="peer sr-only" />
                  <div class="py-2 text-center rounded-xl text-xs font-bold capitalize border border-outline-variant/30 peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary peer-checked:shadow-sm bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant transition-all">
                    ${type}
                  </div>
                </label>
              `).join('')}
            </div>
          </div>

          <!-- Portion Size (Quantity & Unit) -->
          <div class="flex flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label class="text-xs font-bold text-on-surface dark:text-white">Portion Size <span class="text-error">*</span></label>
              <span class="text-[10px] text-on-surface-variant">e.g. 1 serving, 250 g, 2 slices</span>
            </div>

            <div class="grid grid-cols-2 gap-2.5">
              <input 
                type="number" 
                id="ql-quantity" 
                min="0.1" 
                step="any"
                inputmode="decimal"
                value="1" 
                required
                placeholder="Qty"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />

              <select 
                id="ql-unit"
                class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary capitalize"
              >
                <option value="serving" selected>serving</option>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="oz">oz</option>
                <option value="cup">cup</option>
                <option value="scoop">scoop</option>
                <option value="bowl">bowl</option>
                <option value="piece">piece</option>
                <option value="slice">slice</option>
                <option value="tbsp">tbsp</option>
                <option value="tsp">tsp</option>
              </select>
            </div>
          </div>

          <!-- Serving Label / Description -->
          <div class="flex flex-col gap-1.5">
            <label for="ql-serving" class="text-xs font-bold text-on-surface dark:text-white">Serving Description (Optional)</label>
            <input 
              type="text" 
              id="ql-serving" 
              placeholder="e.g. 1 medium bowl, 1 large slice"
              class="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs font-medium text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <!-- Save to My Foods Checkbox -->
          <div class="p-3 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 flex items-start gap-3">
            <input 
              type="checkbox" 
              id="ql-save-to-my-foods" 
              class="mt-0.5 w-4 h-4 rounded text-primary focus:ring-primary border-outline-variant cursor-pointer"
            />
            <label for="ql-save-to-my-foods" class="cursor-pointer select-none">
              <span class="font-heading font-bold text-xs text-on-surface dark:text-white block">Save this food to My Foods</span>
              <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block mt-0.5 leading-tight">
                Add to your personal custom food database so you can find, edit, and log it again with portion options anytime.
              </span>
            </label>
          </div>

          <!-- Calories & Macros Grid -->
          <div class="pt-2 border-t border-outline-variant/20 flex flex-col gap-3">
            <span class="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Nutritional Values</span>
            
            <!-- Calories (Primary) -->
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl flex items-center justify-between border border-outline-variant/20">
              <div>
                <label for="ql-calories" class="font-heading font-bold text-xs text-on-surface dark:text-white block">Energy (Calories) <span class="text-error">*</span></label>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400">Total estimated kcal</span>
              </div>
              <div class="flex items-center gap-1.5">
                <input 
                  type="number" 
                  id="ql-calories" 
                  min="0" 
                  step="1" 
                  required
                  placeholder="0"
                  class="w-24 text-right px-3 py-1.5 rounded-lg bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/40 font-heading font-extrabold text-sm text-primary dark:text-primary-container focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <span class="text-xs font-bold text-on-surface-variant">kcal</span>
              </div>
            </div>

            <!-- Macros 3-Column -->
            <div class="grid grid-cols-3 gap-2">
              <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-2.5 rounded-xl">
                <label for="ql-protein" class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400 block uppercase">Protein</label>
                <div class="flex items-center gap-1 mt-1">
                  <input 
                    type="number" 
                    id="ql-protein" 
                    min="0" 
                    step="0.1" 
                    placeholder="0"
                    class="w-full text-right px-2 py-1 rounded bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span class="text-[10px] font-semibold text-on-surface-variant">g</span>
                </div>
              </div>

              <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-2.5 rounded-xl">
                <label for="ql-carbs" class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400 block uppercase">Carbs</label>
                <div class="flex items-center gap-1 mt-1">
                  <input 
                    type="number" 
                    id="ql-carbs" 
                    min="0" 
                    step="0.1" 
                    placeholder="0"
                    class="w-full text-right px-2 py-1 rounded bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span class="text-[10px] font-semibold text-on-surface-variant">g</span>
                </div>
              </div>

              <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-2.5 rounded-xl">
                <label for="ql-fat" class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400 block uppercase">Fat</label>
                <div class="flex items-center gap-1 mt-1">
                  <input 
                    type="number" 
                    id="ql-fat" 
                    min="0" 
                    step="0.1" 
                    placeholder="0"
                    class="w-full text-right px-2 py-1 rounded bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 text-xs font-bold text-on-surface dark:text-white focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <span class="text-[10px] font-semibold text-on-surface-variant">g</span>
                </div>
              </div>
            </div>

          </div>

          <!-- Date & Time Row -->
          <div class="grid grid-cols-2 gap-2 pt-2 border-t border-outline-variant/20">
            <div class="flex flex-col gap-1">
              <label for="ql-date" class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400 uppercase">Log Date</label>
              <input 
                type="date" 
                id="ql-date" 
                value="${activeDate}"
                class="px-2.5 py-1.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs font-medium text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="ql-time" class="text-[10px] font-bold text-on-surface-variant dark:text-gray-400 uppercase">Log Time</label>
              <input 
                type="text" 
                id="ql-time" 
                value="${nowTime}"
                placeholder="12:30 PM"
                class="px-2.5 py-1.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-xs font-medium text-on-surface dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <!-- Form Actions -->
          <div class="flex flex-col gap-2 pt-3">
            <button 
              type="submit" 
              class="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-white font-heading text-xs font-extrabold shadow-glow-primary active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span class="material-symbols-outlined text-[18px]">save</span>
              <span>Save Meal to Diary</span>
            </button>

            <button 
              type="button" 
              onclick="window.navigateApp('dashboard')" 
              class="w-full py-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card text-xs font-bold text-on-surface-variant hover:text-on-surface active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>

        </form>

      </main>

    </div>
  `;
}
