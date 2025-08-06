import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";

interface Tag {
  id: string;
  name: string;
  ikas_tag_id?: string;
}

export default function TableTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const fetchTags = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/tags?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      setTags(data.tags || []);
      setTotal(data.total || data.tags?.length || 0);
    } catch (err) {
      console.error("Etiketler alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, [page, limit]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex justify-between p-4 border-b">
        <h2 className="text-xl text-gray-800 dark:text-white font-semibold">
          Etiketler
        </h2>
        <button
          onClick={() => navigate("/tags/create")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md transition-colors"
        >
          + Etiket Ekle
        </button>
      </div>

      <div className="max-w-full overflow-x-auto text-gray-800 dark:text-white">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.5]">
            <TableRow>
              <TableCell isHeader className="px-5 py-3 text-start text-theme-xs text-gray-500 dark:text-gray-400">
                #
              </TableCell>
              <TableCell isHeader className="px-5 py-3 text-start text-theme-xs text-gray-500 dark:text-gray-400">
                Etiket Adı
              </TableCell>
              <TableCell isHeader className="px-5 py-3 text-start text-theme-xs text-gray-500 dark:text-gray-400">
                IKAS Tag ID
              </TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {loading ? (
              <TableRow>
                <TableCell className="text-center py-6">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : tags.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-6 text-gray-500" >
                  Henüz etiket eklenmemiş.
                </TableCell>
              </TableRow>
            ) : (
              tags.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    {tag.id}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    {tag.name}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    {tag.ikas_tag_id || "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center p-4 border-t text-sm">
        <div className="text-gray-600">
          Toplam {total} etiketten {Math.min((page - 1) * limit + 1, total)}-
          {Math.min(page * limit, total)} arası gösteriliyor
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-500 dark:text-white"
          >
            ← Önceki
          </button>
          <div className="flex gap-1 text-gray-500 dark:text-gray-400">
            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`px-3 py-1 rounded-md ${
                    page === pageNum
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-50 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            {totalPages > 5 && <span className="px-2">...</span>}
          </div>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            disabled={page === totalPages}
            className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 text-gray-500 dark:text-white"
          >
            Sonraki →
          </button>
        </div>
      </div>
    </div>
  );
}
