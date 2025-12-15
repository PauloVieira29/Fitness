// src/pages/Home.js
import React from 'react';
import { useAuth } from '../context/AuthContext';
import AdminPanel from './AdminPanel';
import ClientHome from './ClientHome'; // antigo HomeLoggedIn renomeado

export default function Home() {
  const { user } = useAuth();

  // ADMIN → vai direto para o painel de administração
  if (user?.role === 'admin') {
    return <AdminPanel />;
  }

  // CLIENT ou TRAINER → home normal
  return <ClientHome />;
}