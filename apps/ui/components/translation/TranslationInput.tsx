"use client";

import { TranslationDict } from "@/app/i18n/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

/**
 * Props for the TranslationInput component
 */
type Props = {
  clientId: string;
  dict: TranslationDict;
};

/**
 * TranslationInput allows the user to input text and submit it for translation.
 * It triggers a backend translation request via REST API, using the current language settings.
 *
 * @param clientId - The current session's client ID
 * @param dict - Translation dictionary for UI text
 */
const TranslationInput = ({ clientId, dict }: Props) => {
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const handleTranslate = async () => {
    if (!clientId || !text.trim()) return;

    setLoading(true);
    const languageSettings = JSON.parse(localStorage.getItem("languageSetting") || "{}");

    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/translate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          sourceLang: languageSettings.targetLanguage,
          targetLang: languageSettings.firstLanguage,
          clientId,
        }),
      });
    } catch (error) {
      console.error("❌ Translation request failed:", error);
    } finally {
      setText("");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={dict.translate.inputPlaceholer}
      />
      <Button
        onClick={handleTranslate}
        disabled={loading}
        className="w-full mt-4 max-w-4xl bg-gradient-to-r from-orange-500 to-red-700"
      >
        {loading ? dict.translate.translateButtonLoading : dict.translate.translateButton}
      </Button>
    </div>
  );
};

export default TranslationInput;