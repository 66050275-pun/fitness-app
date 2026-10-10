import { trHtml, translatedLabel, tr } from '../i18n/index.ts';
import { escapeHtml } from '../utils/sanitize.ts';
import { htmlJsArg } from '../utils/sanitize.ts';
import { store } from '../store/appState';

export function renderAICoachScreen(): string {
  const { chatHistory } = store.getState();

  const sampleChips = [
    'Suggest high-protein dinner',
    'Review my macros today',
    'Pre-workout snack idea',
    'How is my hydration?'
  ];

  return `
    <div class="flex flex-col h-screen bg-surface dark:bg-dark-surface transition-colors">
      
      <!-- Top App Bar -->
      <header class="sticky top-0 z-40 bg-surface/95 dark:bg-dark-surface/95 backdrop-blur-md px-screen-gutter pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/20 shadow-sm shrink-0">
        <div class="flex items-center gap-3">
          <button onclick="window.navigateApp('dashboard')" class="w-9 h-9 rounded-full bg-surface-container-low dark:bg-dark-surface-card border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-all">
            <span class="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-tertiary text-white flex items-center justify-center shadow-md">
              <span class="material-symbols-outlined text-[22px]" style="font-variation-settings: 'FILL' 1;">smart_toy</span>
            </div>
            <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-primary-container ring-2 ring-surface"></span>
          </div>
          <div>
            <div class="flex items-center gap-1.5">
              <h1 class="font-heading font-bold text-sm text-on-surface dark:text-white">${trHtml("NutriAI Coach")}</h1>
              <span class="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary dark:text-primary-container text-[9px] font-extrabold uppercase">${trHtml("Demo Coach")}</span>
            </div>
            <p class="text-[11px] text-on-surface-variant dark:text-gray-400">${trHtml("Local demo replies · No AI server")}</p>
          </div>
        </div>

        <button onclick="window.clearChat()" class="text-xs text-on-surface-variant dark:text-gray-400 hover:text-primary p-2">
          <span class="material-symbols-outlined text-[20px]">restart_alt</span>
        </button>
      </header>

      <!-- Scrollable Message Canvas -->
      <main id="chat-messages-container" class="flex-1 overflow-y-auto px-screen-gutter py-4 flex flex-col gap-3.5 no-scrollbar">
        ${chatHistory.map(msg => `
          <div class="flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}">
            
            <div class="flex items-end gap-2 max-w-[85%] ${msg.sender === 'user' ? 'flex-row-reverse' : ''}">
              ${msg.sender === 'coach' ? `
                <div class="w-7 h-7 rounded-full bg-gradient-to-tr from-primary to-tertiary text-white flex items-center justify-center shrink-0 shadow-sm text-xs">
                  <span class="material-symbols-outlined text-[16px]">smart_toy</span>
                </div>
              ` : ''}

              <div class="p-3.5 rounded-2xl text-xs leading-relaxed ${
                msg.sender === 'user' 
                  ? 'bg-primary text-white rounded-br-none shadow-sm' 
                  : 'bg-surface-container-lowest dark:bg-dark-surface-card text-on-surface dark:text-gray-100 border border-outline-variant/30 rounded-bl-none shadow-ambient'
              }">
                ${escapeHtml(msg.sender === 'coach' ? translatedLabel(msg.text) : msg.text)}
              </div>
            </div>

            <span class="text-[9px] text-on-surface-variant dark:text-gray-400 mt-1 px-1">
              ${trHtml(msg.time)}
            </span>

            ${msg.actionChips && msg.actionChips.length > 0 ? `
              <div class="flex flex-wrap gap-1.5 mt-2 ml-9">
                ${msg.actionChips.map(chip => `
                  <button 
                    onclick="window.sendPrompt(${htmlJsArg(tr(chip))})"
                    class="px-2.5 py-1 rounded-full bg-[#EAF9F0] dark:bg-primary/20 text-primary dark:text-primary-container text-[11px] font-semibold border border-primary/20 hover:scale-105 active:scale-95 transition-all"
                  >
                    ${trHtml(chip)}
                  </button>
                `).join('')}
              </div>
            ` : ''}

          </div>
        `).join('')}
      </main>

      <!-- Suggested Prompt Chips Row -->
      <div class="px-screen-gutter py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-surface/80 dark:bg-dark-surface/80 border-t border-outline-variant/20">
        ${sampleChips.map(chip => `
          <button 
            onclick="window.sendPrompt(${htmlJsArg(tr(chip))})"
            class="px-3 py-1 rounded-full bg-surface-container-low dark:bg-dark-surface-card text-on-surface dark:text-gray-300 text-[11px] font-medium border border-outline-variant/30 whitespace-nowrap hover:bg-surface-container transition-all"
          >
            ${trHtml(chip)}
          </button>
        `).join('')}
      </div>

      <!-- Bottom Chat Input Field -->
      <footer class="p-screen-gutter pb-6 bg-surface dark:bg-dark-surface border-t border-outline-variant/30 shrink-0">
        <form onsubmit="event.preventDefault(); window.submitChat();" class="flex items-center gap-2 bg-surface-container-low dark:bg-dark-surface-card-high rounded-full px-3 py-1.5 border border-outline-variant/40 shadow-sm focus-within:border-primary transition-all">
          
          <button type="button" onclick="window.navigateApp('scanner')" class="w-8 h-8 rounded-full text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors">
            <span class="material-symbols-outlined text-[20px]">photo_camera</span>
          </button>

          <input 
            id="chat-input" 
            type="text" 
            placeholder="${trHtml("Ask anything about nutrition...")}"
            class="flex-1 bg-transparent border-none text-xs text-on-surface dark:text-white placeholder:text-on-surface-variant dark:placeholder:text-gray-400 focus:outline-none focus:ring-0 py-2"
          />

          <button type="submit" class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-sm active:scale-95 transition-transform">
            <span class="material-symbols-outlined text-[18px]">send</span>
          </button>
        </form>
      </footer>

    </div>
  `;
}
