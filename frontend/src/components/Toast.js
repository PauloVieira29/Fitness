// src/components/Toast.js
import React, { useEffect } from 'react';
import './css/Toast.css';

export default function Toast({ message, type, onClose }) {
  useEffect(() => {
    // Fecha automaticamente após 4 segundos
    const timer = setTimeout(() => {
      onClose();
    }, 4000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">
        <span className="toast-icon">
          {type === 'success' ? '✓' : '⚠️'}
        </span>
        <p>{message}</p>
      </div>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  );
}