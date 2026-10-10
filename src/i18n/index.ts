import messages from './messages.json' with { type: 'json' };
import { escapeHtml } from '../utils/sanitize.ts';

export type Language = 'en' | 'th';
const UI_LANGUAGE_KEY = 'nutriai_ui_language';
export function normalizeLanguage(value: unknown): Language { return value === 'th' ? 'th' : 'en'; }
let language: Language = 'en';
let savedChoice = false;
const listeners = new Set<() => void>();
try {
  const saved = localStorage.getItem(UI_LANGUAGE_KEY);
  if (saved === 'en' || saved === 'th') { language = saved; savedChoice = true; }
} catch { /* Language works in memory when browser preferences storage is unavailable. */ }
export function getLanguage(): Language { return language; }
export function hasLanguageChoice(): boolean { return savedChoice; }
export function getLocale(): string { return language === 'th' ? 'th-TH-u-ca-gregory-nu-latn' : 'en-US'; }
export function setLanguage(value: unknown): Language {
  const previous = language;
  language = normalizeLanguage(value); savedChoice = true;
  try { localStorage.setItem(UI_LANGUAGE_KEY, language); } catch { /* Never store private data here. */ }
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  if (previous !== language) for (const listener of listeners) listener();
  return language;
}
export function onLanguageChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
if (typeof document !== 'undefined') document.documentElement.lang = language;

const dictionary: Record<string, { en: string; th: string }> = Object.assign(Object.create(null), messages);
const labelKeys = new Map(Object.entries(dictionary).flatMap(([key, entry]) => [[entry.en, key], [entry.th, key]] as [string, string][]));
// Retain original lookup templates when display labels are corrected or renamed.
const templateLabels = Object.entries(dictionary).flatMap(([key, entry]) => [...new Set([key, entry.en, entry.th])].flatMap(template => {
  const indices: number[] = [];
  const parts = template.split(/(\{\d+\})/).map(part => {
    if (/^\{\d+\}$/.test(part)) { indices.push(Number(part.slice(1, -1))); return '(.*?)'; }
    return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  });
  return indices.length ? [{ key, indices, pattern: new RegExp(`^${parts.join('')}$`, 's') }] : [];
}));
export function tr(key: string, ...values: unknown[]): string {
  const entry = dictionary[key];
  const template = entry ? entry[language] : key;
  return template.replace(/\{(\d+)\}/g, (match, index: string) => Number(index) < values.length ? String(values[Number(index)] ?? '') : match);
}
/** Escapes translated labels and interpolated values before insertion into HTML. */
export function trHtml(key: string, ...values: unknown[]): string { return escapeHtml(tr(key, ...values)); }
/** Only call for app-owned labels or canned assistant content, never arbitrary user text. */
export function translatedLabel(value: string): string {
  if (dictionary[value]) return tr(value);
  const key = labelKeys.get(value);
  if (key) return tr(key);
  for (const { key, indices, pattern } of templateLabels) {
    const match = pattern.exec(value);
    if (!match) continue;
    const values: string[] = [];
    indices.forEach((index, position) => { values[index] = match[position + 1]; });
    return tr(key, ...values);
  }
  return value;
}
