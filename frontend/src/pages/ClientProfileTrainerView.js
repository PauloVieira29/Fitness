// src/pages/ClientProfileTrainerView.js
import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { NotificationContext } from '../context/NotificationContext';
import { toast } from 'react-toastify';
import { Calendar, Zap, Trash2, AlertTriangle, ChevronUp, ChevronDown, Loader2, BarChart2, BellRing } from 'lucide-react'; // <--- BellRing adicionado
import './css/ClientProfileTrainerView.css';

export default function ClientProfileTrainerView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { settings } = useContext(NotificationContext);

  const [client, setClient] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(null);
  const [expandedDays, setExpandedDays] = useState({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [clientRes, templatesRes, planRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get('/plan-templates'),
          api.get(`/plans/client/${id}`)
        ]);
        setClient(clientRes.data);
        setTemplates(templatesRes.data);
        setCurrentPlan(planRes.data || null);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const applyTemplate = async () => {
    if (!selectedTemplate) return toast.warn('Escolhe um template primeiro');
    setApplying(true);
    try {
      const res = await api.post('/plans/from-template', {
        clientId: id,
        templateId: selectedTemplate
      });
      setCurrentPlan(res.data.plan);
      if (settings?.system) toast.success('Template aplicado com sucesso!');
      setSelectedTemplate('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao aplicar template');
    } finally {
      setApplying(false);
    }
  };

  // --- NOVA FUNÇÃO: Enviar alerta manual ---
  const sendAlert = async () => {
    try {
        await api.post('/trainers/alert-client', {
            clientId: id,
            message: "⚠️ Estás a faltar aos treinos. Precisas de ajuda ou motivação?"
        });
        toast.success("Alerta de falta enviado ao cliente.");
    } catch (err) {
        toast.error("Erro ao enviar alerta.");
    }
  };

  const handleRemoveClick = () => setShowDeleteModal(true);

  const confirmRemovePlan = async () => {
    try {
      await api.delete(`/plans/client/${id}`);
      setCurrentPlan(null);
      setShowDeleteModal(false);
      if (settings?.system) toast.success('Plano removido com sucesso!');
    } catch (err) {
      toast.error('Erro ao remover o plano');
    }
  };

  const toggleDay = (index) => {
    setExpandedDays(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (loading) return <div className="loading-screen">A carregar perfil...</div>;
  if (!client) return <div className="error">Cliente não encontrado</div>;

  return (
    <div className="client-profile-trainer">
      <Link to="/trainers" className="back-button">← Voltar aos clientes</Link>

      <div className="profile-header">
        <div className="avatar-wrapper">
          <img src={client.profile?.avatarUrl || '/images/default-avatar.jpg'} alt={client.profile?.name} className="avatar" />
        </div>
        <div className="name-info">
          <h1>{client.profile?.name || client.username}</h1>
          <p className="username">@{client.username}</p>
        </div>
      </div>

      <div className="profile-content">
        {/* Informações Básicas */}
        <div className="info-card">
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem', flexWrap:'wrap', gap:'10px'}}>
             <h2>Informações do Cliente</h2>
             
             <div style={{display:'flex', gap:'10px'}}>
                 {/* BOTÃO DE ALERTA */}
                 <button onClick={sendAlert} className="btn-outline small flex-center gap-2" style={{borderColor:'#f59e0b', color:'#f59e0b'}}>
                    <BellRing size={16}/>
                    Alertar Falta
                 </button>

                 <button onClick={() => navigate(`/client/${id}/dashboard`)} className="btn-outline small flex-center gap-2">
                    <BarChart2 size={16}/>
                    Ver Evolução
                 </button>
             </div>
          </div>
          
          <div className="info-grid">
            <div className="info-item"><span className="label">Email</span><p className="value">{client.profile?.email || '—'}</p></div>
            <div className="info-item"><span className="label">Objetivo</span><p className="value">{client.profile?.goal || '—'}</p></div>
            <div className="info-item"><span className="label">Peso</span><p className="value">{client.profile?.weight ? `${client.profile.weight} kg` : '—'}</p></div>
            <div className="info-item"><span className="label">Altura</span><p className="value">{client.profile?.height ? `${client.profile.height} cm` : '—'}</p></div>
          </div>
        </div>

        {/* Plano de Treino */}
        <div className="plans-card" style={{marginTop:'2rem'}}>
          <div className="plans-header">
            <h2><Calendar size={28} /> Plano de Treino Atual</h2>
          </div>

          <div className="apply-section">
            <h3>Aplicar Template Pré-Feito</h3>
            <div className="template-selector">
              <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="template-select">
                <option value="">Escolher template...</option>
                {templates.map(t => (
                  <option key={t._id} value={t._id}>{t.name} • {t.weeks} sem.</option>
                ))}
              </select>
              <button onClick={applyTemplate} disabled={!selectedTemplate || applying} className="btn-apply-template">
                {applying ? <Loader2 className="spin" size={18} /> : <Zap size={18} />}
                {applying ? 'A aplicar...' : 'Aplicar'}
              </button>
            </div>
          </div>

          {currentPlan ? (
            <div className="current-plan">
              <div className="plan-info-header">
                <div>
                  <h3>{currentPlan.name || 'Plano Sem Nome'}</h3>
                  <p>{currentPlan.weeks} semanas • {currentPlan.sessionsPerWeek} dias/sem</p>
                </div>
                <button onClick={handleRemoveClick} className="btn-danger"><Trash2 size={18} /> Remover</button>
              </div>
              
              <div className="days-list">
                {currentPlan.days?.map((day, i) => (
                  <div key={i} className="day-card">
                    <div className="day-header" onClick={() => toggleDay(i)}>
                      <strong>{day.dayOfWeek}</strong>
                      <span>{day.exercises?.length || 0} exercícios</span>
                      {expandedDays[i] ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </div>
                    {expandedDays[i] && (
                      <div className="exercises">
                        {day.exercises?.map((ex, idx) => (
                          <div key={idx} className="exercise">
                            <span className="name">{ex.name}</span>
                            <span className="details">{ex.sets}x{ex.reps}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="no-plan"><p>Sem plano ativo.</p></div>
          )}
        </div>
      </div>

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-card delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-danger">
              <AlertTriangle size={32} />
              <h3>Remover Plano</h3>
            </div>
            <p className="modal-text">Tens a certeza? Esta ação é irreversível.</p>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowDeleteModal(false)}>Cancelar</button>
              <button className="btn danger" onClick={confirmRemovePlan}>Sim, Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}