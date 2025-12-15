// src/pages/TrainerHome.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Users, FileText, Activity, ArrowRight } from 'lucide-react'; 
import './css/TrainerHome.css';

export default function TrainerHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    clientCount: 0,
    templateCount: 0,
    totalPlansPrescribed: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [clientsRes, templatesRes, plansRes, profileRes] = await Promise.all([
          api.get('/users/my-clients'),
          api.get('/plan-templates'),
          api.get('/trainers/plans'), // Fallback (planos ativos)
          api.get(`/users/trainers/${user._id}`).catch(() => ({ data: {} })) // Perfil com histórico
        ]);
        
        // Contagem de planos ativos (backup)
        const activePlansCount = (plansRes.data || []).length;

        // Histórico real da base de dados
        const historicalTotal = profileRes.data?.profile?.totalPlans || 0;

        // Usa o maior valor (para não mostrar 0 se o histórico for novo mas já existirem planos ativos)
        const displayTotal = Math.max(historicalTotal, activePlansCount);

        setStats({
          clientCount: clientsRes.data.length,
          templateCount: templatesRes.data.length,
          totalPlansPrescribed: displayTotal
        });
      } catch (err) {
        console.error("Erro ao carregar dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user._id]);

  if (loading) {
    return <div className="container py-20 text-center">A carregar o teu painel...</div>;
  }

  return (
    <div className="trainer-home-page">
      {/* Hero Section */}
      <section className="hero-trainer-home">
        <div className="container">
          <div className="welcome-card-trainer">
            <h1>Olá, <span>{user.profile?.name || user.username}</span>!</h1>
            <p>Tens <strong>{stats.clientCount} clientes</strong> ativos e já prescreveste <strong>{stats.totalPlansPrescribed} planos de treino</strong> no total.</p>
            
            <div className="quick-actions-trainer">
              <Link to="/trainers" className="btn btn-primary-white">
                <Users size={18} />
                Gerir Clientes
              </Link>
              <Link to="/planos" className="btn btn-outline-white">
                <FileText size={18} />
                Meus Templates
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Dashboard Grid */}
      <section className="container py-20">
        <h2 className="section-title">Visão Geral</h2>
        <div className="dashboard-grid">
          
          {/* Card Clientes */}
          <Link to="/trainers" className="dashboard-card">
            <div className="icon-box blue">
              <Users size={28} />
            </div>
            <div className="card-info">
              <h3>{stats.clientCount}</h3>
              <p>Clientes Ativos</p>
            </div>
            <div className="card-arrow">
              <ArrowRight size={20} />
            </div>
          </Link>

          {/* Card Templates */}
          <Link to="/planos" className="dashboard-card">
            <div className="icon-box green">
              <FileText size={28} />
            </div>
            <div className="card-info">
              <h3>{stats.templateCount}</h3>
              <p>Templates Criados</p>
            </div>
            <div className="card-arrow">
              <ArrowRight size={20} />
            </div>
          </Link>

          {/* Card Planos Prescritos (Histórico) */}
          <div className="dashboard-card static" title="Total acumulado de planos atribuídos">
            <div className="icon-box purple">
              <Activity size={28} />
            </div>
            <div className="card-info">
              <h3>{stats.totalPlansPrescribed}</h3>
              <p>Planos Prescritos</p>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}