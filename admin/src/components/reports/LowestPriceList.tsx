// src/components/reports/LowestPriceList.tsx
import React, { useEffect, useState } from "react";
import { TrendingDown, ExternalLink, Store } from "lucide-react";
import { formatCurrency } from "@/utils/format";

interface PriceData {
  product_id: number;
  title: string;
  brand: string;
  platform: string;
  product_link: string;
  current_price: number;
  campaign_price: number;
  original_price: number;
  stock_status: string;
  last_updated: string;
  discount_percentage: number;
}

interface Props {
  finalProductId: number | null;
}

export default function LowestPriceList({ finalProductId }: Props) {
  const [priceData, setPriceData] = useState<PriceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"price" | "discount">("price");

  useEffect(() => {
    if (finalProductId) {
      fetchLowestPrices();
    }
  }, [finalProductId, sortBy]);

  const fetchLowestPrices = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/report/lowest-prices/${finalProductId}?sort=${sortBy}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const data = await res.json();
      if (data.success) {
        setPriceData(data.prices || []);
      }
    } catch (err) {
      console.error("Fiyat verileri alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      trendyol: "bg-orange-100 text-orange-700",
      hepsiburada: "bg-purple-100 text-purple-700",
      n11: "bg-green-100 text-green-700",
      avansas: "bg-blue-100 text-blue-700"
    };
    return colors[platform.toLowerCase()] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <TrendingDown className="w-6 h-6 text-green-600" />
            En Düşük Fiyat Listesi
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Eşleşen ürünlerin güncel fiyat karşılaştırması
          </p>
        </div>
        
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "price" | "discount")}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="price">Fiyata Göre</option>
          <option value="discount">İndirim Oranına Göre</option>
        </select>
      </div>

      {priceData.length === 0 ? (
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Bu ürün için fiyat verisi bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-4">
          {priceData.map((item, index) => (
            <div
              key={item.product_id}
              className={`
                border rounded-lg p-4 transition-all duration-200
                ${index === 0 ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-gray-200"}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${getPlatformColor(item.platform)}`}>
                      {item.platform}
                    </span>
                    {index === 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-500 text-white">
                        EN UCUZ
                      </span>
                    )}
                    {item.discount_percentage > 0 && (
                      <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                        %{item.discount_percentage} İNDİRİM
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">
                    {item.title}
                  </h3>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {item.brand} • {item.stock_status}
                  </p>
                  
                  <div className="mt-3 flex items-center gap-4">
                    <div>
                      {item.campaign_price ? (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-red-600">
                            {formatCurrency(item.campaign_price)}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            {formatCurrency(item.original_price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(item.current_price)}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <p className="text-xs text-gray-500 mt-2">
                    Son güncelleme: {new Date(item.last_updated).toLocaleString('tr-TR')}
                  </p>
                </div>
                
                <a
                  href={item.product_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-4 p-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-gray-600" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {priceData.length > 0 && (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">En Düşük Fiyat</p>
            <p className="text-xl font-bold text-green-600">
              {formatCurrency(Math.min(...priceData.map(p => p.campaign_price || p.current_price)))}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">En Yüksek Fiyat</p>
            <p className="text-xl font-bold text-red-600">
              {formatCurrency(Math.max(...priceData.map(p => p.campaign_price || p.current_price)))}
            </p>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">Fiyat Farkı</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(
                Math.max(...priceData.map(p => p.campaign_price || p.current_price)) -
                Math.min(...priceData.map(p => p.campaign_price || p.current_price))
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}