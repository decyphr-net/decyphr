import 'server-only';
import type { Locale } from './config';

const dictionaries = {
  en: () => import('./dictionaries/en.json').then((module) => module.default),
  ga: () => import('./dictionaries/ga.json').then((module) => module.default),
  pt: () => import('./dictionaries/pt.json').then((module) => module.default),
}

export const getDictionary = async (locale: Locale) => {
  const loader = dictionaries[locale];

  if (!loader) {
    console.error(`❌ Locale '${locale}' not found in dictionaries. Falling back to 'en'.`);
    return dictionaries.en(); // fallback
  }

  return loader();
}