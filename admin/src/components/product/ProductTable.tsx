// src/components/product/ProductTable.tsx
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import Badge from "@/components/ui/badge/Badge";
import { formatCurrency } from "@/utils/format";
import { useNavigate } from "react-router";
import Swal from "sweetalert2";

interface Product {
  id: number;
  title: string;
  brand: string;
  product_link: string;
  platform: string;
  product_type: string;
  image_url: string;
  latest_price: number;
}

export default function ProductTable() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    platform: "",
    product_type: "",
    title: "",
  });
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
        platform: filters.platform,
        product_type: filters.product_type,
        search: filters.title,
      });

      const res = await fetch(
        `${
          import.meta.env.VITE_API_URL
        }/api/products?${queryParams.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();
      setProducts(data.products || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("Ürünler alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  const openPriceHistory = async (product_id: number) => {
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/product_price_logs/${product_id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      const logs = data
        .map((log: any) => {
          const date = new Date(log.created_at).toLocaleString("tr-TR");
          return `<tr><td>${date}</td><td>${formatCurrency(
            log.price
          )}</td><td>${formatCurrency(log.campaign_price)}</td></tr>`;
        })
        .join("");

      Swal.fire({
        title: "Fiyat Geçmişi",
        html: `<table class="w-full text-left text-sm"><thead><tr><th>Tarih</th><th>Fiyat</th><th>Kampanya</th></tr></thead><tbody>${logs}</tbody></table>`,
        confirmButtonText: "Kapat",
        width: 600,
      });
    } catch (err) {
      console.error("Fiyat geçmişi alınamadı:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [filters, page, limit]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const getBadgeClass = (platform: string) => {
    switch (platform.toLowerCase()) {
      case "n11":
        return "bg-purple-900 text-white";
      case "avansas":
        return "bg-blue-700 text-white";
      case "hepsiburada":
        return "bg-orange-900 text-white";
      case "trendyol":
        return "bg-red-800 text-white";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="flex flex-wrap gap-4 p-4 text-color-gray-800 dark:text-white">
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

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="text-gray-800 dark:text-white">
              <TableCell isHeader>Görsel</TableCell>
              <TableCell isHeader>Ürün İsmi</TableCell>
              <TableCell isHeader>Ürün Tipi</TableCell>
              <TableCell isHeader>Platform</TableCell>
              <TableCell isHeader>Fiyat</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell  className="text-center py-6">
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
                    <div className="flex items-center gap-3">
                      <div className="w-15 h-15 overflow-hidden rounded-lg">
                        <img
                          width={90}
                          height={90}
                          src={product.image_url}
                          alt={product.title}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => navigate(`/products/${product.id}`)}
                      className="text-blue-700 hover:underline font-medium"
                    >
                      {product.title}
                    </button>
                    <div className="text-xs text-gray-500">{product.brand}</div>
                  </TableCell>
                  <TableCell className="text-gray-800 dark:text-white">
                    {product.product_type || "-"}
                  </TableCell>
                  <TableCell>
                    <a
                      href={product.product_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span
                        className={`px-3 py-2 rounded text-md font-semibold ${getBadgeClass(
                          product.platform
                        )}`}
                      >
                        {product.platform}
                      </span>
                    </a>
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => {
                        console.log("Gelen product_id:", product.id);
                        openPriceHistory(product.id);
                      }}
                      className="text-green-600 hover:underline"
                    >
                      {formatCurrency(product.latest_price)}
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          
        </Table>
      </div>

      {/* Pagination */}
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
  );
}
