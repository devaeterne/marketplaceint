import React, { useEffect, useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/utils/format";
import { useNavigate } from "react-router-dom";
import { MatchModalContent } from "./ProductMatchModal";
import { Pencil, Link2, X, Trash2 } from "lucide-react";
import Swal from "sweetalert2";

// ============================
// INTERFACES
// ============================
interface FinalProduct {
  id: number;
  name: string;
  brand: string;
  image_url: string;
  category: string;
  category_id: number;
  price: number;
  campaign_price: number;
  matched_count?: number;
  ikas_product_id?: string | null;
}

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  finalProductId: number;
  initialSelected: number[];
  onSaved: (selectedIds: number[]) => void;
}

// ============================
// MODAL COMPONENT
// ============================
const MatchModal: React.FC<MatchModalProps> = ({
  isOpen,
  onClose,
  finalProductId,
  initialSelected,
  onSaved
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Ürün Eşleştirme - Final Product #{finalProductId}
            </h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-hidden">
            <MatchModalContent
              finalProductId={finalProductId}
              initialSelected={initialSelected}
              onClose={onClose}
              onSaved={onSaved}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================
// DELETE BUTTON COMPONENT
// ============================
const DeleteProductButton: React.FC<{
  product: FinalProduct;
  onDeleteSuccess: () => void;
}> = ({ product, onDeleteSuccess }) => {

  const handleDelete = async () => {
    try {
      // 1. İKAS entegrasyon kontrolü (frontend'de ilk kontrol)
      if (product.ikas_product_id && product.ikas_product_id.trim() !== '') {
        await Swal.fire({
          icon: "error",
          title: "Silme İşlemi Engellenmiştir!",
          html: `
            <div class="text-left">
              <p class="mb-2"><strong>Bu ürün İKAS ile entegre edilmiştir.</strong></p>
              <p class="mb-2">📦 <strong>Ürün:</strong> ${product.name}</p>
              <p class="mb-2">🔗 <strong>İKAS ID:</strong> ${product.ikas_product_id}</p>
              <p class="text-red-600">⚠️ Güvenlik nedeniyle İKAS entegre ürünler silinemez.</p>
            </div>
          `,
          confirmButtonText: "Anladım",
          confirmButtonColor: "#ef4444",
          showCancelButton: false,
        });
        return;
      }

      // 2. Normal ürün için onay dialogi
      const result = await Swal.fire({
        title: "Ürünü Silmek İstediğinizden Emin misiniz?",
        html: `
          <div class="text-left">
            <p class="mb-2">📦 <strong>Ürün:</strong> ${product.name}</p>
            <p class="mb-2">💰 <strong>Fiyat:</strong> ${product.price ? `${product.price} TL` : 'Belirtilmemiş'}</p>
            <p class="mb-2">🔗 <strong>Eşleştirme:</strong> ${product.matched_count || 0} ürün</p>
            <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p class="text-red-700 text-sm">
                ⚠️ <strong>Dikkat:</strong> Bu işlem geri alınamaz!<br>
                Ürün ve tüm ilişkili veriler kalıcı olarak silinecektir.
              </p>
            </div>
          </div>
        `,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#dc2626",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Evet, Sil!",
        cancelButtonText: "İptal",
        reverseButtons: true,
        focusCancel: true,
      });

      if (!result.isConfirmed) {
        return;
      }

      // 3. Loading göster
      Swal.fire({
        title: "Siliniyor...",
        text: "Ürün ve ilişkili veriler siliniyor, lütfen bekleyin.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      // 4. Backend'e silme isteği gönder
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/final_products/${product.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        // 5. Başarı mesajı
        await Swal.fire({
          icon: "success",
          title: "Başarıyla Silindi!",
          html: `
            <div class="text-left">
              <p class="mb-2">✅ <strong>${data.deleted_product?.name || product.name}</strong> silindi</p>
              ${data.statistics?.deleted_matches > 0
              ? `<p class="text-sm text-gray-600">🔗 ${data.statistics.deleted_matches} eşleştirme de silindi</p>`
              : ''
            }
            </div>
          `,
          timer: 2000,
          showConfirmButton: false,
        });

        // 6. Parent component'i güncelle
        onDeleteSuccess();

      } else if (data.error_type === "IKAS_INTEGRATED") {
        // 7. İKAS entegre ürün hatası (backend'den geldiiyse)
        await Swal.fire({
          icon: "error",
          title: "İKAS Entegre Ürün!",
          html: `
            <div class="text-left">
              <p class="mb-2">🔗 <strong>İKAS ID:</strong> ${data.ikas_product_id}</p>
              <p class="text-red-600">${data.message}</p>
              <p class="text-sm text-gray-600 mt-2">${data.details?.suggestion}</p>
            </div>
          `,
          confirmButtonText: "Anladım",
          confirmButtonColor: "#ef4444",
        });

      } else {
        // 8. Diğer hatalar
        throw new Error(data.message || "Ürün silinemedi");
      }

    } catch (error: any) {
      console.error("❌ Delete error:", error);

      await Swal.fire({
        icon: "error",
        title: "Silme Hatası!",
        text: error.message || "Ürün silinirken bir hata oluştu",
        confirmButtonColor: "#ef4444",
      });
    }
  };

  return (
    <div className="relative group inline-block">
      <button
        onClick={handleDelete}
        className={`p-2 rounded-full transition-colors ${product.ikas_product_id && product.ikas_product_id.trim() !== ''
          ? "text-gray-400 cursor-not-allowed"
          : "text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
          }`}
        disabled={product.ikas_product_id && product.ikas_product_id.trim() !== ''}
        title={
          product.ikas_product_id && product.ikas_product_id.trim() !== ''
            ? "İKAS entegre ürün - Silinemez"
            : "Ürünü sil"
        }
      >
        <Trash2 className="w-4 h-4" />
      </button>
      <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 
        transition-transform bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 whitespace-nowrap">
        {product.ikas_product_id && product.ikas_product_id.trim() !== ''
          ? "İKAS entegre - Silinemez"
          : "Sil"
        }
      </span>
    </div>
  );
};

// ============================
// MAIN TABLE COMPONENT
// ============================
export default function FinalProductTable() {
  // ============================
  // STATE MANAGEMENT
  // ============================
  const [products, setProducts] = useState<FinalProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const navigate = useNavigate();

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedFinalProduct, setSelectedFinalProduct] = useState<number | null>(null);
  const [initialSelectedProducts, setInitialSelectedProducts] = useState<number[]>([]);

  // ============================
  // UTILITY FUNCTIONS
  // ============================

  // Kategori Mapping
  const categoryMap = useMemo(() => {
    const map: Record<number, Category> = {};
    categories.forEach((c) => {
      map[c.id] = c;
    });
    return map;
  }, [categories]);

  // Kategori ismi oluşturma
  const getCategoryFullName = (categoryId: number) => {
    const category = categoryMap[categoryId];
    if (!category) return "—";
    const parent = category.parent_id ? categoryMap[category.parent_id] : null;
    return parent ? `${parent.name} > ${category.name}` : category.name;
  };

  // Pagination hesaplama
  const totalPages = Math.ceil(total / limit);

  // ============================
  // API FUNCTIONS
  // ============================

  // Final ürünleri getir
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/final_products?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const data = await res.json();

      if (data.success) {
        setProducts(data.products || []);
        setTotal(data.total || 0);
      } else {
        // Fallback için eski format desteği
        setProducts(data.products || data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Final ürünler alınamadı:", err);
      setProducts([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // Kategorileri getir
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/categories`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err) {
      console.error("Kategoriler alınamadı:", err);
      setCategories([]);
    }
  };

  // ============================
  // EVENT HANDLERS
  // ============================

  // Eşleştirme modal açma
  const handleMatch = async (finalProductId: number) => {
    console.log('🔍 handleMatch called for ID:', finalProductId);

    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Authentication token bulunamadı. Lütfen tekrar giriş yapın.");
      return;
    }

    // Mevcut eşleşmeleri al
    let matchedIds: number[] = [];
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/final_products/${finalProductId}/matches`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      if (res.ok) {
        const matchData = await res.json();

        // API format desteği
        if (matchData.success && Array.isArray(matchData.matches)) {
          matchedIds = matchData.matches;
        } else if (Array.isArray(matchData)) {
          matchedIds = matchData;
        }

        console.log('🔗 Current matched IDs:', matchedIds);
      } else {
        console.warn('⚠️ Failed to fetch matches, starting with empty list');
      }
    } catch (err) {
      console.error("❌ Mevcut eşleşmeler alınamadı:", err);
    }

    // Modal'ı aç
    setSelectedFinalProduct(finalProductId);
    setInitialSelectedProducts(matchedIds);
    setModalOpen(true);
  };

  // Modal kapatma
  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedFinalProduct(null);
    setInitialSelectedProducts([]);
  };

  // Modal kaydetme
  const handleModalSaved = async (selectedIds: number[]) => {
    const token = localStorage.getItem("authToken");

    if (!token || !selectedFinalProduct) {
      alert("Authentication error");
      return;
    }

    try {
      const updateResponse = await fetch(
        `${import.meta.env.VITE_API_URL}/api/final_products/${selectedFinalProduct}/matches`,
        {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            product_ids: selectedIds,
            replace_all: true
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({ message: 'Bilinmeyen hata' }));
        throw new Error(errorData.message || `HTTP ${updateResponse.status}`);
      }

      const updateResult = await updateResponse.json();

      // Tabloyu güncelle
      setProducts((prev) =>
        prev.map((product) =>
          product.id === selectedFinalProduct
            ? { ...product, matched_count: selectedIds.length }
            : product
        )
      );

      // Modal'ı kapat
      handleModalClose();

      // Başarı mesajı
      alert(
        `✅ Eşleştirme başarıyla güncellendi!\n\n` +
        `📊 Toplam: ${selectedIds.length} ürün\n` +
        `➕ Eklenen: ${updateResult.added_count || 0}\n` +
        `➖ Kaldırılan: ${updateResult.deleted_count || 0}`
      );

    } catch (error) {
      console.error('❌ Update error:', error);
      alert(`❌ Eşleştirme güncellenemedi: ${error instanceof Error ? error.message : 'Bilinmeyen hata'}`);
    }
  };

  // Düzenleme
  const handleEdit = (productId: number) => {
    navigate(`/final-products/edit/${productId}`);
  };

  // Silme başarılı callback
  const handleDeleteSuccess = () => {
    fetchProducts(); // Listeyi yenile
  };

  // Debug API bağlantısı
  const debugApiConnection = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/final_products?limit=1`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
        }
      );

      const data = await response.json();

      alert(
        response.ok
          ? "✅ API Bağlantısı Başarılı!"
          : `❌ API Hatası: ${data.message || 'Test başarısız'}`
      );

    } catch (err) {
      alert(`❌ API bağlantı hatası: ${err instanceof Error ? err.message : 'Bilinmeyen hata'}`);
    }
  };

  // ============================
  // EFFECTS
  // ============================

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [page, limit]);

  // ============================
  // RENDER
  // ============================

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl text-gray-800 dark:text-white font-semibold">
            Final Ürünler ({total})
          </h2>
          <div className="flex gap-2">
            <button
              onClick={debugApiConnection}
              className="bg-gray-500 hover:bg-gray-600 text-white font-semibold px-3 py-2 rounded-md transition-colors text-sm"
            >
              🧪 API Test
            </button>
            <button
              onClick={() => navigate("/final-products/create")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md transition-colors"
            >
              + Final Ürün Ekle
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="max-w-full overflow-x-auto text-gray-800 dark:text-white">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.5]">
              <TableRow>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  #
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Görsel
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Ürün Adı
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Marka
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Kategori
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Fiyat
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  Eşleşme
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  İKAS
                </TableCell>
                <TableCell isHeader className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400">
                  İşlemler
                </TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {loading ? (
                <TableRow>
                  <TableCell className="px-5 py-8 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                      <span className="text-gray-600 dark:text-gray-400">Yükleniyor...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center py-8 text-gray-500">
                    <div>
                      <p className="text-4xl mb-2">📦</p>
                      <p>Henüz final ürün eklenmemiş.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow
                    key={product.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    {/* ID */}
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      #{product.id}
                    </TableCell>

                    {/* Görsel */}
                    <TableCell className="px-4 py-3">
                      <div className="w-12 h-12 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                        <img
                          src={product.image_url || "/placeholder.png"}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "/placeholder.png";
                          }}
                        />
                      </div>
                    </TableCell>

                    {/* Ürün Adı */}
                    <TableCell className="px-4 py-3 text-gray-900 dark:text-white text-start font-medium">
                      {product.name}
                    </TableCell>

                    {/* Marka */}
                    <TableCell className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {product.brand || '—'}
                    </TableCell>

                    {/* Kategori */}
                    <TableCell className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {getCategoryFullName(product.category_id)}
                    </TableCell>

                    {/* Fiyat */}
                    <TableCell className="px-4 py-3 font-semibold">
                      {product.campaign_price ? (
                        <div>
                          <span className="text-red-600 dark:text-red-400">
                            {formatCurrency(product.campaign_price)}
                          </span>
                          <span className="text-xs text-gray-500 line-through ml-2">
                            {formatCurrency(product.price)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-900 dark:text-white">
                          {formatCurrency(product.price)}
                        </span>
                      )}
                    </TableCell>

                    {/* Eşleşme */}
                    <TableCell className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.matched_count && product.matched_count > 0
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          }`}
                      >
                        {product.matched_count || 0} ürün
                      </span>
                    </TableCell>

                    {/* İKAS Durumu */}
                    <TableCell className="px-4 py-3">
                      {product.ikas_product_id && product.ikas_product_id.trim() !== '' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          🔗 Entegre
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          Lokal
                        </span>
                      )}
                    </TableCell>

                    {/* İşlemler */}
                    <TableCell className="px-4 py-3">
                      <div className="flex gap-1">
                        {/* Eşleştir */}
                        <div className="relative group inline-block">
                          <button
                            onClick={() => handleMatch(product.id)}
                            className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-full transition-colors"
                          >
                            <Link2 className="w-4 h-4 text-blue-600 hover:text-blue-800 dark:text-blue-400" />
                          </button>
                          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 
                            transition-transform bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 whitespace-nowrap">
                            Eşleştir
                          </span>
                        </div>

                        {/* Düzenle */}
                        <div className="relative group inline-block">
                          <button
                            onClick={() => handleEdit(product.id)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                          >
                            <Pencil className="w-4 h-4 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400" />
                          </button>
                          <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 
                            transition-transform bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 whitespace-nowrap">
                            Düzenle
                          </span>
                        </div>

                        {/* Sil */}
                        <DeleteProductButton
                          product={product}
                          onDeleteSuccess={handleDeleteSuccess}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center p-4 border-t text-sm">
          <div className="text-gray-600 dark:text-gray-400">
            Toplam {total} üründen {Math.min((page - 1) * limit + 1, total)}-
            {Math.min(page * limit, total)} arası gösteriliyor
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              ← Önceki
            </button>
            <div className="flex gap-1">
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1 rounded-md transition-colors ${page === pageNum
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              {totalPages > 5 && <span className="px-2 text-gray-500">...</span>}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Sonraki →
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && selectedFinalProduct && (
        <MatchModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          finalProductId={selectedFinalProduct}
          initialSelected={initialSelectedProducts}
          onSaved={handleModalSaved}
        />
      )}
    </>
  );
}