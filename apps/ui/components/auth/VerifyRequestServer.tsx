import type { Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";

/**
 * Props for the VerifyRequestServer component.
 */
type Props = {
  lang: Locale;
};

/**
 * VerifyRequestServer is a server component that renders
 * the "Check your email" message after a user requests a magic login link.
 * It loads the correct translation dictionary based on the locale.
 *
 * @param lang - The active language/locale (e.g., 'en', 'ga', 'pt')
 * @returns A server-rendered page showing verification instructions
 */
export default async function VerifyRequestServer({ lang }: Props) {
  const dict = await getDictionary(lang);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full p-6 rounded-lg shadow-md bg-background">
        <h1 className="text-2xl font-semibold text-center mb-4">
          {dict.auth.verifyRequestTitle}
        </h1>
        <p className="text-sm text-gray-200 text-center mb-6">
          {dict.auth.verifyRequestText}
        </p>
        <div className="w-full bg-gradient-to-r from-orange-600 to-red-700 text-white text-center py-2 rounded-lg">
          {dict.auth.verifyRequestWaiting}
        </div>
      </div>
    </div>
  );
}
