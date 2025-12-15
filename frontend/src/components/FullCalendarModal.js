// src/components/FullCalendarModal.js
import React from 'react';
import Calendar from './Calendar';
import './css/Calendar.css';

const FullCalendarModal = ({ isOpen, onClose, clickableDays = [] }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕</button>
        <Calendar clickableDays={clickableDays} />
      </div>
    </div>
  );
};

export default FullCalendarModal;