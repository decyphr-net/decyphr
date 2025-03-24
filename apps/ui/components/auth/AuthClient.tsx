"use client";

import { useState } from "react";
import { Button } from "../ui/button";

export default function ClientAuth({ dict, lang }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const sendMagicLink = async () => {
    setLoading(true);
    setMessage("");

    const res = await fetch("/api/auth/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, locale: lang })
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage(dict.auth.sent);
    } else {
      setMessage(data.error || dict.auth.error)
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
      <Button onClick={sendMagicLink} className="w-full bg-gradient-to-r from-orange-600 to-red-700 text-white">
        {loading ? dict.auth.sending : dict.auth.signIn}
      </Button>
    </div>
  );
}