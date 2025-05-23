"use client";

import { TranslationDict } from "@/app/i18n/types";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState } from "react";
import TranslationInput from "./TranslationInput";
import TranslationList from "./TranslationList";
import { Translation } from "./types";

/**
 * Props for the TranslationClient component.
 */
type Props = {
  dict: TranslationDict;
  lang: string;
};

/**
 * TranslationClient is the main component for managing real-time translation interactions.
 * It:
 * - Fetches the clientId from session
 * - Listens to translation updates via WebSocket
 * - Displays the input form and list of past translations
 *
 * @param dict - The full translation dictionary
 * @param lang - The active language code (e.g. 'en', 'ga', 'pt')
 */
export default function TranslationClient({ dict, lang }: Props) {
  const [clientId, setClientId] = useState<string | null>(null);

  // 🔁 Fetch clientId on mount
  useEffect(() => {
    const getSessionData = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.clientId?.value) {
          setClientId(data.clientId.value);
        } else {
          console.error("⚠️ Client ID not found");
        }
      } catch (error) {
        console.error("❌ Error fetching session data:", error);
      }
    };

    getSessionData();
  }, []);

  const { data: translations, setData: setTranslations } = useWebSocket<Translation>({
    clientId,
    serverUrl: process.env.NEXT_PUBLIC_TRANSLATION_SERVER ?? "http://localhost:3003",
    events: {
      pageData: (message) => setTranslations(Array.isArray(message) ? message : [message]),
      translationResponse: (message) => setTranslations((prev) => [message, ...(prev || [])]),
    },
  });

  if (!clientId) {
    return <div>Loading...</div>;
  }

  return (
    <section className="py-12">
      <div className="container mx-auto p-4 flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold">{dict.translate.title}</h2>

        <TranslationInput clientId={clientId} dict={dict} />
        <TranslationList dict={dict} translations={translations || []}
        />
      </div>
    </section>
  );
}
