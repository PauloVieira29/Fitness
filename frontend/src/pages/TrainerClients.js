// src/pages/TrainerClients.js
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Toast from '../components/Toast';
import './css/TrainerClients.css';
import '../components/css/Modal.css';

export default function TrainerClients() {
  const [clients, setClients] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // ESTADOS DOS MODAIS E TOAST
  const [toast, setToast] = useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  
  // NOVO: Estado para o Modal de Confirmação (Aceitar/Rejeitar)
  const [confirmModal, setConfirmModal] = useState(null); // { id, action, clientName }

  const fetchData = async () => {
    setLoading(true);
    try {
      const [clientsRes, requestsRes] = await Promise.all([
        api.get('/users/my-clients'),
        api.get('/trainers/requests')
      ]);
      setClients(clientsRes.data);
      setRequests(requestsRes.data || []);
    } catch (err) {
      if (err.response?.status === 404) setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  // 1. Inicia o processo: Abre o modal em vez do window.confirm
  const initiateRequest = (requestId, action, clientName) => {
    setConfirmModal({ id: requestId, action, clientName });
  };

  // 2. Executa a ação quando o utilizador confirma no Modal
  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const { id, action } = confirmModal;

    try {
      await api.post(`/trainers/requests/${id}/resolve`, { action });
      fetchData();
      showToast(action === 'accept' ? 'Pedido aceite com sucesso!' : 'Pedido rejeitado.', 'success');
      setConfirmModal(null); // Fecha o modal
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message;
      setConfirmModal(null); // Fecha o modal de confirmação

      if (errorMsg.toLowerCase().includes('limite')) {
        setShowLimitModal(true); // Abre o modal de erro de limite
      } else {
        showToast('Erro: ' + errorMsg, 'error');
      }
    }
  };

  const handleRemoveClient = async (e, clientId, clientName) => {
    e.preventDefault(); 
    e.stopPropagation();

    // Podes também criar um modal para isto, mas por agora mantive o confirm simples ou podes adaptar
    if (!window.confirm(`Deixar de treinar ${clientName}?`)) return;

    try {
      await api.patch(`/trainers/clients/${clientId}/remove`);
      setClients(prev => prev.filter(c => c._id !== clientId));
      showToast('Cliente removido com sucesso.', 'success');
    } catch (err) {
      showToast('Erro ao remover: ' + (err.response?.data?.message || err.message), 'error');
    }
  };

  if (loading && !clients.length && !requests.length) return <div className="loading">A carregar...</div>;

  return (
    <div className="trainer-clients-page">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="hero">
        <h1>Gestão de Clientes</h1>
        <p>Gere os teus clientes ativos e aprova novos pedidos.</p>
      </div>

      <div className="clients-container">
        {/* Pedidos Pendentes */}
        {requests.length > 0 && (
          <div className="requests-section">
            <h2>Pedidos Pendentes ({requests.length})</h2>
            <div className="requests-grid">
              {requests.map(req => {
                const cName = req.client.profile?.name || req.client.username;
                return (
                  <div key={req._id} className="request-card">
                    <div className="req-avatar">
                      <img src={req.client.profile?.avatarUrl || '/images/default-avatar.jpg'} alt="Avatar" />
                    </div>
                    <div className="req-info">
                      <strong>{cName}</strong>
                      <span>Objetivo: {req.client.profile?.goal || 'N/A'}</span>
                    </div>
                    <div className="req-actions">
                      <button 
                        className="btn primary small" 
                        onClick={() => initiateRequest(req._id, 'accept', cName)} // <--- Alterado aqui
                      >
                        Aceitar
                      </button>
                      <button 
                        className="btn danger small" 
                        onClick={() => initiateRequest(req._id, 'reject', cName)} // <--- Alterado aqui
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <hr className="divider"/>
          </div>
        )}

        {/* Clientes Ativos */}
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem' }}>Meus Clientes Ativos</h2>
        {clients.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">?</div><h3>Sem clientes ativos</h3></div>
        ) : (
          <div className="clients-grid">
            {clients.map(client => (
              <Link key={client._id} to={`/client/${client._id}`} className="client-card">
                <button 
                  className="btn-remove-client" 
                  onClick={(e) => handleRemoveClient(e, client._id, client.profile?.name || client.username)}
                >✕</button>
                <div className="card-avatar">
                  <img src={client.profile?.avatarUrl || '/images/default-avatar.jpg'} alt="Avatar" />
                  <div className="online-dot"></div>
                </div>
                <div className="card-content">
                  <h3>{client.profile?.name || client.username}</h3>
                  <div className="badge">Ativo</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* --- NOVO: MODAL DE CONFIRMAÇÃO (ACEITAR/REJEITAR) --- */}
      {confirmModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <h3>Confirmar Ação</h3>
            <p style={{ margin: '1rem 0', color: 'var(--text-light)' }}>
              Tens a certeza que queres <strong>{confirmModal.action === 'accept' ? 'aceitar' : 'rejeitar'}</strong> o pedido de <strong>{confirmModal.clientName}</strong>?
            </p>
            <div className="modal-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
              <button 
                className="btn" 
                onClick={() => setConfirmModal(null)}
              >
                Cancelar
              </button>
              <button 
                className={`btn ${confirmModal.action === 'accept' ? 'success' : 'danger'}`} 
                onClick={handleConfirmAction}
              >
                {confirmModal.action === 'accept' ? 'Sim, Aceitar' : 'Sim, Rejeitar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE LIMITE (JÁ EXISTENTE) */}
      {showLimitModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h2 style={{ color: '#e11d48' }}>Limite Atingido!</h2>
            <p style={{ marginBottom: '1.5rem' }}>Já atingiste o limite de 10 clientes.</p>
            <button className="btn primary" onClick={() => setShowLimitModal(false)} style={{ width: '100%' }}>Entendido</button>
          </div>
        </div>
      )}
    </div>
  );
}