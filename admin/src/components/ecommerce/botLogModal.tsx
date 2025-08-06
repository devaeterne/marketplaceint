import React, { useState, useEffect, useRef } from "react";
import { X, Terminal, ChevronDown, ChevronUp, Trash2, Download } from "lucide-react";

interface BotLogModalProps {
  botName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BotLogModal({ botName, isOpen, onClose }: BotLogModalProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const normalizedBotName = botName.toLowerCase(); // ✅ normalize once

  useEffect(() => {
    if (isOpen) {
      const token = localStorage.getItem("authToken");
      const eventSource = new EventSource(
        `${import.meta.env.VITE_API_URL}/api/bot-logs/stream/${normalizedBotName}?token=${token}`
      );

      eventSource.onmessage = (event) => {
  try {
    const data = JSON.parse(event.data);
    setLogs(prev => [...prev, `[${data.timestamp}] ${data.level}: ${data.message}`]);
  } catch (err) {
    console.error("SSE parse hatası:", event.data);
  }
};

      eventSource.onerror = (error) => {
        console.error("SSE Error:", error);
        setLogs(prev => [...prev, "[ERROR] Log bağlantısı koptu"]);
        setTimeout(() => {
          eventSource.close();
          fetchExistingLogs();
        }, 5000);
      };

      eventSourceRef.current = eventSource;

      fetchExistingLogs();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [isOpen, normalizedBotName]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const fetchExistingLogs = async () => {
    try {
      const rawToken = localStorage.getItem("authToken") || "";
      const token = rawToken.replace(/^Bearer\s/, "");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/bot-logs/${normalizedBotName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Log yükleme hatası:", err);
    }
  };

  const clearLogs = async () => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(
        `${import.meta.env.VITE_API_URL}/api/bot-logs/${normalizedBotName}/clear`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setLogs([]);
    } catch (err) {
      console.error("Log temizleme hatası:", err);
    }
  };

  const downloadLogs = () => {
    const logsText = logs.join("\n");
    const blob = new Blob([logsText], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${normalizedBotName}_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed ${isMinimized ? 'bottom-0 right-4' : 'inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50'}`}>
      <div className={`bg-gray-900 rounded-lg shadow-2xl transition-all duration-300 ${
        isMinimized ? 'w-96 h-12' : 'w-full max-w-4xl max-h-[80vh] flex flex-col'
      }`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-700 cursor-pointer"
             onClick={() => setIsMinimized(!isMinimized)}>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">{botName} Bot Logları</h3>
            {isMinimized && (
              <span className="text-xs text-gray-400">
                ({logs.length} satır)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!isMinimized && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearLogs();
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-red-400"
                  title="Logları Temizle"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadLogs();
                  }}
                  className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-blue-400"
                  title="Logları İndir"
                >
                  <Download className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
            >
              {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    Log bekleniyor...
                  </div>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, index) => {
                      let colorClass = "text-gray-300";
                      if (log.includes("[ERROR]") || log.includes("❌")) {
                        colorClass = "text-red-400";
                      } else if (log.includes("[WARN]") || log.includes("⚠️")) {
                        colorClass = "text-yellow-400";
                      } else if (log.includes("[INFO]") || log.includes("✅")) {
                        colorClass = "text-green-400";
                      } else if (log.includes("🔍") || log.includes("📊")) {
                        colorClass = "text-blue-400";
                      }

                      return (
                        <div key={index} className={`${colorClass} break-all`}>
                          {log}
                        </div>
                      );
                    })}
                    <div ref={logsEndRef} />
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 border-t border-gray-700 flex items-center justify-between">
              <div className="text-xs text-gray-400">
                {logs.length} satır • {autoScroll ? "Otomatik kaydırma açık" : "Otomatik kaydırma kapalı"}
              </div>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={`text-xs px-3 py-1 rounded ${
                  autoScroll 
                    ? "bg-green-600 text-white" 
                    : "bg-gray-700 text-gray-300"
                }`}
              >
                {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
