import { Locale } from "../../app/i18n/config";
import { getDictionary } from "../../app/i18n/get-dictionary";
import LocaleSwitcher from "../locale-switcher";
import { ThemeToggle } from "../theme-toggle";
import { Button } from "../ui/button";
import ClientAuth from "./AuthClient";

export default async function AuthServer({ lang }: { lang: Locale }) {
  const dict = await getDictionary(lang);

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-700 bg-clip-text text-transparent">
              Misneach
            </h1>
            <div className="hidden md:flex space-x-6">
              <Button variant="ghost">{dict.nav.home}</Button>
              <Button variant="ghost">{dict.nav.features}</Button>
              <Button variant="ghost">{dict.nav.practice}</Button>
              <Button variant="ghost">{dict.nav.pricing}</Button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <LocaleSwitcher />
            <ThemeToggle dict={dict.global} />
          </div>
        </div>
      </nav>
      <div className="flex items-center justify-center min-h-screen">
        <div className="max-w-md w-full shadow-md p-6 rounded-lg">
          <h1 className="text-3xl font-bold mb-4">{dict.auth.title}</h1>
          <ClientAuth dict={dict} lang={lang} />
        </div>
      </div>
    </div>
  );
}