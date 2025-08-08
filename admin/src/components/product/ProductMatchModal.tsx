// @/components/product/ProductMatchModal.tsx - Yeniden oluşturuldu
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
  onClose?: () => void;
  onSaved?: (selectedIds: number[]) => void;
}

export function MatchModalContent({
  finalProductId,
  initialSelected,
  onClose,
  onSaved,
}: MatchModalContentProps) {
  // State tanımları
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filtreler
  const [filters, setFilters] = useState({
    platform: "",
    product_type: "",
    title: "",
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  // Seçimler - Set kullanarak unique tutmak için
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

  // İlk seçili ürünleri state'e yükle
  useEffect(() => {
    if (initialSelected && initialSelected.length > 0) {
      setSelectedProducts(new Set(initialSelected));
      console.log('🔄 Initial selected products loaded:', initialSelected);
    }
  }, [initialSelected]);

  // Ürünleri fetch et
  useEffect(() => {
    fetchProducts();
  }, [filters, page, limit]);

  // API Base URL
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        throw new Error("Authentication token bulunamadı");
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        platform: filters.platform,
        product_type: filters.product_type,
        search: filters.title,
      });

      console.log('🔍 Fetching products:', `${API_BASE}/api/final_products/${finalProductId}/selectable-products?${queryParams}`);

      const response = await fetch(
        `${API_BASE}/api/final_products/${finalProductId}/selectable-products?${queryParams}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ Products fetched:', data);

      // Backend response format'ına göre adjust et
      if (data.success) {
        setProducts(data.products || []);
        setTotal(data.total || 0);
      } else {
        // Fallback eski format
        setProducts(Array.isArray(data) ? data : data.products || []);
        setTotal(Array.isArray(data) ? data.length : data.total || 0);
      }
      const currentlyMatchedProducts = (data.products || [])
        .filter((product: any) => product.is_currently_matched)
        .map((product: any) => product.id);

      setSelectedProducts(prev => {
        const newSelected = new Set(prev);
        currentlyMatchedProducts.forEach((id: number) => newSelected.add(id));
        return newSelected;
      });

    } catch (err) {
      console.error("❌ Ürünler yüklenemedi:", err);
      alert(`Ürünler yüklenemedi: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
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
    setPage(1); // Filtre değiştiğinde ilk sayfaya dön
  };

  const toggleSelection = (productId: number) => {
    const newSelected = new Set(selectedProducts);

    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
    }

    setSelectedProducts(newSelected);
    console.log('🔄 Selection changed:', Array.from(newSelected));
  };

  const selectAllOnPage = (selectAll: boolean) => {
    const newSelected = new Set(selectedProducts);

    if (selectAll) {
      // Bu sayfadaki tüm ürünleri seç
      products.forEach(product => newSelected.add(product.id));
    } else {
      // Bu sayfadaki tüm ürünlerin seçimini kaldır
      products.forEach(product => newSelected.delete(product.id));
    }

    setSelectedProducts(newSelected);
  };

  const clearAllSelections = () => {
    setSelectedProducts(new Set());
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        throw new Error("Authentication token bulunamadı");
      }

      const selectedArray = Array.from(selectedProducts);

      console.log('💾 Saving matches:', {
        finalProductId,
        selectedProducts: selectedArray,
        initialSelected,
      });

      const response = await fetch(
        `${API_BASE}/api/final_products/${finalProductId}/matches`,
        {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_ids: selectedArray,
            replace_all: true
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Bilinmeyen hata' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Save successful:', result);

      // Başarı mesajı
      const addedCount = selectedArray.filter(id => !initialSelected.includes(id)).length;
      const removedCount = initialSelected.filter(id => !selectedArray.includes(id)).length;

      alert(
        `✅ Eşleştirme başarıyla güncellendi!\n` +
        `📊 Toplam: ${selectedArray.length} ürün\n` +
        `➕ Eklenen: ${addedCount}\n` +
        `➖ Kaldırılan: ${removedCount}`
      );

      // Callback'leri çağır
      onSaved?.(selectedArray);
      onClose?.();

    } catch (err) {
      console.error("❌ Save error:", err);
      alert(`❌ Eşleştirme kaydedilemedi: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    } finally {
      setSaving(false);
    }
  };

  // Sayfa controls
  const totalPages = Math.ceil(total / limit);
  const selectedCount = selectedProducts.size;
  const isAllPageSelected = products.length > 0 && products.every(p => selectedProducts.has(p.id));

  // Değişiklik hesaplama
  const addedProducts = Array.from(selectedProducts).filter(id => !initialSelected.includes(id));
  const removedProducts = initialSelected.filter(id => !selectedProducts.has(id));

  return (
    <div className="text-left space-y-4 bg-white dark:bg-gray-900 p-6 rounded-lg max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Ürün Eşleştirme
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Final Product ID: #{finalProductId}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* Seçim Özeti */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-800 dark:text-blue-200">
                {selectedCount} ürün seçili
              </h4>
              <div className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
                {addedProducts.length > 0 && (
                  <p className="text-green-600">✅ {addedProducts.length} yeni ürün eklenecek</p>
                )}
                {removedProducts.length > 0 && (
                  <p className="text-red-600">❌ {removedProducts.length} ürün kaldırılacak</p>
                )}
                {addedProducts.length === 0 && removedProducts.length === 0 && (
                  <p>Henüz değişiklik yapılmadı</p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearAllSelections}
                className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-800 rounded-md transition-colors"
              >
                Temizle
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Kaydediyor...
                  </>
                ) : (
                  `💾 Kaydet (${selectedCount})`
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filtreler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <input
          name="title"
          placeholder="🔍 Ürün adı ara..."
          value={filters.title}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <input
          name="product_type"
          placeholder="📦 Ürün tipi..."
          value={filters.product_type}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <select
          name="platform"
          value={filters.platform}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">🏪 Tüm Platformlar</option>
          <option value="trendyol">🟠 Trendyol</option>
          <option value="hepsiburada">🔵 Hepsiburada</option>
          <option value="n11">🟣 N11</option>
          <option value="avansas">🟡 Avansas</option>
        </select>
        <select
          value={limit}
          onChange={(e) => {
            setLimit(parseInt(e.target.value));
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md 
                   bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                   focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value={10}>📄 10 ürün</option>
          <option value={20}>📄 20 ürün</option>
          <option value={50}>📄 50 ürün</option>
        </select>
      </div>

      {/* Ürün Tablosu */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <TableRow>
                <TableCell isHeader className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    onChange={(e) => selectAllOnPage(e.target.checked)}
                    className="rounded"
                  />
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">
                  Görsel
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">
                  Ürün Bilgileri
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">
                  Platform
                </TableCell>
                <TableCell isHeader className="px-4 py-3 text-left font-medium text-gray-900 dark:text-white">
                  Fiyat
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-gray-600 dark:text-gray-400">Ürünler yükleniyor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8">
                    <div className="text-gray-500 dark:text-gray-400">
                      <p className="text-4xl mb-2">📦</p>
                      <p>Filtrelere uygun ürün bulunamadı</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${selectedProducts.has(product.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                  >
                    <TableCell className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedProducts.has(product.id)}
                        onChange={() => toggleSelection(product.id)}
                        className="rounded"
                      />
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-gray-400 text-xs">No img</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white line-clamp-2">
                          {product.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {product.brand} {product.product_type && `• ${product.product_type}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        {product.platform}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <span className="font-semibold text-green-600 dark:text-green-400">
                        ₺{Number(product.latest_price || 0).toFixed(2)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            <span>Toplam {total} ürün</span>
            {selectedCount > 0 && (
              <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                • {selectedCount} seçili
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              ← Önceki
            </button>

            <span className="text-sm text-gray-700 dark:text-gray-300">
              Sayfa {page} / {totalPages || 1}
            </span>

            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md 
                       disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Sonraki →
            </button>
          </div>
        </div>
      </div>

      {/* Alt Actions */}
      <div className="flex justify-between items-center pt-4 border-t">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {selectedCount > 0 ? (
            <div>
              <div className="font-medium">{selectedCount} ürün eşleştirilecek</div>
              {(addedProducts.length > 0 || removedProducts.length > 0) && (
                <div className="text-xs mt-1 space-x-3">
                  {addedProducts.length > 0 && (
                    <span className="text-green-600">+{addedProducts.length} eklenecek</span>
                  )}
                  {removedProducts.length > 0 && (
                    <span className="text-red-600">-{removedProducts.length} kaldırılacak</span>
                  )}
                </div>
              )}
            </div>
          ) : (
            'Eşleştirilecek ürün seçin'
          )}
        </div>

        <div className="flex gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 
                       hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              İptal
            </button>
          )}

          <button
            onClick={clearAllSelections}
            disabled={selectedCount === 0}
            className="px-4 py-2 text-sm border border-red-300 text-red-700 hover:bg-red-50 rounded-md 
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Seçimi Temizle
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-md 
                     disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Kaydediyor...
              </>
            ) : (
              `💾 Eşleştirmeleri Kaydet (${selectedCount})`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MatchModalContent;