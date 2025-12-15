// src/context/MeasurementContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const MeasurementContext = createContext();

export const useMeasurement = () => useContext(MeasurementContext);

export const MeasurementProvider = ({ children }) => {
  const [weightUnit, setWeightUnit] = useState(() => localStorage.getItem('weightUnit') || 'kg');
  const [heightUnit, setHeightUnit] = useState(() => localStorage.getItem('heightUnit') || 'cm');

  useEffect(() => {
    localStorage.setItem('weightUnit', weightUnit);
  }, [weightUnit]);

  useEffect(() => {
    localStorage.setItem('heightUnit', heightUnit);
  }, [heightUnit]);

  const toggleWeightUnit = () => {
    setWeightUnit(prev => (prev === 'kg' ? 'lbs' : 'kg'));
  };

  const toggleHeightUnit = () => {
    setHeightUnit(prev => (prev === 'cm' ? 'ft' : 'cm'));
  };

  // === PESO ===
  const convertWeight = (kg) => {
    if (kg === null || kg === undefined) return null;
    return weightUnit === 'kg' ? parseFloat(kg) : parseFloat((kg * 2.20462).toFixed(2));
  };

  const convertWeightFromDisplay = (display) => {
    if (display === null || display === undefined) return null;
    return weightUnit === 'kg' ? parseFloat(display) : parseFloat((display / 2.20462).toFixed(2));
  };

  const weightDisplayUnit = weightUnit === 'kg' ? 'kg' : 'lbs';

  // === ALTURA ===
  const convertHeight = (cm) => {
    if (cm === null || cm === undefined) return null;
    if (heightUnit === 'cm') return parseFloat(cm);

    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return { feet, inches };
  };

  const convertHeightFromDisplay = (feet, inches) => {
    if (feet === null || inches === null) return null;
    const totalInches = (feet * 12) + inches;
    return Math.round(totalInches * 2.54);
  };

  const formatHeight = (cm) => {
    if (cm === null || cm === undefined) return '-';
    if (heightUnit === 'cm') return `${cm} cm`;
    const { feet, inches } = convertHeight(cm);
    return `${feet}'${inches}"`;
  };

  const heightDisplayUnit = heightUnit === 'cm' ? 'cm' : 'ft/in';

  return (
    <MeasurementContext.Provider value={{
      // Peso
      weightUnit,
      toggleWeightUnit,
      convertWeight,
      convertWeightFromDisplay,
      weightDisplayUnit,

      // Altura
      heightUnit,
      toggleHeightUnit,
      convertHeight,
      convertHeightFromDisplay,
      formatHeight,
      heightDisplayUnit
    }}>
      {children}
    </MeasurementContext.Provider>
  );
};