// src/pages/TrainerList.js
import React, { useEffect, useState, useRef } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import './css/TrainerList.css';

export default function TrainerList() {
  const [trainers, setTrainers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [allSpecialties, setAllSpecialties] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [specSearch, setSpecSearch] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trainersRes, specsRes] = await Promise.all([
          api.get('/users/trainers'),
          api.get('/specialties')
        ]);

        const trainerList = trainersRes.data.trainers || trainersRes.data || [];
        setTrainers(trainerList);
        setFiltered(trainerList);
        setAllSpecialties(specsRes.data || []);
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // fechar dropdown ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // --- CORREÇÃO AQUI: Lógica de Filtragem (AND em vez de OR) ---
  useEffect(() => {
    let list = [...trainers];

    // Filtro por Texto
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(t =>
        (t.profile?.name || t.username || '').toLowerCase().includes(term) ||
        (t.profile?.bio || '').toLowerCase().includes(term)
      );
    }

    // Filtro por Especialidades (Lógica E / AND)
    if (selectedSpecialties.length > 0) {
      list = list.filter(t => {
        // Normaliza as especialidades do treinador para um array de IDs
        const trainerSpecs = t.profile?.specialties?.map(s => 
          (typeof s === 'object' ? s._id : s)
        ) || [];

        // Verifica se TODAS as especialidades selecionadas existem no treinador
        return selectedSpecialties.every(selId => trainerSpecs.includes(selId));
      });
    }

    setFiltered(list);
  }, [search, selectedSpecialties, trainers]);
  // -----------------------------------------------------------

  const toggleSpecialtyFilter = (id) => {
    setSelectedSpecialties(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectedSpecNames = allSpecialties.filter(s => selectedSpecialties.includes(s._id));
  const filteredSpecs = allSpecialties.filter(s =>
    s.name.toLowerCase().includes(specSearch.toLowerCase())
  );

  const renderSpecialties = (specialties = []) => {
    if (!specialties || specialties.length === 0) {
      return <span className="tl-no-spec">Sem especialidades</span>;
    }

    const specsToShow = specialties.slice(0, 3);
    const remaining = specialties.length - 3;

    return (
      <>
        {specsToShow.map((spec, i) => {
          const specObj = typeof spec === 'object' ? spec : allSpecialties.find(s => s._id === spec);
          return specObj ? (
            <span key={specObj._id || i} className="tl-badge">
              {specObj.name}
            </span>
          ) : null;
        })}
        {remaining > 0 && (
          <span className="tl-badge tl-badge-plus">
            +{remaining}
          </span>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div className="tl-page">
        <p style={{ textAlign: 'center', paddingTop: '120px' }}>
          A carregar treinadores...
        </p>
      </div>
    );
  }

  return (
    <div className="tl-page">
      <div className="container">
        <header className="tl-header">
          <h1>Os Nossos Personal Trainers</h1>
          <p>Escolhe o treinador perfeito para ti</p>
        </header>

        <div className="tl-filters">
          <input
            type="text"
            placeholder="Procurar por nome ou bio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="tl-search-input"
          />

          <div className="ms-wrapper" ref={dropdownRef}>
            <div
              className={`ms-display ${dropdownOpen ? 'open' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {selectedSpecNames.length === 0 ? (
                <span className="ms-placeholder">Todas as especialidades</span>
              ) : (
                <div className="ms-tags">
                  {selectedSpecNames.map(s => (
                    <span key={s._id} className="ms-tag">
                      {s.name}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSpecialtyFilter(s._id);
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <span className="ms-arrow">v</span>
            </div>

            {dropdownOpen && (
              <div className="ms-dropdown">
                <input
                  type="text"
                  placeholder="Procurar especialidade..."
                  value={specSearch}
                  onChange={(e) => setSpecSearch(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                <div className="ms-options">
                  {filteredSpecs.length === 0 ? (
                    <div className="ms-option disabled">Nenhuma encontrada</div>
                  ) : (
                    filteredSpecs.map(spec => {
                      const selected = selectedSpecialties.includes(spec._id);
                      return (
                        <div
                          key={spec._id}
                          className={`ms-option ${selected ? 'selected' : ''}`}
                          onClick={() => toggleSpecialtyFilter(spec._id)}
                        >
                          <span className="checkbox">{selected ? 'X' : ''}</span>
                          {spec.name}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="tl-grid">
          {filtered.length === 0 ? (
            <p className="tl-no-results">Nenhum treinador encontrado.</p>
          ) : (
            filtered.map(trainer => (
              <div key={trainer._id} className="tl-card">
                <div className="tl-avatar">
                  <img
                    src={trainer.profile?.avatarUrl || '/images/default-avatar.jpg'}
                    alt={trainer.profile?.name || trainer.username}
                  />
                  <div className="tl-online-dot"></div>
                </div>
                <div className="tl-info">
                  <h3>{trainer.profile?.name || trainer.username}</h3>
                  <div className="specialties-badges">
                    {renderSpecialties(trainer.profile?.specialties)}
                  </div>
                  <p className="tl-bio">
                    {trainer.profile?.bio?.slice(0, 120) || 'Sem descrição disponível.'}
                    {trainer.profile?.bio?.length > 120 && '...'}
                  </p>
                  <div className="trainer-actions">
                    <Link to={`/trainer/${trainer._id}`} className="btn primary small">
                      Ver Perfil
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}