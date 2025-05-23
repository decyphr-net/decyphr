import { Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";
import FirstTimeLoginForm from "@/components/auth/FirstLoginForm";

/**
 * Renders the first-time login page for a given locale.
 * This page loads the appropriate dictionary and passes it to the FirstTimeLoginForm.
 *
 * @param params - Route parameters including the selected language (locale)
 * @returns A server-rendered page with the language-specific first-time login form
 */
export default async function FirstTimeLogin({
  params: { lang },
}: {
  params: { lang: Locale };
}) {
  const dict = await getDictionary(lang);

  return (
    <div>
      <FirstTimeLoginForm dict={dict} lang={lang} />
    </div>
  );
}