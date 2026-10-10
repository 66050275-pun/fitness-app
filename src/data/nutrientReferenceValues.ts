import { tr } from '../i18n/index.ts';
/**
 * Centralized Nutrient Reference Values & Guidelines
 * 
 * Rules:
 * 1. Single source of truth for reference values across all UI screens.
 * 2. Distinct referenceKind ('daily_value' | 'adequate_intake' | 'upper_limit' | 'informational' | 'none')
 *    and direction ('minimum_target' | 'maximum_limit' | 'informational_only').
 * 3. Total Sugars, Trans Fat, Omega-3, Omega-6, Caffeine, and Fluoride do NOT auto-compute %DV (hasDailyValuePercent: false).
 * 4. Sodium, Added Sugars, Saturated Fat, Cholesterol, and Caffeine use maximum-oriented status (exceeding is alert/limit, not target met).
 * 5. Supports units: 'mg', 'mcg', 'g', 'IU', 'mg_NE', 'mcg_DFE', 'mcg_RAE', 'mg_alpha_TE'.
 */

import type { NutrientUnit, NutrientCategory, NutrientReferenceKind, NutrientDirection } from '../types/index.ts';

export interface NutrientReferenceConfig {
  key: string;
  name: string;
  shortName: string;
  category: NutrientCategory;
  defaultUnit: NutrientUnit;
  referenceValue: number | null;
  referenceKind: NutrientReferenceKind;
  direction: NutrientDirection;
  hasDailyValuePercent: boolean;
  displayOrder: number;
  description?: string;
}

