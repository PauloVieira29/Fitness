// src/pages/AdminPanel.js
import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import UserCreateModal from '../components/UserCreateModal';
import UserEditModal from '../components/UserEditModal';
import SpecialtyEditModal from '../components/SpecialtyEditModal';
import Toast from '../components/Toast'; // <--- IMPORTADO O TOAST
import './css/AdminPanel.css';

export default function AdminPanel() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('clients'); // 'clients' | 'trainers'
  const [selectedUser, setSelectedUser] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;

  // Pedidos de mudança de treinador
  const [trainerChangeRequests, setTrainerChangeRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Gestão de Especialidades
  const [specialties, setSpecialties] = useState([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [specialtyInput, setSpecialtyInput] = useState('');
  const [addingSpecialty, setAddingSpecialty] = useState(false);
  const [editingSpecialty, setEditingSpecialty] = useState(null);
  const [specPage, setSpecPage] = useState(1);
  const specsPerPage = 10;

  // NOVO: Estado para o Toast
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchTrainerChangeRequests();
  }, []);

  useEffect(() => {
    if (viewMode === 'trainers') {
      fetchSpecialties();
    }
  }, [viewMode]);

  useEffect(() => {
    filterUsers();
  }, [viewMode, users, searchUser]);

  // Helper para mostrar Toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar utilizadores:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrainerChangeRequests = async () => {
    try {
      const res = await api.get('/admin/trainer-change-requests');
      setTrainerChangeRequests(res.data.requests || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchSpecialties = async () => {
    try {
      setLoadingSpecialties(true);
      const res = await api.get('/admin/specialties');
      setSpecialties(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSpecialties(false);
      setSpecPage(1);
    }
  };

  const addSpecialty = async () => {
    const name = specialtyInput.trim();
    if (!name || name.length < 2) return;

    try {
      setAddingSpecialty(true);
      const res = await api.post('/admin/specialties', { name });
      setSpecialties(prev => [...prev, res.data]);
      setSpecialtyInput('');
      showToast('Especialidade adicionada!', 'success'); // Toast sucesso
    } catch (err) {
      showToast(err.response?.data?.message || 'Erro ao adicionar especialidade', 'error');
    } finally {
      setAddingSpecialty(false);
    }
  };

  // --- ALTERADO: Lógica com Toast e validação de Limite ---
  const handleTrainerChange = async (requestId, accept) => {
    try {
      await api.post(`/admin/trainer-change/${requestId}`, { accept });
      
      setTrainerChangeRequests(prev => prev.filter(r => r._id !== requestId));
      if (accept) fetchUsers();

      showToast(accept ? 'Pedido aceite com sucesso!' : 'Pedido rejeitado.', 'success');

    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Erro ao processar pedido';
      
      // Validação específica para limite
      if (errorMsg.toLowerCase().includes('limite')) {
         showToast('⚠️ Erro: O treinador já atingiu o limite de 10 clientes!', 'error');
      } else {
         showToast(errorMsg, 'error');
      }
    }
  };

  const filterUsers = () => {
    let filtered = users;
    if (viewMode === 'clients') filtered = filtered.filter(u => u.role === 'client');
    if (viewMode === 'trainers') filtered = filtered.filter(u => u.role === 'trainer');

    if (searchUser) {
      filtered = filtered.filter(u =>
        (u.profile?.name || u.username || '').toLowerCase().includes(searchUser.toLowerCase()) ||
        (u.profile?.email || '').toLowerCase().includes(searchUser.toLowerCase())
      );
    }
    setFilteredUsers(filtered);
  };

  // Paginação
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage);

  const filteredSpecialties = specialties.filter(s =>
    s.name.toLowerCase().includes(specialtyInput.toLowerCase())
  );
  const totalSpecPages = Math.ceil(filteredSpecialties.length / specsPerPage);
  const currentSpecialties = filteredSpecialties.slice(
    (specPage - 1) * specsPerPage,
    specPage * specsPerPage
  );

  if (loading) return <div className="ap-panel"><div className="container"><p>A carregar painel...</p></div></div>;

  return (
    <div className="ap-panel">
      {/* Componente Toast Renderizado */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <div className="container">
        <h1>Painel de Administração</h1>
        <p>Bem-vindo, <strong>{user.profile?.name || user.username}</strong></p>

        <div className="ap-controls">
          <input
            type="text"
            placeholder="Procurar utilizador..."
            value={searchUser}
            onChange={(e) => { setSearchUser(e.target.value); setCurrentPage(1); }}
            className="ap-search-input"
          />

          <div className="ap-toggle-group">
            <button
              className={`ap-toggle-btn ${viewMode === 'clients' ? 'active' : ''}`}
              onClick={() => { setViewMode('clients'); setCurrentPage(1); }}
            >Clientes</button>
            <button
              className={`ap-toggle-btn ${viewMode === 'trainers' ? 'active' : ''}`}
              onClick={() => { setViewMode('trainers'); setCurrentPage(1); }}
            >Treinadores</button>
          </div>

          <button className="btn primary" onClick={() => setIsCreateModalOpen(true)}>
            + Criar {viewMode === 'clients' ? 'Cliente' : 'Treinador'}
          </button>
        </div>

        {/* Tabela de Utilizadores */}
        <div className="ap-users-table">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Idade</th>
                <th>Registo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.length === 0 ? (
                <tr><td colSpan="5" className="ap-no-data">Nenhum encontrado.</td></tr>
              ) : (
                currentUsers.map(u => (
                  <tr key={u._id} onClick={() => setSelectedUser(u)} className="ap-clickable-row">
                    <td>{u.profile?.name || u.username}</td>
                    <td>{u.profile?.email || '—'}</td>
                    <td>{u.profile?.age || '—'}</td>
                    <td>{new Date(u.createdAt).toLocaleDateString('pt-PT')}</td>
                    <td><button className="btn small outline">Editar</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {totalUserPages > 1 && (
            <div className="ap-pagination">
              <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1)) } disabled={currentPage === 1}>Anterior</button>
              <span>Página {currentPage} de {totalUserPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalUserPages)) } disabled={currentPage === totalUserPages}>Seguinte</button>
            </div>
          )}
        </div>

        {/* Pedidos de Mudança de Treinador */}
        {viewMode === 'clients' && (
          <div className="ap-trainer-requests-section">
            <h2>Pedidos de Alteração de Treinador</h2>
            {loadingRequests ? <p>A carregar...</p> : trainerChangeRequests.length === 0 ? (
              <p className="ap-no-requests">Nenhum pedido pendente.</p>
            ) : (
              <div className="ap-requests-list">
                {trainerChangeRequests.map(req => (
                  <div key={req._id} className="ap-request-card">
                    <div className="ap-request-info">
                      <strong>{req.client.profile?.name || req.client.username}</strong> quer mudar para{' '}
                      <strong>{req.newTrainer.profile?.name || req.newTrainer.username}</strong>
                      <small>— {new Date(req.createdAt).toLocaleDateString('pt-PT')}</small>
                    </div>
                    <div className="ap-request-actions">
                      <button className="btn small success" onClick={() => handleTrainerChange(req._id, true)}>Aceitar</button>
                      <button className="btn small danger" onClick={() => handleTrainerChange(req._id, false)}>Rejeitar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Gestão de Especialidades */}
        {viewMode === 'trainers' && (
          <div className="ap-specialties-section">
            <h2>Gestão de Especialidades</h2>

            <div className="ap-specialty-input-group">
              <input
                type="text"
                placeholder={
                  specialtyInput.trim() === ''
                    ? "Escreve para adicionar nova especialidade..."
                    : "A filtrar especialidades..."
                }
                value={specialtyInput}
                onChange={(e) => setSpecialtyInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && specialtyInput.trim() && addSpecialty()}
                disabled={addingSpecialty}
                className="ap-specialty-input"
              />
              {specialtyInput.trim() && (
                <button
                  className="btn primary small"
                  onClick={addSpecialty}
                  disabled={addingSpecialty}
                >
                  {addingSpecialty ? 'A adicionar...' : '+ Adicionar'}
                </button>
              )}
            </div>

            {loadingSpecialties ? (
              <p>A carregar especialidades...</p>
            ) : (
              <>
                <div className="ap-specialties-list">
                  {currentSpecialties.length === 0 ? (
                    <p className="ap-no-requests">
                      {specialties.length === 0 
                        ? "Nenhuma especialidade criada ainda." 
                        : "Nenhuma especialidade corresponde à pesquisa."}
                    </p>
                  ) : (
                    currentSpecialties.map(spec => (
                      <div key={spec._id} className="ap-specialty-item">
                        <span
                          className="ap-clickable-specialty"
                          onClick={() => setEditingSpecialty(spec)}
                        >
                          {spec.name}
                        </span>
                        <button
                          className="btn small outline"
                          onClick={() => setEditingSpecialty(spec)}
                        >
                          Editar
                        </button>
                      </div>
                    ))
                  )}
                </div>

                {totalSpecPages > 1 && (
                  <div className="ap-pagination">
                    <button onClick={() => setSpecPage(p => Math.max(p - 1, 1))} disabled={specPage === 1}>
                      Anterior
                    </button>
                    <span>Página {specPage} de {totalSpecPages}</span>
                    <button onClick={() => setSpecPage(p => Math.min(p + 1, totalSpecPages))} disabled={specPage === totalSpecPages}>
                      Seguinte
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modais */}
      {selectedUser && (
        <UserEditModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSave={fetchUsers}
        />
      )}

      {isCreateModalOpen && (
        <UserCreateModal
          role={viewMode === 'clients' ? 'client' : 'trainer'}
          onClose={() => setIsCreateModalOpen(false)}
          onSave={(msg) => {
             fetchUsers();
             showToast(msg || 'Utilizador criado com sucesso!', 'success');
          }}
        />
      )}

      {editingSpecialty && (
        <SpecialtyEditModal
          specialty={editingSpecialty}
          onClose={() => setEditingSpecialty(null)}
          onSave={(updated) => {
            if (updated) {
              setSpecialties(prev => prev.map(s => s._id === updated._id ? updated : s));
              showToast('Especialidade atualizada.', 'success');
            } else {
              fetchSpecialties(); // foi apagada
              showToast('Especialidade removida.', 'success');
            }
            setEditingSpecialty(null);
          }}
        />
      )}
    </div>
  );
}