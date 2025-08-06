import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

export default function TagsCreateForm() {
  const [name, setName] = useState("");
  const [ikasTagId, setIkasTagId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Etiket adı boş olamaz");
      return;
    }

    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, ikas_tag_id: ikasTagId || null })
      });

      const data = await res.json();
      if (data.success) {
        Swal.fire("Başarılı", "Etiket eklendi", "success");
        navigate(-1);
      } else {
        Swal.fire("Hata", data.message || "Etiket eklenemedi", "error");
      }
    } catch (err) {
      Swal.fire("Hata", "Sunucu hatası", "error");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Yeni Etiket Ekle</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          className="w-full p-2 border rounded text-gray-800 dark:text-white"
          placeholder="Etiket Adı"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
        />
        {error && <p className="text-red-500">{error}</p>}

        <input
          className="w-full p-2 border rounded text-gray-800 dark:text-white"
          placeholder="IKAS Tag ID (opsiyonel)"
          value={ikasTagId}
          onChange={(e) => setIkasTagId(e.target.value)}
        />

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
