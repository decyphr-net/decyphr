"use client";

import { TranslationDict } from "@/app/i18n/types";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import TranslationCard from "./TranslationCard";
import { Translation } from "./types";

/**
 * Props for the TranslationList component
 */
type Props = {
  dict: TranslationDict;
  translations: Translation[];
};

/**
 * Displays a paginated list of translation cards.
 *
 * @param dict - Translated UI labels
 * @param translations - Full list of translations to paginate
 */
const TranslationList = ({ dict, translations = [] }: Props) => {
  const [page, setPage] = useState(1);
  const limit = 5;

  const startIndex = (page - 1) * limit;
  const paginatedTranslations = translations.slice(startIndex, startIndex + limit);
  const totalPages = Math.ceil(translations.length / limit);

  const handlePagination = (newPage: number) => {
    setPage(newPage);
  };

  useEffect(() => {
    if (translations.length === 0) {
      console.log("No translations available.");
    }
  }, [translations]);

  return (
    <div className="w-full max-w-4xl">
      <div>
        {paginatedTranslations.length > 0 ? (
          paginatedTranslations.map((translation) => (
            <TranslationCard key={translation.id} translation={translation} />
          ))
        ) : (
          <p>{dict.translate.translateNoTranslations}</p>
        )}
      </div>

      <div className="flex items-center justify-center space-x-4 mt-4">
        <Button
          disabled={page === 1}
          onClick={() => handlePagination(page - 1)}
          className={`${
            page === 1 ? "cursor-not-allowed opacity-50 text-black" : "hover:bg-gray-300 hover:text-black"
          } px-4 py-2 rounded-md text-sm bg-gray-200 transition duration-200`}
        >
          {dict.translate.translatePaginationPrev}
        </Button>

        <span className="text-lg font-semibold">
          {dict.translate.translatePaginationText
            .replace("{page}", String(page))
            .replace("{totalPages}", String(totalPages))}
        </span>

        <Button
          disabled={page === totalPages}
          onClick={() => handlePagination(page + 1)}
          className={`$[
            page === totalPages ? "cursor-not-allowed opacity-50 text-black" : "hover:bg-gray-300 hover:text-black"
          } px-4 py-2 rounded-md text-sm transition duration-200`}
        >
          {dict.translate.translatePaginationNext}
        </Button>
      </div>
    </div>
  );
};

export default TranslationList;