export const NUTRIENT_REFERENCE_DICTIONARY: Record<string, NutrientReferenceConfig> = {
  // ==========================================
  // VITAMINS
  // ==========================================
  vitamin_a: {
    key: 'vitamin_a',
    name: 'Vitamin A',
    get shortName() { return tr("Vit A"); },
    category: 'vitamin',
    defaultUnit: 'mcg_RAE',
    referenceValue: 900,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 10,
    get description() { return tr("Essential for immune defense, eye health, and cellular integrity"); }
  },
  vitamin_c: {
    key: 'vitamin_c',
    name: 'Vitamin C',
    get shortName() { return tr("Vit C"); },
    category: 'vitamin',
    defaultUnit: 'mg',
    referenceValue: 90,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 11,
    get description() { return tr("Potent antioxidant supporting collagen synthesis and iron absorption"); }
  },
  vitamin_d: {
    key: 'vitamin_d',
    name: 'Vitamin D',
    get shortName() { return tr("Vit D"); },
    category: 'vitamin',
    defaultUnit: 'mcg',
    referenceValue: 20, // 20 mcg = 800 IU
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 12,
    get description() { return tr("Critical for calcium uptake, bone mineralization, and immune modulation"); }
  },
  vitamin_e: {
    key: 'vitamin_e',
    name: 'Vitamin E',
    get shortName() { return tr("Vit E"); },
    category: 'vitamin',
    defaultUnit: 'mg_alpha_TE',
    referenceValue: 15,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 13,
    get description() { return tr("Lipid-soluble antioxidant protecting polyunsaturated membranes"); }
  },
  vitamin_k: {
    key: 'vitamin_k',
    name: 'Vitamin K',
    get shortName() { return tr("Vit K"); },
    category: 'vitamin',
    defaultUnit: 'mcg',
    referenceValue: 120,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 14,
    get description() { return tr("Required cofactor for coagulation proteins and osteocalcin"); }
  },
  vitamin_b1: {
    key: 'vitamin_b1',
    name: 'Vitamin B1 (Thiamin)',
    get shortName() { return tr("B1 Thiamin"); },
    category: 'vitamin',
    defaultUnit: 'mg',
    referenceValue: 1.2,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 15,
    get description() { return tr("Central cofactor in carbohydrate catabolism and neural transmission"); }
  },
  vitamin_b2: {
    key: 'vitamin_b2',
    name: 'Vitamin B2 (Riboflavin)',
    get shortName() { return tr("B2 Riboflavin"); },
    category: 'vitamin',
    defaultUnit: 'mg',
    referenceValue: 1.3,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 16,
    get description() { return tr("Precursor of FMN and FAD coenzymes in cellular bioenergetics"); }
  },
  vitamin_b3: {
    key: 'vitamin_b3',
    name: 'Vitamin B3 (Niacin)',
    get shortName() { return tr("B3 Niacin"); },
    category: 'vitamin',
    defaultUnit: 'mg_NE',
    referenceValue: 16,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 17,
    get description() { return tr("Precursor of NAD/NADP facilitating cellular redox homeostasis"); }
  },
  vitamin_b5: {
    key: 'vitamin_b5',
    name: 'Vitamin B5 (Pantothenic Acid)',
    get shortName() { return tr("B5 Pantothenic"); },
    category: 'vitamin',
    defaultUnit: 'mg',
    referenceValue: 5,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 18,
    get description() { return tr("Structural component of Coenzyme A driving fatty acid metabolism"); }
  },
  vitamin_b6: {
    key: 'vitamin_b6',
    name: 'Vitamin B6 (Pyridoxine)',
    get shortName() { return tr("Vit B6"); },
    category: 'vitamin',
    defaultUnit: 'mg',
    referenceValue: 1.7,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 19,
    get description() { return tr("Vital in amino acid transamination and neurotransmitter biosynthesis"); }
  },
  vitamin_b7: {
    key: 'vitamin_b7',
    name: 'Vitamin B7 (Biotin)',
    get shortName() { return tr("B7 Biotin"); },
    category: 'vitamin',
    defaultUnit: 'mcg',
    referenceValue: 30,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 20,
    get description() { return tr("Essential prosthetic group for gluconeogenesis and lipogenesis carboxylases"); }
  },
  vitamin_b9: {
    key: 'vitamin_b9',
    name: 'Vitamin B9 (Folate)',
    get shortName() { return tr("B9 Folate"); },
    category: 'vitamin',
    defaultUnit: 'mcg_DFE',
    referenceValue: 400,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 21,
    get description() { return tr("Crucial one-carbon donor for nucleic acid replication and red cell formation"); }
  },
  vitamin_b12: {
    key: 'vitamin_b12',
    name: 'Vitamin B12 (Cobalamin)',
    get shortName() { return tr("Vit B12"); },
    category: 'vitamin',
    defaultUnit: 'mcg',
    referenceValue: 2.4,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 22,
    get description() { return tr("Required for myelin sheath maintenance and methionine synthase activity"); }
  },
  choline: {
    key: 'choline',
    name: 'Choline',
    get shortName() { return tr("Choline"); },
    category: 'vitamin',
    defaultUnit: 'mg',
    referenceValue: 550,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 23,
    get description() { return tr("Precursor of acetylcholine and phosphatidylcholine cell membranes"); }
  },

  // ==========================================
  // MINERALS
  // ==========================================
  calcium: {
    key: 'calcium',
    name: 'Calcium',
    get shortName() { return tr("Calcium"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 1300,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 30,
    get description() { return tr("Primary structural cation in bone matrix and neuromuscular signaling"); }
  },
  iron: {
    key: 'iron',
    name: 'Iron',
    get shortName() { return tr("Iron"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 18,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 31,
    get description() { return tr("Central functional core of hemoglobin and mitochondrial cytochromes"); }
  },
  magnesium: {
    key: 'magnesium',
    name: 'Magnesium',
    get shortName() { return tr("Magnesium"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 420,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 32,
    get description() { return tr("Enzyme cofactor for >300 biochemical reactions and ATP phosphorylation"); }
  },
  phosphorus: {
    key: 'phosphorus',
    name: 'Phosphorus',
    get shortName() { return tr("Phosphorus"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 1250,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 33,
    get description() { return tr("Constituent of hydroxyapatite crystals and phospholipid bilayers"); }
  },
  potassium: {
    key: 'potassium',
    name: 'Potassium',
    get shortName() { return tr("Potassium"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 4700,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 34,
    get description() { return tr("Major intracellular electrolyte maintaining resting membrane potential"); }
  },
  sodium: {
    key: 'sodium',
    name: 'Sodium',
    get shortName() { return tr("Sodium"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 2300,
    referenceKind: 'upper_limit',
    direction: 'maximum_limit', // Exceeding is over limit
    hasDailyValuePercent: true,
    displayOrder: 35,
    get description() { return tr("Primary extracellular osmolytes; recommended limit <= 2,300 mg/day"); }
  },
  zinc: {
    key: 'zinc',
    name: 'Zinc',
    get shortName() { return tr("Zinc"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 11,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 36,
    get description() { return tr("Catalytic and structural ion for zinc-finger transcription factors"); }
  },
  copper: {
    key: 'copper',
    name: 'Copper',
    get shortName() { return tr("Copper"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 0.9,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 37,
    get description() { return tr("Cofactor in cytochrome c oxidase and ceruloplasmin"); }
  },
  manganese: {
    key: 'manganese',
    name: 'Manganese',
    get shortName() { return tr("Manganese"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 2.3,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 38,
    get description() { return tr("Antioxidant activator of mitochondrial Mn-SOD and arginase"); }
  },
  selenium: {
    key: 'selenium',
    name: 'Selenium',
    get shortName() { return tr("Selenium"); },
    category: 'mineral',
    defaultUnit: 'mcg',
    referenceValue: 55,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 39,
    get description() { return tr("Integral selenocysteine residue in glutathione peroxidase and deiodinases"); }
  },
  iodine: {
    key: 'iodine',
    name: 'Iodine',
    get shortName() { return tr("Iodine"); },
    category: 'mineral',
    defaultUnit: 'mcg',
    referenceValue: 150,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 40,
    get description() { return tr("Indispensable component of thyroid hormones thyroxine (T4) and T3"); }
  },
  chromium: {
    key: 'chromium',
    name: 'Chromium',
    get shortName() { return tr("Chromium"); },
    category: 'mineral',
    defaultUnit: 'mcg',
    referenceValue: 35,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 41,
    get description() { return tr("Potentiates physiological insulin signaling and carbohydrate processing"); }
  },
  molybdenum: {
    key: 'molybdenum',
    name: 'Molybdenum',
    get shortName() { return tr("Molybdenum"); },
    category: 'mineral',
    defaultUnit: 'mcg',
    referenceValue: 45,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 42,
    get description() { return tr("Cofactor for sulfite oxidase and xanthine oxidoreductase enzymes"); }
  },
  chloride: {
    key: 'chloride',
    name: 'Chloride',
    get shortName() { return tr("Chloride"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 2300,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 43,
    get description() { return tr("Principal anion maintaining extracellular fluid volume and gastric HCl"); }
  },
  fluoride: {
    key: 'fluoride',
    name: 'Fluoride',
    get shortName() { return tr("Fluoride"); },
    category: 'mineral',
    defaultUnit: 'mg',
    referenceValue: 4,
    referenceKind: 'adequate_intake',
    direction: 'informational_only',
    hasDailyValuePercent: false, // Explicitly NO auto %DV
    displayOrder: 44,
    get description() { return tr("Promotes fluorapatite crystal stability in tooth enamel mineralization"); }
  },

  // ==========================================
  // OTHER NUTRIENTS & LIPIDS
  // ==========================================
  fiber: {
    key: 'fiber',
    name: 'Dietary Fiber',
    get shortName() { return tr("Fiber"); },
    category: 'other',
    defaultUnit: 'g',
    referenceValue: 28,
    referenceKind: 'daily_value',
    direction: 'minimum_target',
    hasDailyValuePercent: true,
    displayOrder: 50,
    get description() { return tr("Non-digestible carbohydrate promoting microbiome diversity and satiety"); }
  },
  total_sugars: {
    key: 'total_sugars',
    name: 'Total Sugars',
    get shortName() { return tr("Total Sugars"); },
    category: 'other',
    defaultUnit: 'g',
    referenceValue: null,
    referenceKind: 'informational',
    direction: 'informational_only',
    hasDailyValuePercent: false, // Explicitly NO auto %DV
    displayOrder: 51,
    get description() { return tr("Combined natural and added mono- and disaccharides (informational only)"); }
  },
  added_sugars: {
    key: 'added_sugars',
    name: 'Added Sugars',
    get shortName() { return tr("Added Sugars"); },
    category: 'other',
    defaultUnit: 'g',
    referenceValue: 50,
    referenceKind: 'upper_limit',
    direction: 'maximum_limit', // Maximum-oriented
    hasDailyValuePercent: true,
    displayOrder: 52,
    get description() { return tr("Sugars added during processing; recommend limiting to <10% of daily calories"); }
  },
  cholesterol: {
    key: 'cholesterol',
    name: 'Cholesterol',
    get shortName() { return tr("Cholesterol"); },
    category: 'other',
    defaultUnit: 'mg',
    referenceValue: 300,
    referenceKind: 'upper_limit',
    direction: 'maximum_limit', // Maximum-oriented
    hasDailyValuePercent: true,
    displayOrder: 53,
    get description() { return tr("Dietary sterol; healthy dietary guideline reference <= 300 mg/day"); }
  },
  saturated_fat: {
    key: 'saturated_fat',
    name: 'Saturated Fat',
    get shortName() { return tr("Sat. Fat"); },
    category: 'other',
    defaultUnit: 'g',
    referenceValue: 20,
    referenceKind: 'upper_limit',
    direction: 'maximum_limit', // Maximum-oriented
    hasDailyValuePercent: true,
    displayOrder: 54,
    get description() { return tr("Saturated fatty acid chains; recommended limit <= 20 g/day"); }
  },
  trans_fat: {
    key: 'trans_fat',
    name: 'Trans Fat',
    get shortName() { return tr("Trans Fat"); },
    category: 'other',
    defaultUnit: 'g',
    referenceValue: 0,
    referenceKind: 'informational',
    direction: 'maximum_limit',
    hasDailyValuePercent: false, // Explicitly NO auto %DV
    displayOrder: 55,
    get description() { return tr("Partially hydrogenated industrial fatty acids (keep as close to 0 as possible)"); }
  },
  monounsaturated_fat: {
    key: 'monounsaturated_fat',
    name: 'Monounsaturated Fat',
    get shortName() { return tr("Monounsat."); },
    category: 'other',
    defaultUnit: 'g',
    referenceValue: null,
    referenceKind: 'informational',
    direction: 'informational_only',
    hasDailyValuePercent: false,
    displayOrder: 56,
    get description() { return tr("Omega-9 rich heart-healthy fats such as oleic acid from olive oil"); }
  },
  polyunsaturated_fat: {
    key: 'polyunsaturated_fat',
    name: 'Polyunsaturated Fat',
    get shortName() { return tr("Polyunsat."); },
    category: 'other',
    defaultUnit: 'g',
    referenceValue: null,
    referenceKind: 'informational',
    direction: 'informational_only',
    hasDailyValuePercent: false,
    displayOrder: 57,
    get description() { return tr("Essential polyunsaturated fatty acids containing multiple double bonds"); }
  },
  omega_3: {
    key: 'omega_3',
    name: 'Omega-3 Fatty Acids',
    get shortName() { return tr("Omega-3"); },
    category: 'other',
    defaultUnit: 'g',
    referenceValue: 1.6,
    referenceKind: 'adequate_intake',
    direction: 'informational_only',
    hasDailyValuePercent: false, // Explicitly NO auto %DV
    displayOrder: 58,
    get description() { return tr("Alpha-linolenic acid (ALA), EPA and DHA supporting cardiovascular health"); }
  },
  omega_6: {
    key: 'omega_6',
    name: 'Omega-6 Fatty Acids',
    get shortName() { return tr("Omega-6"); },
    category: 'other',
    defaultUnit: 'g',
    referenceValue: 14,
    referenceKind: 'adequate_intake',
    direction: 'informational_only',
    hasDailyValuePercent: false, // Explicitly NO auto %DV
    displayOrder: 59,
    get description() { return tr("Linoleic acid supporting cellular integrity and metabolic regulation"); }
  },
  caffeine: {
    key: 'caffeine',
    name: 'Caffeine',
    get shortName() { return tr("Caffeine"); },
    category: 'other',
    defaultUnit: 'mg',
    referenceValue: 400,
    referenceKind: 'upper_limit',
    direction: 'maximum_limit', // Maximum-oriented
    hasDailyValuePercent: false, // Explicitly NO auto %DV
    displayOrder: 60,
    get description() { return tr("Central nervous system stimulant; safe reference upper threshold is 400 mg/day"); }
  }
};

/**
 * Lookup nutrient reference configuration by key.
 */
const NUTRIENT_ALIASES: Record<string, string> = {
  sugars: 'total_sugars',
  sugar: 'total_sugars',
  totalsugars: 'total_sugars',
  totalsugar: 'total_sugars',
  satfat: 'saturated_fat',
  transfat: 'trans_fat',
  addedsugars: 'added_sugars',
  addedsugar: 'added_sugars',
  omega3: 'omega_3',
  omega6: 'omega_6'
};

export function getNutrientReference(key: string): NutrientReferenceConfig | undefined {
  if (!key) return undefined;
  const lower = key.toLowerCase();
  if (NUTRIENT_REFERENCE_DICTIONARY[lower]) return NUTRIENT_REFERENCE_DICTIONARY[lower];

  const aliasKey = NUTRIENT_ALIASES[lower.replace(/[^a-z0-9]/g, '')];
  if (aliasKey && NUTRIENT_REFERENCE_DICTIONARY[aliasKey]) {
    return NUTRIENT_REFERENCE_DICTIONARY[aliasKey];
  }

  // Convert camelCase or digits (e.g. vitaminC -> vitamin_c, addedSugars -> added_sugars, omega3 -> omega_3)
  const snake = key.replace(/([A-Z])/g, '_$1').replace(/([0-9]+)/g, '_$1').toLowerCase().replace(/^_/, '');
  if (NUTRIENT_REFERENCE_DICTIONARY[snake]) return NUTRIENT_REFERENCE_DICTIONARY[snake];

  // Strip non-alphanumeric for resilient lookup
  const stripped = lower.replace(/[^a-z0-9]/g, '');
  for (const config of Object.values(NUTRIENT_REFERENCE_DICTIONARY)) {
    if (config.key.replace(/[^a-z0-9]/g, '') === stripped) {
      return config;
    }
  }

  return undefined;
}

/**
 * Get all configured nutrient reference items sorted by display order.
 */
export function getAllNutrientReferences(): NutrientReferenceConfig[] {
  return Object.values(NUTRIENT_REFERENCE_DICTIONARY).sort((a, b) => a.displayOrder - b.displayOrder);
}
