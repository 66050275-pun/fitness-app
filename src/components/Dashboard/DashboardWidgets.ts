import { tr, trHtml } from '../../i18n/index.ts';
import { mealLabel } from '../../i18n/foodLabels.ts';
import type { MealItem } from '../../types/index.ts';
import { formatDisplayNumber, formatRemainingCalories, clampProgressRatio, safeRatio } from '../../utils/safeNumbers.ts';
import { escapeHtml, htmlJsArg } from '../../utils/sanitize.ts';
import { getMealNutrientForDisplay } from '../../utils/mealNutritionDisplay.ts';

function heading(id: string, title: string, action = ''): string {
  return `<header class="dashboard-card-heading"><h2 id="dashboard-${id}-title" tabindex="-1">${trHtml(title)}</h2>${action}</header>`;
}

function meter(percent: number, label: string, valueText: string): string {
  const value = Math.round(clampProgressRatio(percent / 100) * 100);
  return `<div class="dashboard-meter" role="progressbar" aria-label="${escapeHtml(label)}"
    aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}" aria-valuetext="${escapeHtml(valueText)}">
    <span style="width:${value}%"></span></div>`;
}

export interface DashboardEnergy {
  consumed: number;
  burned: number;
  target: number;
  remaining: number;
  missingCalories: number;
  refeedCalories: number;
  refeedCarbs: number;
}

export function renderEnergyCard(data: DashboardEnergy): string {
  const hasTarget = Number.isFinite(data.target) && data.target > 0;
  const balance = formatRemainingCalories(data.remaining);
  const ratio = safeRatio(data.consumed, data.target);
  const circumference = 2 * Math.PI * 66;
  const equation = [
    { label: 'Food', icon: 'restaurant', value: data.consumed },
    { label: 'Exercise', icon: 'fitness_center', value: data.burned },
    { label: balance.isOver ? 'Over budget' : 'Net Left', icon: 'flag', value: hasTarget ? balance.value : null },
  ];
  return `<section class="dashboard-card dashboard-energy" aria-labelledby="dashboard-energy-title">
    ${heading('energy', 'Daily Energy Budget')}
    <p class="dashboard-target">${hasTarget ? trHtml('Daily target: {0} kcal', formatDisplayNumber(data.target, 0)) : trHtml('Target unavailable')}</p>
    <figure class="dashboard-energy-figure">
      <div class="dashboard-energy-ring">
        <svg viewBox="0 0 160 160" aria-hidden="true" focusable="false">
          <circle class="dashboard-ring-track" cx="80" cy="80" r="66"/>
          <circle class="dashboard-ring-progress" cx="80" cy="80" r="66"
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference * (1 - clampProgressRatio(ratio))}"/>
        </svg>
        <div class="dashboard-energy-reading ${balance.isOver ? 'is-over' : ''}">
          <span class="material-symbols-outlined" aria-hidden="true">bolt</span>
          <strong class="ui-number">${hasTarget ? formatDisplayNumber(balance.value, 0) : '—'}</strong>
          <span>${trHtml(hasTarget ? balance.isOver ? 'kcal over' : 'kcal left' : 'Target unavailable')}</span>
        </div>
      </div>
      <figcaption>${hasTarget ? trHtml('Food logged: {0}% of daily target', formatDisplayNumber(ratio * 100, 0)) : trHtml('Set your daily target in Profile.')}</figcaption>
    </figure>
    <dl class="dashboard-energy-equation">
      ${equation.map(item => `<div><dt><span class="material-symbols-outlined" aria-hidden="true">${item.icon}</span>${trHtml(item.label)}</dt>
        <dd><strong class="ui-number">${formatDisplayNumber(item.value, 0)}</strong><span>${trHtml('kcal')}</span></dd></div>`).join('')}
    </dl>
    <p class="dashboard-note">${trHtml('Remaining = target − food + exercise.')}</p>
    ${data.missingCalories ? `<p class="dashboard-data-note">${trHtml('Known calories only. Missing entries: {0}.', formatDisplayNumber(data.missingCalories, 0))}</p>` : ''}
    ${data.refeedCalories > 0 ? `<p class="dashboard-program-note">${trHtml('Refeed day: +{0} kcal and +{1} g carbs. Log meals as usual.', formatDisplayNumber(data.refeedCalories, 0), formatDisplayNumber(data.refeedCarbs))}</p>` : ''}
  </section>`;
}

