/**
 * Reusable Calorie Progress Ring Component
 * 
 * Renders a hollow circular SVG progress ring representing:
 *   progressRatio = consumedCalories / calorieTarget
 *   visualProgress = clamp(progressRatio, 0, 1)
 * 
 * Rules:
 * 1. Hollow circle (fill="none"), never solid or pie chart.
 * 2. No percentage numbers rendered in the ring or date strip.
 * 3. Gracefully handles 0 target, missing target, and 0 consumed (no division by zero or NaN).
 * 4. Over-target shows 100% full ring with a polite accent indicator (no alarming red).
 * 5. Provides accessible description for screen readers.
 */

export interface CalorieProgressRingOptions {
  consumed: number;
  target: number;
  size?: number;             // Ring outer diameter in px (default: 40)
  strokeWidth?: number;      // Stroke width in px (default: 3)
  isSelected?: boolean;
  isToday?: boolean;
  className?: string;
  innerContentHtml?: string; // HTML placed in the center (e.g. day number)
  ariaLabel?: string;
}

export function renderCalorieProgressRing(options: CalorieProgressRingOptions): string {
  const {
    consumed,
    target,
    size = 40,
    strokeWidth = 3,
    isSelected = false,
    isToday: _isToday = false,
    className = '',
    innerContentHtml = '',
    ariaLabel
  } = options;

  // Safe numerical handling
  const safeConsumed = typeof consumed === 'number' && !isNaN(consumed) && isFinite(consumed) ? Math.max(0, Math.round(consumed)) : 0;
  const safeTarget = typeof target === 'number' && !isNaN(target) && isFinite(target) ? Math.max(0, Math.round(target)) : 0;

  // Progress calculation
  let progressRatio = 0;
  let isOverTarget = false;

  if (safeTarget > 0) {
    progressRatio = safeConsumed / safeTarget;
    if (safeConsumed > safeTarget) {
      isOverTarget = true;
    }
  }

  const visualProgress = Math.min(Math.max(progressRatio, 0), 1);

  // SVG dimensions
  const center = size / 2;
  const radius = Math.max(1, (size - strokeWidth) / 2);
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - visualProgress);

  // Screen reader description
  const defaultLabel = safeTarget > 0
    ? `${safeConsumed.toLocaleString()} of ${safeTarget.toLocaleString()} calories logged`
    : (safeConsumed > 0 ? `${safeConsumed.toLocaleString()} calories logged (target unavailable)` : '0 calories logged');

  const finalAriaLabel = ariaLabel || defaultLabel;

  // Progress stroke color
  // Selected state: ring uses bright white/emerald contrast when on dark/primary background, or primary green
  let progressColorClass = 'text-primary dark:text-primary-container';
  if (isSelected) {
    progressColorClass = 'text-white dark:text-white';
  }

  // Track stroke color
  const trackColorClass = isSelected
    ? 'text-white/30'
    : 'text-outline-variant/35 dark:text-gray-700/60';

  return `
    <div 
      class="relative inline-flex items-center justify-center ${className}"
      style="width: ${size}px; height: ${size}px;"
      role="progressbar"
      aria-valuenow="${safeConsumed}"
      aria-valuemin="0"
      aria-valuemax="${safeTarget}"
      aria-label="${finalAriaLabel}"
    >
      <!-- Circular SVG Track & Progress -->
      <svg 
        width="${size}" 
        height="${size}" 
        viewBox="0 0 ${size} ${size}" 
        class="absolute inset-0 -rotate-90 pointer-events-none transform"
      >
        <!-- Background Track -->
        <circle 
          cx="${center}" 
          cy="${center}" 
          r="${radius}" 
          fill="none" 
          stroke="currentColor" 
          stroke-width="${strokeWidth}" 
          class="${trackColorClass} transition-colors duration-200" 
        />
        
        <!-- Progress Stroke -->
        ${visualProgress > 0 ? `
          <circle 
            cx="${center}" 
            cy="${center}" 
            r="${radius}" 
            fill="none" 
            stroke="currentColor" 
            stroke-width="${strokeWidth}" 
            stroke-linecap="round" 
            stroke-dasharray="${circumference.toFixed(2)}" 
            stroke-dashoffset="${strokeDashoffset.toFixed(2)}" 
            class="${progressColorClass} transition-all duration-300 ease-out" 
          />
        ` : ''}

        <!-- Over-target subtle completed accent indicator (top dot) -->
        ${isOverTarget ? `
          <circle 
            cx="${center}" 
            cy="${strokeWidth / 2}" 
            r="${strokeWidth / 2 + 0.5}" 
            fill="currentColor" 
            class="${isSelected ? 'text-white' : 'text-amber-500 dark:text-amber-400'}" 
          />
        ` : ''}
      </svg>

      <!-- Centered Day Number or Custom Content -->
      <div class="relative z-10 flex items-center justify-center select-none pointer-events-none">
        ${innerContentHtml}
      </div>
    </div>
  `;
}
