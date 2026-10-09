import { store } from '../store/appState';
import { 
  getDateRangeKeys, 
  calculateDailyNutritionTotals, 
  calculateNutritionAverages, 
  calculateWorkoutTotals, 
  calculatePercentageChange, 
  calculateLoggingStreak, 
  calculateWorkoutStreak, 
  calculateGoalAdherence, 
  generateInsightMessages,
  type DailyNutritionSummary,
  type MetricDelta 
} from '../utils/insightCalculations';
import { calculateMicronutrientTrends } from '../utils/nutrientCalculations';
import { htmlJsArg, escapeHtml } from '../utils/sanitize';
import { renderAppHeader } from '../components/Navigation/AppHeader';

export function renderInsightsScreen(): string {
  const state = store.getState();
  const range = state.selectedInsightRange || 7;
  const activeTab = state.selectedInsightTab || 'calories';
  const selectedNutrientCategory = state.selectedInsightNutrientCategory || 'all';

  // 1. Current Period Keys & Previous Period Keys for Comparison
  const curDateKeys = getDateRangeKeys(range, 0);
  const prevDateKeys = getDateRangeKeys(range, 1);

  // Micronutrient Trends (calculated strictly from user logs, demo excluded)
  const microTrends = calculateMicronutrientTrends(state.meals, curDateKeys);
  const filteredNutrients = selectedNutrientCategory === 'all'
    ? microTrends.nutrients
    : microTrends.nutrients.filter(n => {
        if (selectedNutrientCategory === 'vitamins') return n.category === 'vitamin';
        if (selectedNutrientCategory === 'minerals') return n.category === 'mineral';
        return n.category === 'other';
      });

  // 2. Aggregate Nutrition
  const curDailyTotals = calculateDailyNutritionTotals(state.meals, curDateKeys);
  const prevDailyTotals = calculateDailyNutritionTotals(state.meals, prevDateKeys);

  const curNutritionAvg = calculateNutritionAverages(curDailyTotals);
  const prevNutritionAvg = calculateNutritionAverages(prevDailyTotals);

  // 3. Aggregate Workouts
  const curWorkoutTotals = calculateWorkoutTotals(state.workoutHistory, curDateKeys);
  const prevWorkoutTotals = calculateWorkoutTotals(state.workoutHistory, prevDateKeys);

  // 4. Calculate Deltas
  const deltaCalories = calculatePercentageChange(curNutritionAvg.avgCalories, prevNutritionAvg.avgCalories);
  const deltaProtein = calculatePercentageChange(curNutritionAvg.avgProtein, prevNutritionAvg.avgProtein);
  const deltaDuration = calculatePercentageChange(curWorkoutTotals.totalDurationMinutes, prevWorkoutTotals.totalDurationMinutes);
  const deltaWorkouts = calculatePercentageChange(curWorkoutTotals.completedWorkoutCount, prevWorkoutTotals.completedWorkoutCount);
  const deltaVolume = calculatePercentageChange(curWorkoutTotals.totalVolumeKg, prevWorkoutTotals.totalVolumeKg);

  // 5. Streaks & Adherence
  const loggingStreak = calculateLoggingStreak(state.meals);
  const workoutStreak = calculateWorkoutStreak(state.workoutHistory);
  const adherence = calculateGoalAdherence(
    curDailyTotals,
    state.calorieTarget,
    145, // default protein target
    state.waterByDate,
    state.waterTarget,
    curWorkoutTotals
  );

  // 6. PRs (computed from completed sets)
  const prs = store.calculatePersonalRecords();

  // 7. Rule-based Insight Messages
  const insightMessages = generateInsightMessages(
    range,
    curNutritionAvg,
    curWorkoutTotals,
    adherence,
    deltaCalories,
    deltaVolume
  );
  return `
    <div class="flex flex-col min-h-screen pb-28 bg-surface dark:bg-dark-surface transition-colors">
      
      ${renderAppHeader({
        state,
        subtitleType: 'default',
        showQuickAdd: true,
        quickAddAriaLabel: 'Quick add',
      })}

      <!-- Main Canvas -->
      <main class="px-screen-gutter flex flex-col gap-4 pt-3">
        
        <!-- Timeframe Range Selector (7 / 30 / 90 Days) -->
        <div class="w-full bg-surface-container-low dark:bg-dark-surface-card p-1 rounded-full flex items-center border border-outline-variant/30 shadow-sm">
          ${([7, 30, 90] as (7 | 30 | 90)[]).map(r => `
            <button 
              onclick="window.setInsightRange(${r})" 
              class="flex-1 py-1.5 px-3 rounded-full font-heading text-xs font-bold transition-all ${
                range === r 
                  ? 'bg-surface-container-lowest dark:bg-dark-surface-card-high text-primary dark:text-primary-container shadow-sm' 
                  : 'text-on-surface-variant dark:text-gray-400 hover:text-primary'
              }"
            >
              ${r} Days
            </button>
          `).join('')}
        </div>

        <!-- A. WEEKLY OVERVIEW METRICS GRID -->
        <section class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <h2 class="font-heading font-bold text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Period Overview</h2>
            <span class="text-[10px] text-on-surface-variant dark:text-gray-400">vs previous ${range}d</span>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <!-- Avg Calories -->
            ${renderOverviewCard('Avg Daily Calories', `${curNutritionAvg.avgCalories.toLocaleString()}`, 'kcal', deltaCalories, 'local_fire_department', 'neutral')}
            
            <!-- Avg Protein -->
            ${renderOverviewCard('Avg Daily Protein', `${curNutritionAvg.avgProtein}`, 'g', deltaProtein, 'egg_alt', 'protein')}
            
            <!-- Total Training Duration -->
            ${renderOverviewCard('Training Time', `${curWorkoutTotals.totalDurationMinutes}`, 'min', deltaDuration, 'timer', 'fitness')}
            
            <!-- Workouts Completed -->
            ${renderOverviewCard('Workouts Completed', `${curWorkoutTotals.completedWorkoutCount}`, 'sessions', deltaWorkouts, 'fitness_center', 'fitness')}
          </div>
        </section>

        <!-- B. NUTRITION TRENDS (CALORIES & MACROS CHART) -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-heading font-bold text-sm text-on-surface dark:text-white">Nutrition Trajectory</h3>
              <p class="text-[11px] text-on-surface-variant dark:text-gray-400">Daily intake over ${range} days</p>
            </div>

            <!-- Sub-segmented Toggle: Calories vs Macros -->
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-0.5 rounded-xl flex items-center border border-outline-variant/30">
              <button 
                onclick="window.setInsightTab('calories')" 
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  activeTab === 'calories' 
                    ? 'bg-surface-container-lowest dark:bg-dark-surface-card text-primary shadow-xs' 
                    : 'text-on-surface-variant'
                }"
              >
                Calories
              </button>
              <button 
                onclick="window.setInsightTab('macros')" 
                class="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                  activeTab === 'macros' 
                    ? 'bg-surface-container-lowest dark:bg-dark-surface-card text-primary shadow-xs' 
                    : 'text-on-surface-variant'
                }"
              >
                Macros
              </button>
            </div>
          </div>

          <!-- Chart Canvas -->
          ${activeTab === 'calories' 
            ? renderCaloriesChart(curDailyTotals, state.calorieTarget) 
            : renderMacrosChart(curDailyTotals, 145)
          }

        </section>

        <!-- C. FITNESS & PROGRESSIVE OVERLOAD TRENDS -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-heading font-bold text-sm text-on-surface dark:text-white">Fitness & Volume Trends</h3>
              <p class="text-[11px] text-on-surface-variant dark:text-gray-400">Mechanical load from verified completed sets</p>
            </div>
            <span class="text-xs font-extrabold text-primary dark:text-primary-container">
              ${curWorkoutTotals.totalVolumeKg.toLocaleString()} kg total vol
            </span>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center pt-1">
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-2.5 rounded-xl">
              <span class="text-[10px] font-bold uppercase text-on-surface-variant dark:text-gray-400 block mb-0.5">Completed Sets</span>
              <span class="font-heading font-extrabold text-base text-on-surface dark:text-white">${curWorkoutTotals.totalCompletedSets}</span>
            </div>
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-2.5 rounded-xl">
              <span class="text-[10px] font-bold uppercase text-on-surface-variant dark:text-gray-400 block mb-0.5">Total Volume</span>
              <span class="font-heading font-extrabold text-base text-primary dark:text-primary-container">${curWorkoutTotals.totalVolumeKg.toLocaleString()} kg</span>
            </div>
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-2.5 rounded-xl">
              <span class="text-[10px] font-bold uppercase text-on-surface-variant dark:text-gray-400 block mb-0.5">Avg / Session</span>
              <span class="font-heading font-extrabold text-base text-on-surface dark:text-white">
                ${curWorkoutTotals.completedWorkoutCount > 0 ? Math.round(curWorkoutTotals.totalVolumeKg / curWorkoutTotals.completedWorkoutCount).toLocaleString() : 0} kg
              </span>
            </div>
          </div>

          <!-- Workouts in this period list -->
          <div class="flex flex-col gap-2 pt-1 border-t border-outline-variant/20">
            <span class="text-[10px] font-bold uppercase text-on-surface-variant dark:text-gray-400">Sessions in this range (${curWorkoutTotals.workouts.length})</span>
            ${curWorkoutTotals.workouts.length === 0 ? `
              <p class="text-xs text-on-surface-variant dark:text-gray-400 text-center py-2">No workout sessions logged within this ${range}-day window.</p>
            ` : `
              <div class="flex flex-col gap-1.5">
                ${curWorkoutTotals.workouts.map(w => `
                  <button 
                    type="button"
                    onclick="window.openWorkoutDetail(${htmlJsArg(w.id)})"
                    class="w-full text-left p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 hover:border-primary/40 active:scale-[0.99] transition-all flex items-center justify-between group cursor-pointer"
                  >
                    <div class="flex items-center gap-2">
                      <div class="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs">
                        <span class="material-symbols-outlined text-[16px]">fitness_center</span>
                      </div>
                      <div>
                        <span class="font-heading font-bold text-xs text-on-surface dark:text-white group-hover:text-primary transition-colors">${escapeHtml(w.name)}</span>
                        <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">
                          ${new Date(w.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} &bull; ${Math.round(w.durationSeconds / 60)} min
                        </span>
                      </div>
                    </div>
                    <div class="flex items-center gap-1.5">
                      <span class="font-heading font-bold text-xs text-on-surface dark:text-white">${w.totalVolume.toLocaleString()} kg</span>
                      <span class="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span>
                    </div>
                  </button>
                `).join('')}
              </div>
            `}
          </div>

        </section>

        <!-- D. CONSISTENCY & GOAL ADHERENCE -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <h3 class="font-heading font-bold text-sm text-on-surface dark:text-white">Consistency & Streaks</h3>
          
          <div class="grid grid-cols-2 gap-2.5">
            <!-- Nutrition Streak -->
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl border border-outline-variant/20 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-orange-500/10 text-[#FF6B00] flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">local_fire_department</span>
              </div>
              <div>
                <span class="font-heading font-extrabold text-base text-on-surface dark:text-white">${loggingStreak} days</span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Logging Streak</span>
              </div>
            </div>

            <!-- Workout Streak -->
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl border border-outline-variant/20 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">fitness_center</span>
              </div>
              <div>
                <span class="font-heading font-extrabold text-base text-on-surface dark:text-white">${workoutStreak} days</span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Workout Streak</span>
              </div>
            </div>

            <!-- Protein Goal Met Days -->
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl border border-outline-variant/20 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">egg_alt</span>
              </div>
              <div>
                <span class="font-heading font-extrabold text-base text-on-surface dark:text-white">${adherence.proteinGoalMetDays} / ${range}</span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Protein Target Met</span>
              </div>
            </div>

            <!-- Hydration Met Days -->
            <div class="bg-surface-container-low dark:bg-dark-surface-card-high p-3 rounded-xl border border-outline-variant/20 flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">water_drop</span>
              </div>
              <div>
                <span class="font-heading font-extrabold text-base text-on-surface dark:text-white">${adherence.hydrationGoalMetDays} / ${range}</span>
                <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">Hydration Target Met</span>
              </div>
            </div>
          </div>
        </section>

        <!-- E. PERSONAL PROGRESS (VERIFIED RECORDS) -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <span class="material-symbols-outlined text-[18px] text-amber-500">emoji_events</span>
              <h3 class="font-heading font-bold text-sm text-on-surface dark:text-white">Personal Records Progress</h3>
            </div>
            <span class="text-[10px] text-primary font-semibold">${prs.length} Verified</span>
          </div>

          ${prs.length === 0 ? `
            <div class="p-4 rounded-xl border border-dashed border-outline-variant/40 text-center">
              <p class="text-xs text-on-surface-variant dark:text-gray-400">Complete weighted exercises to establish your first verified PR.</p>
            </div>
          ` : `
            <div class="flex flex-col gap-2">
              ${prs.slice(0, 4).map(pr => `
                <button 
                  type="button"
                  onclick="window.openPersonalRecordDetail(${htmlJsArg(pr.id)})"
                  class="w-full text-left p-3 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 hover:border-primary/40 active:scale-[0.99] transition-all flex items-center justify-between group cursor-pointer"
                >
                  <div>
                    <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white group-hover:text-primary transition-colors">${escapeHtml(pr.exerciseName)}</h4>
                    <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${escapeHtml(pr.muscleGroup)} &bull; ${pr.achievedAt}</span>
                  </div>

                  <div class="flex items-center gap-2">
                    <div class="text-right">
                      <span class="font-heading font-extrabold text-xs text-on-surface dark:text-white block">${pr.weightKg} kg &times; ${pr.reps}</span>
                      <span class="text-[9px] text-primary dark:text-primary-container font-semibold">1RM: ${pr.estimatedOneRepMax} kg</span>
                    </div>
                    <span class="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">chevron_right</span>
                  </div>
                </button>
              `).join('')}
            </div>
          `}
        </section>

        <!-- F. MICRONUTRIENT TRENDS -->
        <section class="bg-surface-container-lowest dark:bg-dark-surface-card rounded-2xl p-4 border border-outline-variant/30 shadow-ambient flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <div>
              <div class="flex items-center gap-1.5">
                <h3 class="font-heading font-bold text-sm text-on-surface dark:text-white">Micronutrient Trends</h3>
                <span class="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary dark:text-primary-container text-[9px] font-extrabold uppercase">Vitamins &amp; Trace</span>
              </div>
              <p class="text-[11px] text-on-surface-variant dark:text-gray-400">Intake evaluation over ${range} days</p>
            </div>

            <span class="text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              microTrends.hasMinimumCoverage 
                ? 'bg-primary/10 text-primary dark:text-primary-container border-primary/20' 
                : 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant border-outline-variant/30'
            }">
              ${microTrends.overallCoveragePercent}% Coverage
            </span>
          </div>

          <!-- Coverage & Threshold Banner -->
          <div class="p-2.5 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="material-symbols-outlined text-[18px] text-primary">pie_chart</span>
              <span class="text-[11px] text-on-surface dark:text-gray-200">
                Data recorded for <strong>${microTrends.mealsWithMicronutrientData} of ${microTrends.totalLoggedMeals} meals</strong> in this ${range}-day window
              </span>
            </div>
          </div>

          <!-- Category Filter Pills -->
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            ${(['all', 'vitamins', 'minerals', 'other'] as const).map(cat => {
              const isActive = selectedNutrientCategory === cat;
              const label = cat === 'all' ? 'All Nutrients' : cat === 'vitamins' ? 'Vitamins' : cat === 'minerals' ? 'Minerals' : 'Other';
              return `
                <button 
                  type="button"
                  onclick="window.setInsightNutrientCategory(${htmlJsArg(cat)})"
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

          <!-- Top Tracked Nutrients Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            ${filteredNutrients.slice(0, 8).map(n => {
              const isInsufficient = n.status === 'insufficient_data';
              const isTargetMet = n.status === 'target_met' || n.status === 'within_limit';
              const isNear = n.status === 'near_target' || n.status === 'near_limit';
              const isAlert = n.status === 'below_target' || n.status === 'above_limit';

              const badgeColor = isTargetMet 
                ? 'bg-primary/10 text-primary dark:text-primary-container border-primary/20' 
                : isNear 
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' 
                  : isAlert 
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' 
                    : 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant border-outline-variant/30';

              return `
                <div class="p-3 rounded-2xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/20 flex flex-col gap-1.5">
                  <div class="flex items-start justify-between">
                    <div>
                      <span class="font-heading font-bold text-xs text-on-surface dark:text-white block leading-tight">${escapeHtml(n.name)}</span>
                      <span class="text-[10px] text-on-surface-variant dark:text-gray-400">
                        ${n.referenceValue !== null ? `Ref: ${n.referenceValue} ${n.unit} (${n.direction === 'maximum_limit' ? 'max' : 'target'})` : 'Informational'}
                      </span>
                    </div>

                    <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${badgeColor}">
                      ${n.statusLabel}
                    </span>
                  </div>

                  <div class="flex items-baseline justify-between pt-1">
                    <div>
                      <span class="text-[10px] text-on-surface-variant dark:text-gray-400 uppercase font-semibold">Daily Avg</span>
                      <div class="font-heading font-extrabold text-sm text-primary dark:text-primary-container">
                        ${isInsufficient ? 'Insufficient data' : `${n.avgDailyIntake} ${n.unit}`}
                      </div>
                    </div>

                    <div class="text-right">
                      <span class="text-[10px] text-on-surface-variant dark:text-gray-400 block">${n.totalMealsReporting} meals logged</span>
                    </div>
                  </div>

                  <p class="text-[10px] text-on-surface-variant dark:text-gray-400 italic pt-0.5">
                    ${escapeHtml(n.guidanceText)}
                  </p>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Non-medical Disclaimer -->
          <div class="p-2.5 rounded-xl bg-surface-container-low/60 dark:bg-dark-surface-card/60 border border-outline-variant/20 text-[10px] text-on-surface-variant dark:text-gray-400 leading-relaxed">
            These insights are based on logged meals and may not represent total dietary intake. Consult healthcare professionals for clinical nutritional evaluations.
          </div>
        </section>

        <!-- G. RULE-BASED INSIGHT MESSAGES -->
        <section class="flex flex-col gap-2 pt-1">
          <div class="flex items-center justify-between">
            <h3 class="font-heading font-bold text-xs uppercase tracking-wider text-on-surface-variant dark:text-gray-400">Activity & Nutrition Analysis</h3>
            <span class="text-[10px] text-primary dark:text-primary-container font-semibold">Automated Assessment</span>
          </div>

          <div class="flex flex-col gap-2">
            ${insightMessages.map(msg => `
              <div class="p-3.5 rounded-2xl bg-surface-container-lowest dark:bg-dark-surface-card border border-outline-variant/30 shadow-sm flex items-start gap-3">
                <div class="w-8 h-8 rounded-xl ${
                  msg.status === 'positive' 
                    ? 'bg-primary/10 text-primary dark:text-primary-container' 
                    : msg.status === 'attention' 
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' 
                      : 'bg-surface-container-low dark:bg-dark-surface-card-high text-on-surface-variant'
                } flex items-center justify-center shrink-0 mt-0.5">
                  <span class="material-symbols-outlined text-[18px]">${msg.icon}</span>
                </div>
                <div>
                  <h4 class="font-heading font-bold text-xs text-on-surface dark:text-white leading-snug">${escapeHtml(msg.title)}</h4>
                  <p class="text-[11px] text-on-surface-variant dark:text-gray-400 mt-0.5 leading-relaxed">${escapeHtml(msg.text)}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </section>

      </main>

    </div>
  `;
}

function renderOverviewCard(
  title: string, 
  value: string, 
  unit: string, 
  delta: MetricDelta | null, 
  icon: string,
  semantics: 'neutral' | 'protein' | 'fitness'
): string {
  let deltaHtml = '';
  if (delta && delta.hasEnoughData) {
    const isUp = delta.direction === 'up';
    const isDown = delta.direction === 'down';
    const iconName = isUp ? 'trending_up' : isDown ? 'trending_down' : 'trending_flat';
    
    // Neutral semantic color: does NOT automatically mark up as green "good" for calories
    const colorClass = semantics === 'neutral'
      ? 'text-on-surface-variant dark:text-gray-400 bg-surface-container/60'
      : isUp 
        ? 'text-primary dark:text-primary-container bg-primary/10' 
        : 'text-on-surface-variant bg-surface-container/60';

    deltaHtml = `
      <div class="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md ${colorClass} text-[10px] font-bold mt-1">
        <span class="material-symbols-outlined text-[12px]">${iconName}</span>
        <span>${isUp ? '+' : isDown ? '-' : ''}${delta.percent}%</span>
      </div>
    `;
  } else {
    deltaHtml = `
      <span class="text-[10px] text-on-surface-variant/70 dark:text-gray-500 block mt-1">
        Not enough previous data
      </span>
    `;
  }

  return `
    <div class="bg-surface-container-lowest dark:bg-dark-surface-card p-3.5 rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col justify-between">
      <div class="flex items-center justify-between text-on-surface-variant dark:text-gray-400 mb-1">
        <span class="text-[10px] font-bold uppercase truncate max-w-[110px]">${title}</span>
        <span class="material-symbols-outlined text-[16px] text-primary">${icon}</span>
      </div>

      <div>
        <div class="flex items-baseline gap-1">
          <span class="font-heading font-extrabold text-xl text-on-surface dark:text-white leading-tight">${value}</span>
          <span class="text-xs font-medium text-on-surface-variant dark:text-gray-400">${unit}</span>
        </div>
        ${deltaHtml}
      </div>
    </div>
  `;
}

function renderCaloriesChart(dailyTotals: DailyNutritionSummary[], targetCal: number): string {
  const maxCal = Math.max(targetCal * 1.25, ...dailyTotals.map(d => d.calories), 1000);
  const colCount = dailyTotals.length;
  const isDense = colCount > 14;

  return `
    <div class="flex flex-col gap-2 pt-2">
      <!-- Target Legend line -->
      <div class="flex items-center justify-between text-[10px] text-on-surface-variant dark:text-gray-400 px-1">
        <div class="flex items-center gap-1.5">
          <span class="w-3 h-0.5 bg-primary/80 rounded-full inline-block"></span>
          <span>Target: <strong>${targetCal} kcal</strong></span>
        </div>
        <span class="text-[9px] text-on-surface-variant/70">Tap bar to inspect day</span>
      </div>

      <!-- Accessible Bar Representation -->
      <div class="relative w-full h-[140px] flex items-end justify-between gap-1 pt-4 pb-1 px-1 bg-surface-container-low dark:bg-dark-surface-card-high rounded-xl border border-outline-variant/20 overflow-x-auto">
        
        <!-- Target Line across container -->
        <div 
          class="absolute left-0 right-0 border-b border-dashed border-primary/60 z-0 pointer-events-none"
          style="bottom: ${(targetCal / maxCal) * 100}%;"
        ></div>

        <!-- Bars -->
        ${dailyTotals.map((day, idx) => {
          const heightPct = Math.min(100, Math.round((day.calories / maxCal) * 100));
          const isOver = day.calories > targetCal;
          const isZero = day.calories === 0;

          return `
            <div 
              class="flex-1 flex flex-col items-center justify-end h-full z-10 group relative cursor-pointer"
              onclick="window.showDayDetailToast(${htmlJsArg(day.fullDateLabel)}, '${day.calories} kcal logged across ${day.mealCount} meals')"
            >
              <!-- Tooltip on hover/touch -->
              <div class="hidden group-hover:flex absolute -top-8 bg-black/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                ${day.calories} kcal
              </div>

              <!-- Bar Fill -->
              <div 
                class="w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                  isZero 
                    ? 'bg-outline-variant/20 h-1' 
                    : isOver 
                      ? 'bg-amber-500/80 dark:bg-amber-400/80 group-hover:bg-amber-500' 
                      : 'bg-primary/80 dark:bg-primary-container group-hover:bg-primary'
                }"
                style="height: ${Math.max(4, heightPct)}%;"
              ></div>

              <!-- Label underneath -->
              <span class="text-[9px] text-on-surface-variant dark:text-gray-400 mt-1 font-semibold truncate ${
                isDense && idx % Math.ceil(colCount / 7) !== 0 ? 'opacity-0' : 'opacity-100'
              }">
                ${day.dayLabel.charAt(0)}
              </span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Inspection Banner Display -->
      <div id="day-detail-toast" class="hidden p-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-[11px] text-on-surface dark:text-gray-200 flex items-center justify-between animate-fade-in">
        <span id="day-detail-toast-text" class="font-medium"></span>
        <button onclick="document.getElementById('day-detail-toast')?.classList.add('hidden')" class="text-on-surface-variant text-xs ml-2">&times;</button>
      </div>

      <p class="sr-only">Calories chart displaying ${colCount} days of intake against target ${targetCal} kcal.</p>
    </div>
  `;
}

function renderMacrosChart(dailyTotals: DailyNutritionSummary[], targetProtein: number): string {
  const maxGrams = Math.max(250, ...dailyTotals.map(d => d.protein + d.carbs + d.fat));
  const colCount = dailyTotals.length;
  const isDense = colCount > 14;

  return `
    <div class="flex flex-col gap-2 pt-2">
      <!-- Legend with symbols & patterns for accessibility -->
      <div class="flex items-center justify-between text-[10px] text-on-surface-variant dark:text-gray-400 px-1">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-xs bg-primary inline-block"></span>
            <span>Protein (${targetProtein}g target)</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-xs bg-amber-500 inline-block"></span>
            <span>Carbs</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block"></span>
            <span>Fat</span>
          </div>
        </div>
      </div>

      <!-- Stacked Bar Visualizer -->
      <div class="relative w-full h-[140px] flex items-end justify-between gap-1 pt-4 pb-1 px-1 bg-surface-container-low dark:bg-dark-surface-card-high rounded-xl border border-outline-variant/20 overflow-x-auto">
        ${dailyTotals.map((day, idx) => {
          const totalMacros = day.protein + day.carbs + day.fat;
          const isZero = totalMacros === 0;

          const pPct = totalMacros > 0 ? (day.protein / maxGrams) * 100 : 0;
          const cPct = totalMacros > 0 ? (day.carbs / maxGrams) * 100 : 0;
          const fPct = totalMacros > 0 ? (day.fat / maxGrams) * 100 : 0;

          return `
            <div 
              class="flex-1 flex flex-col items-center justify-end h-full z-10 group relative cursor-pointer"
              onclick="window.showDayDetailToast(${htmlJsArg(day.fullDateLabel)}, '${day.protein}g P &bull; ${day.carbs}g C &bull; ${day.fat}g F')"
            >
              <!-- Tooltip on hover/touch -->
              <div class="hidden group-hover:flex absolute -top-8 bg-black/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-md pointer-events-none whitespace-nowrap z-20">
                P:${day.protein} C:${day.carbs} F:${day.fat}
              </div>

              <!-- Stacked Segment -->
              <div class="w-full max-w-[28px] flex flex-col justify-end overflow-hidden rounded-t-md ${isZero ? 'h-1 bg-outline-variant/20' : ''}">
                ${fPct > 0 ? `<div class="bg-rose-500 w-full" style="height: ${fPct}%;"></div>` : ''}
                ${cPct > 0 ? `<div class="bg-amber-500 w-full" style="height: ${cPct}%;"></div>` : ''}
                ${pPct > 0 ? `<div class="bg-primary w-full" style="height: ${pPct}%;"></div>` : ''}
              </div>

              <span class="text-[9px] text-on-surface-variant dark:text-gray-400 mt-1 font-semibold truncate ${
                isDense && idx % Math.ceil(colCount / 7) !== 0 ? 'opacity-0' : 'opacity-100'
              }">
                ${day.dayLabel.charAt(0)}
              </span>
            </div>
          `;
        }).join('')}
      </div>

      <!-- Inspection Banner Display -->
      <div id="day-detail-toast" class="hidden p-2 rounded-xl bg-surface-container-low dark:bg-dark-surface-card-high border border-outline-variant/30 text-[11px] text-on-surface dark:text-gray-200 flex items-center justify-between animate-fade-in">
        <span id="day-detail-toast-text" class="font-medium"></span>
        <button onclick="document.getElementById('day-detail-toast')?.classList.add('hidden')" class="text-on-surface-variant text-xs ml-2">&times;</button>
      </div>

      <p class="sr-only">Macronutrient distribution chart displaying Protein, Carbs, and Fats across ${colCount} days.</p>
    </div>
  `;
}
