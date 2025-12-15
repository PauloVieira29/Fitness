// src/components/SpecialtySelector.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function SpecialtySelector({ selected = [], onChange, disabled = false }) {
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpecialties = async () => {
      try {
        const res = await api.get('/specialties');
        setSpecialties(res.data);
      } catch (err) {
        console.error('Erro ao carregar especialidades', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSpecialties();
  }, []);

  const toggleSpecialty = (specId) => {
    const newSelected = selected.includes(specId)
      ? selected.filter(id => id !== specId)
      : [...selected, specId];
    onChange(newSelected);
  };

  if (loading) return <p>A carregar especialidades...</p>;

  return (
    <div className="specialty-selector">
      <label><strong>Especialidades</strong> (podes escolher várias)</label>
      <div className="specialty-grid">
        {specialties.map(spec => (
          <label key={spec._id} className="specialty-checkbox">
            <input
              type="checkbox"
              checked={selected.includes(spec._id)}
              onChange={() => toggleSpecialty(spec._id)}
              disabled={disabled}
            />
            <span>{spec.name}</span>
          </label>
        ))}
      </div>
      {specialties.length === 0 && (
        <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Ainda não existem especialidades criadas.
        </p>
      )}
    </div>
  );
}