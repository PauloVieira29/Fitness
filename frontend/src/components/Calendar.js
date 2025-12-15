// src/components/Calendar.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './css/Calendar.css';

const Calendar = ({ clickableDays = [] }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthsPt = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const cells = [];
  let day = 1;
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDayOfMonth) {
        cells.push(<div key={`empty-${i}-${j}`} className="calendar-day empty"></div>);
      } else if (day > daysInMonth) {
        cells.push(<div key={`empty2-${i}-${j}`} className="calendar-day empty"></div>);
      } else {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        const hasWorkout = clickableDays.includes(dateStr);

        const dayContent = (
          <div className={`calendar-day ${isToday ? 'today' : ''} ${hasWorkout ? 'workout clickable' : ''}`}>
            <span className="day-number">{day}</span>
            {hasWorkout && <div className="workout-dot"></div>}
          </div>
        );

        cells.push(
          hasWorkout ? (
            <Link key={dateStr} to={`/plano/${dateStr}`} className="day-link">{dayContent}</Link>
          ) : (
            <div key={dateStr}>{dayContent}</div>
          )
        );
        day++;
      }
    }
    if (day > daysInMonth) break;
  }

  return (
    <div className="calendar">
      <div className="calendar-header">
        <button onClick={prevMonth}>←</button>
        <h4>{monthsPt[month]} {year}</h4>
        <button onClick={nextMonth}>→</button>
      </div>
      <div className="calendar-weekdays">
        {weekDays.map(d => <div key={d}>{d}</div>)}
      </div>
      <div className="calendar-days">{cells}</div>
    </div>
  );
};

export default Calendar;