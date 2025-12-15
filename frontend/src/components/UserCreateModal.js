// src/components/UserCreateModal.js
import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import './css/Modal.css';

export default function UserCreateModal({ role, onClose, onSave }) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    profile: {
      name: '',
      email: '',
      age: '',
      bio: '',
      goal: 'Perder peso',
      weight: '',
      height: '',
      specialties: []
    }
  });

  const [specialties, setSpecialties] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchSpec, setSearchSpec] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (role === 'trainer') {
      fetchSpecialties();
    }
  }, [role]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSpecialties = async () => {
    try {
      const res = await api.get('/admin/specialties');
      setSpecialties(res.data || []);
    } catch (err) {
      console.error('Erro ao carregar especialidades:', err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const toggleSpecialty = (specId) => {
    setFormData(prev => {
      const current = prev.profile.specialties || [];
      const updated = current.includes(specId)
        ? current.filter(id => id !== specId)
        : [...current, specId];
      return {
        ...prev,
        profile: { ...prev.profile, specialties: updated }
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', { ...formData, role });
      onSave();
      onClose();
    } catch (err) {
      alert('Erro ao criar: ' + (err.response?.data?.message || err.message));
    }
  };

  const selectedSpecialties = specialties.filter(s =>
    formData.profile.specialties.includes(s._id)
  );

  const filteredSpecialties = specialties.filter(s =>
    s.name.toLowerCase().includes(searchSpec.toLowerCase())
  );

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>Criar {role === 'client' ? 'Cliente' : 'Treinador'}</h2>

        <form onSubmit={handleSubmit}>
          <input name="username" value={formData.username} onChange={handleChange} placeholder="Username" required />
          <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password" required />
          <input name="profile.name" value={formData.profile.name} onChange={handleChange} placeholder="Nome completo" />
          <input name="profile.email" value={formData.profile.email} onChange={handleChange} placeholder="Email" />
          <input name="profile.age" type="number" value={formData.profile.age} onChange={handleChange} placeholder="Idade" />
          <textarea name="profile.bio" value={formData.profile.bio} onChange={handleChange} placeholder="Bio" rows="3" />

          {/* Campos só para Cliente */}
          {role === 'client' && (
            <>
              <select name="profile.goal" value={formData.profile.goal} onChange={handleChange}>
                <option>Perder peso</option>
                <option>Ganhar massa</option>
                <option>Melhorar resistência</option>
                <option>Saúde geral</option>
              </select>
              <input name="profile.weight" type="number" value={formData.profile.weight} onChange={handleChange} placeholder="Peso (kg)" />
              <input name="profile.height" type="number" value={formData.profile.height} onChange={handleChange} placeholder="Altura (cm)" />
            </>
          )}

          {/* Multi-select para Treinador */}
          {role === 'trainer' && (
            <div className="ms-wrapper" ref={dropdownRef}>
              <label>Especialidades</label>
              <div
                className={`ms-display ${dropdownOpen ? 'open' : ''}`}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                {selectedSpecialties.length === 0 ? (
                  <span className="ms-placeholder">Selecione especialidades...</span>
                ) : (
                  <div className="ms-tags">
                    {selectedSpecialties.map(spec => (
                      <span key={spec._id} className="ms-tag">
                        {spec.name}
                        <button type="button" onClick={(e) => { e.stopPropagation(); toggleSpecialty(spec._id); }}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <span className="ms-arrow">Down Arrow</span>
              </div>

              {dropdownOpen && (
                <div className="ms-dropdown">
                  <input
                    type="text"
                    placeholder="Procurar especialidade..."
                    value={searchSpec}
                    onChange={(e) => setSearchSpec(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                  <div className="ms-options">
                    {filteredSpecialties.length === 0 ? (
                      <div className="ms-option disabled">Nenhuma encontrada</div>
                    ) : (
                      filteredSpecialties.map(spec => {
                        const isSelected = formData.profile.specialties.includes(spec._id);
                        return (
                          <div
                            key={spec._id}
                            className={`ms-option ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleSpecialty(spec._id)}
                          >
                            <span className="checkbox">{isSelected ? 'Checkmark' : ''}</span>
                            {spec.name}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="modal-actions">
            <button type="submit" className="btn primary">
              Criar {role === 'client' ? 'Cliente' : 'Treinador'}
            </button>
            <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}