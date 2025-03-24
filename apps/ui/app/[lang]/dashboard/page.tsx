import { Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";
import DashboardClient from "@/components/dashboard/DashboardClient";

export default async function DashboardPage({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang);

  return <DashboardClient dict={dict} lang={lang} />;
}
