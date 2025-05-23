import { Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary"; // Adjust the import to match your i18n setup
import LocaleSwitcher from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export default async function DashboardLayout({
  children,
  params: { lang },
}: {
  children: ReactNode;
  params: { lang: string };
}) {
  const dict = await getDictionary(lang as Locale);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-700 bg-clip-text text-transparent">
            <Link href={`/${lang}/dashboard`}>Decyphr Dashboard</Link>
          </h1>

          <div className="hidden md:flex space-x-6">
            {/* <Link href={`/${lang}/dashboard/chat`}>
              <Button variant="ghost">{dict.nav.chat}</Button>
            </Link> */}
            <Link href={`/${lang}/dashboard/language-processing`}>
              <Button variant="ghost">{dict.nav.translate}</Button>
            </Link>
            <Link href={`/${lang}/dashboard/lexicon`}>
              <Button variant="ghost">{dict.nav.lexicon}</Button>
            </Link>
          </div>

          <div className="flex items-center space-x-2">
            <Link href={`/${lang}/settings`}>
              <Settings />
              <span>{dict.global.settings}</span>
            </Link>
            <LocaleSwitcher />
            <ThemeToggle dict={dict.global} />
          </div>
        </div>
      </nav>

      <main>{children}</main>
    </div>
  );
}
