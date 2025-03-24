"use client";  // This is a client-side component

import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import TranslationCard from "./TranslationCard";

// Pagination logic
const TranslationList = ({ dict, translations = [] }: { translations: any[] }) => {
  const [page, setPage] = useState(1);
  const limit = 5;

  // Paginate translations on the client-side
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
        {/* Render paginated translations here */}
        {paginatedTranslations.length > 0 ? (
          paginatedTranslations.map((translation, index) => (
            <TranslationCard
              key={index}
              translation={translation}
            />
          ))
        ) : (
          <p>{dict.translate.translateNoTranslations}</p>
        )}
      </div>

      <div className="flex items-center justify-center space-x-4">
        {/* Previous Button */}
        <Button
          disabled={page === 1}
          onClick={() => handlePagination(page - 1)}
          className={`${
            page === 1 ? 'cursor-not-allowed opacity-50 text-black' : 'hover:bg-gray-300 hover:text-black'
          } px-4 py-2 rounded-md text-sm bg-gray-200 transition duration-200`}
        >
          {dict.translate.translatePaginationPrev}
        </Button>

        {/* Current Page and Total Pages */}
        <span className="text-lg font-semibold">
          {page}/{totalPages}
        </span>

        {/* Next Button */}
        <Button
          disabled={page === totalPages}
          onClick={() => handlePagination(page + 1)}
          className={`${
            page === totalPages ? 'cursor-not-allowed opacity-50 text-black' : 'hover:bg-gray-300 hover:text-black'
          } px-4 py-2 rounded-md text-sm transition duration-200`}
        >
          {dict.translate.translatePaginationNext}
        </Button>
      </div>
    </div>
  );
};

export default TranslationList;
