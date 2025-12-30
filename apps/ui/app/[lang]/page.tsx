import LocaleSwitcher from '@/components/locale-switcher'
import { ThemeToggle } from '@/components/theme-toggle'
import { Button } from '@/components/ui/button'
import { Brain, Languages, LineChart } from 'lucide-react'
import Link from 'next/link'
import { Locale } from '../i18n/config'
import { getDictionary } from '../i18n/get-dictionary'

export default async function Home({ params: { lang } }: { params: { lang: Locale } }) {
  const dict = await getDictionary(lang)

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

      <main>
        <section className="py-20">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-orange-600 to-red-700 bg-clip-text text-transparent h-16">
              {dict.hero.title}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {dict.hero.subtitle}
            </p>
            <Link href={`/${lang}/auth/login`}>
              <Button size="lg" className="bg-gradient-to-r from-orange-600 to-red-700 text-white">
                {dict.hero.cta}
              </Button>
            </Link>
          </div>
        </section>

        <section className="py-20 bg-muted/50">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 bg-background rounded-lg shadow-lg">
                <Languages className="w-12 h-12 mb-4 text-orange-500" />
                <h3 className="text-xl font-semibold mb-2">{dict.features.translation.title}</h3>
                <p className="text-muted-foreground">{dict.features.translation.description}</p>
              </div>
              <div className="p-6 bg-background rounded-lg shadow-lg">
                <Brain className="w-12 h-12 mb-4 text-orange-700" />
                <h3 className="text-xl font-semibold mb-2">{dict.features.practice.title}</h3>
                <p className="text-muted-foreground">{dict.features.practice.description}</p>
              </div>
              <div className="p-6 bg-background rounded-lg shadow-lg">
                <LineChart className="w-12 h-12 mb-4 text-red-700" />
                <h3 className="text-xl font-semibold mb-2">{dict.features.tracking.title}</h3>
                <p className="text-muted-foreground">{dict.features.tracking.description}</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
