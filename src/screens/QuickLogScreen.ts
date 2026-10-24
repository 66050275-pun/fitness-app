import { tr, trHtml } from '../i18n/index.ts';
import { escapeHtml } from '../utils/sanitize.ts';
import { store } from '../store/appState';
import { renderFoodEntryHeader } from '../components/Food/FoodEntryHeader.ts';
import { QUICK_LOG_UNITS } from './quickLogController.ts';

function field(id: string, label: string, type: string, value = '', required = false): string {
  const numeric = type === 'number';
  return `<div class="nutrition-field-group"><label for="${id}">${escapeHtml(label)}${required ? ` <span class="nutrition-required">${trHtml('(required)')}</span>` : ''}</label>
    <input id="${id}" class="ui-field" type="${type}" value="${escapeHtml(value)}" ${required ? 'required' : ''}
      ${numeric ? 'min="0" step="any" inputmode="decimal"' : ''}
      aria-describedby="${id}-error${id === 'ql-calories' || ['ql-protein','ql-carbs','ql-fat'].includes(id) ? ' quicklog-nutrition-help' : ''}">
    <p id="${id}-error" class="nutrition-field-error" role="alert"></p></div>`;
}

export function renderQuickLogScreen(): string {
  const date = store.getState().selectedDate;
  const time = new Date().toTimeString().slice(0, 5);
  return `<div class="nutrition-screen flex flex-col min-h-screen">
    ${renderFoodEntryHeader('Quick Food Log', 'Enter custom calories and macronutrients', `<span class="nutrition-badge">${trHtml('Manual Entry')}</span>`)}
    <main class="nutrition-main">
      <form id="quicklog-form" data-preserve-draft novalidate onsubmit="event.preventDefault(); window.submitQuickLog();" class="nutrition-card quicklog-form">
        <section id="quicklog-error-banner" class="nutrition-error-summary" tabindex="-1" aria-labelledby="quicklog-error-message" hidden>
          <h2 id="quicklog-error-message">${trHtml('Check your details')}</h2><ul id="quicklog-error-list"></ul>
        </section>
        ${field('ql-food-name', tr('Food Name'), 'text', '', true)}
        <fieldset><legend>${trHtml('Meal Category')}</legend><div class="nutrition-meal-options">
          ${(['breakfast','lunch','dinner','snack'] as const).map(type => `<label><input id="ql-meal-${type}" type="radio" name="ql-meal-type" value="${type}" ${type === 'lunch' ? 'checked' : ''} class="sr-only"><span>${trHtml(type)}</span></label>`).join('')}
        </div></fieldset>
        <section class="nutrition-form-section"><h2>${trHtml('Portion Size')}</h2>
          <div class="nutrition-field-grid">${field('ql-quantity', tr('Quantity'), 'number', '1', true)}
            <div class="nutrition-field-group"><label for="ql-unit">${trHtml('Unit')}</label><select id="ql-unit" class="ui-field" aria-describedby="ql-unit-error">${QUICK_LOG_UNITS.map(unit => `<option value="${unit}">${trHtml(unit)}</option>`).join('')}</select><p id="ql-unit-error" class="nutrition-field-error" role="alert"></p></div>
          </div>
          ${field('ql-serving', tr('Serving Description (Optional)'), 'text')}
        </section>
        <section class="nutrition-form-section"><h2>${trHtml('Nutritional Values')}</h2>
          <p id="quicklog-nutrition-help" class="nutrition-help">${trHtml('Enter nutrition for the whole portion above. Leave unknown macros blank; enter 0 only when known to be zero.')}</p>
          ${field('ql-calories', `${tr('Calories')} (${tr('kcal')})`, 'number', '', true)}
          <div class="quicklog-macros">${(['protein','carbs','fat'] as const).map(key => field(`ql-${key}`, `${tr(key === 'protein' ? 'Protein' : key === 'carbs' ? 'Carbs' : 'Fat')} (${tr('g')})`, 'number')).join('')}</div>
        </section>
        <section class="nutrition-form-section"><div class="nutrition-field-grid">${field('ql-date', tr('Log Date'), 'date', date, true)}${field('ql-time', tr('Log Time'), 'time', time, true)}</div></section>
        <label class="nutrition-save-option" for="ql-save-to-my-foods"><input type="checkbox" id="ql-save-to-my-foods"><span><strong>${trHtml('Save this food to My Foods')}</strong><span class="nutrition-help">${trHtml('Add to your personal custom food database so you can find, edit, and log it again with portion options anytime.')}</span></span></label>
        <button id="quicklog-save" type="submit" class="ui-primary-button">${trHtml('Save Meal to Diary')}</button>
        <button id="quicklog-cancel" type="button" class="nutrition-secondary-button" onclick="window.navigateApp('dashboard')">${trHtml('Cancel')}</button>
      </form>
    </main>
  </div>`;
}
