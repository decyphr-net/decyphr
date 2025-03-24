import { Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";
import FirstTimeLoginForm from '../../../../components/auth/FirstLoginForm';

export default async function FirstTimeLogin({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang);
  return (
    <div>
      <FirstTimeLoginForm dict={dict} lang={lang} />
    </div>
  );
};
