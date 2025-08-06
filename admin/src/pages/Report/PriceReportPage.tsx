// src/pages/PriceReportPage.tsx
import React, { useState, useEffect } from "react";
import { 
  Package, 
  TrendingDown, 
  Store, 
  Tag, 
  Clock, 
  AlertCircle,
  ChevronRight
} from "lucide-react";
import FinalProductSelector from "@/components/reports/FinalProductSelector";
import LowestPriceList from "@/components/reports/LowestPriceList";
import PlatformAverages from "@/components/reports/PlatformAvarages";
import TagPriceReport from "@/components/reports/TagPriceReport";
import LowestMoment from "@/components/reports/LowestMoment";
import CampaignDetection from "@/components/reports/CampaignDetection"

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType<{ finalProductId: number | null }>;
}

export default function PriceReportPage() {
  const [selectedFinalProduct, setSelectedFinalProduct] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("product-selector");

  const tabs: Tab[] = [
    {
      id: "product-selector",
      label: "Ürün Seçimi",
      icon: Package,
      component: FinalProductSelector
    },
    {
      id: "lowest-prices",
      label: "En Düşük Fiyatlar",
      icon: TrendingDown,
      component: LowestPriceList
    },
    {
      id: "platform-averages",
      label: "Platform Ortalamaları",
      icon: Store,
      component: PlatformAverages
    },
    {
      id: "tag-prices",
      label: "Etiket Bazlı Fiyatlar",
      icon: Tag,
      component: TagPriceReport
    },
    {
      id: "lowest-moment",
      label: "En Ucuz Zaman",
      icon: Clock,
      component: LowestMoment
    },
    {
      id: "campaign-detection",
      label: "Kampanya Tespiti",
      icon: AlertCircle,
      component: CampaignDetection
    }
  ];

  // Ürün seçildiğinde otomatik olarak ilk rapora geç
  useEffect(() => {
    if (selectedFinalProduct && activeTab === "product-selector") {
      setActiveTab("lowest-prices");
    }
  }, [selectedFinalProduct, activeTab]);

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || FinalProductSelector;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 w-10xl">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Fiyat Analiz Raporu
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Ürün fiyatlarını detaylı olarak analiz edin
              </p>
            </div>
            {selectedFinalProduct && (
              <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Seçili Ürün ID: #{selectedFinalProduct}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 max-auto overflow-x-auto py-4" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDisabled = tab.id !== "product-selector" && !selectedFinalProduct;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`
                    flex items-center gap-2 px-3 py-2 text-sm font-medium whitespace-nowrap
                    border-b-2 transition-colors duration-200
                    ${isActive
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : isDisabled
                      ? "border-transparent text-gray-400 dark:text-gray-600 cursor-not-allowed"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                  {tab.id === "product-selector" && !selectedFinalProduct && (
                    <ChevronRight className="w-4 h-4 ml-1" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-12xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Product Selection Hint */}
        {!selectedFinalProduct && activeTab !== "product-selector" && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Ürün Seçimi Gerekli
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              Raporları görüntülemek için önce bir final ürün seçmelisiniz.
            </p>
            <button
              onClick={() => setActiveTab("product-selector")}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Ürün Seç
            </button>
          </div>
        )}

        {/* Active Tab Component */}
        {(selectedFinalProduct || activeTab === "product-selector") && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <ActiveComponent 
              finalProductId={selectedFinalProduct}
              onProductSelect={activeTab === "product-selector" ? setSelectedFinalProduct : undefined}
            />
          </div>
        )}
      </div>
    </div>
  );
}