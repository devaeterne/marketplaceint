// src/components/reports/FinalProductSelector.tsx
import React, { useEffect, useState, useMemo } from "react";
import { Search, Package } from "lucide-react";
import { formatCurrency } from "@/utils/format";

interface FinalProduct {
  id: number;
  name: string;
  brand: string;
  category_id: number | string;
  image_url: string;
  price: number;
  campaign_price: number;
  matched_count: number;
}

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
}

interface Props {
  finalProductId: number | null;
  onProductSelect?: (productId: number) => void;
}

export default function FinalProductSelector({ finalProductId, onProductSelect }: Props) {
  const [products, setProducts] = useState<FinalProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "">("");

  // Fetch categories and products
  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const [prodRes, catRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/final_products?limit=1000`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const productData = await prodRes.json();
      const categoryData = await catRes.json();

      if (productData.success) setProducts(productData.products || []);
      if (categoryData.success) setCategories(categoryData.categories || []);
    } catch (err) {
      console.error("Veriler alınamadı:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const groupedCategories = useMemo(() => {
    const main = categories.filter((c) => c.parent_id === null);
    const sub = categories.filter((c) => c.parent_id !== null);
    const grouped: Record<number, Category[]> = {};
    main.forEach((m) => {
      grouped[m.id] = sub.filter((s) => s.parent_id === m.id);
    });
    return { main, grouped };
  }, [categories]);

  const getCategoryName = (categoryId: number | string): string => {
    const id = typeof categoryId === "string" ? parseInt(categoryId) : categoryId;
    const category = categories.find((c) => c.id === id);
    const parent = category ? categories.find((c) => c.id === category.parent_id) : null;
    return category
      ? parent
        ? `${parent.name} > ${category.name}`
        : category.name
      : "Kategori Yok";
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      searchQuery === "" ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategoryId === "" ||
      parseInt(product.category_id as string) === selectedCategoryId;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-auto p-4">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Final Ürün Seçimi
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Analiz etmek istediğiniz ürünü seçin
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-800 dark:text-white w-5 h-5" />
          <input
            type="text"
            placeholder="Ürün adı veya marka ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white focus:border-transparent"
          />
        </div>

        <select
          value={selectedCategoryId}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedCategoryId(value === "" ? "" : parseInt(value));
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-1 text-gray-800 dark:text-white focus:ring-blue-500"
        >
          <option value="">Tüm Kategoriler</option>
          {groupedCategories.main.map((main) => (
            <optgroup key={main.id} label={main.name}>
              {(groupedCategories.grouped[main.id] || []).map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {`${main.name} > ${sub.name}`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => onProductSelect?.(product.id)}
            className={`
              border rounded-lg p-4 cursor-pointer transition-all duration-200
              ${finalProductId === product.id
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                : "border-gray-200 hover:border-gray-300 hover:shadow-md"
              }
            `}
          >
            <div className="flex gap-4">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-20 h-20 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.png";
                  }}
                />
              ) : (
                <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}

              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white line-clamp-2">
                  {product.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {product.brand} • {getCategoryName(product.category_id)}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <div>
                    {product.campaign_price ? (
                      <div className="flex items-center gap-2">
                        <span className="text-red-600 font-semibold">
                          {formatCurrency(product.campaign_price)}
                        </span>
                        <span className="text-xs text-gray-500 line-through">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                    ) : (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(product.price)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${product.matched_count > 0
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-700"
                      }`}
                  >
                    {product.matched_count} eşleşme
                  </span>
                </div>
              </div>
            </div>

            {finalProductId === product.id && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  ✓ Seçili Ürün
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">Arama kriterlerine uygun ürün bulunamadı</p>
        </div>
      )}
    </div>
  );
}
