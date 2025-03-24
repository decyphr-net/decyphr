"use client";

import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useEffect, useState } from "react";

export default function LexiconTable({
  dict,
  lang,
}: {
  dict: Record<string, string>;
  lang: string;
}) {
  const [tableData, setTableData] = useState<any[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ✅ Fetch clientId on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();
        if (data.clientId) {
          setClientId(data.clientId.value);
        }
      } catch (error) {
        console.error("❌ Error fetching session data:", error);
      }
    };

    fetchSession();
  }, []);

  const { data: interactions, setData: setInteractions } = useWebSocket({
    clientId,
    serverUrl: process.env.NEXT_PUBLIC_LEXICON_SERVER,
    events: {
      wordStatisticsUpdate: (message) => {
        setInteractions((prev) => {
          // Ensure prev is always an array
          const prevData = Array.isArray(prev) ? prev : prev ? [prev] : [];
          const newData = Array.isArray(message) ? message : [message];

          // Merge new and previous data, avoiding duplicates
          const mergedData = [...prevData, ...newData].reduce((acc, item) => {
            if (!acc.some((existing) => existing.wordId === item.wordId)) {
              acc.push(item);
            }
            return acc;
          }, []);

          return mergedData;
        });
        setLoading(false);
      },

    },
  });

  useEffect(() => {
    if (!interactions || (Array.isArray(interactions) && interactions.length === 0)) return;

    // Ensure `interactions` is always an array
    const normalizedInteractions = Array.isArray(interactions) ? interactions : [interactions];

    const processedData = normalizedInteractions.map((interaction: any) => ({
      id: interaction.wordId,
      word: interaction.word,
      tag: interaction.pos_tag,
      lemma: interaction.lemma,
      revision_score: interaction.score ?? 0,
      needs_revision: (interaction.score ?? 0) < 0.8,
    }));

    // 🔹 Update existing words, or add new ones
    setTableData((prev) => {
      const prevTableData = Array.isArray(prev) ? prev : prev ? [prev] : [];

      // Create a Map to easily replace existing words
      const dataMap = new Map(prevTableData.map((item) => [item.id, item]));

      // Update or insert new words
      processedData.forEach((item) => {
        dataMap.set(item.id, item); // Replaces existing or adds new
      });

      return Array.from(dataMap.values()); // Convert back to array
    });
  }, [interactions]);


  if (!clientId) return <p>{dict.global.loading}</p>;

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
      // 🔹 Show loading message while fetching data
      <TableRow>
        <TableCell colSpan={6} className="text-center">
          {dict.global.loading}
        </TableCell>
      </TableRow>
    ) : tableData.length > 0 ? (
      // ✅ Show table data when received
      tableData.map((row) => (
        <TableRow key={row.id}>
          <TableCell>{row.word}</TableCell>
          <TableCell>{row.tag}</TableCell>
          <TableCell>{row.lemma}</TableCell>
          <TableCell><Progress value={row.revision_score * 100} className="w-32 h-2" /></TableCell>
          <TableCell>{row.needs_revision ? "⚠️" : "✅"}</TableCell>
          <TableCell>
            <button className="text-blue-500 hover:underline">Practice</button>
          </TableCell>
        </TableRow>
      ))
    ) : (
      // 🚨 Show "No Words" message if WebSocket returns an empty array
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
