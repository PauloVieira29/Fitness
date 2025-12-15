// src/components/ClientDashboardStats.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Calendar as CalendarIcon, ArrowUpDown } from 'lucide-react';
import './css/ClientDashboardStats.css';

export default function ClientDashboardStats({ clientId }) {
  // --- ESTADOS DO GRÁFICO ---
  const [chartData, setChartData] = useState([]);
  const [period, setPeriod] = useState('week'); // 'week' | 'month'
  
  // --- ESTADOS DO HISTÓRICO ---
  const [history, setHistory] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    sort: 'desc'
  });
  
  const [loading, setLoading] = useState(true);

  // Carregar dados
  useEffect(() => {
    if (clientId) {
        fetchStats();
        fetchHistory();
    }
  }, [clientId, period, filters]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/entries/stats', {
        params: { client: clientId, period }
      });
      
      const formatted = res.data.map(item => {
        let label = item._id;
        if (period === 'month') {
           const [year, month] = item._id.split('-');
           const date = new Date(year, month - 1);
           label = format(date, 'MMM yyyy', { locale: pt });
        } else {
           label = `Sem ${item._id.split('-')[1]}`;
        }
        return {
          name: label,
          treinos: item.count,
          calorias: item.calories
        };
      });
      setChartData(formatted);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await api.get('/entries', {
        params: {
          client: clientId,
          startDate: filters.startDate,
          endDate: filters.endDate,
          sort: filters.sort
        }
      });
      setHistory(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="dashboard-stats-container">
      
      {/* --- SECÇÃO GRÁFICO --- */}
      <div className="stats-card chart-section">
        <div className="card-header">
          <h3>Evolução de Treinos</h3>
          <div className="period-toggle">
            <button 
              className={period === 'week' ? 'active' : ''} 
              onClick={() => setPeriod('week')}
            >
              Semana
            </button>
            <button 
              className={period === 'month' ? 'active' : ''} 
              onClick={() => setPeriod('month')}
            >
              Mês
            </button>
          </div>
        </div>

        <div className="chart-wrapper">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  cursor={{ fill: 'transparent' }}
                />
                <Bar dataKey="treinos" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.treinos >= 4 ? '#10b981' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
             <div className="no-data-chart">
               <p>Sem dados suficientes para gerar gráfico.</p>
             </div>
          )}
        </div>
      </div>

      {/* --- SECÇÃO HISTÓRICO --- */}
      <div className="stats-card history-section">
        <div className="card-header">
          <h3>Histórico Detalhado</h3>
          <span className="count-badge">{history.length} registos</span>
        </div>

        {/* Filtros */}
        <div className="filters-bar">
          <div className="filter-group">
            <CalendarIcon size={16} />
            <input 
              type="date" 
              name="startDate" 
              value={filters.startDate} 
              onChange={handleFilterChange} 
            />
            <span>até</span>
            <input 
              type="date" 
              name="endDate" 
              value={filters.endDate} 
              onChange={handleFilterChange} 
            />
          </div>
          
          <div className="filter-group sort-group">
            <ArrowUpDown size={16} />
            <select name="sort" value={filters.sort} onChange={handleFilterChange}>
              <option value="desc">Mais recente</option>
              <option value="asc">Mais antigo</option>
            </select>
          </div>
        </div>

        {/* Lista */}
        <div className="history-list">
          {loading ? (
            <p className="loading-text">A carregar histórico...</p>
          ) : history.length === 0 ? (
            <div className="empty-history">
              <p>Nenhum treino encontrado.</p>
            </div>
          ) : (
            history.map(entry => (
              <div key={entry._id} className={`history-item ${entry.completed ? 'completed' : 'skipped'}`}>
                <div className="history-date">
                  <span className="day">{format(parseISO(entry.date), 'dd')}</span>
                  <span className="month">{format(parseISO(entry.date), 'MMM', { locale: pt })}</span>
                </div>
                
                <div className="history-details">
                  <h4>
                    {entry.completed ? 'Treino Concluído' : 'Treino Falhado'}
                    {entry.caloriesBurned > 0 && <span className="cal-tag">{entry.caloriesBurned} kcal</span>}
                  </h4>
                  <p className="notes">
                    {entry.notes || (entry.completed ? 'Sem notas.' : 'Motivo não especificado.')}
                  </p>
                </div>

                <div className="history-status">
                   {entry.completed ? (
                     <span className="status-pill success">Feito</span>
                   ) : (
                     <span className="status-pill danger">Falhou</span>
                   )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}