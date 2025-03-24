"use client";

import { useWebSocket } from "@/hooks/useWebSocket"; // Assuming your WebSocket hook is here
import { useEffect, useState } from "react";
import TranslationInput from "./TranslationInput";
import TranslationList from "./TranslationList";

export default function TranslationClient({
  dict,
  lang,
}: {
  dict: Record<string, string>;
  lang: string;
}) {
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch session data only on the client side
    const getSessionData = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.clientId) {
          setClientId(data.clientId.value);
        } else {
          console.error("Client ID not found");
        }
      } catch (error) {
        console.error("Error fetching session data:", error);
      }
    };

    getSessionData();
  }, []);

  const { data: translations, setData: setTranslations } = useWebSocket({
    clientId,
    serverUrl: process.env.NEXT_PUBLIC_TRANSLATION_SERVER,
    events: {
      pageData: (message) => setTranslations(message),
      translationResponse: (message) => setTranslations((prev) => [message, ...prev]),
    },
  });

  if (!clientId) {
    return <div>Loading...</div>; // Show loading while clientId is being fetched
  }

  return (
    <section className="py-12">
      <div className="container mx-auto p-4 flex flex-col items-center gap-4">
        <h2 className="text-2xl font-bold">{dict.translate.title}</h2>

        <TranslationInput clientId={clientId} dict={dict} />
        <TranslationList clientId={clientId} dict={dict} lang={lang} translations={translations} />
      </div>
    </section>
  );
}
