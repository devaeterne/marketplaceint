// src/components/product/FinalProductCreateForm.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import Swal from "sweetalert2";

export default function FinalProductCreateForm() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    short_description: "",
    description: "",
    image_url: "",
    brand: "",
    brand_id: "",
    category_id: "",
    weight: "",
    total_stock: "",
    max_quantity_per_cart: "",
    google_taxonomy_id: "",
    product_option_set_id: "",
    product_volume_discount_id: "",
    base_unit: "",
    sales_channel_ids: [],
    hidden_sales_channel_ids: [],
    tag_ids: [],
    ikas_product_id: "",
    price: "",
    campaign_price: "",
  });

  const fetchMetadata = async () => {
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
    setTags(tagsData.tags || []);
  };

  useEffect(() => {
    fetchMetadata();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagChange = (tagId: string) => {
    setFormData((prev) => {
      const currentTags = prev.tag_ids;
      return {
        ...prev,
        tag_ids: currentTags.includes(tagId)
          ? currentTags.filter((id) => id !== tagId)
          : [...currentTags, tagId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/final_products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire("Başarılı", "Ürün eklendi", "success");
        navigate("/final-products");
      } else {
        Swal.fire("Hata", data.message, "error");
      }
    } catch (err) {
      console.error("Ürün eklenemedi:", err);
      Swal.fire("Hata", "Sunucu hatası", "error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Final Ürün Oluştur</h2>

      <input name="name" placeholder="Ürün adı *" required onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />
      <input name="short_description" placeholder="Kısa açıklama" onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />
      <textarea name="description" placeholder="Açıklama" onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />
      <input name="image_url" placeholder="Görsel URL" onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />
      <input name="brand" placeholder="Marka" onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />
      <input name="brand_id" placeholder="Marka ID" onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />

      <select name="category_id" required onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white">
        <option value="">Kategori Seç</option>
        {categories.map((cat: any) => (
          <option key={cat.id} value={cat.id}>{cat.name}</option>
        ))}
      </select>

      <input name="weight" type="number" placeholder="Ağırlık (gram)" onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />
      <input name="total_stock" type="number" placeholder="Stok" onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />
      <input name="max_quantity_per_cart" type="number" placeholder="Sepet Limiti" onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />
      <input name="price" type="number" placeholder="Fiyat" required onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />
      <input name="campaign_price" type="number" placeholder="Kampanya Fiyatı" onChange={handleChange} className="w-full border px-4 py-2 rounded text-gray-800 dark:text-white" />

      {/* TAGS */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-white">Etiketler:</label>
        <div className="flex flex-wrap gap-2  text-gray-800 dark:text-white">
          {tags.map((tag: any) => (
            <button
              key={tag.id}
              type="button"
              onClick={() => handleTagChange(tag.id)}
              className={`px-3 py-1 rounded border ${
                formData.tag_ids.includes(tag.id)
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {tag.name}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded">
        Ürünü Kaydet
      </button>
    </form>
  );
}
