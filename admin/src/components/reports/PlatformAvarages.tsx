// src/components/reports/PlatformAverages.tsx
import React, { useState, useEffect } from 'react';
import { Store, TrendingUp, TrendingDown, Minus, Loader2, RefreshCw } from 'lucide-react';

interface PlatformAverage {
  platform: string;
  avg_price: number;
  product_count: number;
  min_price: number;
  max_price: number;
  price_trend?: 'up' | 'down' | 'stable';
  trend_percentage?: number;
}

interface PlatformAveragesProps {
  finalProductId: number | null;
}

export default function PlatformAverages({ finalProductId }: PlatformAveragesProps) {
  const [data, setData] = useState<PlatformAverage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<'avg_price' | 'product_count' | 'platform'>('avg_price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (finalProductId) {
      fetchPlatformAverages();
    }
  }, [finalProductId]);

  const fetchPlatformAverages = async () => {
    if (!finalProductId) return;

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/report/platform-averages/${finalProductId}`);
      
      if (!response.ok) {
        throw new Error('Platform ortalamaları yüklenirken hata oluştu');
      }
      
      const result = await response.json();
      setData(result || []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(price);
  };

  const getPlatformIcon = (platform: string) => {
    const icons: { [key: string]: string } = {
      'trendyol': '🟠',
      'hepsiburada': '🔵',
      'n11': '🟣',
      'amazon': '🟡',
    };
    return icons[platform.toLowerCase()] || '🏪';
  };

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'trendyol': 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20',
      'hepsiburada': 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20',
      'n11': 'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-900/20',
      'amazon': 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20',
    };
    return colors[platform.toLowerCase()] || 'border-gray-200 bg-gray-50 dark:border-gray-600 dark:bg-gray-700';
  };

  const getTrendIcon = (trend: string | undefined) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-green-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const sortedData = [...data].sort((a, b) => {
    const modifier = sortOrder === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'avg_price':
        return (a.avg_price - b.avg_price) * modifier;
      case 'product_count':
        return (a.product_count - b.product_count) * modifier;
      case 'platform':
        return a.platform.localeCompare(b.platform) * modifier;
      default:
        return 0;
    }
  });

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (!finalProductId) {
    return (
      <div className="p-8 text-center">
        <Store className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Ürün Seçimi Gerekli
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Platform ortalamalarını görüntülemek için önce bir final ürün seçin.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Store className="w-6 h-6 text-blue-500" />
            Platform Bazlı Ortalama Fiyatlar
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Her platform için ortalama fiyat karşılaştırması ve istatistikler
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
            </span>
          )}
          <button
            onClick={fetchPlatformAverages}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 
                     disabled:bg-blue-300 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
          <span className="text-gray-600 dark:text-gray-400">Platform verileri yükleniyor...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Hata Oluştu
          </h3>
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchPlatformAverages}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Yeniden Dene
          </button>
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && (
        <>
          {data.length === 0 ? (
            <div className="text-center py-12">
              <Store className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Platform Verisi Bulunamadı
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Bu final ürün için henüz platform verisi bulunmuyor.
                            </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-white/[0.05]">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-white/[0.05] text-sm text-gray-800 dark:text-white">
                <thead className="bg-gray-50 dark:bg-white/[0.03]">
                  <tr>
                    <th
                      onClick={() => handleSort("platform")}
                      className="cursor-pointer px-6 py-3 text-left font-medium"
                    >
                      Platform
                    </th>
                    <th
                      onClick={() => handleSort("avg_price")}
                      className="cursor-pointer px-6 py-3 text-left font-medium"
                    >
                      Ortalama Fiyat
                    </th>
                    <th
                      onClick={() => handleSort("product_count")}
                      className="cursor-pointer px-6 py-3 text-left font-medium"
                    >
                      Ürün Sayısı
                    </th>
                    <th className="px-6 py-3 text-left font-medium">Minimum</th>
                    <th className="px-6 py-3 text-left font-medium">Maksimum</th>
                    <th className="px-6 py-3 text-left font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {sortedData.map((item) => (
                    <tr
                      key={item.platform}
                      className={`${getPlatformColor(item.platform)} transition-colors`}
                    >
                      <td className="px-6 py-4 font-medium whitespace-nowrap">
                        {getPlatformIcon(item.platform)} {item.platform}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold">
                        {formatPrice(item.avg_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">{item.product_count}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatPrice(item.min_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {formatPrice(item.max_price)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                        {getTrendIcon(item.price_trend)}
                        {item.trend_percentage !== undefined &&
                          `${item.trend_percentage.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
