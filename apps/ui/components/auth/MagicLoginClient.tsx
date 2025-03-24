"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function MagicLoginClient({ dict, lang }: { dict: any, lang: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState(dict.auth.magicLoginVerifying);
  const storedData = localStorage.getItem('languageSetting');
  const hasLanguageSettings = storedData !== null;

  useEffect(() => {
    if (!searchParams) return;

    const token = searchParams.get("token");
    const email = searchParams.get("email");

    if (!token || !email) {
      setMessage(dict.auth.magicLoginInvalidLinkError);
      return;
    }

    const verifyMagicLink = async () => {
      const res = await fetch(`/api/auth/verify-request?token=${token}&email=${email}`);
      if (res.ok) {
        const data = await res.json();
        router.push(hasLanguageSettings ? `/${lang}/dashboard` : `/${lang}/auth/first-login`);
      } else {
        setMessage(dict.auth.magicLoginExpiredLinkError);
      }
    };

    verifyMagicLink();
  }, [searchParams, router, dict, lang, hasLanguageSettings]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full p-6 shadow-lg rounded-lg bg-gray-800 text-white">
        <h1 className="text-xl font-semibold text-center">{message}</h1>
      </div>
    </div>
  );
}
