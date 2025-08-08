
// src/components/reports/CampaignDetection.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingDown, Zap, Loader2, RefreshCw, ExternalLink, Calendar } from 'lucide-react';

interface CampaignData {
  product_id: number;
  product_name: string;
  platform: string;
  old_price: number;
  new_price: number;  // Artık gerçek campaign_price
  discount_amount: number;
  discount_percentage: number;
  detection_date: string;
  url?: string;
  campaign_type: 'flash_sale' | 'sudden_drop' | 'regular_discount' | 'minor_discount';
  confidence_level: 'high' | 'medium' | 'low';
  duration_hours?: number;
}

interface CampaignDetectionProps {
  finalProductId: number | null;
}

export default function CampaignDetection({ finalProductId }: CampaignDetectionProps) {
  const [data, setData] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [campaignFilter, setCampaignFilter] = useState<'all' | 'sudden_drop' | 'flash_sale' | 'regular_discount'>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [minDiscount, setMinDiscount] = useState<string>('');
  const [sortBy, setSortBy] = useState<'discount_percentage' | 'detection_date' | 'discount_amount' | 'platform'>('discount_percentage');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    if (finalProductId) {
      fetchCampaignData();
    }
  }, [finalProductId]);

  const fetchCampaignData = async () => {
    if (!finalProductId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/price-drops/${finalProductId}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("authToken")}`
        }
      });

      if (!response.ok) {
        throw new Error('Kampanya tespiti verileri yüklenirken hata oluştu');
      }

      const result = await response.json();

      console.log('📊 Campaign API Response:', result);

      // API response format kontrolü ve normalizasyon
      let campaigns: CampaignData[] = [];

      if (result.success && Array.isArray(result.data)) {
        campaigns = result.data;
      } else if (result.success && Array.isArray(result.campaigns)) {
        campaigns = result.campaigns;
      } else if (Array.isArray(result)) {
        campaigns = result;
      } else if (result.data && Array.isArray(result.data)) {
        campaigns = result.data;
      } else {
        console.warn('⚠️ Unexpected API response format:', result);
        campaigns = [];
      }

      setData(campaigns);
      setLastUpdated(new Date());

    } catch (err) {
      console.error('❌ Campaign fetch error:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
      setData([]); // Hata durumunda boş array set et
    } finally {
      setLoading(false);
    }
  };

  // Güvenli sayı formatlama fonksiyonu
  const formatNumber = (value: any, decimals: number = 2): string => {
    if (value === null || value === undefined || value === '') {
      return '0.00';
    }

    const num = typeof value === 'string' ? parseFloat(value) : Number(value);

    if (isNaN(num)) {
      return '0.00';
    }

    return num.toFixed(decimals);
  };

  const formatPrice = (price: number) => {
    if (typeof price !== 'number' || isNaN(price)) {
      return '₺0,00';
    }
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Geçersiz tarih';
      }
      return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Geçersiz tarih';
    }
  };

  const getCampaignTypeColor = (type: string) => {
    switch (type) {
      case 'sudden_drop':
        return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
      case 'flash_sale':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800';
      case 'regular_discount':
        return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600';
    }
  };

  const getCampaignTypeIcon = (type: string) => {
    switch (type) {
      case 'sudden_drop':
        return <TrendingDown className="w-4 h-4" />;
      case 'flash_sale':
        return <Zap className="w-4 h-4" />;
      case 'regular_discount':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getCampaignTypeLabel = (type: string) => {
    switch (type) {
      case 'flash_sale':
        return 'Flaş İndirim';
      case 'sudden_drop':
        return 'Ani Düşüş';
      case 'regular_discount':
        return 'Normal İndirim';
      case 'minor_discount':
        return 'Küçük İndirim';
      default:
        return 'Bilinmeyen';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high':
        return 'text-green-600 dark:text-green-400';
      case 'medium':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'low':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'Yüksek';
      case 'medium': return 'Orta';
      case 'low': return 'Düşük';
      default: return 'Bilinmeyen';
    }
  };

  const getPlatformColor = (platform: string) => {
    const colors: { [key: string]: string } = {
      'trendyol': 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400',
      'hepsiburada': 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
      'n11': 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400',
      'amazon': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
    };
    return colors[platform?.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  // Güvenli filtering ve sorting
  const filteredAndSortedData = React.useMemo(() => {
    // Data'nın array olduğundan emin ol
    if (!Array.isArray(data)) {
      console.warn('⚠️ Data is not an array:', data);
      return [];
    }

    return data
      .filter(item => {
        // Item'ın valid olup olmadığını kontrol et
        if (!item || typeof item !== 'object') {
          return false;
        }

        // Campaign type filter
        if (campaignFilter !== 'all' && item.campaign_type !== campaignFilter) {
          return false;
        }

        // Confidence filter
        if (confidenceFilter !== 'all' && item.confidence_level !== confidenceFilter) {
          return false;
        }

        // Minimum discount filter - güvenli parsing
        if (minDiscount) {
          const itemDiscount = parseFloat(item.discount_percentage) || 0;
          const minDiscountValue = parseFloat(minDiscount) || 0;
          if (itemDiscount < minDiscountValue) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const modifier = sortOrder === 'asc' ? 1 : -1;

        try {
          switch (sortBy) {
            case 'discount_percentage':
              const aDiscount = parseFloat(a.discount_percentage) || 0;
              const bDiscount = parseFloat(b.discount_percentage) || 0;
              return (aDiscount - bDiscount) * modifier;
            case 'discount_amount':
              const aAmount = parseFloat(a.discount_amount) || 0;
              const bAmount = parseFloat(b.discount_amount) || 0;
              return (aAmount - bAmount) * modifier;
            case 'detection_date':
              const dateA = new Date(a.detection_date).getTime() || 0;
              const dateB = new Date(b.detection_date).getTime() || 0;
              return (dateA - dateB) * modifier;
            case 'platform':
              return (a.platform || '').localeCompare(b.platform || '') * modifier;
            default:
              return 0;
          }
        } catch (err) {
          console.warn('⚠️ Sorting error:', err);
          return 0;
        }
      });
  }, [data, campaignFilter, confidenceFilter, minDiscount, sortBy, sortOrder]);

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Güvenli istatistik hesaplamaları
  const stats = React.useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) {
      return {
        totalCount: 0,
        maxDiscount: 0,
        maxSavings: 0,
        highConfidenceCount: 0
      };
    }

    const validData = data.filter(item => item && typeof item === 'object');

    return {
      totalCount: validData.length,
      maxDiscount: Math.max(...validData.map(item => parseFloat(item.discount_percentage) || 0), 0),
      maxSavings: Math.max(...validData.map(item => parseFloat(item.discount_amount) || 0), 0),
      highConfidenceCount: validData.filter(item => item.confidence_level === 'high').length
    };
  }, [data]);

  if (!finalProductId) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Ürün Seçimi Gerekli
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Kampanya tespiti analizini görüntülemek için önce bir final ürün seçin.
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
            <AlertCircle className="w-6 h-6 text-orange-500" />
            Kampanya Algılama ve Fiyat Anomalileri
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Ani fiyat düşüşleri, flaş indirimler ve kampanya tespiti analizi
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Son güncelleme: {lastUpdated.toLocaleTimeString('tr-TR')}
            </span>
          )}
          <button
            onClick={fetchCampaignData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-orange-500 hover:bg-orange-600 
                     disabled:bg-orange-300 text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mr-3" />
          <span className="text-gray-600 dark:text-gray-400">Kampanya anomalileri analiz ediliyor...</span>
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
            onClick={fetchCampaignData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Yeniden Dene
          </button>
        </div>
      )}

      {/* Data Display */}
      {!loading && !error && (
        <>
          {stats.totalCount === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Kampanya Tespiti Bulunamadı
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Bu final ürün için henüz kampanya veya fiyat anomalisi tespit edilmemiş.
              </p>
              <button
                onClick={fetchCampaignData}
                className="mt-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Yeniden Kontrol Et
              </button>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
                    {stats.totalCount}
                  </h3>
                  <p className="text-orange-600 dark:text-orange-400 text-sm">Toplam Tespit</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
                    %{stats.maxDiscount.toFixed(1)}
                  </h3>
                  <p className="text-red-600 dark:text-red-400 text-sm">En Yüksek İndirim</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">
                    {formatPrice(stats.maxSavings)}
                  </h3>
                  <p className="text-green-600 dark:text-green-400 text-sm">En Büyük Tasarruf</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                    {stats.highConfidenceCount}
                  </h3>
                  <p className="text-blue-600 dark:text-blue-400 text-sm">Yüksek Güvenilirlik</p>
                </div>
              </div>

              {/* Platform Breakdown */}
              {Object.keys(filteredAndSortedData.reduce((acc, item) => {
                acc[item.platform] = (acc[item.platform] || 0) + 1;
                return acc;
              }, {})).length > 1 && (
                  <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Platform Dağılımı
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(filteredAndSortedData.reduce((acc, item) => {
                        acc[item.platform] = (acc[item.platform] || 0) + 1;
                        return acc;
                      }, {})).map(([platform, count]) => (
                        <span
                          key={platform}
                          className={`px-3 py-1 text-sm font-medium rounded-full ${getPlatformColor(platform)}`}
                        >
                          {platform}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Filters and Controls */}
              <div className="space-y-4 mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {/* Campaign Type Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Kampanya Türü
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'all', label: 'Tümü', icon: AlertCircle },
                      { key: 'flash_sale', label: 'Flaş İndirim', icon: Zap },
                      { key: 'sudden_drop', label: 'Ani Düşüş', icon: TrendingDown },
                      { key: 'regular_discount', label: 'Normal İndirim', icon: AlertCircle },
                      { key: 'minor_discount', label: 'Küçük İndirim', icon: AlertCircle }
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setCampaignFilter(key as typeof campaignFilter)}
                        className={`flex items-center gap-2 px-3 py-1 text-sm rounded-lg border-2 transition-colors ${campaignFilter === key
                          ? 'bg-orange-500 text-white border-orange-500'
                          : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-500 hover:border-orange-400'
                          }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confidence and Discount Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Güvenilirlik Seviyesi
                    </label>
                    <select
                      value={confidenceFilter}
                      onChange={(e) => setConfidenceFilter(e.target.value as typeof confidenceFilter)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                               bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                    >
                      <option value="all">Tümü</option>
                      <option value="high">Yüksek</option>
                      <option value="medium">Orta</option>
                      <option value="low">Düşük</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum İndirim (%)
                    </label>
                    <input
                      type="number"
                      value={minDiscount}
                      onChange={(e) => setMinDiscount(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                               bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>

                {/* Sorting Controls */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sıralama:</span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'discount_percentage', label: 'İndirim Oranı' },
                      { key: 'discount_amount', label: 'İndirim Miktarı' },
                      { key: 'detection_date', label: 'Tespit Tarihi' },
                      { key: 'platform', label: 'Platform' }
                    ].map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => handleSort(key as typeof sortBy)}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${sortBy === key
                          ? 'bg-orange-500 text-white'
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
                {filteredAndSortedData.length} / {stats.totalCount} kampanya gösteriliyor
              </div>

              {/* Campaign Cards */}
              <div className="space-y-4">
                {filteredAndSortedData.map((campaign, index) => (
                  <div
                    key={`${campaign.product_id}-${campaign.platform}-${campaign.detection_date}-${index}`}
                    className="bg-white dark:bg-gray-700 border-2 border-orange-200 dark:border-orange-800 
                             rounded-lg p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {campaign.product_name || 'Bilinmeyen Ürün'}
                          </h3>
                          <span className={`px-3 py-1 text-sm font-medium rounded-full ${getPlatformColor(campaign.platform)}`}>
                            {campaign.platform || 'Bilinmeyen'}
                          </span>
                          <span className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full border-2 ${getCampaignTypeColor(campaign.campaign_type)}`}>
                            {getCampaignTypeIcon(campaign.campaign_type)}
                            {getCampaignTypeLabel(campaign.campaign_type)}
                          </span>
                          {index === 0 && sortBy === 'discount_percentage' && (
                            <span className="px-3 py-1 text-sm font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                              🏆 En Yüksek
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Eski Fiyat</p>
                            <p className="text-xl font-bold text-red-600 dark:text-red-400 line-through">
                              {formatPrice(parseFloat(campaign.old_price) || 0)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Yeni Fiyat</p>
                            <p className="text-xl font-bold text-green-600 dark:text-green-400">
                              {formatPrice(parseFloat(campaign.new_price) || 0)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">İndirim Miktarı</p>
                            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                              {formatPrice(parseFloat(campaign.discount_amount) || 0)}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">İndirim Oranı</p>
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                              %{formatNumber(campaign.discount_percentage, 1)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>Tespit: {formatDate(campaign.detection_date)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span>Güvenilirlik:</span>
                              <span className={`font-semibold ${getConfidenceColor(campaign.confidence_level)}`}>
                                {getConfidenceLabel(campaign.confidence_level)}
                              </span>
                            </div>
                            {campaign.duration_hours && (
                              <div className="flex items-center gap-2">
                                <span>Süre:</span>
                                <span className="font-semibold">{campaign.duration_hours} saat</span>
                              </div>
                            )}
                          </div>
                          {campaign.url && campaign.url.trim() !== '' ? (
                            <a
                              href={campaign.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-orange-500 hover:text-orange-600 transition-colors"
                            >
                              <ExternalLink className="w-4 h-4" />
                              Ürünü Gör
                            </a>
                          ) : (
                            <div className="flex items-center gap-1 text-gray-400 text-sm">
                              <ExternalLink className="w-4 h-4" />
                              <span>ID: {campaign.product_id}</span>
                            </div>
                          )}
                        </div>

                        {/* Discount Visualization */}
                        <div>
                          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <span>İndirim Seviyesi</span>
                            <span>%{formatNumber(campaign.discount_percentage, 1)}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                            <div
                              className={`h-3 rounded-full transition-all ${parseFloat(campaign.discount_percentage) >= 50
                                ? 'bg-gradient-to-r from-green-500 to-red-500'
                                : parseFloat(campaign.discount_percentage) >= 25
                                  ? 'bg-gradient-to-r from-yellow-500 to-orange-500'
                                  : 'bg-gradient-to-r from-blue-500 to-green-500'
                                }`}
                              style={{ width: `${Math.min(100, parseFloat(campaign.discount_percentage) || 0)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* No Results After Filter */}
              {filteredAndSortedData.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Filtreye Uygun Kampanya Bulunamadı
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Seçili filtreler için kampanya bulunamadı. Filtreleri değiştirmeyi deneyin.
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