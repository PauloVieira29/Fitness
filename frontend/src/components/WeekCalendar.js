// src/components/WeekCalendar.js
import React from 'react';
import { Link } from 'react-router-dom';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { pt } from 'date-fns/locale';
import './css/Calendar.css';

const WeekCalendar = ({ clickableDays = [] }) => {
  const today = new Date();
  const start = startOfWeek(today, { weekStartsOn: 1 });

  const weekDaysPt = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(start, i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayNum = date.getDate();
    const weekDayName = weekDaysPt[i];
    const isTodayFlag = isToday(date);
    const hasWorkout = clickableDays.includes(dateStr);

    if (hasWorkout) {
      days.push(
        <Link key={i} to={`/plano/${dateStr}`} className="week-day workout clickable">
          <span className="weekday">{weekDayName}</span>
          <span className="daynum">{dayNum}</span>
          <div className="workout-dot"></div>
        </Link>
      );
    } else {
      days.push(
        <div key={i} className={`week-day ${isTodayFlag ? 'today' : ''}`}>
          <span className="weekday">{weekDayName}</span>
          <span className="daynum">{dayNum}</span>
        </div>
      );
    }
  }

  return (
    <div className="week-calendar">
      <div className="week-header">
        <h3>Semana Atual</h3>
        <span className="click-hint">Clica para ver o mês completo</span>
      </div>
      <div className="week-days">{days}</div>
    </div>
  );
};

export default WeekCalendar;