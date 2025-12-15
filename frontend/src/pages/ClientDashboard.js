// src/pages/ClientDashboard.js
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ClientDashboardStats from '../components/ClientDashboardStats';
import { ArrowLeft } from 'lucide-react';
import './css/ClientDashboard.css';

export default function ClientDashboard() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  // Se houver ID na rota (ex: treinador a ver cliente), usa esse.
  // Senão, usa o ID do próprio user logado.
  const targetId = id || user._id;

  return (
    <div className="dashboard-page">
      <div className="container py-10">
        <div className="dashboard-header-page">
          <button onClick={() => navigate(-1)} className="btn-back-page">
            <ArrowLeft size={24} />
            <span>Voltar</span>
          </button>
          
          <div className="header-text">
            <h1>Dashboard de Evolução</h1>
            <p>Análise detalhada de treinos e consistência semanal.</p>
          </div>
        </div>

        {/* Aqui chamamos o componente correto */}
        <ClientDashboardStats clientId={targetId} />
      </div>
    </div>
  );
}