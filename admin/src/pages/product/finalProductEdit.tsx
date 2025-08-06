import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import FinalProductEditForm from "../../components/product/FinalProductEditForm";

export default function FinalProductEditPage() {
  return (
    <div>
      <PageMeta
        title="Ürün Düzenle | Admin Panel"
        description="Platformlardan gelen ürünleri listeleyin, detaylarını inceleyin ve fiyat geçmişine erişin."
      />
      <PageBreadcrumb pageTitle="Ürün Düzenle" />
      <FinalProductEditForm />
    </div>
  );
}

// Tailwind input style
// Add this to global css or tailwind config if needed:
// .input { @apply w-full px-3 py-2 border rounded dark:bg-gray-800 dark:text-white focus:outline-none focus:ring focus:border-blue-300; }
