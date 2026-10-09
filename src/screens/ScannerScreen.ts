import { store } from '../store/appState';

export function renderScannerScreen(): string {
  const { lastScannedFood, scannerMode } = store.getState();
  const isBarcode = scannerMode === 'barcode';

  const food = lastScannedFood || {
    name: 'Mediterranean Salmon Bowl',
    subtitle: 'Wild Salmon, Quinoa & Greens',
    calories: 540,
    protein: 42,
    carbs: 48,
    fat: 18,
    confidence: 0.98,
    glycemicIndex: 'Low' as const,
    ingredients: ['Fresh Salmon', 'Tri-Color Quinoa', 'Steamed Edamame', 'Avocado Oil'],
    suggestedMealType: 'lunch' as const
  };

  return `
    <div class="flex flex-col min-h-screen bg-black text-white relative overflow-hidden select-none">
      
      <!-- Simulated Camera Feed Canvas -->
      <div class="absolute inset-0 z-0 overflow-hidden">
        <!-- High-res realistic background simulating camera sensor -->
        <img 
          src="${isBarcode 
            ? 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=800&q=80' 
            : 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}" 
          class="w-full h-full object-cover filter brightness-85 contrast-105 transform scale-105 transition-transform duration-700" 
          alt="Camera viewfinder stream"
        />
        <!-- Vignette & Camera Scan Grid Overlay -->
        <div class="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-transparent via-transparent to-black/50"></div>
      </div>

      <!-- Top Camera Controls Bar -->
      <header class="relative z-20 px-screen-gutter pt-5 pb-3 flex justify-between items-center">
        <button 
          onclick="window.navigateApp('dashboard')" 
          aria-label="Back" 
          class="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <span class="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>

        <!-- Mode Toggle Pill -->
        <div class="bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/20 flex items-center gap-1">
          <button 
            type="button"
            onclick="window.openScannerMode('food')" 
            class="px-3 py-1 rounded-full font-heading text-xs font-bold transition-all ${
              !isBarcode ? 'bg-primary text-white shadow-sm' : 'text-white/70 hover:text-white'
            }"
          >
            AI Lens
          </button>
          <button 
            type="button"
            onclick="window.openScannerMode('barcode')" 
            class="px-3 py-1 rounded-full font-heading text-xs font-bold transition-all ${
              isBarcode ? 'bg-primary text-white shadow-sm' : 'text-white/70 hover:text-white'
            }"
          >
            Barcode
          </button>
        </div>

        <!-- Flash Toggle (In-UI indicator without alert) -->
        <button 
          id="flash-toggle-btn"
          onclick="this.classList.toggle('text-amber-400'); this.classList.toggle('text-white');" 
          aria-label="Toggle Flash"
          class="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white active:scale-95 transition-all"
        >
          <span class="material-symbols-outlined text-[20px]">flash_on</span>
        </button>
      </header>

      <!-- Center Viewfinder with Reticle and Laser Animation -->
      <main class="relative z-10 flex-1 flex flex-col items-center justify-center px-8">
        
        <!-- Prototype Notice Pill -->
        <div class="mb-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center gap-1 text-[10px] font-semibold text-white/80">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Camera Prototype Mode &bull; Simulated Feed</span>
        </div>

        ${!isBarcode ? `
          <!-- Viewfinder Frame (Food Mode: Square 256x256) -->
          <div class="relative w-64 h-64 border-2 border-dashed border-white/40 rounded-3xl flex items-center justify-center">
            
            <!-- Reticle Corners -->
            <div class="absolute -top-1.5 -left-1.5 w-6 h-6 border-t-4 border-l-4 border-primary-container rounded-tl-xl"></div>
            <div class="absolute -top-1.5 -right-1.5 w-6 h-6 border-t-4 border-r-4 border-primary-container rounded-tr-xl"></div>
            <div class="absolute -bottom-1.5 -left-1.5 w-6 h-6 border-b-4 border-l-4 border-primary-container rounded-bl-xl"></div>
            <div class="absolute -bottom-1.5 -right-1.5 w-6 h-6 border-b-4 border-r-4 border-primary-container rounded-br-xl"></div>

            <!-- Animated Laser Scanning Line -->
            <div class="absolute top-0 left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary-container to-transparent shadow-[0_0_12px_#35C76F] animate-scan-laser"></div>

            <!-- Center Focus Dot -->
            <div class="w-2.5 h-2.5 rounded-full bg-primary-container/80 shadow-[0_0_8px_#35C76F] animate-pulse"></div>
          </div>

          <!-- Real-time Recognition Tag Floating Pill -->
          <div 
            onclick="window.navigateApp('foodResult')" 
            class="mt-6 bg-surface/90 backdrop-blur-xl text-on-surface p-3.5 rounded-2xl border border-primary/40 shadow-glow-primary flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all max-w-[320px]"
          >
            <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-primary-container text-white flex items-center justify-center shadow-md shrink-0">
              <span class="material-symbols-outlined text-[20px]" style="font-variation-settings: 'FILL' 1;">auto_awesome</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="font-heading font-bold text-xs truncate text-on-surface">${food.name}</span>
                <span class="px-1.5 py-0.2 rounded-full bg-primary/10 text-primary text-[9px] font-extrabold">${Math.round(food.confidence * 100)}% Match</span>
              </div>
              <p class="text-[11px] text-on-surface-variant mt-0.5">${food.calories} kcal &bull; ${food.protein}g Protein &bull; Tap for Details &rarr;</p>
            </div>
          </div>
        ` : `
          <!-- Viewfinder Frame (Barcode Mode: Wide Rectangle) -->
          <div class="relative w-72 h-44 border-2 border-white/50 rounded-2xl flex items-center justify-center bg-black/20 backdrop-blur-xs">
            
            <!-- Red barcode laser line -->
            <div class="absolute top-1/2 -translate-y-1/2 left-3 right-3 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse"></div>

            <div class="text-center px-4">
              <span class="material-symbols-outlined text-3xl text-white/70 mb-1">barcode_scanner</span>
              <p class="text-[11px] text-white/90 font-medium">Align packaged barcode within box</p>
            </div>
          </div>

          <!-- Barcode Prototype Notice Card -->
          <div class="mt-6 bg-surface/95 backdrop-blur-xl text-on-surface p-4 rounded-2xl border border-outline-variant/30 shadow-lg max-w-[320px] flex flex-col gap-2 text-center">
            <span class="font-heading font-bold text-xs text-on-surface">Barcode Scanning Prototype</span>
            <p class="text-[11px] text-on-surface-variant leading-relaxed">
              Hardware camera barcode decoding is currently in prototype integration. Search our verified offline catalog or use manual quick log:
            </p>
            <div class="flex items-center gap-2 mt-1">
              <button 
                onclick="window.navigateApp('foodSearch')" 
                class="flex-1 py-2 rounded-xl bg-primary text-white text-xs font-bold active:scale-95 transition-all"
              >
                Search Catalog
              </button>
              <button 
                onclick="window.navigateApp('quickLog')" 
                class="flex-1 py-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface active:scale-95 transition-all"
              >
                Quick Log
              </button>
            </div>
          </div>
        `}

      </main>

      <!-- Bottom Capture & Actions Bar -->
      <footer class="relative z-20 px-8 pb-10 pt-4 flex items-center justify-between">
        
        <!-- Gallery Upload Button -->
        <button 
          onclick="window.navigateApp('foodResult')" 
          aria-label="Upload photo"
          class="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white/90 active:scale-95 transition-all"
        >
          <span class="material-symbols-outlined text-[22px]">photo_library</span>
        </button>

        <!-- Main Shutter Button -->
        <button 
          onclick="window.navigateApp('foodResult')" 
          aria-label="Capture Food"
          class="w-20 h-20 rounded-full border-4 border-white/80 p-1 flex items-center justify-center scan-fab-glow active:scale-90 transition-transform"
        >
          <div class="w-full h-full rounded-full bg-gradient-to-tr from-primary to-primary-container flex items-center justify-center shadow-lg">
            <span class="material-symbols-outlined text-[32px] text-white">camera</span>
          </div>
        </button>

        <!-- Search Database Button -->
        <button 
          onclick="window.navigateApp('foodSearch')" 
          aria-label="Search Database"
          class="w-12 h-12 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex flex-col items-center justify-center text-white/90 active:scale-95 transition-all"
        >
          <span class="material-symbols-outlined text-[22px]">search</span>
        </button>

      </footer>

    </div>
  `;
}
