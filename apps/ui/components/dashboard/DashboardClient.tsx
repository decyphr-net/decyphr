"use client";

import { Button } from "@/components/ui/button";
import { BookOpen, List } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

export default function DashboardClient({ dict, lang }: { dict: any; lang: string }) {
  const router = useRouter();
  const [user, setUser] = useState<string | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setUser(data.clientId);
        console.log(data);
      } else {
        router.push(`/${lang}/auth/login`); // Redirect to login if not authenticated
      }
    };

    checkSession();
  }, [router, lang]);

  const logout = async () => {
    await fetch("/api/auth/logout");
    router.push(`/${lang}/auth/login`);
  };

  if (!user) {
    return <p>{dict.loading}</p>; // Show loading state while checking session
  }

  return (
    <section className="py-20">
      <div className="container mx-auto px-4 grid md:grid-cols-3 gap-8 text-center">
        <Link href={`/${lang}/dashboard/chat`} className="w-full">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer flex flex-col h-full">
            <CardHeader className="flex flex-col items-center p-4">
              <Bot className="w-12 h-12 text-orange-500" />
              <CardTitle className="text-xl font-semibold mt-2">{dict.dashboard.chat.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col p-4 h-full">
              <CardDescription className="flex-1">{dict.dashboard.chat.description}</CardDescription>
              <Button className="self-center mt-8">{dict.dashboard.chat.cta}</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${lang}/dashboard/language-processing`} className="w-full">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer flex flex-col h-full">
            <CardHeader className="flex flex-col items-center p-4">
              <BookOpen className="w-12 h-12 text-orange-700" />
              <CardTitle className="text-xl font-semibold mt-2">{dict.dashboard.translation.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col p-4 h-full">
              <CardDescription className="flex-1">{dict.dashboard.translation.description}</CardDescription>
              <Button className="self-center mt-8">{dict.dashboard.translation.cta}</Button>
            </CardContent>
          </Card>
        </Link>

        <Link href={`/${lang}/dashboard/lexicon`} className="w-full">
          <Card className="hover:shadow-xl transition-shadow cursor-pointer flex flex-col h-full">
            <CardHeader className="flex flex-col items-center p-4">
              <List className="w-12 h-12 text-red-700" />
              <CardTitle className="text-xl font-semibold mt-2">{dict.dashboard.lexicon.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col p-4 h-full">
              <CardDescription className="flex-1">{dict.dashboard.lexicon.description}</CardDescription>
              <Button className="self-center mt-8">{dict.dashboard.lexicon.cta}</Button>
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  );
}
