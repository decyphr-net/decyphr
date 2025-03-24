// app/[lang]/dashboard/language-processing/page.tsx

import { Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";
import TranslationClient from "@/components/translation/TranslationClient";

export default async function TranslationPage({
  params: { lang },
}: {
  params: { lang: Locale };
}) {
  const dict = await getDictionary(lang);

  return <TranslationClient dict={dict} lang={lang} />;
}
