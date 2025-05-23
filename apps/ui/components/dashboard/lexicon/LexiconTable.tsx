"use client";

import { TranslationDict } from "@/app/i18n/types";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState } from "react";

/**
 * Shape of a single word interaction from the WebSocket event
 */
type WordInteraction = {
  wordId: string;
  word: string;
  pos_tag: string;
  lemma: string;
  score?: number;
};

/**
 * Shape used in table rendering
 */
type WordInteractionRow = {
  id: string;
  word: string;
  tag: string;
  lemma: string;
  revision_score: number;
  needs_revision: boolean;
};

type Props = {
  dict: TranslationDict;
};

/**
 * LexiconTable displays a real-time table of the user's word interactions
 * via WebSocket, including score-based revision indicators.
 */
export default function LexiconTable({ dict }: Props) {
  const [tableData, setTableData] = useState<WordInteractionRow[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // 🚀 Fetch client ID on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.clientId?.value) {
          setClientId(data.clientId.value);
        }
      } catch (error) {
        console.error("❌ Error fetching session:", error);
      }
    };

    fetchSession();
  }, []);

  // 🔌 Listen to WebSocket messages for word statistics
  const { data: interactions, setData: setInteractions } = useWebSocket<WordInteraction>({
    clientId,
    serverUrl: process.env.NEXT_PUBLIC_LEXICON_SERVER ?? "",
    events: {
      wordStatisticsUpdate: (message) => {
        const newData = Array.isArray(message) ? message : [message];

        setInteractions((prev) => {
          const prevArray = Array.isArray(prev) ? prev : [prev];
          const merged = [...prevArray, ...newData].reduce<WordInteraction[]>((acc, item) => {
            if (!acc.some((existing) => existing.wordId === item.wordId)) {
              acc.push(item);
            }
            return acc;
          }, []);
          return merged;
        });

        setLoading(false);
      },
    },
  });

  // 🧠 Convert raw WebSocket data to renderable table rows
  useEffect(() => {
    if (!interactions) return;

    const inputArray = Array.isArray(interactions) ? interactions : [interactions];

    const updatedData: WordInteractionRow[] = inputArray.map((interaction) => ({
      id: interaction.wordId,
      word: interaction.word,
      tag: interaction.pos_tag,
      lemma: interaction.lemma,
      revision_score: interaction.score ?? 0,
      needs_revision: (interaction.score ?? 0) < 0.8,
    }));

    setTableData((prev) => {
      const map = new Map<string, WordInteractionRow>(
        prev.map((item) => [item.id, item])
      );

      updatedData.forEach((item) => {
        map.set(item.id, item); // update or insert
      });

      return Array.from(map.values());
    });
  }, [interactions]);

  if (!clientId) {
    return <p>{dict.global.loading}</p>;
  }

  return (
    <Table className="w-full">
      <TableHeader>
        <TableRow className="font-bold text-lg">
          <TableCell>{dict.lexicon.table.word}</TableCell>
          <TableCell>{dict.lexicon.table.type}</TableCell>
          <TableCell>{dict.lexicon.table.family}</TableCell>
          <TableCell>{dict.lexicon.table.familiarity}</TableCell>
          <TableCell>{dict.lexicon.table.revise}</TableCell>
          <TableCell>{dict.lexicon.table.action}</TableCell>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TableRow>
            <TableCell colSpan={6} className="text-center">
              {dict.global.loading}
            </TableCell>
          </TableRow>
        ) : tableData.length > 0 ? (
          tableData.map((row) => (
            <TableRow key={row.id}>
              <TableCell>{row.word}</TableCell>
              <TableCell>{row.tag}</TableCell>
              <TableCell>{row.lemma}</TableCell>
              <TableCell>
                <div className="w-32 h-2 bg-gray-200">
                  <div
                    className="h-2 bg-green-500"
                    style={{ width: `${Math.round(row.revision_score * 100)}%` }}
                  />
                </div>
              </TableCell>
              <TableCell>{row.needs_revision ? "⚠️" : "✅"}</TableCell>
              <TableCell>
                <button className="text-blue-500 hover:underline">Practice</button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center">
              {dict.lexicon.noWords}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
