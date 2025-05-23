"use client";

import { TranslationDict } from "@/app/i18n/types";
import { useState } from "react";
import { Button } from "../ui/button";

/**
 * Props for the ClientAuth component.
 */
type ClientAuthProps = {
  dict: TranslationDict;
  lang: string;
};

/**
 * ClientAuth is a client-side component that provides a form
 * for users to request a magic login link via email.
 *
 * It uses a locale-specific dictionary for UI text and sends
 * the email and language code to the `/api/auth/magic-link` route.
 *
 * @param dict - A nested translation dictionary used to localise UI strings
 * @param lang - The active language code (e.g., 'en', 'ga-ie', 'pt-br')
 */
export default function ClientAuth({ dict, lang }: ClientAuthProps) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  /**
   * Sends a request to the backend to generate a magic login link
   * for the provided email address and selected language.
   */
  const sendMagicLink = async () => {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale: lang }),
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setMessage(dict.auth.sent);
      } else {
        setMessage(data.error || dict.auth.error);
      }
    } catch (err) {
      console.error("Failed to send magic link:", err);
      setLoading(false);
      setMessage(dict.auth.error);
    }
  };

  return (
    <div>
      <input
        type="email"
        name="email"
        className="w-full p-2 mb-4 border rounded"
        placeholder={dict.auth.emailPlaceholder}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Button
        onClick={sendMagicLink}
        className="w-full bg-gradient-to-r from-orange-600 to-red-700 text-white"
      >
        {loading ? dict.auth.sending : dict.auth.signIn}
      </Button>
      {message && <p className="mt-2 text-sm text-center">{message}</p>}
    </div>
  );
}
