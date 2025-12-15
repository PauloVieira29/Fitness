// src/context/NotificationContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';
import { useChat } from './ChatContext'; // Importar ChatContext
import { toast } from 'react-toastify';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { openChatWith } = useChat(); // Usar hook do chat
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [settings, setSettings] = useState({ messages: true, plans: true, system: true });

  const fetchData = async () => {
    if (!user) return;
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data);
      setUnreadCount(res.data.filter(n => !n.isRead).length);
      
      if (user.notificationSettings) {
        setSettings(user.notificationSettings);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling a cada 10s
    return () => clearInterval(interval);
  }, [user]);

  // Efeito para detetar NOVA notificação e lançar Toast customizado
  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[0];
      // Se foi criado nos últimos 12 segundos (margem segura)
      const isRecent = (new Date() - new Date(latest.createdAt)) < 12000; 
      
      // Só mostra se ainda não foi lida e se é recente
      if (isRecent && !latest.isRead && !latest.toastShown) {
         latest.toastShown = true; // Flag local para evitar repetição
         
         if (latest.type === 'alert') {
            // TOAST DE ALERTA COM AÇÃO (Amarelo/Laranja)
            toast.warn(
              <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                <span style={{fontWeight:'bold'}}>{latest.content}</span>
                {latest.relatedId && (
                  <button 
                    onClick={() => {
                       openChatWith({ _id: latest.relatedId });
                       markAsRead(latest._id);
                    }}
                    style={{
                      background: '#333', color:'white', border:'none', 
                      padding:'6px 12px', borderRadius:'4px', cursor:'pointer', fontSize:'0.85rem',
                      alignSelf: 'flex-start'
                    }}
                  >
                    Responder ao Treinador
                  </button>
                )}
              </div>, 
              { 
                autoClose: 8000,
                position: "top-center", // Destaque no topo
                icon: "⚠️"
              }
            );
         } else if (settings.system && latest.type !== 'alert') {
            // Toasts normais de sistema/mensagens
            toast.info(latest.content);
         }
      }
    }
  }, [notifications, settings, openChatWith]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) { console.error(err); }
  };

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, fetchData, markAsRead, settings }}>
      {children}
    </NotificationContext.Provider>
  );
};