export interface DashboardMacro {
  id: 'protein' | 'carbs' | 'fat';
  label: string;
  amount: number | null;
  target: number;
  missing: number;
}

export function renderMacrosCard(macros: readonly DashboardMacro[], fatNote: string): string {
  return `<section class="dashboard-card" aria-labelledby="dashboard-macros-title">
    ${heading('macros', 'Macronutrients', `<button id="dashboard-view-diary" type="button" class="dashboard-text-action" onclick="window.navigateApp('diary')">${trHtml('View Diary')}<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span></button>`)}
    <div class="dashboard-macro-grid">
      ${macros.map(macro => {
        const hasTarget = Number.isFinite(macro.target) && macro.target > 0;
        const percent = safeRatio(macro.amount ?? 0, macro.target) * 100;
        const valueText = tr('{0}: {1} g of {2} g', tr(macro.label), formatDisplayNumber(macro.amount), formatDisplayNumber(macro.target));
        return `<div class="dashboard-macro dashboard-macro-${macro.id}">
          <div class="dashboard-macro-top"><h3>${trHtml(macro.label)}</h3>
            <span class="dashboard-macro-percent">${hasTarget && macro.amount !== null ? `${formatDisplayNumber(percent, 0)}%` : '—'}</span></div>
          <div class="dashboard-macro-reading"><strong class="ui-number">${formatDisplayNumber(macro.amount)} <span>${trHtml('g')}</span></strong>
            <span class="dashboard-note">${hasTarget ? trHtml('Target: {0} g', formatDisplayNumber(macro.target)) : trHtml('Target unavailable')}</span></div>
          ${hasTarget && macro.amount !== null ? meter(percent, tr(macro.label), valueText) : ''}
          ${macro.missing ? `<p class="dashboard-note">${trHtml('Incomplete data · missing entries: {0}', formatDisplayNumber(macro.missing, 0))}</p>` : ''}
        </div>`;
      }).join('')}
    </div>
    ${fatNote ? `<p class="dashboard-program-note">${escapeHtml(fatNote)}</p>` : ''}
  </section>`;
}

export function renderHydrationCard(date: string, glasses: number, targetMl: number): string {
  const amount = glasses * 250;
  const hasTarget = Number.isFinite(targetMl) && targetMl > 0;
  const valueText = hasTarget ? tr('Water: {0} of {1} ml', formatDisplayNumber(amount, 0), formatDisplayNumber(targetMl, 0))
    : tr('Water logged: {0} ml', formatDisplayNumber(amount, 0));
  return `<section class="dashboard-card dashboard-hydration" aria-labelledby="dashboard-hydration-title">
    ${heading('hydration', 'Hydration Level')}
    <div class="dashboard-water-row">
      <span class="dashboard-water-icon material-symbols-outlined" aria-hidden="true">water_drop</span>
      <p id="dashboard-hydration-summary" class="dashboard-water-summary" role="status" aria-live="polite" aria-atomic="true">
        <strong class="ui-number">${formatDisplayNumber(amount, 0)} <span>${trHtml('ml')}</span></strong>
        <span>${hasTarget ? trHtml('Target: {0} ml', formatDisplayNumber(targetMl, 0)) : trHtml('Target unavailable')}</span>
      </p>
    </div>
    ${hasTarget ? meter(safeRatio(amount, targetMl) * 100, tr('Hydration Level'), valueText) : ''}
    <div class="dashboard-water-controls"><p class="dashboard-note">${trHtml('One tap records 250 ml.')}</p>
      <div><button id="dashboard-water-remove" type="button" class="ui-icon-button" ${glasses <= 0 ? 'disabled' : ''}
          onclick="window.removeWater(${htmlJsArg(date)})" aria-label="${trHtml('Remove 250 ml of water')}" aria-describedby="dashboard-hydration-summary"><span class="material-symbols-outlined" aria-hidden="true">remove</span></button>
        <button id="dashboard-water-add" type="button" class="ui-icon-button dashboard-water-add"
          onclick="window.addWater(${htmlJsArg(date)})" aria-label="${trHtml('Add 250 ml of water')}" aria-describedby="dashboard-hydration-summary"><span class="material-symbols-outlined" aria-hidden="true">add</span></button></div>
    </div>
  </section>`;
}

