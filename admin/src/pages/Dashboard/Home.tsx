import React, { useEffect, useState } from "react";
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
    { name: 'Avansas', isRunning: false, lastRun: '', progress: 0 },
    { name: 'Hepsiburada', isRunning: false, lastRun: '', progress: 0 },
    { name: 'n11', isRunning: false, lastRun: '', progress: 0 },
    { name: 'Trendyol', isRunning: false, lastRun: '', progress: 0 }
  ]);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

  useEffect(() => {
    fetchLastRunTimes();
  }, []);

  useEffect(() => {
    const runningBots = bots.filter(bot => bot.isRunning);
    if (runningBots.length === 0) return;

    const totalSeconds = 600;
    const updateInterval = 2;
    let elapsed = 0;

    const interval = setInterval(() => {
      elapsed += updateInterval;

      setBots(prev =>
        prev.map(bot =>
          bot.isRunning
            ? {
                ...bot,
                progress: Math.min(99, Math.floor((elapsed / totalSeconds) * 100)),
              }
            : bot
        )
      );

      if (elapsed >= totalSeconds) clearInterval(interval);
    }, updateInterval * 1000);

    return () => clearInterval(interval);
  }, [bots]);

  const formatRelativeTime = (timestamp: string): string => {
    const now = new Date();
    const then = new Date(timestamp);
    const diffMs = now.getTime() - then.getTime();

    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "az önce";
    if (minutes < 60) return `${minutes} dk önce`;
    if (hours < 24) return `${hours} saat önce`;
    if (days < 7) return `${days} gün önce`;

    return then.toLocaleString("tr-TR", {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "2-digit"
    });
  };

  const fetchLastRunTimes = async () => {
    const token = localStorage.getItem("authToken");

    try {
      const res = await fetch(`${API_BASE_URL}/api/bot-logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        throw new Error(`API hatası: ${res.status}`);
      }

      const logs = await res.json();

      const updatedBots = bots.map(bot => {
        const baseBotName = bot.name.toLowerCase();

        const botLogs = logs
          .filter((log: any) =>
            log.bot.toLowerCase() === baseBotName ||
            log.bot.toLowerCase() === `${baseBotName}-detail`
          )
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        const lastLog = botLogs[0];

        return {
          ...bot,
          lastRun: lastLog ? formatRelativeTime(lastLog.timestamp) : ""
        };
      });

      setBots(updatedBots);

    } catch (err) {
      console.error("Bot logları alınamadı:", err);
    }
  };

  const updateBotState = (botName: string, isRunning: boolean, progress: number) => {
    setBots(prev => prev.map(bot =>
      bot.name === botName
        ? { ...bot, isRunning, progress, lastRun: formatRelativeTime(new Date().toISOString()) }
        : bot
    ));
  };

  const runBot = async (botName: string): Promise<boolean> => {
    const token = localStorage.getItem("authToken");
    updateBotState(botName, true, 5);

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

      updateBotState(botName, false, 100);
      await fetchLastRunTimes();

      const confirmResult = await MySwal.fire({
        title: `${botName} detay botu da başlatılsın mı?`,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Evet, başlat",
        cancelButtonText: "Hayır",
      });

      if (confirmResult.isConfirmed) {
        await runDetailBotManually(botName);
      }

      return true;

    } catch (error: any) {
      console.error(`🚨 ${botName} bot başlatma hatası:`, error.message);
      MySwal.fire({ icon: "error", title: `${botName} botu başlatılamadı`, text: error.message });
      updateBotState(botName, false, 0);
      return false;
    }
  };

  const runDetailBotManually = async (botName: string): Promise<boolean> => {
  const token = localStorage.getItem("authToken");
  updateBotState(botName, true, 5);

  try {
    const response = await fetch(`${API_BASE_URL}/api/start-${botName.toLowerCase()}-detail`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ bot_name: botName.toLowerCase() })
    });

    const data = await response.json();

    if (!response.ok || !data || data.status !== "success") {
      throw new Error("Detay bot başlatılamadı");
    }

    updateBotState(botName, false, 100);
    await fetchLastRunTimes();

    MySwal.fire({
      icon: "success",
      title: `${botName} detay botu başlatıldı.`,
      timer: 1500,
      showConfirmButton: false,
    });

    return true;

  } catch (error: any) {
    console.error(`🚨 ${botName} detay bot hatası:`, error.message);
    MySwal.fire({ icon: "error", title: `${botName} detay botu başlatılamadı`, text: error.message });
    updateBotState(botName, false, 0);
    return false;
  }
};

  const stopBot = async (botName: string) => {
    const confirm = await MySwal.fire({
      title: `${botName} botunu durdurmak istiyor musunuz?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Evet, durdur",
      cancelButtonText: "İptal"
    });

    if (!confirm.isConfirmed) return;

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
        updateBotState(botName, false, 0);
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
          const updatedList = value
            .split('\n')
            .map((term:string) => term.trim())
            .filter((term:string) => term !== "");
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

      <BotControlPanel
        bots={bots}
        runBot={runBot}
        runDetailBot={runDetailBotManually}
        stopBot={stopBot}
      />
    </div>
  );
}
