import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

interface Category {
  id: string;
  name: string;
}

export default function CategoryCreateForm() {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Kategoriler alınamadı:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Kategori adı boş olamaz");
      return;
    }

    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, parent_id: parentId }) // parent_id eklendi
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire("Başarılı", "Kategori eklendi", "success");
        navigate(-1);
      } else {
        Swal.fire("Hata", data.message || "Kategori eklenemedi", "error");
      }
    } catch (err) {
      Swal.fire("Hata", "Sunucu hatası", "error");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">
        Yeni Kategori Ekle
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full p-2 border rounded text-gray-800 dark:text-white"
          placeholder="Kategori Adı"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
        />
        {error && <p className="text-red-500">{error}</p>}

        <div>
          <label className="block mb-1 text-gray-700 dark:text-gray-300">
            Üst Kategori (Opsiyonel)
          </label>
          <select
            value={parentId || ""}
            onChange={(e) => setParentId(e.target.value || null)}
            className="w-full p-2 border rounded text-gray-800 dark:text-white"
          >
            <option value="">— Ana kategori —</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          Kaydet
        </button>
      </form>
    </div>
  );
}
