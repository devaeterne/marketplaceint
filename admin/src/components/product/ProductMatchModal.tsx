// @/components/product/ProductMatchModal.tsx
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Product {
  id: number;
  title: string;
  brand: string;
  platform: string;
  latest_price: number;
  product_type?: string;
  image_url?: string;
}

interface MatchModalContentProps {
  finalProductId: number;
  initialSelected: number[];
}

export function MatchModalContent({
  finalProductId,
  initialSelected,
}: MatchModalContentProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: "",
    product_type: "",
    title: "",
  });
  const [selected, setSelected] = useState<number[]>(initialSelected);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchProducts();
  }, [filters, page, limit]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        platform: filters.platform,
        product_type: filters.product_type,
        search: filters.title,
      });

      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/final_products/${finalProductId}/selectable-products?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      setProducts(Array.isArray(data) ? data : data.products || []);
      setTotal(Array.isArray(data) ? data.length : data.total || 0);
    } catch (err) {
      console.error("Ürünler alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setPage(1);
  };

  const toggleSelection = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const token = localStorage.getItem("authToken");

    try {
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
          body: JSON.stringify({ product_ids: selected }),
        }
      );
      alert("Eşleştirme başarıyla kaydedildi.");
    } catch (err) {
      alert("Eşleştirme kaydedilemedi.");
      console.error("Save error:", err);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="text-left space-y-4 bg-white dark:bg-gray-900 p-4 rounded-lg">
      <div className="flex flex-wrap gap-4 text-color-gray-800 dark:text-white">
        <input
          name="title"
          placeholder="Ürün adı"
          value={filters.title}
          onChange={handleInputChange}
          className="flex-1 min-w-[200px] border px-4 py-2 rounded-md shadow-sm text-gray-800 dark:text-white"
        />
        <input
          name="product_type"
          placeholder="Ürün tipi"
          value={filters.product_type}
          onChange={handleInputChange}
          className="flex-1 min-w-[200px] border px-4 py-2 rounded-md shadow-sm text-gray-800 dark:text-white"
        />
        <select
          name="platform"
          value={filters.platform}
          onChange={handleInputChange}
          className="min-w-[180px] border px-4 py-2 rounded-md shadow-sm text-color-gray-800 dark:text-white"
        >
          <option value="">Tüm Platformlar</option>
          <option value="n11">n11</option>
          <option value="avansas">Avansas</option>
          <option value="hepsiburada">Hepsiburada</option>
          <option value="trendyol">Trendyol</option>
        </select>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(parseInt(e.target.value));
            setPage(1);
          }}
          className="min-w-[160px] border px-4 py-2 rounded-md shadow-sm"
        >
          <option value={10}>10 ürün</option>
          <option value={20}>20 ürün</option>
          <option value={50}>50 ürün</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-gray-800">
        <div className="max-h-[400px] overflow-y-auto border rounded-lg">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
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
                  Ürün
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Platform
                </TableCell>
                <TableCell
                  isHeader
                  className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                >
                  Fiyat
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
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-6">
                    Ürün bulunamadı.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <input
                        type="checkbox"
                        value={product.id}
                        checked={selected.includes(product.id)}
                        onChange={() => toggleSelection(product.id)}
                      />
                    </TableCell>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 overflow-hidden rounded-full">
                          <img
                            width={40}
                            height={40}
                            src={product.image_url}
                            alt={product.title}
                          />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <div className="font-medium">{product.title}</div>
                      <div className="text-sm text-gray-500">
                        {product.brand} • {product.product_type || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      {product.platform}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      ₺{Number(product.latest_price || 0).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center p-4 text-sm text-gray-700 dark:text-gray-200">
          <div>{total} ürün bulundu.</div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded-md disabled:opacity-50"
            >
              Önceki
            </button>
            <span>
              Sayfa {page} / {totalPages || 1}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded-md disabled:opacity-50"
            >
              Sonraki
            </button>
          </div>
        </div>        
      </div>
    </div>
  );
}

export default MatchModalContent;
