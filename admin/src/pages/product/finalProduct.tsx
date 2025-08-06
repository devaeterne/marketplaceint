// admin/src/pages/product/index.tsx

import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import FinalProductTable from "../../components/product/FinalProductTable";

export default function ProductPage() {
  return (
    <div>
      <PageMeta
        title="Ürün Listesi | Admin Panel"
        description="Platformlardan gelen ürünleri listeleyin, detaylarını inceleyin ve fiyat geçmişine erişin."
      />
      <PageBreadcrumb pageTitle="Ürün Listesi" />
      <FinalProductTable />
    </div>
  );
}
