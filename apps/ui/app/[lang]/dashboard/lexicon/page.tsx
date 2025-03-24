import { Locale } from "@/app/i18n/config";
import { getDictionary } from "@/app/i18n/get-dictionary";
import LexiconTable from "@/components/dashboard/lexicon/LexiconTable";

export default async function LexiconPage({
  params: { lang },
}: {
  params: { lang: Locale };
}) {
  const dict = await getDictionary(lang);
  return (
      <section className="py-12">
        <div className="container mx-auto p-4 flex flex-col items-center gap-4">
          <h2 className="text-2xl font-bold">{dict.lexicon.title}</h2>
          <LexiconTable dict={dict} />
        </div>
      </section>
  );
};

