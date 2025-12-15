// src/pages/ClientHome.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { format, parseISO, startOfWeek, addDays, isToday, isAfter } from 'date-fns';
import { pt } from 'date-fns/locale';
import WeekCalendar from '../components/WeekCalendar';
import FullCalendarModal from '../components/FullCalendarModal';
import api from '../services/api';
import { BarChart2, FileText } from 'lucide-react'; 
import './css/ClientHome.css';

export default function HomeLoggedIn() {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickableDays, setClickableDays] = useState([]);
  const [nextWorkout, setNextWorkout] = useState(null);
  const [stats, setStats] = useState({
    workoutsThisMonth: '-',
    weeklyAdherence: '-',
    caloriesToday: '-'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // --- NOVO: Trigger para verificar se falhou treino ontem ---
        // Se falhou, o backend cria notificação e o NotificationContext mostra o Toast
        api.post('/users/me/check-missed-workout').catch(err => console.log("Check missed failed", err));
        // ---------------------------------------------------------

        const [planRes, statsRes] = await Promise.all([
          api.get('/plans/my'),
          api.get('/plans/my/stats')
        ]);

        const plan = planRes.data;
        const fetchedStats = statsRes.data || {};

        setStats({
          workoutsThisMonth: fetchedStats.workoutsThisMonth ?? '-',
          weeklyAdherence: fetchedStats.weeklyAdherence ?? '-',
          caloriesToday: fetchedStats.caloriesToday ?? '-'
        });

        if (plan) {
          const dates = generateWorkoutDates(plan);
          setClickableDays(dates);

          dates.forEach(dateStr => {
            const dateObj = parseISO(dateStr);
            const dayNamePt = format(dateObj, 'EEEE', { locale: pt }).charAt(0).toUpperCase() + format(dateObj, 'EEEE', { locale: pt }).slice(1);
            const dayData = plan.days.find(d => d.dayOfWeek === dayNamePt);

            if (dayData) {
              sessionStorage.setItem(`workout_${dateStr}`, JSON.stringify({
                ...plan,
                selectedDay: dayData,
                date: dateStr,
                trainerName: plan.trainer?.profile?.name || plan.trainer?.username || 'Treinador'
              }));
            }
          });

          const futureDates = dates
            .map(d => parseISO(d))
            .filter(d => isAfter(d, new Date()) || isToday(d))
            .sort((a, b) => a - b);

          if (futureDates.length > 0) {
            const nextDate = futureDates[0];
            const nextDateStr = format(nextDate, 'yyyy-MM-dd');
            const dayNamePt = format(nextDate, 'EEEE', { locale: pt }).charAt(0).toUpperCase() + format(nextDate, 'EEEE', { locale: pt }).slice(1);
            const dayData = plan.days.find(d => d.dayOfWeek === dayNamePt);

            setNextWorkout({
              date: nextDate,
              dateStr: nextDateStr,
              dayName: format(nextDate, "EEEE, d 'de' MMMM", { locale: pt }),
              time: '18:30',
              exercises: dayData?.exercises || [],
              planName: plan.name,
              isFuture: !isToday(nextDate) && isAfter(nextDate, new Date())
            });
          }
        }
      } catch (err) {
        console.error('Erro ao carregar dados da home:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const generateWorkoutDates = (plan) => {
    const activeDays = plan.days.map(d => d.dayOfWeek);
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + 6);

    const dates = [];
    let current = startOfWeek(start, { weekStartsOn: 1 });

    while (current <= end) {
      const dayName = format(current, 'EEEE', { locale: pt });
      const ptDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);

      if (activeDays.includes(ptDayName)) {
        dates.push(format(current, 'yyyy-MM-dd'));
      }
      current = addDays(current, 1);
    }
    return dates;
  };

  if (loading) {
    return <div className="container py-20 text-center">A carregar os teus treinos...</div>;
  }

  return (
    <div className="home-loggedin">
      {/* Hero */}
      <section className="hero-loggedin">
        <div className="container">
          <div className="welcome-card">
            <h1>Bem-vindo de volta, <span>{user.profile?.name || user.username}</span>!</h1>
            <p>Estás pronto para mais um dia de conquistas?</p>
            <div className="quick-actions">
              <Link to="/dashboard" className="btn primary-white">
                <BarChart2 size={20} />
                Ver Dashboard de Evolução
              </Link>
              <Link to="/planos" className="btn outline">
                <FileText size={20} />
                Ver Plano Completo
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Simples + Calendário */}
      <section className="summary py-20">
        <div className="container grid md:grid-cols-3 gap-8">
          <div className="week-calendar-wrapper md:col-span-3 lg:col-span-1 cursor-pointer" onClick={() => setIsModalOpen(true)}>
            <WeekCalendar clickableDays={clickableDays} />
          </div>

          <div className="stat-card"><h3>{stats.workoutsThisMonth}</h3><p>Treinos este mês</p></div>
          <div className="stat-card"><h3>{stats.weeklyAdherence}</h3><p>Adesão semanal</p></div>
          <div className="stat-card"><h3>{stats.caloriesToday}</h3><p>Kcal hoje</p></div>
        </div>
      </section>

      <FullCalendarModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} clickableDays={clickableDays} />

      {/* Próximo Treino */}
      <section className="next-workout py-20">
        <div className="container">
          <h2 className="section-title">Próximo Treino</h2>
          {nextWorkout ? (
            <div className="workout-card">
              <div className="workout-header">
                <h3>{nextWorkout.planName}</h3>
                <span className="tag">
                  {isToday(parseISO(nextWorkout.dateStr)) ? 'Hoje' : format(nextWorkout.date, 'EEEE', { locale: pt })}, {nextWorkout.time}
                </span>
              </div>
              <p className="text-sm opacity-80 mb-4">{nextWorkout.dayName}</p>

              {nextWorkout.isFuture && (
                <div className="alert alert-info" style={{ marginBottom: '1rem', padding: '0.75rem', background: '#dbeafe', color: '#1e40af', borderRadius: '8px', fontSize: '0.9rem' }}>
                  Este treino ainda não chegou. Podes ver os exercícios, mas só poderás marcá-lo como concluído no dia.
                </div>
              )}

              <ul className="exercise-list">
                {nextWorkout.exercises.slice(0, 5).map((ex, i) => (
                  <li key={i}>
                    {ex.name || ex.exercise}
                    <span>{ex.sets}×{ex.reps}</span>
                  </li>
                ))}
                {nextWorkout.exercises.length > 5 && (
                  <li className="text-sm italic">…e mais {nextWorkout.exercises.length - 5} exercícios</li>
                )}
              </ul>

              <Link
                to={`/plano/${nextWorkout.dateStr}`}
                className={`btn ${nextWorkout.isFuture ? 'outline' : 'primary'} small`}
                style={nextWorkout.isFuture ? { opacity: 0.7 } : {}}
              >
                {nextWorkout.isFuture ? 'Ver Treino (ainda não chegou)' : 'Começar Treino'}
              </Link>
            </div>
          ) : (
            <div className="workout-card text-center py-8 opacity-75">
              <p>Sem treinos agendados para os próximos dias.</p>
              <Link to="/planos" className="btn primary mt-4">Ver Plano</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}