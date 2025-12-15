import React from 'react';
import { useTheme } from '../context/ThemeContext';
export default function Dashboard(){
  const { theme, toggle } = useTheme();
  return (
    <div style={{padding:20}}>
      <h1>Dashboard</h1>
      <p>Current theme: {theme}</p>
      <button onClick={toggle}>Toggle theme</button>
    </div>
  );
}
