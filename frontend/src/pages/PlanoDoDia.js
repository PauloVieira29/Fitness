// src/pages/PlanoDoDia.js
import React, { useState, useEffect, useContext } from 'react'; // Adicionado useContext
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format, parseISO, startOfDay, isAfter, startOfWeek, addDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useMeasurement } from '../context/MeasurementContext';
import { NotificationContext } from '../context/NotificationContext'; // Importado Contexto
import { toast } from 'react-toastify';
import './css/Planos.css';

const regenerateWorkoutDays = (planData) => {
  const daysMap = {};
  planData.days.forEach(d => { daysMap[d.dayOfWeek] = d.exercises; });

  const activeDays = planData.days.map(d => d.dayOfWeek);
  const start = new Date();
  const end = new Date();
  end.setMonth(end.getMonth() + 3);

  let current = startOfWeek(start, { weekStartsOn: 1 });

  while (current <= end) {
    const dayName = format(current, 'EEEE', { locale: pt });
    const ptDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

    if (activeDays.includes(ptDayName)) {
      const dateStr = format(current, 'yyyy-MM-dd');
      const dayData = planData.days.find(d => d.dayOfWeek === ptDayName);

      sessionStorage.setItem(`workout_${dateStr}`, JSON.stringify({
        ...planData,
        selectedDay: dayData,
        date: dateStr,
        trainerName: planData.trainer?.profile?.name || planData.trainer?.username || 'Treinador'
      }));
    }
    current = addDays(current, 1);
  }
};

