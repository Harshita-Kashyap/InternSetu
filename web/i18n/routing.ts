import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'hi', 'mr', 'bn'],
  defaultLocale: 'en'
});