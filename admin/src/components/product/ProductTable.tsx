import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Badge from "@/components/ui/badge";
import { formatCurrency } from "@/utils/format";
import { useNavigate } from "react-router";

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
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/products?page=1&limit=50`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error("Ürünler alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const openPriceHistory = (productId: number) => {
    navigate(`/products/${productId}/price-history`);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow className="text-gray-800 dark:text-white/90">
              <TableCell isHeader className="px-5 py-3 text-start">Görsel</TableCell>
              <TableCell isHeader className="px-5 py-3 text-start">Ürün İsmi</TableCell>
              <TableCell isHeader className="px-5 py-3 text-start">Ürün Tipi</TableCell>
              <TableCell isHeader className="px-5 py-3 text-start">Platform</TableCell>
              <TableCell isHeader className="px-5 py-3 text-start">Fiyat</TableCell>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  Yükleniyor...
                </TableCell>
              </TableRow>
            ) : products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-6">
                  Ürün bulunamadı.
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="px-5 py-4">
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start">
                    <div className="font-medium text-gray-800 dark:text-white/90">
                      {product.title}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {product.brand || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start text-gray-500 dark:text-gray-400">
                    {product.product_type || "-"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start">
                    <a
                      href={product.product_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {product.platform}
                    </a>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-start">
                    <button
                      className="text-sm font-medium text-green-600 hover:underline"
                      onClick={() => openPriceHistory(product.id)}
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
    </div>
  );
}
