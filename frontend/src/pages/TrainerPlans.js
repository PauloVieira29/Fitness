// src/pages/TrainerPlans.js
import React, { useState, useEffect, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext'; 
import { toast } from 'react-toastify'; 
import api from '../services/api';
import { Plus, Trash2, X, Save, Loader2, Edit, AlertTriangle } from 'lucide-react';
import './css/TrainerPlans.css';

const DAYS_OF_WEEK = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
];

// --- NOVO: MAPA PARA ORDENAÇÃO ---
const DAY_ORDER = {
  'Segunda-feira': 1, 'Terça-feira': 2, 'Quarta-feira': 3,
  'Quinta-feira': 4, 'Sexta-feira': 5, 'Sábado': 6, 'Domingo': 7
};

const MAX_EXERCISES_PER_DAY = 10;

export default function TrainerPlans() {
  const { user } = useAuth();
  const { settings } = useContext(NotificationContext);

  const [showForm, setShowForm] = useState(false);
  const [isForClient, setIsForClient] = useState(false);
  const [clients, setClients] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState(null);

  const [form, setForm] = useState({
    name: '',
    weeks: 8,
    sessionsPerWeek: 4,
    notes: '',
    days: []
  });

  const generateDays = (count) => {
    return Array.from({ length: count }, () => ({ dayOfWeek: '', exercises: [] }));
  };

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [clientsRes, templatesRes] = await Promise.all([
        api.get('/users/my-clients'),
        api.get('/plan-templates')
      ]);
      setClients(clientsRes.data);
      setTemplates(templatesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openForm = () => {
    setShowForm(true);
    setEditingTemplate(null);
    setSelectedClient('');
    setIsForClient(false);
    setForm({ 
        name: '', 
        weeks: 8, 
        sessionsPerWeek: 4, 
        notes: '', 
        days: generateDays(4) 
    });
  };

  const closeForm = () => {
    setShowForm(false);
    setIsForClient(false);
    setEditingTemplate(null);
  };

  const editTemplate = (template) => {
    setEditingTemplate(template);
    setForm({
      name: template.name,
      weeks: template.weeks,
      sessionsPerWeek: template.sessionsPerWeek,
      notes: template.notes || '',
      days: template.days.map(day => ({
        dayOfWeek: day.dayOfWeek,
        exercises: day.exercises.map(ex => ({ ...ex }))
      }))
    });
    setIsForClient(false);
    setShowForm(true);
  };

  const handleSessionsChange = (e) => {
    const newCount = Number(e.target.value);
    setForm(prev => {
        const currentDays = [...prev.days];
        
        if (newCount > currentDays.length) {
            const toAdd = newCount - currentDays.length;
            for (let i = 0; i < toAdd; i++) {
                currentDays.push({ dayOfWeek: '', exercises: [] });
            }
        } else if (newCount < currentDays.length) {
            currentDays.splice(newCount);
        }

        return {
            ...prev,
            sessionsPerWeek: newCount,
            days: currentDays
        };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.warn('Dá um nome ao plano');
    if (form.days.some(d => !d.dayOfWeek)) return toast.warn('Escolhe o dia para todos os dias');
    if (form.days.some(d => d.exercises.length === 0)) return toast.warn('Cada dia precisa de pelo menos 1 exercício');

    setSaving(true);
    try {
      // --- ALTERAÇÃO: Ordenar dias antes de enviar ---
      const sortedDays = [...form.days].sort((a, b) => {
        const orderA = DAY_ORDER[a.dayOfWeek] || 99;
        const orderB = DAY_ORDER[b.dayOfWeek] || 99;
        return orderA - orderB;
      });

      const payload = {
        ...form,
        days: sortedDays, // Envia ordenado
        weeks: Number(form.weeks),
        sessionsPerWeek: Number(form.sessionsPerWeek),
      };

      if (!isForClient) {
        if (editingTemplate) {
          await api.put(`/plan-templates/${editingTemplate._id}`, payload);
          if (settings?.system) toast.success('Template atualizado com sucesso!');
        } else {
          await api.post('/plan-templates', payload);
          if (settings?.system) toast.success('Template criado com sucesso!');
        }
      } else {
        if (!selectedClient) return toast.warn('Escolhe um cliente');
        await api.post('/plans', { ...payload, clientId: selectedClient });
        if (settings?.system) toast.success('Plano aplicado com sucesso!');
      }

      setEditingTemplate(null);
      closeForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Erro ao guardar');
    } finally {
      setSaving(false);
    }
  };

  // --- ALTERAÇÃO: Função que atualiza E ORDENA os dias ---
  const updateDayOfWeek = (index, value) => {
    const newDays = [...form.days];
    newDays[index].dayOfWeek = value;
    
    // Tenta ordenar se todos os dias estiverem preenchidos (opcional, ou ordena sempre)
    // Aqui vamos ordenar visualmente para o utilizador ver a mudança
    newDays.sort((a, b) => {
       // Dias sem nome vão para o fim
       if (!a.dayOfWeek) return 1;
       if (!b.dayOfWeek) return -1;
       return DAY_ORDER[a.dayOfWeek] - DAY_ORDER[b.dayOfWeek];
    });

    setForm({ ...form, days: newDays });
  };

  const addExercise = (dayIndex) => {
    if (form.days[dayIndex].exercises.length >= MAX_EXERCISES_PER_DAY) {
      toast.warn(`Máximo de ${MAX_EXERCISES_PER_DAY} exercícios por dia`);
      return;
    }
    const newDays = [...form.days];
    newDays[dayIndex].exercises.push({
      name: '', sets: 4, reps: '10-12', rest: '90s', notes: ''
    });
    setForm({ ...form, days: newDays });
  };

  const updateExercise = (dayIndex, exIndex, field, value) => {
    const newDays = [...form.days];
    newDays[dayIndex].exercises[exIndex][field] = value;
    setForm({ ...form, days: newDays });
  };

  const removeExercise = (dayIndex, exIndex) => {
    const newDays = [...form.days];
    newDays[dayIndex].exercises.splice(exIndex, 1);
    setForm({ ...form, days: newDays });
  };

  const handleDeleteClick = (template) => {
    setTemplateToDelete(template);
    setDeleteModalOpen(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    try {
      await api.delete(`/plan-templates/${templateToDelete._id}`);
      if (settings?.system) toast.success('Template apagado com sucesso!');
      fetchData();
    } catch (err) {
      toast.error('Erro ao apagar template.');
    } finally {
      setDeleteModalOpen(false);
      setTemplateToDelete(null);
    }
  };

  if (user?.role !== 'trainer') return <div className="container py-20 text-center"><h1>Acesso negado</h1></div>;

  return (
    <div className="trainer-plans-page">
      <section className="hero-trainer">
        <div className="container">
          <h1>Criar um Plano</h1>
          <p>Cria templates reutilizáveis ou planos diretos para os teus clientes</p>
          <div className="text-center mt-10">
            <button onClick={openForm} className="btn btn-primary large inline-flex items-center gap-3">
              <Plus size={28} />
              Novo Plano
            </button>
          </div>
        </div>
      </section>

      <div className="container py-20">

        {showForm && (
          <div className="template-form-card mb-16">
            <form onSubmit={handleSubmit}>
              <div className="text-center mb-8">
                <button type="button" onClick={() => setIsForClient(!isForClient)} className="toggle-mode-btn">
                  <div className={`toggle-switch ${isForClient ? 'active' : ''}`}>
                    <div className="switch-knob" />
                  </div>
                  <span className="toggle-label">
                    {isForClient ? 'Plano para cliente específico' : 'Template reutilizável'}
                  </span>
                </button>
              </div>

              {isForClient && (
                <div className="form-group mb-6">
                  <label className="block text-lg font-semibold mb-3">Cliente destino</label>
                  <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)} className="w-full max-w-md mx-auto" required>
                    <option value="">– Escolher cliente –</option>
                    {clients.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.profile?.name || c.username}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-grid">
                <div className="form-group">
                  <label>Nome do {editingTemplate ? 'Template' : isForClient ? 'Plano' : 'Template'}</label>
                  <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="ex: Hipertrofia Full Body" required />
                </div>
                <div className="form-group">
                  <label>Semanas</label>
                  <input type="number" min="1" value={form.weeks} onChange={e => setForm({ ...form, weeks: +e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Dias por semana</label>
                  <select value={form.sessionsPerWeek} onChange={handleSessionsChange}>
                    <option value={3}>3 dias</option>
                    <option value={4}>4 dias</option>
                    <option value={5}>5 dias</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Notas gerais (opcional)</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>

              <div className="days-section">
                <h3>{form.sessionsPerWeek} Dias de Treino</h3>
                {form.days.map((day, dayIndex) => (
                  <div key={dayIndex} className="day-block">
                    <div className="day-header">
                      <span className="day-label">Dia {dayIndex + 1}</span>
                      <select value={day.dayOfWeek} onChange={e => updateDayOfWeek(dayIndex, e.target.value)} required>
                        <option value="">– Escolher dia –</option>
                        {DAYS_OF_WEEK.map(d => (
                          <option key={d} value={d} disabled={form.days.some((dd, i) => i !== dayIndex && dd.dayOfWeek === d)}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="exercises-list">
                      {day.exercises.map((ex, exIndex) => (
                        <div key={exIndex} className="exercise-row">
                          <input placeholder="Exercício" value={ex.name} onChange={e => updateExercise(dayIndex, exIndex, 'name', e.target.value)} required />
                          <input type="number" min="1" placeholder="Séries" value={ex.sets} onChange={e => updateExercise(dayIndex, exIndex, 'sets', +e.target.value)} />
                          <input placeholder="Reps" value={ex.reps} onChange={e => updateExercise(dayIndex, exIndex, 'reps', e.target.value)} />
                          <input placeholder="Descanso" value={ex.rest || ''} onChange={e => updateExercise(dayIndex, exIndex, 'rest', e.target.value)} />
                          <input placeholder="Notas" value={ex.notes || ''} onChange={e => updateExercise(dayIndex, exIndex, 'notes', e.target.value)} />
                          <button
                            type="button"
                            onClick={() => removeExercise(dayIndex, exIndex)}
                            className="remove-exercise-btn"
                            title="Remover exercício"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ))}

                      {day.exercises.length < MAX_EXERCISES_PER_DAY && (
                        <button type="button" onClick={() => addExercise(dayIndex)} className="btn-outline small full-width mt-2">
                          <Plus size={16} /> Adicionar Exercício ({day.exercises.length}/{MAX_EXERCISES_PER_DAY})
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-actions">
                <button type="submit" disabled={saving} className="btn btn-primary large">
                  {saving ? <Loader2 className="spin" size={20} /> : editingTemplate ? <Save size={20} /> : <Plus size={20} />}
                  {saving ? 'A guardar...' : (editingTemplate ? 'Atualizar Template' : (isForClient ? 'Aplicar Plano ao Cliente' : 'Criar Template'))}
                </button>
                <button type="button" onClick={closeForm} className="btn btn-outline large">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        <h2 className="text-3xl font-bold mb-8">Meus Templates ({templates.length})</h2>
        {loading ? (
          <p className="text-center">A carregar templates...</p>
        ) : templates.length === 0 ? (
          <div className="empty-state text-center py-20">
            <p className="text-2xl text-gray-500">Ainda não tens templates criados.</p>
            <p className="text-lg mt-4">Clica em "Novo Plano" para começar</p>
          </div>
        ) : (
          <div className="templates-grid">
            {templates.map(tmpl => (
              <div key={tmpl._id} className="template-card">
                <h3>{tmpl.name}</h3>
                <div className="template-meta">
                  <span>{tmpl.weeks} semanas</span>
                  <span>{tmpl.sessionsPerWeek} dias/semana</span>
                  <span>{tmpl.days.reduce((a, d) => a + d.exercises.length, 0)} exercícios</span>
                </div>
                {tmpl.notes && <p className="template-notes">{tmpl.notes}</p>}
                <div className="template-actions">
                  <button onClick={() => editTemplate(tmpl)} className="btn-edit small">
                    <Edit size={18} /> Editar
                  </button>
                  <button onClick={() => handleDeleteClick(tmpl)} className="btn-danger small">
                    <Trash2 size={18} /> Apagar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteModalOpen && (
        <div className="modal-overlay" onClick={() => setDeleteModalOpen(false)}>
          <div className="modal-card delete-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-danger">
              <AlertTriangle size={32} />
              <h3>Apagar Template</h3>
            </div>
            <p className="modal-text">
              Tens a certeza que queres apagar o template <strong>{templateToDelete?.name}</strong>?
              <br/>Esta ação é irreversível.
            </p>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setDeleteModalOpen(false)}>Cancelar</button>
              <button className="btn danger" onClick={confirmDeleteTemplate}>Sim, Apagar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}