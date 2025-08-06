import React, { useState } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import BotControlPanel from "@/components/ecommerce/BotControlPanel";
import BotLogModal from "@/components/ecommerce/botLogModal";

const MySwal = withReactContent(Swal);

interface BotStatus {
  name: string;
  isRunning: boolean;
  lastRun?: string;
  progress?: number;
}

export default function Home() {
  const [bots, setBots] = useState<BotStatus[]>([
    { name: "Avansas", isRunning: false, lastRun: "", progress: 0 },
    { name: "Hepsiburada", isRunning: false, lastRun: "", progress: 0 },
    { name: "n11", isRunning: false, lastRun: "", progress: 0 },
    { name: "Trendyol", isRunning: false, lastRun: "", progress: 0 },
  ]);
  const [logModal, setLogModal] = useState<{
    isOpen: boolean;
    botName: string;
  }>({
    isOpen: false,
    botName: "",
  });

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

  const updateBotState = (
    botName: string,
    isRunning: boolean,
    progress: number
  ) => {
    setBots((prev) =>
      prev.map((bot) =>
        bot.name === botName
          ? {
              ...bot,
              isRunning,
              progress,
              lastRun:
                isRunning || progress === 100
                  ? new Date().toLocaleString("tr-TR")
                  : bot.lastRun,
            }
          : bot
      )
    );
  };

  // Progress simülasyonu için yardımcı fonksiyon
  const simulateProgress = (botName: string, startProgress: number = 5) => {
    let currentProgress = startProgress;

    const interval = setInterval(() => {
      currentProgress += Math.random() * 15 + 5; // 5-20 arası rastgele artış

      if (currentProgress >= 95) {
        currentProgress = 95; // API cevabını beklerken 95'te durdur
        clearInterval(interval);
      }

      setBots((prev) =>
        prev.map((bot) =>
          bot.name === botName && bot.isRunning
            ? { ...bot, progress: Math.min(currentProgress, 100) }
            : bot
        )
      );
    }, 500); // Her 500ms'de bir güncelle

    return interval;
  };

  const runBot = async (botName: string): Promise<boolean> => {
    const raw = localStorage.getItem("authToken");
    const token = raw?.replace(/^Bearer\s+/, "");

    updateBotState(botName, true, 5);
    setLogModal({ isOpen: true, botName });
    console.log("🪪 TOKEN:", token);

    const progressInterval = simulateProgress(botName);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/start-${botName.toLowerCase()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ bot_name: botName.toLowerCase() }),
        }
      );
      console.log("TOKEN:", token);
      const data = await response.json();

      if (!response.ok || !data || data.status !== "success") {
        throw new Error(data?.message || "Bot başlatılamadı");
      }

      // İşlem başarılı, progress'i tamamla
      clearInterval(progressInterval);
      updateBotState(botName, false, 100);

      // Başarı bildirimi göster
      await MySwal.fire({
        icon: "success",
        title: `${botName} botu başarıyla tamamlandı!`,
        timer: 1500,
        showConfirmButton: false,
      });

      // Detay botu için sor
      const { isConfirmed } = await MySwal.fire({
        title: `${botName} detay botu da başlatılsın mı?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Evet, başlat",
        cancelButtonText: "Hayır",
      });

      if (isConfirmed) await runDetailBotManually(botName);
      return true;
    } catch (error: any) {
      clearInterval(progressInterval);
      console.error(`🚨 ${botName} bot başlatma hatası:`, error.message);
      await MySwal.fire({
        icon: "error",
        title: `${botName} botu başlatılamadı`,
        text: error.message,
      });
      updateBotState(botName, false, 0);
      return false;
    }
  };

  const runDetailBotManually = async (botName: string): Promise<boolean> => {
  const raw = localStorage.getItem("authToken");
  const token = raw?.replace(/^Bearer\s+/, "");

  updateBotState(botName, true, 5);

  // ✅ BotLogModal'a doğru dosya adını ilet
  setLogModal({ isOpen: true, botName: `${botName}-detail` });

  console.log("🪪 TOKEN:", token);

  const progressInterval = simulateProgress(botName);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/start-${botName.toLowerCase()}-detail`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ bot_name: botName.toLowerCase() }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data || data.status !== "success") {
      throw new Error(data?.message || "Detay bot başlatılamadı");
    }

    clearInterval(progressInterval);
    updateBotState(botName, false, 100);

    await MySwal.fire({
      icon: "success",
      title: `${botName} detay botu başarıyla tamamlandı!`,
      timer: 1500,
      showConfirmButton: false,
    });

    return true;
  } catch (error: any) {
    clearInterval(progressInterval);
    console.error(`🚨 ${botName} detay bot hatası:`, error.message);
    await MySwal.fire({
      icon: "error",
      title: `${botName} detay botu başlatılamadı`,
      text: error.message,
    });
    updateBotState(botName, false, 0);
    return false;
  }
};


  const stopBot = async (botName: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_BASE_URL}/api/stop-${botName.toLowerCase()}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        updateBotState(botName, false, 0);
        await MySwal.fire({
          icon: "info",
          title: `${botName} botu durduruldu`,
          timer: 1500,
          showConfirmButton: false,
        });
      }
    } catch (error) {
      console.error("Bot durdurma hatası:", error);
      await MySwal.fire({
        icon: "error",
        title: "Bot durdurulamadı",
        text: "Bir hata oluştu",
      });
    }
  };

  const editSearchTerms = async () => {
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${API_BASE_URL}/api/terms`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const { value: updatedTerms } = await MySwal.fire({
        title: "Arama Kelimeleri",
        input: "textarea",
        inputValue: data.terms.join("\n"),
        inputAttributes: {
          rows: "10",
          style: "min-height:200px",
        },
        showCancelButton: true,
        confirmButtonText: "Kaydet",
        cancelButtonText: "İptal",
        preConfirm: async (value) => {
          const updatedList = value
            .split("\n")
            .map((term) => term.trim())
            .filter((term) => term !== "");
          const saveRes = await fetch(`${API_BASE_URL}/api/terms`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ terms: updatedList }),
          });

          const result = await saveRes.json();
          if (!result.success) throw new Error(result.message);
          return result;
        },
      });

      if (updatedTerms) {
        await MySwal.fire(
          "✅ Başarılı",
          "Arama kelimeleri güncellendi.",
          "success"
        );
      }
    } catch (err: any) {
      await MySwal.fire("❌ Hata", err.message || "Bir hata oluştu.", "error");
    }
    console.log("TOKEN:", token);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Pazaryeri botlarınızı yönetin ve durumlarını takip edin
          </p>
        </div>
        <button
          onClick={editSearchTerms}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Arama Kelimeleri
        </button>
      </div>

      <BotControlPanel
        bots={bots}
        runBot={runBot}
        runDetailBot={runDetailBotManually}
        stopBot={stopBot}
      />

      {/* Log Modal */}
      <BotLogModal
        botName={logModal.botName}
        isOpen={logModal.isOpen}
        onClose={() => setLogModal({ isOpen: false, botName: "" })}
      />
    </div>
  );
}
