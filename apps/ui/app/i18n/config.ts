export type Locale = 'en' | 'ga' | 'pt'

export const defaultLocale: Locale = 'en'
export const locales: Locale[] = ['en', 'ga', 'pt']

export const localeNames: { [key in Locale]: string } = {
  en: 'English',
  ga: 'Gaeilge',
  pt: 'Português'
}