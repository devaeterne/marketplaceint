// src/components/product/FinalProductCreateForm.tsx
import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { ArrowLeft, Save, Upload, X, Plus, Info } from "lucide-react";

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Tag {
  id: string;
  name: string;
}

export default function FinalProductCreateForm() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [previewImage, setPreviewImage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    short_description: "",
    description: "",
    image_url: "",
    image_file: "",
    brand: "",
    brand_id: "",
    category: "",
    category_id: "",
    weight: "",
    total_stock: "",
    max_quantity_per_cart: "",
    google_taxonomy_id: "",
    product_option_set_id: "",
    product_volume_discount_id: "",
    base_unit: "adet",
    sales_channel_ids: [] as string[],
    hidden_sales_channel_ids: [] as string[],
    tag_ids: [] as string[],
    ikas_product_id: "",
    price: "",
    campaign_price: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const [catRes, tagRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${import.meta.env.VITE_API_URL}/api/tags`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const categoriesData = await catRes.json();
      const tagsData = await tagRes.json();

      setCategories(categoriesData.categories || []);
      if (Array.isArray(tagsData.tags)) {
        setTags(tagsData.tags);
      } else if (Array.isArray(tagsData.tag)) {
        setTags(tagsData.tag);
      } else if (tagsData.tag) {
        setTags([tagsData.tag]);
      } else {
        setTags([]);
      }
    } catch (error) {
      console.error("Metadata yüklenemedi:", error);
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const groupedCategories = useMemo(() => {
    const mainCategories = categories.filter((cat) => !cat.parent_id);
    const subCategories = categories.filter((cat) => cat.parent_id);
    const grouped: Record<string, Category[]> = {};
    mainCategories.forEach((main) => {
      grouped[main.id] = subCategories.filter(
        (sub) => sub.parent_id === main.id
      );
    });
    return { mainCategories, grouped };
  }, [categories]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "category_id") {
      const selected = categories.find((cat) => cat.id === value);
      setFormData((prev) => ({ ...prev, category: selected?.name || "" }));
    }

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleImageUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setFormData((prev) => ({ ...prev, image_url: url }));
    setPreviewImage(url);
  };

  const handleTagChange = (tagId: string) => {
    setFormData((prev) => ({
      ...prev,
      tag_ids: prev.tag_ids.includes(tagId)
        ? prev.tag_ids.filter((id) => id !== tagId)
        : [...prev.tag_ids, tagId],
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = "Ürün adı zorunludur";
    if (!formData.category_id)
      newErrors.category_id = "Kategori seçimi zorunludur";
    if (!formData.price || parseFloat(formData.price) <= 0)
      newErrors.price = "Geçerli bir fiyat giriniz";
    if (
      formData.campaign_price &&
      parseFloat(formData.campaign_price) >= parseFloat(formData.price)
    ) {
      newErrors.campaign_price =
        "Kampanya fiyatı normal fiyattan düşük olmalıdır";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      Swal.fire("Hata", "Lütfen zorunlu alanları doldurun", "error");
      return;
    }

    setLoading(true);
    const token = localStorage.getItem("authToken");

    // Array alanları string array'e dönüştür
    const payload = {
      ...formData,
      tag_ids: Array.isArray(formData.tag_ids)
        ? formData.tag_ids.map(String)
        : [],
      sales_channel_ids: Array.isArray(formData.sales_channel_ids)
        ? formData.sales_channel_ids.map(String)
        : [],
      hidden_sales_channel_ids: Array.isArray(formData.hidden_sales_channel_ids)
        ? formData.hidden_sales_channel_ids.map(String)
        : []
    };

    try {
      console.log('🔄 Creating product:', payload);

      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/final_products`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      console.log('📡 Response status:', res.status);

      // Response kontrolü
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error response:', errorText);

        // HTML response kontrolü (404 sayfası vs)
        if (errorText.includes('<!DOCTYPE')) {
          throw new Error(`Backend endpoint bulunamadı (${res.status})`);
        }

        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const data = await res.json();

      if (data.success) {
        await Swal.fire({
          icon: "success",
          title: "Başarılı!",
          text: "Ürün başarıyla eklendi",
          timer: 1500,
          showConfirmButton: false,
        });
        navigate("/final-products");
      } else {
        Swal.fire("Hata", data.message || "Ürün eklenemedi", "error");
      }

    } catch (err: any) {
      console.error("Ürün eklenemedi:", err);
      Swal.fire("Hata", err.message || "Sunucu hatası", "error");
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/final-products")}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800 dark:text-white" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Yeni Final Ürün Ekle
          </h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "basic", label: "Temel Bilgiler", icon: Info },
            { id: "pricing", label: "Fiyat & Stok", icon: Plus },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }
              `}
            >
              <tab.icon className="w-4 h-4 text-gray-800 dark:text-white" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler Tab */}
        {activeTab === "basic" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sol Kolon */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ürün Adı *
                </label>
                <input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500  text-gray-800 dark:text-white  ${errors.name ? "border-red-500" : "border-gray-300"
                    }`}
                  placeholder="Örn: Faber Castell Kurşun Kalem"
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kısa Açıklama
                </label>
                <input
                  name="short_description"
                  value={formData.short_description}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500  text-gray-800 dark:text-white"
                  placeholder="Ürünün kısa tanımı"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Detaylı Açıklama
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                  placeholder="Ürün hakkında detaylı bilgi..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Marka
                </label>
                <input
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                  placeholder="Örn: Lavazza Filtre Kahve"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kategori *
                </label>
                <select
                  name="category_id"
                  value={formData.category_id}
                  onChange={handleChange}
                  className="w-full p-2 border rounded  text-gray-800 dark:text-white"
                >
                  <option value="">Kategori Seçiniz</option>
                  {groupedCategories.mainCategories.map((main) => (
                    <optgroup key={main.id} label={main.name}>
                      {(groupedCategories.grouped[main.id] || []).map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          ├─ {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                {errors.category_id && (
                  <p className="text-red-500 text-sm">{errors.category_id}</p>
                )}
              </div>
            </div>

            {/* Sağ Kolon - Görsel */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ">
                  Ürün Görseli
                </label>
                <div className="space-y-4">
                  <input
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleImageUrlChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                    placeholder="Görsel URL'si"
                  />

                  {previewImage && (
                    <div className="relative">
                      <img
                        src={previewImage}
                        alt="Ürün önizleme"
                        className="w-full h-64 object-contain border rounded-lg"
                        onError={() => setPreviewImage("")}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImage("");
                          setFormData((prev) => ({ ...prev, image_url: "" }));
                        }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Etiketler */}
              <div>
                <label className="block text-sm mb-1  text-gray-800 dark:text-white">
                  Etiketler
                </label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagChange(tag.id)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${formData.tag_ids.includes(tag.id)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fiyat & Stok Tab */}
        {activeTab === "pricing" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Normal Fiyat (TL) *
                </label>
                <input
                  name="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white ${errors.price ? "border-red-500" : "border-gray-300"
                    }`}
                  placeholder="0.00"
                />
                {errors.price && (
                  <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Kampanya Fiyatı (TL)
                </label>
                <input
                  name="campaign_price"
                  type="number"
                  step="0.01"
                  value={formData.campaign_price}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white ${errors.campaign_price ? "border-red-500" : "border-gray-300"
                    }`}
                  placeholder="0.00"
                />
                {errors.campaign_price && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.campaign_price}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Stok Adedi
                </label>
                <input
                  name="total_stock"
                  type="number"
                  value={formData.total_stock}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Sepet Limiti
                </label>
                <input
                  name="max_quantity_per_cart"
                  type="number"
                  value={formData.max_quantity_per_cart}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                  placeholder="Maksimum sepet adedi"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ağırlık (gram)
                </label>
                <input
                  name="weight"
                  type="number"
                  value={formData.weight}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Birim
                </label>
                <select
                  name="base_unit"
                  value={formData.base_unit}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                >
                  <option value="adet">Adet</option>
                  <option value="paket">Paket</option>
                  <option value="kutu">Kutu</option>
                  <option value="koli">Koli</option>
                  <option value="kg">Kilogram</option>
                  <option value="gram">Gram</option>
                  <option value="litre">Litre</option>
                  <option value="metre">Metre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IKAS Ürün ID
                </label>
                <input
                  name="ikas_product_id"
                  value={formData.ikas_product_id}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                  placeholder="IKAS sistemindeki ID"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={() => navigate("/final-products")}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            İptal
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Kaydediliyor...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Ürünü Kaydet
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
