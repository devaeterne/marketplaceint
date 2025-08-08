// src/components/reports/TagPriceReport.tsx
import React, { useState, useEffect } from 'react';
import { Tag, Filter, Loader2, RefreshCw, Hash } from 'lucide-react';

interface TagPriceData {
  tag_name: string;
  tag_id: number;
  avg_price: number;
  product_count: number;
  min_price: number;
  max_price: number;
  price_variance: number;
  most_common_platform?: string;
}

interface TagPriceReportProps {
  finalProductId: number | null;
}

export default function TagPriceReport({ finalProductId }: TagPriceReportProps) {
  const [data, setData] = useState<TagPriceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'avg_price' | 'product_count' | 'tag_name' | 'price_variance'>('avg_price');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [priceFilter, setPriceFilter] = useState<{ min: string; max: string }>({ min: '', max: '' });

  useEffect(() => {
    if (finalProductId) {
      fetchTagPriceData();
    }
  }, [finalProductId]);

  const fetchTagPriceData = async () => {
    if (!finalProductId) return;

    try {
      setLoading(true);
      setError(null);

      // 🎯 DÜZELTME: Doğru API URL ve headers
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tag-averages/${finalProductId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
        }
      });

      if (!response.ok) {
        throw new Error('Etiket bazlı fiyat verileri yüklenirken hata oluştu');
      }

      const result = await response.json();
      console.log('📦 Tag price data:', result);

      // Backend response format kontrolü
      if (result.success) {
        setData(result.data || []);
      } else {
        // Fallback eski format
        setData(result || []);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('❌ Tag price fetch error:', err);
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

  const getTagColor = (index: number) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800',
      'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',
      'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800',
      'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800',
      'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/20 dark:text-pink-400 dark:border-pink-800',
      'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800',
    ];
    return colors[index % colors.length];
  };

  const handleTagFilter = (tagName: string) => {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const filteredAndSortedData = data
    .filter(item => {
      // Tag filter
      if (selectedTags.length > 0 && !selectedTags.includes(item.tag_name)) {
        return false;
      }

      // Price filter
      const minPrice = priceFilter.min ? parseFloat(priceFilter.min) : 0;
      const maxPrice = priceFilter.max ? parseFloat(priceFilter.max) : Infinity;

      return item.avg_price >= minPrice && item.avg_price <= maxPrice;
    })
    .sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      switch (sortBy) {
        case 'avg_price':
          return (a.avg_price - b.avg_price) * modifier;
        case 'product_count':
          return (a.product_count - b.product_count) * modifier;
        case 'tag_name':
          return a.tag_name.localeCompare(b.tag_name) * modifier;
        case 'price_variance':
          return (a.price_variance - b.price_variance) * modifier;
        default:
          return 0;
      }
    });

  if (!finalProductId) {
    return (
      <div className="p-8 text-center">
        <Tag className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Ürün Seçimi Gerekli
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Etiket bazlı fiyat raporunu görüntülemek için önce bir final ürün seçin.
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
            <Tag className="w-6 h-6 text-purple-500" />
            Etiket Bazlı Fiyat Raporu
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Ürün etiketlerine göre gruplandırılmış fiyat analizi ve istatistikler
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
            </span>
          )}
          <button
            onClick={fetchTagPriceData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-500 hover:bg-purple-600 
                     disabled:bg-purple-300 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500 mr-3" />
          <span className="text-gray-600 dark:text-gray-400">Etiket verileri yükleniyor...</span>
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
            onClick={fetchTagPriceData}
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
              <Tag className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Etiket Verisi Bulunamadı
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Bu final ürün için henüz etiket verisi bulunmuyor.
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-200">
                    {data.length}
                  </h3>
                  <p className="text-purple-600 dark:text-purple-400 text-sm">Toplam Etiket</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    {formatPrice(Math.min(...data.map(item => item.avg_price)))}
                  </h3>
                  <p className="text-green-600 dark:text-green-400 text-sm">En Düşük Ortalama</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                    {formatPrice(Math.max(...data.map(item => item.avg_price)))}
                  </h3>
                  <p className="text-red-600 dark:text-red-400 text-sm">En Yüksek Ortalama</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                    {data.reduce((sum, item) => sum + item.product_count, 0)}
                  </h3>
                  <p className="text-blue-600 dark:text-blue-400 text-sm">Toplam Ürün</p>
                </div>
              </div>

              {/* Filters and Controls */}
              <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {/* Tag Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Filter className="w-4 h-4 inline mr-1" />
                    Etiket Filtresi
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {data.map((item, index) => (
                      <button
                        key={item.tag_name}
                        onClick={() => handleTagFilter(item.tag_name)}
                        className={`px-3 py-1 text-sm rounded-full border-2 transition-all ${selectedTags.includes(item.tag_name)
                          ? getTagColor(index)
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-400'
                          }`}
                      >
                        <Hash className="w-3 h-3 inline mr-1" />
                        {item.tag_name}
                      </button>
                    ))}
                    {selectedTags.length > 0 && (
                      <button
                        onClick={() => setSelectedTags([])}
                        className="px-3 py-1 text-sm rounded-full bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                      >
                        Temizle
                      </button>
                    )}
                  </div>
                </div>

                {/* Price Filter */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Minimum Fiyat (₺)
                    </label>
                    <input
                      type="number"
                      value={priceFilter.min}
                      onChange={(e) => setPriceFilter(prev => ({ ...prev, min: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                               bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Maksimum Fiyat (₺)
                    </label>
                    <input
                      type="number"
                      value={priceFilter.max}
                      onChange={(e) => setPriceFilter(prev => ({ ...prev, max: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                               bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                      placeholder="∞"
                    />
                  </div>
                </div>

                {/* Sorting Controls */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sıralama:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'avg_price', label: 'Ortalama Fiyat' },
                      { key: 'product_count', label: 'Ürün Sayısı' },
                      { key: 'price_variance', label: 'Fiyat Varyansı' },
                      { key: 'tag_name', label: 'Etiket Adı' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => handleSort(key as typeof sortBy)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${sortBy === key
                          ? 'bg-purple-500 text-white'
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
                {filteredAndSortedData.length} / {data.length} etiket gösteriliyor
              </div>

              {/* Tag Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredAndSortedData.map((tag, index) => (
                  <div
                    key={tag.tag_id}
                    className={`border-2 rounded-lg p-6 transition-all hover:shadow-lg ${getTagColor(index)}`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <Hash className="w-5 h-5" />
                      <h3 className="font-bold text-lg truncate">{tag.tag_name}</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm opacity-75 mb-1">Ortalama Fiyat</p>
                        <p className="text-2xl font-bold">{formatPrice(tag.avg_price)}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm opacity-75">Minimum</p>
                          <p className="text-lg font-semibold">{formatPrice(tag.min_price)}</p>
                        </div>
                        <div>
                          <p className="text-sm opacity-75">Maksimum</p>
                          <p className="text-lg font-semibold">{formatPrice(tag.max_price)}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm opacity-75">Ürün Sayısı</p>
                          <p className="text-lg font-bold">{tag.product_count}</p>
                        </div>
                        <div>
                          <p className="text-sm opacity-75">Varyans</p>
                          <p className="text-lg font-bold">{(tag.price_variance !== null && tag.price_variance !== undefined)
                            ? Number(tag.price_variance).toFixed(2)
                            : '0.00'}</p>
                        </div>
                      </div>

                      {tag.most_common_platform && (
                        <div className="pt-3 border-t border-current border-opacity-20">
                          <p className="text-sm opacity-75">En Yaygın Platform</p>
                          <p className="font-semibold capitalize">{tag.most_common_platform}</p>
                        </div>
                      )}

                      {/* Price Range Visualization */}
                      <div className="pt-2">
                        <div className="flex justify-between text-xs opacity-75 mb-1">
                          <span>Fiyat Aralığı</span>
                          <span>{formatPrice(tag.max_price - tag.min_price)}</span>
                        </div>
                        <div className="w-full bg-black bg-opacity-20 rounded-full h-2">
                          <div
                            className="bg-current h-2 rounded-full opacity-60"
                            style={{
                              width: `${Math.min(100, ((tag.avg_price - tag.min_price) / (tag.max_price - tag.min_price)) * 100)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* No Results */}
              {filteredAndSortedData.length === 0 && (
                <div className="text-center py-12">
                  <Filter className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Sonuç Bulunamadı
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Seçilen filtrelerle eşleşen bir etiket grubu bulunamadı.
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