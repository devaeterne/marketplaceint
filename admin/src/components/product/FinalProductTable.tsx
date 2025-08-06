import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/utils/format";
import { useNavigate } from "react-router";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { MatchModalContent } from "./ProductMatchModal";

const MySwal = withReactContent(Swal);

interface FinalProduct {
  id: number;
  name: string;
  brand: string;
  image_url: string;
  category: string;
  price: number;
  campaign_price: number;
  matched_count?: number;
}

export default function FinalProductTable() {
  const [products, setProducts] = useState<FinalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/final_products?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Final ürünler alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMatch = async (finalProductId: number) => {
    const token = localStorage.getItem("authToken");

    // Mevcut eşleşmeleri al
    let matchedIds: number[] = [];
    try {
      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/final_products/${finalProductId}/matches`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const matches = await res.json();
      matchedIds = matches.map((p: any) => p.id);
    } catch (err) {
      console.error("Eşleşmeler alınamadı:", err);
    }

    const isDarkMode = document.documentElement.classList.contains("dark");

const { value: result } = await MySwal.fire({
  title: "Ürün Eşleştirme",
  width: "90%",
  showCancelButton: true,
  confirmButtonText: "Kaydet",
  cancelButtonText: "İptal",
  background: isDarkMode ? "#1f2937" : "#ffffff", // Tailwind dark:bg-gray-800 vs light:bg-white
  color: isDarkMode ? "#f9fafb" : "#111827",      // Tailwind text-gray-100 vs text-gray-900
  customClass: {
    popup: "rounded-lg shadow-lg",
  },
  html: (
    <MatchModalContent
      finalProductId={finalProductId}
      initialSelected={matchedIds}
    />
  ),
  preConfirm: () => {
    const checkboxes =
      Swal.getPopup()?.querySelectorAll('input[type="checkbox"]:checked') || [];
    return Array.from(checkboxes).map((cb: any) => parseInt(cb.value));
  },
});
    if (result) {
      try {
        // Önce tüm eşleşmeleri temizle
        for (const id of matchedIds) {
          await fetch(
            `${
              import.meta.env.VITE_API_URL
            }/api/final_products/${finalProductId}/match/${id}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            }
          );
        }

        // Yeni eşleşmeleri ekle
        if (result.length > 0) {
          await fetch(
            `${
              import.meta.env.VITE_API_URL
            }/api/final_products/${finalProductId}/matches`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ product_ids: result }),
            }
          );
        }

        // Tabloyu güncelle
        setProducts((prev) =>
          prev.map((product) =>
            product.id === finalProductId
              ? { ...product, matched_count: result.length }
              : product
          )
        );

        MySwal.fire({
          icon: "success",
          title: "Başarılı!",
          text: `${result.length} ürün eşleştirildi.`,
          timer: 1500,
          showConfirmButton: false,
        });
      } catch (err) {
        MySwal.fire("Hata", "Eşleşmeler kaydedilemedi", "error");
      }
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, limit]);

  const totalPages = Math.ceil(total / limit);

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="flex justify-between p-4 border-b">
          <h2 className="text-xl text-gray-800 dark:text-white font-semibold">
            Final Ürünler
          </h2>
          <button
            onClick={() => navigate("/final-products/create")}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md transition-colors"
          >
            + Final Ürün Ekle
          </button>
        </div>

        <div className="max-w-full overflow-x-auto text-gray-800 dark:text-white ">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.5]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  #
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Görsel
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Ürün Adı
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Marka
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Kategori
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Fiyat
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Eşleşme
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  İşlemler
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="flex justify-center items-center">
                      <div className="w-10 h-10 overflow-hidden rounded-full"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-6 text-gray-500">
                    Henüz final ürün eklenmemiş.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 table-auto"
                  >
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">{product.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden rounded-full">
                          <img
                            src={product.image_url || "/placeholder.png"}
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                "/placeholder.png";
                            }}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {product.name}
                    </TableCell>
                    <TableCell>{product.brand}</TableCell>
                    <TableCell>{product.category || "—"}</TableCell>
                    <TableCell className="font-semibold">
                      {product.campaign_price ? (
                        <div>
                          <span className="text-red-600">
                            {formatCurrency(product.campaign_price)}
                          </span>
                          <span className="text-xs text-gray-500 line-through ml-2">
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                      ) : (
                        formatCurrency(product.price)
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.matched_count && product.matched_count > 0
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.matched_count || 0} ürün
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleMatch(product.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Eşleştir
                      </button>
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
            Toplam {total} üründen {Math.min((page - 1) * limit + 1, total)}-
            {Math.min(page * limit, total)} arası gösteriliyor
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              ← Önceki
            </button>
            <div className="flex gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 rounded-md ${
                      page === pageNum
                        ? "bg-blue-600 text-white"
                        : "hover:bg-gray-50"
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
              className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Sonraki →
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
