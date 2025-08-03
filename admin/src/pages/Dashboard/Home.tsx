import React, { useState } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import BotControlPanel from "../../components/ecommerce/BotControlPanel";

const MySwal = withReactContent(Swal);

interface BotStatus {
  name: string;
  isRunning: boolean;
  lastRun?: string;
  progress?: number;
}

export default function Home() {
  const [bots, setBots] = useState<BotStatus[]>([
    { name: 'Avansas', isRunning: false, lastRun: '2 saat önce', progress: 0 },
    { name: 'Hepsiburada', isRunning: false, lastRun: '1 saat önce', progress: 0 },
    { name: 'n11', isRunning: false, lastRun: '30 dk önce', progress: 0 },
    { name: 'Trendyol', isRunning: false, lastRun: '15 dk önce', progress: 0 }
  ]);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

  const runBot = async (botName: string): Promise<boolean> => {
    const token = localStorage.getItem("authToken");

    try {
      const response = await fetch(`${API_BASE_URL}/api/start-${botName.toLowerCase()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ bot_name: botName.toLowerCase() })
      });

      const data = await response.json();

      if (!response.ok || !data || data.status !== "success") {
        throw new Error(data?.message || "Bot başlatılamadı");
      }

      console.log(`✅ ${botName} botu başarıyla başlatıldı.`);

      // Detay bot sorusu
      const { isConfirmed } = await Swal.fire({
        title: `${botName} detay botu da başlatılsın mı?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Evet, başlat",
        cancelButtonText: "Hayır",
      });

      if (isConfirmed) {
        const detailResponse = await fetch(`${API_BASE_URL}/api/start-${botName.toLowerCase()}-detail`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ bot_name: botName.toLowerCase() })
        });

        const detailData = await detailResponse.json();

        if (!detailResponse.ok || !detailData || detailData.status !== "success") {
          throw new Error("Detay bot başlatılamadı");
        }

        Swal.fire({
          icon: "success",
          title: `${botName} detay botu başlatıldı.`,
          timer: 1500,
          showConfirmButton: false,
        });
      }

      return true;
    } catch (error: any) {
      console.error(`🚨 ${botName} bot başlatma hatası:`, error.message);
      Swal.fire({
        icon: "error",
        title: `${botName} botu başlatılamadı`,
        text: error.message,
      });
      return false;
    }
  };

  const stopBot = async (botName: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_BASE_URL}/api/stop-${botName.toLowerCase()}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setBots(prev => prev.map(bot =>
          bot.name === botName
            ? { ...bot, isRunning: false, progress: 0 }
            : bot
        ));
      }
    } catch (error) {
      console.error('Bot durdurma hatası:', error);
    }
  };

  const editSearchTerms = async () => {
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${API_BASE_URL}/api/terms`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);

      const { value: updatedTerms } = await MySwal.fire({
        title: 'Arama Kelimeleri',
        input: 'textarea',
        inputValue: data.terms.join('\n'),
        inputAttributes: {
          rows: '10',
          style: 'min-height:200px'
        },
        showCancelButton: true,
        confirmButtonText: 'Kaydet',
        cancelButtonText: 'İptal',
        preConfirm: async (value) => {
          const updatedList = value.split('\n').map(term => term.trim()).filter(term => term !== "");
          const saveRes = await fetch(`${API_BASE_URL}/api/terms`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ terms: updatedList })
          });

          const result = await saveRes.json();
          if (!result.success) throw new Error(result.message);
          return result;
        }
      });

      if (updatedTerms) {
        MySwal.fire('✅ Başarılı', 'Arama kelimeleri güncellendi.', 'success');
      }

    } catch (err: any) {
      MySwal.fire('❌ Hata', err.message || 'Bir hata oluştu.', 'error');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Pazaryeri botlarınızı yönetin ve durumlarını takip edin</p>
        </div>
        <button
          onClick={editSearchTerms}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Arama Kelimeleri
        </button>
      </div>

      <BotControlPanel bots={bots} runBot={runBot} stopBot={stopBot} />
    </div>
  );
}