export function renderCoachCard(message: string): string {
  return `<section class="dashboard-card dashboard-coach" aria-labelledby="dashboard-coach-title">
    ${heading('coach', 'AI Nutrition Coach', `<span class="dashboard-badge">${trHtml('Demo Coach')}</span>`)}
    <p>${escapeHtml(message)}</p>
    <button id="dashboard-open-coach" type="button" class="dashboard-text-action" onclick="window.navigateApp('coach')">
      ${trHtml('Ask Coach for dinner ideas')}<span class="material-symbols-outlined" aria-hidden="true">arrow_forward</span>
    </button>
  </section>`;
}

export function renderMealsCard(meals: readonly MealItem[], title: string): string {
  return `<section class="dashboard-card dashboard-meals" aria-labelledby="dashboard-meals-title">
    ${heading('meals', title, `<button id="dashboard-log-meal" type="button" class="dashboard-text-action" onclick="window.toggleQuickActions(true)"><span class="material-symbols-outlined" aria-hidden="true">add</span>${trHtml('Log Meal')}</button>`)}
    ${meals.length === 0 ? `<div class="dashboard-empty">
      <span class="material-symbols-outlined" aria-hidden="true">restaurant</span>
      <h3>${trHtml('No meals recorded yet')}</h3><p>${trHtml('Tap below to add a meal for this day')}</p>
      <button id="dashboard-first-meal" type="button" class="ui-primary-button" onclick="window.toggleQuickActions(true)">${trHtml('+ Add Food')}</button>
    </div>` : `<ul class="dashboard-meal-list">${meals.map(meal => {
      const name = mealLabel(meal, meal.name);
      return `<li class="dashboard-meal">
        <span class="dashboard-meal-icon material-symbols-outlined" aria-hidden="true">${escapeHtml(meal.icon)}</span>
        <div class="dashboard-meal-details"><h3>${escapeHtml(name)}</h3>
          <p class="dashboard-note">${trHtml(meal.mealType)} · ${escapeHtml(meal.time)}</p>
          <p class="dashboard-meal-calories ui-number">${formatDisplayNumber(getMealNutrientForDisplay(meal, 'calories'), 0)} <span>${trHtml('kcal')}</span></p>
          <p class="dashboard-note ui-number">${trHtml('Protein {0} g · Carbs {1} g', formatDisplayNumber(getMealNutrientForDisplay(meal, 'protein')), formatDisplayNumber(getMealNutrientForDisplay(meal, 'carbs')))}</p>
        </div>
        <button id="dashboard-delete-${escapeHtml(meal.id)}" type="button" class="ui-icon-button dashboard-delete-meal"
          onclick="window.deleteMeal(${htmlJsArg(meal.id)});document.getElementById('dashboard-meals-title')?.focus({preventScroll:true})"
          aria-label="${trHtml('Delete {0}', name)}"><span class="material-symbols-outlined" aria-hidden="true">delete_outline</span></button>
      </li>`;
    }).join('')}</ul>`}
  </section>`;
}
