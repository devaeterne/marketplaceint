import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import PageMeta from "@/components/common/PageMeta";
import TableSearchTerms from "@/components/reports/TableSearchTerms";

export default function TermsReportPage() {
  return (
    <div>
      <PageMeta
        title="Arama Kelimeleri Raporu | Admin Panel"
        description="Platformlardan gelen ürünleri listeleyin, detaylarını inceleyin ve fiyat geçmişine erişin."
      />
      <PageBreadcrumb pageTitle="Arama Kelimeleri Raporu" />
      <TableSearchTerms />
    </div>
  );
}
