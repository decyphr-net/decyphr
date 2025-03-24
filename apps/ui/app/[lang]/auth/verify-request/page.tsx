import { Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";
import MagicLoginClient from "@/components/auth/MagicLoginClient";

export default async function MagicLoginPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang);

  return <MagicLoginClient dict={dict} lang={lang} />;
}

