// src/pages/Planos.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format, parseISO, startOfWeek, addDays, isWithinInterval } from 'date-fns';
import { pt } from 'date-fns/locale';
import Calendar from '../components/Calendar';
import api from '../services/api';
import './css/Planos.css';

export default function Planos() {
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clickableDays, setClickableDays] = useState([]);
  const navigate = useNavigate();

  // Ref para guardar a string do último plano e comparar (evita re-renders desnecessários)
  const lastPlanRef = useRef(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const res = await api.get('/plans/my');
        const currentDataStr = JSON.stringify(res.data);

        // SÓ ATUALIZA O ESTADO SE HOUVER MUDANÇAS REAIS NOS DADOS
        if (lastPlanRef.current !== currentDataStr) {
          lastPlanRef.current = currentDataStr;
          setPlan(res.data);

          if (res.data) {
            generateWorkoutDays(res.data);
          } else {
            // Se o plano foi removido, limpamos o estado
            setClickableDays([]);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar plano:', err);
      } finally {
        // Remove o loading apenas na primeira execução
        if (loading) setLoading(false);
      }
    };

    // 1. Executa imediatamente ao abrir
    fetchPlan();

    // 2. Cria um intervalo para verificar atualizações a cada 3 segundos
    const interval = setInterval(fetchPlan, 3000);

    // 3. Limpa o intervalo ao sair da página
    return () => clearInterval(interval);
  }, []); // Dependências vazias, pois a lógica interna gere tudo via Ref e API

  // Gerar lista de datas com treino (próximos 3 meses)
  const generateWorkoutDays = (planData) => {
    const daysMap = {};
    planData.days.forEach(d => {
      daysMap[d.dayOfWeek] = d.exercises;
    });

    const activeDays = planData.days.map(d => d.dayOfWeek);

    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 3); // 3 meses à frente

    const dates = [];
    let current = startOfWeek(start, { weekStartsOn: 1 }); // Semana começa na segunda

    while (current <= end) {
      const dayName = format(current, 'EEEE', { locale: pt });
      const ptDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

      if (activeDays.includes(ptDayName)) {
        const dateStr = format(current, 'yyyy-MM-dd');
        dates.push(dateStr);

        // Guardar os exercícios desse dia no sessionStorage para usar no PlanoDoDia
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

    setClickableDays(dates);
  };

  if (loading) {
    return <div className="container py-20 text-center">A carregar plano...</div>;
  }

  return (
    <div className="planos-page">
      <section className="hero-planos">
        <div className="container">
          <h1>Os Teus Planos de Treino</h1>
          <p>Clica num dia com treino para veres os exercícios</p>
        </div>
      </section>

      {/* RESUMO DO PLANO ATUAL */}
      {plan ? (
        <section className="current-plan py-20">
          <div className="container">
            <div className="plan-card">
              <div className="plan-header">
                <h2>{plan.name}</h2>
                {plan.isFromTemplate && <span className="badge">Do Template</span>}
              </div>

              <div className="plan-info-grid">
                <div>
                  <strong>Duração:</strong> {plan.weeks} semanas
                </div>
                <div>
                  <strong>Sessões por semana:</strong> {plan.sessionsPerWeek}
                </div>
                <div>
                  <strong>Dias de treino:</strong>{' '}
                  {plan.days.map(d => d.dayOfWeek).join(', ')}
                </div>
              </div>

              {plan.notes && (
                <div className="plan-notes">
                  <h4>Notas do Treinador</h4>
                  <p>{plan.notes}</p>
                </div>
              )}

              <div className="trainer-info">
                <small>
                  Criado por <strong>{plan.trainer?.profile?.name || plan.trainer?.username}</strong>
                </small>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="no-plan py-20">
          <div className="container text-center">
            <h2>Ainda não tens plano de treino</h2>
            <p>Fala com o teu treinador para ele te atribuir um!</p>
          </div>
        </section>
      )}

      {/* CALENDÁRIO */}
      <section className="calendar-section py-20">
        <div className="container">
          <div className="calendar-wrapper">
            <Calendar clickableDays={clickableDays} />
          </div>

          <div className="legend mt-10">
            <span><div className="dot workout"></div> Dia com treino</span>
            <span><div className="dot today"></div> Hoje</span>
          </div>
        </div>
      </section>
    </div>
  );
}