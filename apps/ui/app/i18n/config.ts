export type Locale = 'en' | 'ga' | 'pt';

export const defaultLocale: Locale = 'en';

export const locales: Locale[] = ['en', 'ga', 'pt'];

export const localeNames: { [key in Locale]: string } = {
  en: 'English',
  ga: 'Gaeilge',
  pt: 'Português',
};

export const languageOptions = [
  { label: 'English', value: 'en' },
  { label: 'Gaeilge', value: 'ga' },
  { label: 'Português', value: 'pt' },
] as const;

export type LanguageOption = typeof languageOptions[number];
