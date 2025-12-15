// src/components/ChatWidget.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Headset, Trash2 } from 'lucide-react'; 
import './css/ChatWidget.css';

export default function ChatWidget() {
  const { user } = useAuth();
  
  const { fetchData: refreshNotifications } = useContext(NotificationContext);
  
  const { 
    isOpen, setIsOpen, 
    view, setView, 
    chatPartner, setChatPartner 
  } = useChat();
  
  const [trainer, setTrainer] = useState(null);
  const [clients, setClients] = useState([]);
  const [supportAgent, setSupportAgent] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadByUser, setUnreadByUser] = useState({});
  
  const messagesEndRef = useRef(null);
  const chatIntervalRef = useRef(null);
  const notifyIntervalRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const initData = async () => {
      try {
        const supportRes = await api.get('/users/support-agent').catch(() => ({ data: null }));
        setSupportAgent(supportRes.data);

        if (user.role === 'client' && user.trainerAssigned) {
          const res = await api.get(`/users/trainers/${user.trainerAssigned}`);
          setTrainer(res.data);
          if (!chatPartner) setChatPartner(res.data);
          
          // --- CORREÇÃO AQUI ---
          // Verifica se está na vista 'list' (padrão) e força a ida para 'chat'
          if (view === 'list') setView('chat'); 
          // ---------------------

        } else if (user.role === 'trainer') {
          const res = await api.get('/users/my-clients');
          setClients(res.data);

        } else if (user.role === 'admin') {
          const res = await api.get('/messages/conversations');
          setClients(res.data); 
        }
        
        checkUnread();
      } catch (err) {
        console.error(err);
      }
    };

    initData();
    notifyIntervalRef.current = setInterval(checkUnread, 5000);
    return () => clearInterval(notifyIntervalRef.current);
  }, [user]);

  // Recarrega lista para Admin periodicamente
  useEffect(() => {
    if (user?.role === 'admin' && isOpen && view === 'list') {
        const interval = setInterval(async () => {
            try {
                const res = await api.get('/messages/conversations');
                setClients(res.data);
            } catch(e) {}
        }, 5000);
        return () => clearInterval(interval);
    }
  }, [user, isOpen, view]);

  const checkUnread = async () => {
    if (!user) return;
    try {
      const res = await api.get('/messages/unread');
      const { total, byUser } = res.data;
      setUnreadTotal(total);
      setUnreadByUser(byUser);
    } catch (err) {
      console.error("Erro checkUnread", err);
    }
  };

  useEffect(() => {
    if (isOpen && view === 'chat' && chatPartner) {
      fetchMessagesAndRead();
      chatIntervalRef.current = setInterval(fetchMessagesAndRead, 3000);
    } else {
      if (chatIntervalRef.current) clearInterval(chatIntervalRef.current);
    }
    return () => clearInterval(chatIntervalRef.current);
  }, [isOpen, view, chatPartner]);

  useEffect(() => {
    if (isOpen && view === 'chat') {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, view]);

  const fetchMessagesAndRead = async () => {
    if (!chatPartner) return;
    try {
      const res = await api.get(`/messages/${chatPartner._id}`);
      setMessages(res.data);

      if (unreadByUser[chatPartner._id]) {
        await api.put(`/messages/read/${chatPartner._id}`);
        setUnreadTotal(prev => Math.max(0, prev - unreadByUser[chatPartner._id].count));
        setUnreadByUser(prev => {
          const newState = { ...prev };
          delete newState[chatPartner._id];
          return newState;
        });
        refreshNotifications(); 
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatPartner) return;
    try {
      const res = await api.post('/messages', { to: chatPartner._id, text: newMessage });
      setMessages([...messages, res.data]);
      setNewMessage('');
      
      if (user.role === 'admin') {
         const conversationsRes = await api.get('/messages/conversations');
         setClients(conversationsRes.data);
      }
    } catch (err) {
      toast.error('Erro ao enviar.');
    }
  };

  // --- FUNÇÃO: ELIMINAR CONVERSA ---
  const handleDeleteConversation = async () => {
    if (!chatPartner) return;
    if (!window.confirm("Tens a certeza que queres eliminar esta conversa? O histórico desaparecerá apenas para ti.")) return;

    try {
        await api.delete(`/messages/conversation/${chatPartner._id}`);
        setMessages([]); // Limpa visualmente
        toast.success("Conversa eliminada.");
        
        // Se for admin ou estiver na vista de lista, atualiza a lista
        if (user.role === 'admin' || view === 'list') {
            const conversationsRes = await api.get('/messages/conversations');
            setClients(conversationsRes.data);
        }
        
        // Se formos admin/treinador, voltamos para a lista. Cliente mantém-se mas vazio.
        if (user.role !== 'client') {
            setView('list');
            setChatPartner(null);
        }

    } catch (err) {
        console.error(err);
        toast.error("Erro ao eliminar conversa.");
    }
  };
  // -------------------------------------

  const handleClientSelect = (client) => {
    setChatPartner(client);
    setView('chat');
  };

  const openSupportChat = () => {
    if (supportAgent) {
        setChatPartner(supportAgent);
        setView('chat');
    } else {
        toast.error("Serviço de suporte indisponível.");
    }
  };

  if (!user) return null;

  if (!isOpen) {
    const hasUnread = unreadTotal > 0;
    return (
      <div className={`chat-widget-bubble ${hasUnread ? 'unread' : ''}`} onClick={() => setIsOpen(true)}>
        {hasUnread && <div className="unread-badge">{unreadTotal}</div>}
        {user.role === 'client' && trainer ? (
            <img src={trainer.profile?.avatarUrl || '/images/default-avatar.jpg'} alt="PT" className="chat-bubble-avatar" />
        ) : (
          user.role === 'admin' ? (
             <Headset size={24} /> 
          ) : (
             <span className="chat-bubble-count">{clients.length || 0}</span>
          )
        )}
      </div>
    );
  }

  const isChattingWithSupport = chatPartner && supportAgent && chatPartner._id === supportAgent._id;

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
            {view === 'chat' && (user.role === 'trainer' || user.role === 'admin' || isChattingWithSupport) ? (
            <button className="chat-back-btn" onClick={() => {
                if (user.role === 'client') {
                    setChatPartner(trainer);
                } else {
                    setView('list');
                    setChatPartner(null);
                }
            }}>←</button>
            ) : null}
            
            <span>{user.role === 'admin' ? 'Suporte Admin' : 'FitChat'}</span>
        </div>
        
        <h4 style={{flex:1, textAlign:'center', margin:0, fontSize:'0.95rem', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
          {view === 'chat' && chatPartner 
            ? (chatPartner.profile?.name || chatPartner.username) 
            : (user.role === 'admin' ? 'Tickets Abertos' : 'Meus Clientes')}
        </h4>

        <div style={{display:'flex', alignItems:'center'}}>
            {/* Botão de Suporte (para não admins) */}
            {user.role !== 'admin' && !isChattingWithSupport && view !== 'list' && (
                <button onClick={openSupportChat} className="support-btn" title="Falar com Suporte">
                    <Headset size={18} />
                </button>
            )}
            
            {user.role === 'trainer' && view === 'list' && (
                 <button onClick={openSupportChat} className="support-btn" title="Falar com Suporte">
                    <Headset size={18} />
                 </button>
            )}

            {/* BOTÃO DE ELIMINAR CONVERSA (Apenas quando estamos num chat ativo) */}
            {view === 'chat' && chatPartner && (
                <button onClick={handleDeleteConversation} className="support-btn delete-chat-btn" title="Eliminar Conversa">
                    <Trash2 size={18} />
                </button>
            )}

            <button className="chat-close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>
      </div>

      {(view === 'list' && (user.role === 'trainer' || user.role === 'admin')) && (
        <div className="client-list">
          {clients.length === 0 && (
             <p style={{padding:'20px', textAlign:'center', color:'#888'}}>
                 {user.role === 'admin' ? 'Sem conversas iniciadas.' : 'Sem clientes atribuídos.'}
             </p>
          )}
          {clients.map(client => {
            const count = unreadByUser[client._id]?.count || 0;
            return (
              <div key={client._id} className="client-item" onClick={() => handleClientSelect(client)}>
                <div style={{display:'flex', alignItems:'center'}}>
                  <img src={client.profile?.avatarUrl || '/images/default-avatar.jpg'} alt="" className="client-avatar-small" />
                  <div className="client-info">
                    <span style={{marginLeft: '10px'}}>{client.profile?.name || client.username}</span>
                    {user.role === 'admin' && (
                        <div style={{fontSize:'0.75rem', color:'#888', marginLeft:'10px', whiteSpace:'nowrap', overflow:'hidden', maxWidth:'120px'}}>
                            {client.lastMessage ? client.lastMessage : '...'}
                        </div>
                    )}
                  </div>
                </div>
                {count > 0 && <div className="client-unread-dot" />}
              </div>
            );
          })}
        </div>
      )}

      {view === 'chat' && (
        <>
          <div className="messages-area">
            {messages.length === 0 && <p style={{textAlign:'center', color:'var(--text-muted)', fontSize:'0.8rem', marginTop:'20px'}}>Início da conversa.</p>}
            {messages.map((msg, idx) => {
              const isMine = msg.from._id === user._id || msg.from === user._id;
              return (
                <div key={idx} className={`message-bubble ${isMine ? 'message-sent' : 'message-received'}`}>
                  {msg.text}
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSendMessage}>
            <input 
              value={newMessage} 
              onChange={e => setNewMessage(e.target.value)} 
              placeholder="Escreve aqui..." 
              disabled={!chatPartner}
            />
            <button type="submit" className="chat-send-btn" disabled={!newMessage.trim()}>➤</button>
          </form>
        </>
      )}
    </div>
  );
}