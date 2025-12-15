// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Função para carregar o user do backend (usada em todo lado)
  const loadUser = async () => {
    try {
      const res = await api.get('/users/me');
      setUser(res.data);
      return res.data;
    } catch (err) {
      logout();
      return null;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      loadUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (credentials) => {
    const resp = await api.post('/auth/login', credentials);
    const { token } = resp.data;
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return await loadUser();
  };

  const register = async (data) => {
    const payload = {
      username: data.username.trim(),
      password: data.password,
      role: data.role,
      profile: data.profile,
    };
    const resp = await api.post('/auth/register', payload);
    return resp.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  // SEMPRE recarrega do servidor após atualização
  const updateUser = async (updates) => {
    await api.patch('/users/me', updates);
    return await loadUser(); // ← FORÇA reload completo
  };

  const changePassword = async ({ currentPassword, newPassword, confirmPassword }) => {
    const resp = await api.patch('/users/me/password', {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return resp.data;
  };

  // Função pública para forçar reload (usada no PlanoDoDia e Profile)
  const refreshUser = () => loadUser();

  return (
    <AuthContext.Provider value={{
      user,
      login,
      register,
      logout,
      loading,
      updateUser,
      changePassword,
      refreshUser  // ← nova função exposta
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);