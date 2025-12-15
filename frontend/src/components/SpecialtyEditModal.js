// src/components/SpecialtyEditModal.js
import React, { useState } from 'react';
import api from '../services/api';
import './css/Modal.css';

export default function SpecialtyEditModal({ specialty, onClose, onSave }) {
  const [name, setName] = useState(specialty.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Nome obrigatório');

    setLoading(true);
    try {
      const res = await api.patch(`/admin/specialties/${specialty._id}`, { name });
      onSave(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao guardar');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Apagar permanentemente "${specialty.name}"?`)) return;

    try {
      await api.delete(`/admin/specialties/${specialty._id}`);
      onSave(); // recarrega a lista
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Erro ao apagar');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Editar Especialidade</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome da especialidade"
            autoFocus
          />
          {error && <p style={{ color: '#fca5a5' }}>{error}</p>}

          <div className="modal-actions">
            <button type="submit" className="btn primary" disabled={loading}>
              {loading ? 'A guardar...' : 'Guardar'}
            </button>
            <button type="button" className="btn danger" onClick={handleDelete}>
              Apagar
            </button>
            <button type="button" className="btn" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}