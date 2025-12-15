// src/components/UserEditModal.js
import React, { useState } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import './css/Modal.css'; // Certifica-te que tens estilos básicos para o modal

export default function UserEditModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: user.profile?.name || '',
    email: user.profile?.email || '',
    username: user.username || '',
    role: user.role
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados para a Zona de Perigo
  const [actionType, setActionType] = useState(null); // 'deactivate', 'reactivate', 'delete'
  const [adminPassword, setAdminPassword] = useState('');
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const isActive = user.isActive !== false; // Se undefined, assume true

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.patch(`/admin/users/${user._id}`, {
        username: formData.username,
        role: formData.role,
        profile: {
          name: formData.name,
          email: formData.email
        }
      });
      toast.success('Utilizador atualizado com sucesso!');
      onSave(); // Recarrega a lista
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar');
    } finally {
      setLoading(false);
    }
  };

  const initiateAction = (type) => {
    setActionType(type);
    setAdminPassword('');
    setShowPasswordConfirm(true);
    setError('');
  };

  const confirmAction = async (e) => {
    e.preventDefault();
    if (!adminPassword) return setError('Password de administrador é obrigatória.');

    setLoading(true);
    try {
        if (actionType === 'delete') {
            // Eliminar Permanentemente (Envia password no body)
            await api.delete(`/admin/users/${user._id}`, {
                data: { password: adminPassword }
            });
            toast.success('Utilizador eliminado permanentemente.');
            onSave();
            onClose();

        } else {
            // Desativar ou Reativar
            const targetState = actionType === 'reactivate'; // true para reativar, false para desativar
            await api.post(`/admin/users/${user._id}/status`, {
                password: adminPassword,
                isActive: targetState
            });
            
            toast.success(`Conta ${targetState ? 'reativada' : 'desativada'} com sucesso.`);
            onSave();
            onClose();
        }
    } catch (err) {
        setError(err.response?.data?.message || 'Erro ao processar ação (password incorreta?).');
        setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <h2>Editar Utilizador</h2>
            {/* Badge de estado */}
            <span style={{
                padding: '4px 8px', 
                borderRadius: '12px', 
                fontSize: '0.8rem',
                backgroundColor: isActive ? '#dcfce7' : '#fee2e2',
                color: isActive ? '#166534' : '#991b1b',
                fontWeight: 'bold'
            }}>
                {isActive ? 'Ativo' : 'Inativo'}
            </span>
        </div>

        {!showPasswordConfirm ? (
            // FORMULÁRIO DE EDIÇÃO NORMAL
            <>
                <form onSubmit={handleUpdate}>
                  <div className="form-group">
                    <label>Username</label>
                    <input 
                        type="text" 
                        value={formData.username} 
                        onChange={e => setFormData({...formData, username: e.target.value})}
                        required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Nome</label>
                    <input 
                        type="text" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input 
                        type="email" 
                        value={formData.email} 
                        onChange={e => setFormData({...formData, email: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select 
                        value={formData.role} 
                        onChange={e => setFormData({...formData, role: e.target.value})}
                    >
                      <option value="client">Cliente</option>
                      <option value="trainer">Treinador</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  {error && <div className="error-alert">{error}</div>}

                  <div className="button-group">
                    <button type="submit" className="btn primary" disabled={loading}>Guardar</button>
                    <button type="button" className="btn secondary" onClick={onClose}>Cancelar</button>
                  </div>
                </form>

                {/* ZONA DE PERIGO */}
                <div style={{marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem'}}>
                    <h4 style={{color: '#666', marginBottom: '1rem'}}>Gestão de Conta</h4>
                    
                    {isActive ? (
                        <button 
                            type="button" 
                            className="btn warning" 
                            style={{width: '100%', backgroundColor: '#f59e0b', color: 'white'}}
                            onClick={() => initiateAction('deactivate')}
                        >
                            Desativar Conta
                        </button>
                    ) : (
                        <div style={{display: 'flex', gap: '1rem'}}>
                            <button 
                                type="button" 
                                className="btn success" 
                                style={{flex: 1}}
                                onClick={() => initiateAction('reactivate')}
                            >
                                Reativar Conta
                            </button>
                            <button 
                                type="button" 
                                className="btn danger" 
                                style={{flex: 1}}
                                onClick={() => initiateAction('delete')}
                            >
                                Eliminar Permanentemente
                            </button>
                        </div>
                    )}
                </div>
            </>
        ) : (
            // FORMULÁRIO DE CONFIRMAÇÃO DE PASSWORD
            <form onSubmit={confirmAction}>
                <div className="modal-header-danger" style={{color: actionType === 'reactivate' ? '#16a34a' : '#ef4444'}}>
                    <h3>
                        {actionType === 'deactivate' && 'Desativar Conta?'}
                        {actionType === 'reactivate' && 'Reativar Conta?'}
                        {actionType === 'delete' && 'Eliminar Permanentemente?'}
                    </h3>
                </div>
                
                <p style={{marginBottom: '1rem', color: '#555'}}>
                    {actionType === 'deactivate' && 'O utilizador perderá o acesso, mas os dados serão mantidos.'}
                    {actionType === 'reactivate' && 'O utilizador voltará a ter acesso à plataforma.'}
                    {actionType === 'delete' && 'Atenção: Esta ação é irreversível. Todos os dados serão apagados.'}
                </p>

                <div className="form-group">
                    <label>Confirma a tua password de administrador:</label>
                    <input 
                        type="password" 
                        value={adminPassword} 
                        onChange={e => setAdminPassword(e.target.value)}
                        placeholder="Password de Admin"
                        required 
                        autoFocus
                    />
                </div>

                {error && <div className="error-alert">{error}</div>}

                <div className="button-group">
                    <button 
                        type="submit" 
                        className={`btn ${actionType === 'reactivate' ? 'success' : 'danger'}`} 
                        disabled={loading}
                    >
                        {loading ? 'A processar...' : 'Confirmar'}
                    </button>
                    <button 
                        type="button" 
                        className="btn secondary" 
                        onClick={() => { setShowPasswordConfirm(false); setAdminPassword(''); setError(''); }}
                    >
                        Voltar
                    </button>
                </div>
            </form>
        )}
      </div>
    </div>
  );
}