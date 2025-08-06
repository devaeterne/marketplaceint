import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import TableTags from "@/components/product/TableTags";

export default function TagsPage() {
  return (
    <div>
      <PageMeta
        title="Kategori Listesi | Admin Panel"
        description="Platformlardan gelen ürünleri listeleyin, detaylarını inceleyin ve fiyat geçmişine erişin."
      />
      <PageBreadcrumb pageTitle="Kategori Listesi" />
      <TableTags />
    </div>
  );
}
