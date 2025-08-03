import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface Notification {
  id: number;
  user_id: number;
  bot_name: string;
  bot_type: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  message: string;
  details?: any;
  read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (notificationId: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  checkBotStatus: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5050";

  // Bot durumlarını kontrol et
  useEffect(() => {
    const interval = setInterval(() => {
      checkBotStatus();
    }, 10000); // Her 10 saniyede kontrol et

    // İlk yükleme
    checkBotStatus();

    return () => clearInterval(interval);
  }, []);

  const checkBotStatus = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/bot-logs`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotifications(data.notifications);
          setUnreadCount(data.unreadCount);
        }
      }
    } catch (error) {
      console.error("Bot status check failed:", error);
    }
  };

  const markAsRead = async (notificationId: number): Promise<void> => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`${API_BASE_URL}/api/bots/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Local state güncelle
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Mark as read failed:", error);
    }
  };

  const markAllAsRead = async (): Promise<void> => {
    try {
      const token = localStorage.getItem("authToken");
      await fetch(`${API_BASE_URL}/api/bots/notifications/read-all`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Mark all as read failed:", error);
    }
  };

  const addNotification = (notification: Notification): void => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
  };

  const value: NotificationContextType = {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    checkBotStatus
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};