export default function PlanoDoDia() {
  const { user, refreshUser } = useAuth();
  const { weightDisplayUnit, convertWeightFromDisplay } = useMeasurement();
  
  // Aceder às settings de notificação
  const { settings } = useContext(NotificationContext); 

  const { date } = useParams();
  const navigate = useNavigate();

  const stored = sessionStorage.getItem(`workout_${date}`);
  if (!stored) {
    navigate('/planos');
    return null;
  }
  const planData = JSON.parse(stored);
  const day = planData.selectedDay;

  const [entry, setEntry] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [proofFile, setProofFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState('');

  const dataFormatada = format(parseISO(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: pt });
  const today = startOfDay(new Date());
  const workoutDay = startOfDay(parseISO(date));
  const isFutureWorkout = isAfter(workoutDay, today);

  useEffect(() => {
    const loadEntry = async () => {
      try {
        const res = await api.get('/entries');
        const existing = res.data.find(
          e => format(new Date(e.date), 'yyyy-MM-dd') === date
        );

        if (existing) {
          setEntry(existing);
          setIsCompleted(existing.completed);
          setCalories(existing.caloriesBurned || '');
          setNotes(existing.notes || '');
          setReason(existing.reason || '');
          setPreviewUrl(existing.proofMedia || '');
          setWeight(existing.weight ? convertWeightFromDisplay(existing.weight).toFixed(1) : '');
        }
      } catch (err) {
        console.error('Erro ao carregar entrada:', err);
      } finally {
        setLoading(false);
      }
    };

    loadEntry();
  }, [date, convertWeightFromDisplay]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProofFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    // Validações continuam a aparecer (essencial para UX)
    if (!isCompleted && !reason.trim()) {
      toast.warn('Por favor, explica o motivo da ausência.');
      return;
    }

    setUploading(true);
    let finalProofUrl = previewUrl;

    if (proofFile) {
      const formData = new FormData();
      formData.append('file', proofFile);
      try {
        const uploadRes = await api.post('/upload/proof', formData);
        finalProofUrl = uploadRes.data.url;
      } catch (err) {
        toast.error('Erro ao enviar a prova. Tenta novamente.');
        setUploading(false);
        return;
      }
    }

    try {
      await api.post('/entries', {
        date,
        completed: isCompleted,
        caloriesBurned: isCompleted ? (calories || null) : null,
        notes: isCompleted ? notes : null,
        reason: !isCompleted ? reason : null,
        proofMedia: finalProofUrl || null,
        weight: isCompleted && weight ? convertWeightFromDisplay(parseFloat(weight)) : null,
      });

      if (isCompleted && weight.trim() !== '') {
        const displayValue = parseFloat(weight);
        const minWeight = weightDisplayUnit === 'kg' ? 30 : 66; 
        if (!isNaN(displayValue) && displayValue >= minWeight) {
          const weightInKg = convertWeightFromDisplay(displayValue);
          const weightFixed = Math.round(weightInKg * 10) / 10;
          await api.post('/users/me/weight', { weight: weightFixed });
          await refreshUser();
        }
      }

      // CORREÇÃO: O Toast de sucesso agora respeita as Definições de Sistema
      if (settings?.system) {
        toast.success('Treino registado com sucesso!');
      }

      try {
        const freshPlan = await api.get('/plans/my');
        if (freshPlan.data) regenerateWorkoutDays(freshPlan.data);
      } catch (err) {}

      setTimeout(() => navigate('/planos'), 800);

    } catch (err) {
      console.error('Erro ao guardar:', err);
      // Erros continuam a aparecer, pois indicam falha técnica
      toast.error('Erro ao registar o treino.');
    } finally {
      setUploading(false);
    }
  };

  const isAlreadyCompleted = entry?.completed;

  return (
    <div className="plano-do-dia">
      <section className="hero-treino">
        <div className="container">
          <h1>Treino do Dia</h1>
          <p>{dataFormatada}</p>
        </div>
      </section>

      <section className="py-20">
        <div className="container">
          <div className="card-large">
            {loading ? (
              <p>A carregar...</p>
            ) : (
              <>
                {isFutureWorkout && (
                  <div className="alert alert-info">
                    Este treino é para o futuro. Só podes registá-lo no dia ou depois.
                  </div>
                )}

                {(isEditing || !isAlreadyCompleted) ? (
                  <>
                    <div className="form-group">
                      <label>Estado do Treino</label>
                      <div className="radio-group">
                        <label>
                          <input type="radio" checked={isCompleted} onChange={() => setIsCompleted(true)} />
                          Concluído
                        </label>
                        <label>
                          <input type="radio" checked={!isCompleted} onChange={() => setIsCompleted(false)} />
                          Não concluído
                        </label>
                      </div>
                    </div>

                    {isCompleted && (
                      <>
                        <div className="form-group">
                          <label>Peso atual (opcional)</label>
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder={weightDisplayUnit === 'kg' ? 'Ex: 75.5' : 'Ex: 166.4'}
                            value={weight}
                            onChange={(e) => {
                              const value = e.target.value.trim();
                              if (value === '' || /^\d*\.?\d{0,1}$/.test(value)) {
                                setWeight(value);
                              }
                            }}
                            className="weight-input-no-arrows"
                          />
                          <small style={{ color: '#888', marginTop: '0.4rem', display: 'block' }}>
                            Em {weightDisplayUnit}
                          </small>
                        </div>

                        <div className="form-group">
                          <label>Calorias queimadas (opcional)</label>
                          <input type="number" value={calories} onChange={e => setCalories(e.target.value)} placeholder="Ex: 300" />
                        </div>
                        <div className="form-group">
                          <label>Notas (opcional)</label>
                          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows="4" placeholder="Ex: Sentiu-se bem..." />
                        </div>
                        <div className="proof-upload">
                          <label htmlFor="proof-upload">Adicionar prova (foto/vídeo, opcional)</label>
                          <input id="proof-upload" type="file" accept="image/*,video/*" onChange={handleFileChange} />
                          {previewUrl && (
                            <div className="preview-proof">
                              {previewUrl.match(/video|mp4|mov/i) ? (
                                <video src={previewUrl} controls className="w-full rounded-lg" />
                              ) : (
                                <img src={previewUrl} alt="Prova" className="w-full rounded-lg" />
                              )}
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {!isCompleted && (
                      <div className="form-group">
                        <label>Porquê não fizeste o treino?</label>
                        <textarea value={reason} onChange={e => setReason(e.target.value)} rows="4" required />
                      </div>
                    )}
                  </>
                ) : (
                  <div className="completed-summary">
                    <h3>Treino Concluído!</h3>
                    {calories && <p><strong>Calorias queimadas:</strong> {calories} kcal</p>}
                    {notes && <p><strong>Notas:</strong> {notes}</p>}
                    {weight && <p><strong>Peso registado:</strong> {weight} {weightDisplayUnit}</p>}
                    {previewUrl && (
                      <div className="preview-proof">
                        {previewUrl.match(/video|mp4|mov/i) ? (
                          <video src={previewUrl} controls className="w-full rounded-lg" />
                        ) : (
                          <img src={previewUrl} alt="Prova" className="w-full rounded-lg" />
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="secao-treino">
                  <h2>Treino do Dia</h2>
                  <div className="exercicios">
                    {day.exercises.length > 0 ? (
                      day.exercises.map((ex, i) => (
                        <div key={i} className="exercicio-card">
                          <div className="exercicio-nome">{ex.name || ex.exercise}</div>
                          <div className="exercicio-detalhes">
                            <span>{ex.sets} séries</span>
                            <span>{ex.reps} reps</span>
                            {ex.rest && <span className="descanso">{ex.rest} descanso</span>}
                            {ex.notes && <small className="notes-block">{ex.notes}</small>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                        Sem exercícios definidos para este dia.
                      </p>
                    )}
                  </div>
                </div>

                <div className="acoes-finais">
                  {isAlreadyCompleted && !isEditing ? (
                    <button onClick={() => setIsEditing(true)} className="btn outline large">
                      Editar Registo
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={uploading || isFutureWorkout}
                      className={`btn large ${isFutureWorkout ? 'disabled' : 'primary'}`}
                    >
                      {uploading ? 'A guardar...' : isFutureWorkout ? 'Ainda não podes concluir' : isCompleted ? 'Concluir Treino' : 'Registar Ausência'}
                    </button>
                  )}

                  <Link to="/planos" className="btn outline large">
                    Voltar ao Calendário
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}