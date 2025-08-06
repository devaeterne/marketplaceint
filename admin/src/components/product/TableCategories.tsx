import React, { useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

export default function TableCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  // 🧠 Backend'den kategori verisini al
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/categories?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      setCategories(data.categories || []);
      setTotal(data.total || data.categories?.length || 0);
    } catch (err) {
      console.error("Kategoriler alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [page, limit]);

  const totalPages = Math.ceil(total / limit);

  // 🧠 useMemo ile parent_id -> name eşleşmesini 1 kez oluştur
  const categoryNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    categories.forEach((cat) => {
      map[cat.id] = cat.name;
    });
    return map;
  }, [categories]);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex justify-between p-4 border-b">
        <h2 className="text-xl text-gray-800 dark:text-white font-semibold">
          Kategoriler
        </h2>
        <button
          onClick={() => navigate("/categories/create")}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md transition-colors"
        >
          + Kategori Ekle
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
                Kategori Adı
              </TableCell>
              <TableCell isHeader className="px-5 py-3 text-start text-theme-xs text-gray-500 dark:text-gray-400">
                Üst Kategori
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
            ) : categories.length === 0 ? (
              <TableRow>
                <TableCell className="text-center py-6 text-gray-500">
                  Henüz kategori eklenmemiş.
                </TableCell>
              </TableRow>
            ) : (
              categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    {category.id}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    {category.name}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-theme-sm text-gray-500 dark:text-gray-400">
                    {/* 🧠 parent_id varsa isim eşleşmesini göster */}
                    {category.parent_id
                      ? categoryNameMap[category.parent_id] || "Bilinmiyor"
                      : "!!!Ana Kategori!!!"}
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
          Toplam {total} kategoriden {Math.min((page - 1) * limit + 1, total)}-
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
