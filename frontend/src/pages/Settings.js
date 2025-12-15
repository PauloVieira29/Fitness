// src/pages/Settings.js
import React, { useContext } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useMeasurement } from '../context/MeasurementContext';
import { useAuth } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import './css/Settings.css';

export default function Settings() {
  const { theme, toggle } = useTheme();
  const {
    weightUnit, toggleWeightUnit,
    heightUnit, toggleHeightUnit
  } = useMeasurement();
  const { user } = useAuth();
  
  const { settings, updateSettings } = useContext(NotificationContext);

  const handleNotifToggle = (key) => {
    updateSettings({ [key]: !settings[key] });
  };

  return (
    <div className="settings-page">
      <div className="container">
        <h1 className="text-4xl font-bold mb-8">Definições</h1>

        {/* TEMA */}
        <div className="settings-card">
          <h2>Tema</h2>
          <button onClick={toggle} className="btn toggle-theme">
            {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
          </button>
        </div>

        {/* GRID RESPONSIVO: PESO + ALTURA */}
        <div className="units-grid">
          {/* PESO */}
          <div className="settings-card">
            <h2>Unidade de Peso</h2>
            <div className="flex flex-col gap-3">
              <label className="checkbox-label">
                <input type="radio" name="weight" checked={weightUnit === 'kg'} onChange={() => weightUnit !== 'kg' && toggleWeightUnit()} />
                Quilogramas (kg)
              </label>
              <label className="checkbox-label">
                <input type="radio" name="weight" checked={weightUnit === 'lbs'} onChange={() => weightUnit !== 'lbs' && toggleWeightUnit()} />
                Libras (lbs)
              </label>
            </div>
          </div>

          {/* ALTURA */}
          <div className="settings-card">
            <h2>Unidade de Altura</h2>
            <div className="flex flex-col gap-3">
              <label className="checkbox-label">
                <input type="radio" name="height" checked={heightUnit === 'cm'} onChange={() => heightUnit !== 'cm' && toggleHeightUnit()} />
                Centímetros (cm)
              </label>
              <label className="checkbox-label">
                <input type="radio" name="height" checked={heightUnit === 'ft'} onChange={() => heightUnit !== 'ft' && toggleHeightUnit()} />
                Pés e Polegadas (ft/in)
              </label>
            </div>
          </div>
        </div>

        {/* NOTIFICAÇÕES - ESCONDIDO PARA ADMINS */}
        {user && settings && user.role !== 'admin' && (
          <div className="settings-card">
            <h2>Notificações</h2>
            
            <label className="checkbox-label" style={{cursor: 'pointer'}}>
              <input 
                type="checkbox" 
                checked={settings.messages} 
                onChange={() => handleNotifToggle('messages')}
              /> 
              Mensagens (Chat)
            </label>

            <label className="checkbox-label" style={{cursor: 'pointer'}}>
              <input 
                type="checkbox" 
                checked={settings.plans} 
                onChange={() => handleNotifToggle('plans')}
              /> 
              Novos Planos
            </label>

            <label className="checkbox-label" style={{cursor: 'pointer'}}>
              <input 
                type="checkbox" 
                checked={settings.system} 
                onChange={() => handleNotifToggle('system')}
              /> 
              Avisos do Sistema
            </label>
          </div>
        )}
      </div>
    </div>
  );
}