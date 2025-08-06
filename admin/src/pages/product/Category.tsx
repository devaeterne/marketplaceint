import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import TableCategories from "@/components/product/TableCategories";

export default function ProductPage() {
  return (
    <div>
      <PageMeta
        title="Kategori Listesi | Admin Panel"
        description="Platformlardan gelen ürünleri listeleyin, detaylarını inceleyin ve fiyat geçmişine erişin."
      />
      <PageBreadcrumb pageTitle="Kategori Listesi" />
      <TableCategories />
    </div>
  );
}
