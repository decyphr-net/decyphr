import { getDictionary } from "@/app/i18n/get-dictionary";

export default async function VerifyRequestServer({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-semibold text-center mb-4">{dict.auth.verifyRequestTitle}</h1>
        <p className="text-gray-200 text-center mb-6">
          {dict.auth.verifyRequestText}
        </p>
        <div className="w-full bg-gradient-to-r from-orange-600 to-red-700 text-white text-center py-2 rounded-lg">
          {dict.auth.verifyRequestWaiting}
        </div>
      </div>
    </div>
  );
}