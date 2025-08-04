// admin/src/pages/product/index.tsx

import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ProductTable from "../../components/product/ProductTable";

export default function ProductPage() {
  return (
    <div>
      <PageMeta
        title="Ürün Listesi | Admin Panel"
        description="Platformlardan gelen ürünleri listeleyin, detaylarını inceleyin ve fiyat geçmişine erişin."
      />
      <PageBreadcrumb pageTitle="Ürün Listesi" />
      <ProductTable />
    </div>
  );
}
