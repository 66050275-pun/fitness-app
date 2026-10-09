/**
 * Application Configuration & Content Data
 * 
 * Centralized metadata for:
 * - App version & release information
 * - Changelog / What's New
 * - Help Center FAQs (Accordion)
 * - Legal Document texts (Draft state)
 */

export interface ChangelogItem {
  version: string;
  releaseDate: string;
  title: string;
  highlights: string[];
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  status: 'draft' | 'published';
  lastUpdated: string;
  summary: string;
  sections: { title: string; content: string }[];
}

export const APP_METADATA = {
  name: 'NutriAI',
  version: '1.0.0',
  build: '100',
  platform: 'Android (Capacitor Native)',
  releaseDate: 'September 2026',
  supportEmail: 'support@nutriai.app',
  playStoreListingAvailable: false,
  publicShareUrl: ''
} as const;

export const CHANGELOG: ChangelogItem[] = [
  {
    version: '1.0.0',
    releaseDate: 'September 2026',
    title: 'Initial Android Release',
    highlights: [
      'Visual Nutrition Scanner with instant AI detection (demo mode)',
      'Comprehensive Micronutrient profiles with coverage percentage tracking',
      '4-Step Custom Food Wizard with 4–4–9 calorie validation',
      'Dynamic Multi-Year Diary with anchored weekly strip and Calorie Progress Rings',
      'Personal Records and Workout History tracking',
      'Weight Goal, Activity Level, and Weight History tracking',
      'Intermittent Eating Schedule window customization',
      'System, Light, and Dark mode theme support'
    ]
  }
];

export const HELP_CENTER_FAQS: FaqItem[] = [
  {
    id: 'faq-food-logging',
    category: 'Logging',
    question: 'How does food logging work in NutriAI?',
    answer: 'You can log meals through multiple methods: scanning meals with the camera (demo mode), searching our built-in food catalog, creating custom recipes using the 4-step wizard, or using Quick Log for swift calorie and macro entry. Each logged item is associated with a specific date, meal type, and verified portion.'
  },
  {
    id: 'faq-macro-calculations',
    category: 'Nutrition',
    question: 'How do nutrition and calorie calculations work?',
    answer: 'NutriAI utilizes standard physiological energy density factors: 4 kcal per gram of protein, 4 kcal per gram of carbohydrate, and 9 kcal per gram of fat. When creating or editing foods, you can calculate calories directly from macronutrients to ensure numerical consistency.'
  },
  {
    id: 'faq-micronutrient-coverage',
    category: 'Micronutrients',
    question: 'How does micronutrient coverage work?',
    answer: 'Micronutrients represent trace vitamins and minerals (such as Vitamin C, Vitamin D, Calcium, and Iron). NutriAI aggregates daily micronutrients only from meals with verified nutritional profiles. Meals without micronutrient data are never assumed to be zero, and coverage percentage indicates data completeness across your day.'
  },
  {
    id: 'faq-workout-history',
    category: 'Fitness',
    question: 'How does workout history and PR tracking work?',
    answer: 'Workouts are recorded with individual exercises, sets, repetitions, and weights. The system automatically inspects your completed sets to identify all-time Personal Records (PRs) by maximum weight and calculated one-rep max.'
  },
  {
    id: 'faq-local-data',
    category: 'Data & Privacy',
    question: 'Where is my data stored?',
    answer: 'All your logs, foods, workouts, weights, and personal settings are stored exclusively in your device\'s local storage. No data is transmitted to external servers or sold to third parties. You can export your full backup as a JSON file anytime from Data & Privacy.'
  },
  {
    id: 'faq-scanner-estimates',
    category: 'Scanner',
    question: 'Why are scanned nutritional values estimates?',
    answer: 'Visual AI food scanning estimates portion sizes and ingredients based on photographic appearance. Prepared meals vary significantly in cooking oils, sauces, and actual density, so scanned items should be treated as nutritional estimates rather than certified laboratory analyses.'
  }
];

export const TERMS_OF_USE_DOC: LegalDocument = {
  id: 'terms_of_use',
  title: 'Terms of Use',
  status: 'draft',
  lastUpdated: 'September 2026',
  summary: 'Draft legal terms. Not yet finalized for commercial release.',
  sections: [
    {
      title: '1. Acceptance of Terms',
      content: 'NutriAI is currently provided as a local personal nutrition and fitness tracking application. By using this application, you agree to these provisional draft terms.'
    },
    {
      title: '2. General Informational Use',
      content: 'All calculations, micronutrient analyses, calorie counts, and workout logs are intended for general personal wellness tracking and educational purposes only.'
    },
    {
      title: '3. Local Storage & Responsibility',
      content: 'Because your data resides solely on your physical device, you are responsible for maintaining backups using the built-in JSON Export feature in Data & Privacy.'
    }
  ]
};

export const PRIVACY_POLICY_DOC: LegalDocument = {
  id: 'privacy_policy',
  title: 'Privacy Policy',
  status: 'draft',
  lastUpdated: 'September 2026',
  summary: 'Draft privacy policy detailing 100% on-device storage.',
  sections: [
    {
      title: '1. On-Device Data Storage',
      content: 'NutriAI does not operate a remote user database or authentication cloud in this version. All personal information, weights, meals, and workout logs remain strictly inside your device\'s local storage.'
    },
    {
      title: '2. Zero Telemetry & Tracking',
      content: 'We do not employ third-party behavioral trackers, advertising pixels, or telemetry SDKs. Your health data is entirely private to your device.'
    },
    {
      title: '3. User Rights & Data Deletion',
      content: 'You retain complete ownership of your data. You may export your complete data as a JSON file or delete individual data sections (meals, workouts, weights) or all local data at any time.'
    }
  ]
};

export const HEALTH_DISCLAIMER_DOC: LegalDocument = {
  id: 'health_disclaimer',
  title: 'Health Disclaimer',
  status: 'draft',
  lastUpdated: 'September 2026',
  summary: 'Important medical and health notice for all NutriAI users.',
  sections: [
    {
      title: 'Not Medical Advice',
      content: 'NutriAI provides general nutrition and fitness information. It is not a substitute for professional medical advice, diagnosis, or treatment.'
    },
    {
      title: 'Consultation with Healthcare Professionals',
      content: 'Always seek the advice of your physician, registered dietitian, or other qualified health provider with any questions you may have regarding a medical condition, weight management goals, or physical exercise program.'
    },
    {
      title: 'Emergency Situations',
      content: 'If you think you may have a medical emergency, call your doctor or local emergency services immediately.'
    }
  ]
};
