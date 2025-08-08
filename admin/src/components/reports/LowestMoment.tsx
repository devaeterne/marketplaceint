// src/components/reports/LowestMoment.tsx
import React, { useState, useEffect } from 'react';
import { Clock, Calendar, TrendingDown, Loader2, RefreshCw, ExternalLink } from 'lucide-react';

interface LowestMomentData {
  product_id: number;
  product_name: string;
  platform: string;
  lowest_price: number;
  current_price: number;
  lowest_date: string;
  url: string;
  price_difference: number;
  price_difference_percentage: number;
  days_ago: number;

}

interface LowestMomentProps {
  finalProductId: number | null;
}

export default function LowestMoment({ finalProductId }: LowestMomentProps) {
  const [data, setData] = useState<LowestMomentData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [timeFilter, setTimeFilter] = useState<'all' | '7d' | '30d' | '90d' | '1y'>('all');
  const [sortBy, setSortBy] = useState<'lowest_price' | 'price_difference' | 'days_ago' | 'platform'>('price_difference');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (finalProductId) {
      fetchLowestMomentData();
    }
  }, [finalProductId]);

  const fetchLowestMomentData = async () => {
    if (!finalProductId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/lowest-moment/${finalProductId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
        }
      });

      if (!response.ok) {
        throw new Error('En ucuz an verileri yüklenirken hata oluştu');
      }

      const result = await response.json();
      console.log('📦 Lowest moment response:', result);

      // Gelen veriyi sanitize et
      const sanitizedData = (result.data || []).map((item: any) => ({
        ...item,
        lowest_price: Number(item.lowest_price) || 0,
        current_price: Number(item.current_price) || 0,
        price_difference: Number(item.price_difference) || 0,
        price_difference_percentage: Number(item.price_difference_percentage) || 0,
        days_ago: Number(item.days_ago) || 0
      }));

      console.log('🧹 Sanitized data sample:', sanitizedData.slice(0, 2));

      setData(sanitizedData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('❌ Fetch error:', err);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeFilterDays = (filter: typeof timeFilter) => {
    switch (filter) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return Infinity;
    }
  };

  const filteredData = data.filter(item => {
    if (timeFilter === 'all') return true;
    return item.days_ago <= getTimeFilterDays(timeFilter);
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const modifier = sortOrder === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'lowest_price':
        return (a.lowest_price - b.lowest_price) * modifier;
      case 'price_difference':
        return (a.price_difference - b.price_difference) * modifier;
      case 'days_ago':
        return (a.days_ago - b.days_ago) * modifier;
      case 'platform':
        return a.platform.localeCompare(b.platform) * modifier;
      default:
        return 0;
    }
  });

  console.log(
    "PRICE % VALUE",
    data.map(i => {
      return i.price_difference_percentage;
    })
  );



  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'trendyol': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'hepsiburada': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'n11': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'amazon': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    };
    return colors[platform.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const getDaysAgoColor = (days: number) => {
    if (days <= 7) return 'text-green-600 dark:text-green-400';
    if (days <= 30) return 'text-yellow-600 dark:text-yellow-400';
    if (days <= 90) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (!finalProductId) {
    return (
      <div className="p-8 text-center">
        <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Ürün Seçimi Gerekli
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          En ucuz anı analizini görüntülemek için önce bir final ürün seçin.
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
            <Clock className="w-6 h-6 text-indigo-500" />
            En Ucuz Anı Belirleme
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Ürünlerin tarihsel en düşük fiyat anları ve mevcut fiyatlarla karşılaştırması
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
            </span>
          )}
          <button
            onClick={fetchLowestMomentData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 
                     disabled:bg-indigo-300 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mr-3" />
          <span className="text-gray-600 dark:text-gray-400">Tarihsel veriler analiz ediliyor...</span>
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
            onClick={fetchLowestMomentData}
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
              <Clock className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Tarihsel Veri Bulunamadı
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Bu final ürün için henüz yeterli tarihsel fiyat verisi bulunmuyor.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    {formatPrice(Math.min(...data.map(item => item.lowest_price)))}
                  </h3>
                  <p className="text-green-600 dark:text-green-400 text-sm">Tüm Zamanların En Düşüğü</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                    {formatPrice(data.reduce((sum, item) => sum + item.price_difference, 0) / data.length)}
                  </h3>
                  <p className="text-blue-600 dark:text-blue-400 text-sm">Ortalama Fiyat Farkı</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200">
                    {(() => {
                      if (data.length === 0) return '0.0%';
                      const validPercentages = data
                        .map(item => Number(item.price_difference_percentage) || 0)
                        .filter(pct => !isNaN(pct) && isFinite(pct));

                      if (validPercentages.length === 0) return '0.0%';

                      const maxPercentage = Math.max(...validPercentages);
                      return `${maxPercentage.toFixed(1)}%`;
                    })()}
                  </h3>
                  <p className="text-yellow-600 dark:text-yellow-400 text-sm">En Yüksek Artış</p>
                </div>
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-indigo-800 dark:text-indigo-200">
                    {data.length}
                  </h3>
                  <p className="text-indigo-600 dark:text-indigo-400 text-sm">Analiz Edilen Ürün</p>
                </div>
              </div>

              {/* Filters and Controls */}
              <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {/* Time Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Zaman Filtresi
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'Tüm Zamanlar' },
                      { key: '7d', label: 'Son 7 Gün' },
                      { key: '30d', label: 'Son 30 Gün' },
                      { key: '90d', label: 'Son 3 Ay' },
                      { key: '1y', label: 'Son 1 Yıl' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setTimeFilter(key as typeof timeFilter)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${timeFilter === key
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                          }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sorting Controls */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sıralama:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'price_difference', label: 'Fiyat Farkı' },
                      { key: 'lowest_price', label: 'En Düşük Fiyat' },
                      { key: 'days_ago', label: 'Zaman' },
                      { key: 'platform', label: 'Platform' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => handleSort(key as typeof sortBy)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${sortBy === key
                          ? 'bg-indigo-500 text-white'
                          : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500'
                          }`}
                      >
                        {label} {sortBy === key && (sortOrder === 'asc' ? '↑' : '↓')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Results Info */}
              <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                {filteredData.length} / {data.length} ürün gösteriliyor
              </div>

              {/* Product Cards */}
              <div className="space-y-4">
                {sortedData.map((item, index) => (
                  <div
                    key={`${item.product_id}-${item.platform}`}
                    className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 
                             rounded-lg p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {item.product_name}
                          </h3>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPlatformColor(item.platform)}`}>
                            {item.platform}
                          </span>
                          {index === 0 && sortBy === 'price_difference' && (
                            <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                              En Büyük Fark
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">En Düşük Fiyat</p>
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                              {formatPrice(item.lowest_price)}
                            </p>
                            <p className={`text-sm font-medium ${getDaysAgoColor(item.days_ago)}`}>
                              {item.days_ago} gün önce
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mevcut Fiyat</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {formatPrice(item.current_price)}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Şu anki</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Fiyat Farkı</p>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                              +{formatPrice(item.price_difference)}
                            </p>
                            <p className="text-lg font-semibold text-red-500">
                              +{Number(item.price_difference_percentage).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>En düşük tarih: {formatDate(item.lowest_date)}</span>
                          </div>
                          {item.url && (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-indigo-500 hover:text-indigo-600 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Ürünü Gör
                            </a>
                          )}
                        </div>

                        {/* Price Progress Indicator */}
                        <div className="mt-4">
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>Fiyat Artışı</span>
                            <span>{Number(item.price_difference_percentage).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-green-500 to-red-500 h-2 rounded-full transition-all"
                              style={{ width: `${Math.min(100, item.price_difference_percentage)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* No Results After Filter */}
              {filteredData.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Seçili Zaman Aralığında Veri Bulunamadı
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Daha geniş bir zaman aralığı seçmeyi deneyin.
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}