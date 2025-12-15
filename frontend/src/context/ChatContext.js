// src/context/ChatContext.js
import React, { createContext, useState, useContext } from 'react';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('list');
  const [chatPartner, setChatPartner] = useState(null);

  // Função para abrir o chat diretamente com um utilizador
  const openChatWith = (userPartial) => {
    setChatPartner(userPartial); 
    setView('chat');
    setIsOpen(true);
  };

  const closeChat = () => setIsOpen(false);

  return (
    <ChatContext.Provider value={{
      isOpen, setIsOpen,
      view, setView,
      chatPartner, setChatPartner,
      openChatWith,
      closeChat
    }}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);