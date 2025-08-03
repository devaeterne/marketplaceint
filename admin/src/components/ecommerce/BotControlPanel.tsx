// === admin/src/components/ecommerce/BotControlPanel.tsx ===
import React, { useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";

interface BotStatus {
  name: string;
  isRunning: boolean;
  lastRun?: string;
  progress?: number;
}

interface BotControlPanelProps {
  bots: BotStatus[];
  runBot: (botName: string) => Promise<boolean>;
  stopBot: (botName: string) => void;
}

const BotControlPanel: React.FC<BotControlPanelProps> = ({ bots, runBot, stopBot }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDropdown = () => setIsOpen(!isOpen);
  const closeDropdown = () => setIsOpen(false);

  const getBotIcon = (botName: string) => {
    const logoPath = `/images/botlogo/${botName.toLowerCase()}.svg`;

    return (
      <div className="w-12 h-12 rounded-full flex items-center justify-center bg-white border border-gray-200 dark:border-gray-700 shadow-sm">
        <img
          src={logoPath}
          alt={`${botName} Logo`}
          className="w-8 h-8 object-contain"
          onError={(e) => {
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
            target.parentElement!.innerHTML = `
              <div class='w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center'>
                <span class='text-gray-600 text-xs font-bold'>${botName.charAt(0)}</span>
              </div>
            `;
          }}
        />
      </div>
    );
  };

  const getRunningBotsCount = () => bots.filter(bot => bot.isRunning).length;
  const getTotalBots = () => bots.length;

  const handleStart = async (botName: string) => {
    const success = await runBot(botName);
    if (success) {
      const wantsDetail = confirm(`${botName} detay botunu da başlatmak ister misiniz?`);
      if (wantsDetail) {
        const detailName = `${botName}-detail`.toLowerCase();
        await runBot(detailName);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-100 dark:border-gray-800 dark:bg-white/[0.03] mb-6">
      <div className="px-5 pt-5 bg-white shadow-default rounded-2xl pb-6 dark:bg-gray-900 sm:px-6 sm:pt-6">
        <div className="flex justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Bot Kontrol Paneli</h3>
            <p className="mt-1 text-gray-500 text-sm dark:text-gray-400">Pazaryeri botlarını yönet ve çalıştır</p>
          </div>
          <div className="relative inline-block">
            <button className="dropdown-toggle p-2 hover:bg-gray-100 rounded-lg dark:hover:bg-gray-800" onClick={toggleDropdown}>
              <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
            <Dropdown isOpen={isOpen} onClose={closeDropdown} className="w-48 p-2 mt-2">
              <DropdownItem onItemClick={closeDropdown} className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 px-3 py-2">
                Tüm Logları Görüntüle
              </DropdownItem>
              <DropdownItem onItemClick={closeDropdown} className="flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300 px-3 py-2">
                Bot Ayarları
              </DropdownItem>
            </Dropdown>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {bots.map((bot) => (
            <div key={bot.name} className="relative">
              <div className={`p-4 rounded-xl border-2 transition-all ${
                bot.isRunning ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20' : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  {getBotIcon(bot.name)}
                  <div className="flex items-center space-x-2">
                    {bot.isRunning ? (
                      <button onClick={() => stopBot(bot.name)} className="px-3 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-full hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors">
                        Durdur
                      </button>
                    ) : (
                      <button onClick={() => handleStart(bot.name)} className="px-3 py-1 text-xs font-medium text-green-600 bg-green-100 rounded-full hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 transition-colors">
                        Başlat
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{bot.name}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{bot.isRunning ? 'Çalışıyor...' : `Son çalışma: ${bot.lastRun}`}</p>
                </div>

                {bot.isRunning && (
                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                      <div className="bg-green-600 h-2 rounded-full transition-all duration-300" style={{ width: `${bot.progress || 0}%` }}></div>
                    </div>
                  </div>
                )}

                {bot.isRunning && (
                  <div className="absolute top-2 right-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BotControlPanel;
