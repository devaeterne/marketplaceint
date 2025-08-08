// src/components/reports/LowestPriceList.tsx
import React, { useEffect, useState } from "react";
import { TrendingDown, Store } from "lucide-react";
import { formatCurrency } from "@/utils/format";

interface LowestPrice {
  title: string;
  product_link: string;
  platform: string;
  price: number;
  campaign_price: number;
  created_at: string;
  shipping_info: string;
}

interface Props {
  finalProductId: number | null;
}

export default function LowestPriceList({ finalProductId }: Props) {
  const [data, setData] = useState<LowestPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (finalProductId) {
      fetchLowestPrice();
    }
  }, [finalProductId]);

  const fetchLowestPrice = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/lowest-price/${finalProductId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const result = await res.json();
      if (result.success) {
        setData(result.data || []);
      }
    } catch (err) {
      console.error("En ucuz fiyat alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
        <TrendingDown className="w-6 h-6 text-green-600" />
        En Ucuz An
      </h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Bu final ürün ile eşleşen ürünlerin son fiyat bilgileri. En ucuzdan pahalıya sıralanmıştır.
      </p>

      {!data || data.length === 0 ? (
        <div className="text-center py-10">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Fiyat verisi bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-4 w-auto h-auto">
          {data.map((item: any, index: number) => (
            <div
              key={index}
              className={`border p-4 rounded-lg ${index === 0
                ? "bg-green-50 dark:bg-green-900/20 border-green-400"
                : "bg-white dark:bg-white/5 border-gray-200 dark:border-gray-700"
                }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800 dark:text-white">
                  Platform:
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-white">{item.platform}</span>
              </div>
              <div className="flex flex-wrap items-start justify-between mb-2 gap-2">
                <span className="text-sm font-medium text-gray-800 dark:text-white">
                  Kargo:
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-white text-right max-w-[70%] break-words whitespace-normal">
                  {item.shipping_info}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800 dark:text-white">
                  Ürün Adı:
                </span>
                <a
                  href={item.product_link?.startsWith("http") ? item.product_link : `https://${item.product_link}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()} // Yeterli
                  className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:underline dark:text-blue-400"
                >
                  {item.title}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 3h7m0 0v7m0-7L10 14"></path>
                  </svg>
                </a>
              </div>

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800 dark:text-white">
                  Fiyat:
                </span>
                <span className="text-sm font-bold text-gray-800 dark:text-white">
                  {formatCurrency(item.campaign_price || item.price)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-800 dark:text-white">Tarih:</span>
                <span className="text-sm text-gray-800 dark:text-white">
                  {new Date(item.created_at).toLocaleString("tr-TR")}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
