"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";

const TranslationInput = ({dict}) => {
  const [clientId, setClientId] = useState<string | null>(null);
  const [text, setText] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const getSessionData = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.clientId) {
          setClientId(data.clientId.value);
        } else {
          throw new Error("Client ID not found in session");
        }
      } catch (error) {
        console.error("Failed to fetch session:", error);
      }
    };

    getSessionData();
  }, []);

  const handleTranslate = async () => {
    if (!clientId) return;

    setLoading(true);
    const languageSettings = JSON.parse(localStorage.getItem("languageSetting") || "{}");

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

    setText("");
    setLoading(false);
  };

  return (
    <div className="w-full max-w-4xl">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={dict.translate.inputPlaceholer} />
      <Button onClick={handleTranslate} disabled={loading} className="w-full mt-4 max-w-4xl bg-gradient-to-r from-orange-500 to-red-700">
        {loading ? dict.translate.translateButtonLoading : dict.translate.translateButton}
      </Button>
    </div>
  );
};

export default TranslationInput;
