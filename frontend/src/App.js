// src/App.js
import React from 'react';
import { ModalProvider } from './context/ModalContext';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MeasurementProvider } from './context/MeasurementContext';
import { NotificationProvider } from './context/NotificationContext';
import { ChatProvider } from './context/ChatContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';
import LandingPage from './pages/LandingPage';
import HomeLoggedIn from './pages/ClientHome';
import TrainerHome from './pages/TrainerHome';
import ClientDashboard from './pages/ClientDashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import TrainerList from './pages/TrainerList';
import TrainerClients from './pages/TrainerClients';
import TrainerProfile from './pages/TrainerProfile';
import ClientProfileTrainerView from './pages/ClientProfileTrainerView';
import AdminPanel from './pages/AdminPanel';
import Planos from './pages/Planos';
import TrainerPlans from './pages/TrainerPlans';
import PlanoDoDia from './pages/PlanoDoDia';
import Auth from './pages/Auth';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">Carregando...</div>;
  return user ? children : <Navigate to="/auth" replace />;
};

function HomeRoute() {
  const { user } = useAuth();
  if (!user) return <LandingPage />;
  if (user.role === 'admin') return <AdminPanel />;
  if (user.role === 'trainer') return <TrainerHome />;
  return <HomeLoggedIn />;
}

function TrainersOrClientsRoute() {
  const { user } = useAuth();
  if (user?.role === 'trainer') return <TrainerClients />;
  return <TrainerList />;
}

function PlanosRoute() {
  const { user } = useAuth();
  if (user?.role === 'trainer') {
    return <TrainerPlans />;
  }
  return <Planos />;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/home" element={<HomeRoute />} />
        
        <Route path="/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        <Route path="/client/:id/dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
        
        <Route path="/auth" element={<Auth />} />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/register" element={<Navigate to="/auth?register" replace />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/trainers" element={<ProtectedRoute><TrainersOrClientsRoute /></ProtectedRoute>} />
        <Route path="/trainer/:id" element={<TrainerProfile />} />
        <Route path="/client/:id" element={<ProtectedRoute><ClientProfileTrainerView /></ProtectedRoute>} />
        <Route path="/planos" element={<ProtectedRoute><PlanosRoute /></ProtectedRoute>} />
        <Route path="/plano/:date" element={<ProtectedRoute><PlanoDoDia /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ChatWidget />

      <ToastContainer 
        position="top-right" 
        autoClose={3000} 
        hideProgressBar={false}
        theme="colored"
      />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <MeasurementProvider>
        <AuthProvider>
          {/* CORREÇÃO: ChatProvider deve envolver o NotificationProvider */}
          <ChatProvider>
            <NotificationProvider>
              <ModalProvider>
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </ModalProvider>
            </NotificationProvider>
          </ChatProvider>
        </AuthProvider>
      </MeasurementProvider>
    </ThemeProvider>
  );
}