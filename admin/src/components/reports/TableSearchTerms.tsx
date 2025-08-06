// src/components/TableSearchTerms.tsx
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SearchTermLog {
  term: string;
  hepsiburadaCount: number;
  trendyolCount: number;
  avansasCount: number;
  n11Count: number;
}

export default function TableSearchTerms() {
  const [terms, setTerms] = useState<SearchTermLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/search-terms-log?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      if (data.success) {
        setTerms(data.data || []);
      }
    } catch (err) {
      console.error("🔴 Search term verileri alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, limit]);

  const totalPages = Math.ceil(terms.length / limit);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex justify-between p-4 border-b">
        <h2 className="text-xl text-gray-800 dark:text-white font-semibold">
          Arama Terimleri Özeti
        </h2>
      </div>

      <div className="max-w-full overflow-x-auto text-gray-800 dark:text-white">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.5]">
            <TableRow>
              <TableCell isHeader
                className="px-5 py-3 text-start text-theme-md text-gray-500 dark:text-gray-400">#</TableCell>
              <TableCell isHeader
                className="px-5 py-3 text-start text-theme-md text-gray-500 dark:text-gray-400">Arama Terimi</TableCell>
              <TableCell isHeader
                className="px-5 py-3 text-start text-theme-md text-gray-500 dark:text-gray-400">Hepsiburada</TableCell>
              <TableCell isHeader
                className="px-5 py-3 text-start text-theme-md text-gray-500 dark:text-gray-400">Trendyol</TableCell>
              <TableCell isHeader
                className="px-5 py-3 text-start text-theme-md text-gray-500 dark:text-gray-400">Avansas</TableCell>
              <TableCell isHeader
                className="px-5 py-3 text-start text-theme-md text-gray-500 dark:text-gray-400">N11</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-6">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : terms.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-6 text-gray-500">
                  Henüz kayıt yok.
                </TableCell>
              </TableRow>
            ) : (
              terms.slice((page - 1) * limit, page * limit).map((term, index) => (
                <TableRow key={term.term}>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{(page - 1) * limit + index + 1}</TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{term.term}</TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{term.hepsiburadaCount}</TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{term.trendyolCount}</TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{term.avansasCount}</TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">{term.n11Count}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center p-4 border-t text-sm">
        <div className="text-gray-600">
          Toplam {terms.length} terimden {Math.min((page - 1) * limit + 1, terms.length)}-
          {Math.min(page * limit, terms.length)} arası gösteriliyor
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded-md disabled:opacity-50"
          >
            ← Önceki
          </button>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded-md disabled:opacity-50"
          >
            Sonraki →
          </button>
        </div>
      </div>
    </div>
  );
}
