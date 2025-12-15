// src/pages/TrainerProfile.js
import React, { useEffect, useState, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext'; // <--- Import Context
import { toast } from 'react-toastify'; // <--- Import Toast
import './css/TrainerProfile.css';

export default function TrainerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Aceder às settings de notificação
  const { settings } = useContext(NotificationContext); 

  const [trainer, setTrainer] = useState(null);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trainerRes, specsRes] = await Promise.all([
          api.get(`/users/trainers/${id}`),
          api.get('/specialties')
        ]);
        setTrainer(trainerRes.data);
        setSpecialties(specsRes.data || []);
      } catch (err) {
        setError('Não foi possível carregar o perfil do treinador.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleAction = async () => {
    if (!user || user.role !== 'client' || processing) return;
    setProcessing(true);

    try {
      if (user.trainerAssigned) {
        // Lógica de Pedir Troca
        await api.post('/users/me/request-trainer-change', { newTrainerId: id });
        
        // Só mostra Toast de Sucesso se a configuração "Avisos do Sistema" estiver ativa
        if (settings?.system) {
          toast.success('Pedido de transferência enviado com sucesso!');
        }

      } else {
        // Lógica de Escolher Novo Treinador
        await api.post('/users/me/assign-trainer', { trainerId: id });
        
        // Só mostra Toast de Sucesso se a configuração "Avisos do Sistema" estiver ativa
        if (settings?.system) {
          toast.success('Treinador escolhido com sucesso!');
        }
        navigate('/home');
      }
    } catch (err) {
      // Erros mostramos sempre por questões de usabilidade
      toast.error(err.response?.data?.message || 'Ocorreu um erro.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="tp-page"><div className="container"><p style={{textAlign:'center',padding:'120px 0'}}>A carregar...</p></div></div>;
  if (error || !trainer) return <div className="tp-page"><div className="container"><p className="tp-error">{error || 'Treinador não encontrado.'}</p></div></div>;

  const specNames = (trainer.profile?.specialties || [])
    .map(s => typeof s === 'object' ? s.name : specialties.find(x => x._id === s)?.name)
    .filter(Boolean);

  const isOwnProfile = user?._id === trainer._id;
  const isMyTrainer = user?.trainerAssigned === id;
  const hasTrainer = !!user?.trainerAssigned;

  const clientsCount = trainer.clientsCount || 0;
  const trainerFull = clientsCount >= 10;

  const buttonText = isMyTrainer
    ? 'Este é o teu Personal Trainer'
    : hasTrainer
    ? 'Pedir Transferência de Treinador'
    : trainerFull
    ? 'Lotação Esgotada'
    : 'Escolher como Meu PT';

  const buttonDisabled = isMyTrainer || trainerFull || processing;

  return (
    <div className="tp-page">
      <div className="container">
        <div className="tp-avatar-header">
          <img 
            className="tp-avatar-large" 
            src={trainer.profile?.avatarUrl || '/images/default-avatar.jpg'} 
            alt={trainer.profile?.name || trainer.username} 
          />
        </div>

        <div className="tp-content">
          <div className="tp-header">
            <h1>{trainer.profile?.name || trainer.username}</h1>
            <p className="tp-role">Personal Trainer</p>
            <div className="tp-specialties">
              {specNames.length === 0 ? 
                <span className="tp-no-spec">Sem especialidades definidas</span> : 
                specNames.map((n, i) => <span key={i} className="tp-badge">{n}</span>)
              }
            </div>
          </div>

          {trainer.profile?.bio && (
            <section className="tp-section">
              <h2>Sobre mim</h2>
              <p className="tp-bio">{trainer.profile.bio}</p>
            </section>
          )}

          <section className="tp-section tp-stats">
            <div className="tp-stat">
              <strong>{trainer.profile?.totalWorkouts || 0}</strong>
              <span>Treinos criados</span>
            </div>
            <div className="tp-stat">
              <strong>{clientsCount}/10</strong>
              <span>Clientes atuais</span>
            </div>
          </section>

          <div className="tp-actions">
            {!isOwnProfile && user?.role === 'client' && (
              <button
                onClick={handleAction}
                disabled={buttonDisabled}
                className={`btn large ${buttonDisabled ? 'disabled-state' : 'primary'}`}
                style={{ minWidth: '300px', padding: '1rem 2rem', fontSize: '1.15rem' }}
              >
                {processing ? 'A processar...' : buttonText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}