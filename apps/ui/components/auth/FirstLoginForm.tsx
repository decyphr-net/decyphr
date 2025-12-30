"use client";

import { languageOptions, Locale } from "@/app/i18n/config";
import type { TranslationDict } from "@/app/i18n/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import LocaleSwitcher from "../locale-switcher";
import { ThemeToggle } from "../theme-toggle";
import { Button } from "../ui/button";

type Props = {
  dict: TranslationDict;
  lang: Locale;
};

/**
 * FirstTimeLoginPage component
 *
 * This client-side form allows users to configure their language preferences
 * on first login, storing selections in localStorage and redirecting based on immersion level.
 *
 * Props:
 * @param dict - Localised strings dictionary
 * @param lang - Active locale string (e.g. 'en', 'pt', 'ga')
 */
export default function FirstTimeLoginPage({ dict, lang }: Props) {
  const [firstLanguage, setFirstLanguage] = useState(lang);
  const [targetLanguage, setTargetLanguage] = useState("");
  const [immersionLevel, setImmersionLevel] = useState<"normal" | "full">("normal");
  const router = useRouter();

  /**
   * Handles form submission by saving preferences in localStorage
   * and redirecting the user to the appropriate dashboard route.
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const languageSettings = {
      firstLanguage,
      targetLanguage,
      immersionLevel,
    };

    localStorage.setItem("languageSetting", JSON.stringify(languageSettings));

    const redirectPath =
      immersionLevel === "full" ? `/${targetLanguage}/dashboard` : "/dashboard";

    router.push(redirectPath);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-700 bg-clip-text text-transparent">
            Misneach
          </h1>
          <div className="flex items-center space-x-2">
            <LocaleSwitcher />
            <ThemeToggle dict={dict.global} />
          </div>
        </div>
      </nav>

      {/* Language Setup Form */}
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full shadow-md p-6 rounded-lg">
          <h1 className="text-3xl font-bold mb-4">{dict.auth.firstTimeLoginTitle}</h1>
          <form onSubmit={handleSubmit}>
            {/* First Language */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {dict.auth.firstLanguage}
              </label>
              <select
                className="w-full p-2 mb-4 border rounded"
                value={firstLanguage}
                onChange={(e) => setFirstLanguage(e.target.value as Locale)}
                required
              >
                {languageOptions.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Language */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                {dict.auth.targetLanguage}
              </label>
              <select
                className="w-full p-2 mb-4 border rounded"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                required
              >
                <option value="" disabled>
                  {dict.auth.selectLanguage}
                </option>
                {languageOptions
                  .filter((lang) => lang.value !== firstLanguage)
                  .map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
              </select>
            </div>

            {/* Immersion Level */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {dict.auth.immersionLevel}
              </label>
              <select
                name="immersionLevel"
                className="w-full p-2 border rounded"
                value={immersionLevel}
                onChange={(e) =>
                  setImmersionLevel(e.target.value as "normal" | "full")
                }
              >
                <option value="normal">{dict.auth.immersionNormal}</option>
                <option value="full">{dict.auth.immersionFull}</option>
              </select>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-600 to-red-700 text-white"
            >
              {dict.auth.saveSettings}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
