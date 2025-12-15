// src/pages/Auth.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMeasurement } from '../context/MeasurementContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Scanner } from '@yudiel/react-qr-scanner';
import api from '../services/api'; // Necessário para chamada direta de reativação
import './css/Auth.css';

export default function Auth() {
  const { login, register, setToken, setUser } = useAuth(); // Precisei desestruturar setToken/setUser do contexto ou usar api direta
  const {
    convertWeightFromDisplay, weightDisplayUnit,
    convertHeightFromDisplay, heightUnit
  } = useMeasurement();
  const navigate = useNavigate();
  const location = useLocation();

  const isInitiallyRegister = new URLSearchParams(location.search).has('register');
  const [isRegister, setIsRegister] = useState(isInitiallyRegister);

  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    role: 'client',
    bio: '',
    goal: 'Perder peso',
    weight: '',
    height: '',
    age: '',
  });

  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  // --- STATE para Modal de Reativação ---
  const [showReactivateModal, setShowReactivateModal] = useState(false);
  const [credentialsForReactivation, setCredentialsForReactivation] = useState(null);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (location.state?.success && !isRegister) {
      setSuccess('Conta criada com sucesso! Já podes fazer login.');
    }
  }, [location.state, isRegister]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegister) {
        // ... (Lógica de registo mantém-se igual) ...
        if (form.password !== form.confirmPassword)
          throw new Error('As passwords não coincidem.');
        if (form.password.length < 6)
          throw new Error('A password deve ter pelo menos 6 caracteres.');

        const trimmed = {
          name: form.name.trim(),
          email: form.email.trim(),
          username: form.username.trim(),
          bio: form.bio.trim(),
        };

        if (!trimmed.name || !trimmed.email || !trimmed.username || !form.password)
          throw new Error('Preenche todos os campos obrigatórios.');

        let heightInCm = null;
        if (heightUnit === 'cm' && form.height) {
          heightInCm = parseInt(form.height);
        } else if (heightUnit === 'ft' && heightFeet && heightInches) {
          heightInCm = convertHeightFromDisplay(parseInt(heightFeet), parseInt(heightInches));
        }

        const weightVal = form.weight ? convertWeightFromDisplay(parseFloat(form.weight)) : null;
        const ageVal = form.age ? parseInt(form.age) : null;

        await register({
          username: trimmed.username,
          password: form.password,
          role: form.role,
          profile: {
            name: trimmed.name,
            email: trimmed.email,
            bio: trimmed.bio,
            goal: form.goal,
            weight: weightVal,
            height: heightInCm,
            age: ageVal,
          },
        });

        setForm((prev) => ({
          ...prev,
          username: trimmed.username,
          password: '',
          confirmPassword: '',
          name: '',
          email: '',
          bio: '',
          goal: 'Perder peso',
          weight: '',
          height: '',
          age: '',
        }));
        setHeightFeet('');
        setHeightInches('');
        setIsRegister(false);
        navigate('/auth', { replace: true, state: { success: true } });
      } else {
        // LOGIN
        const trimmedUsername = form.username.trim();
        if (!trimmedUsername || !form.password)
          throw new Error('Username e password são obrigatórios.');

        try {
            await login({
              username: trimmedUsername,
              password: form.password,
            });
            navigate('/home');
        } catch (loginErr) {
            // --- DETEÇÃO DE CONTA DESATIVADA ---
            if (loginErr.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
                setCredentialsForReactivation({ username: trimmedUsername, password: form.password });
                setShowReactivateModal(true);
                setLoading(false);
                return; // Pára aqui e espera input do utilizador
            }
            throw loginErr; // Relança outros erros
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      setError(msg || 'Ocorreu um erro. Tenta novamente.');
    } finally {
      if (!showReactivateModal) setLoading(false);
    }
  };

  const handleReactivateConfirm = async () => {
      setLoading(true);
      try {
          // Chamada direta para reativar
          const res = await api.post('/auth/reactivate', credentialsForReactivation);
          
          // Login manual após reativação (atualizar contexto)
          localStorage.setItem('token', res.data.token);
          // Nota: O useAuth deve ter um método para atualizar o estado sem chamar a API de novo,
          // ou podemos fazer reload, ou chamar refreshUser.
          // Assumindo que o login() do contexto faz setItem e setUser:
          window.location.href = '/home'; 
          
      } catch (err) {
          setError(err.response?.data?.message || 'Erro ao reativar conta.');
          setShowReactivateModal(false);
      } finally {
          setLoading(false);
      }
  };

  const handleCancel = () => navigate('/');

  const handleQrScan = (detectedCodes) => {
    if (detectedCodes.length === 0) return;
    const result = detectedCodes[0];
    if (!result?.rawValue) return;

    try {
      const data = JSON.parse(result.rawValue);
      const { username, password } = data;
      if (!username || !password) throw new Error('Dados inválidos no QR');

      setLoading(true);
      login({ username, password, isQrCode: true })
        .then(() => navigate('/home'))
        .catch((err) => {
             if (err.response?.data?.code === 'ACCOUNT_DEACTIVATED') {
                setCredentialsForReactivation({ username, password });
                setShowReactivateModal(true);
                setShowScanner(false);
             } else {
                setError(err.response?.data?.message || 'QR code inválido');
             }
        })
        .finally(() => {
          if(!showReactivateModal) setLoading(false);
        });
    } catch {
      setError('QR code mal formatado');
      setShowScanner(false);
    }
  };

  const toggleMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setSuccess('');
    setForm({
      username: '',
      password: '',
      confirmPassword: '',
      name: '',
      email: '',
      role: 'client',
      bio: '',
      goal: 'Perder peso',
      weight: '',
      height: '',
      age: '',
    });
    setHeightFeet('');
    setHeightInches('');
    navigate(isRegister ? '/auth' : '/auth?register', { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <h1>{isRegister ? 'Criar Conta Grátis' : 'Bem-vindo de Volta'}</h1>
          <p className="subtitle">
            {isRegister
              ? 'Junta-te à comunidade fitness!'
              : 'Entra na tua conta para continuares o treino.'}
          </p>

          {error && <div className="error-alert">{error}</div>}
          {success && <div className="success-alert">{success}</div>}

          {!isRegister && !showScanner && (
            <button
              type="button"
              className="btn secondary large qr-btn"
              onClick={() => setShowScanner(true)}
              disabled={loading}
            >
              Ou entra com QR Code
            </button>
          )}

          {showScanner && (
            <div className="qr-scanner-container">
              <Scanner
                onScan={handleQrScan}
                onError={(err) => {
                  console.error('Erro no scanner:', err);
                  setError('Erro ao aceder à câmara. Verifica permissões.');
                  setShowScanner(false);
                }}
                constraints={{ facingMode: 'environment' }}
                containerStyle={{ width: '100%', height: '300px' }}
              />
              <button
                type="button"
                className="btn secondary large"
                onClick={() => setShowScanner(false)}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            {isRegister ? (
              <div className="register-fields">
                <div className="role-selector">
                  <label>
                    <input
                      type="radio"
                      name="role"
                      value="client"
                      checked={form.role === 'client'}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                    />
                    <span>Sou Cliente</span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="role"
                      value="trainer"
                      checked={form.role === 'trainer'}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                    />
                    <span>Sou Personal Trainer</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Nome completo"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  autoComplete="username"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="new-password"
                />
                <input
                  type="password"
                  placeholder="Confirmar Password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                  autoComplete="new-password"
                />
                <div className="optional-profile-fields">
                  <div className="section-title">Completa o teu perfil (opcional)</div>
                  <select value={form.goal} onChange={(e) => setForm({ ...form, goal: e.target.value })}>
                    <option>Perder peso</option>
                    <option>Ganhar massa muscular</option>
                    <option>Melhorar resistência</option>
                    <option>Manutenção</option>
                  </select>
                  <input 
                    type="number" 
                    placeholder={`Peso (${weightDisplayUnit})`} 
                    value={form.weight} 
                    onChange={(e) => setForm({ ...form, weight: e.target.value })} 
                  />
                  {heightUnit === 'cm' ? (
                    <input 
                      type="number" 
                      placeholder="Altura (cm)" 
                      value={form.height} 
                      onChange={(e) => setForm({ ...form, height: e.target.value })} 
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <input 
                        type="number" 
                        placeholder="Pés (ft)" 
                        value={heightFeet} 
                        onChange={(e) => setHeightFeet(e.target.value)} 
                        min="4" max="8"
                      />
                      <input 
                        type="number" 
                        placeholder="Polegadas (in)" 
                        value={heightInches} 
                        onChange={(e) => setHeightInches(e.target.value)} 
                        min="0" max="11"
                      />
                    </div>
                  )}
                  <input type="number" placeholder="Idade" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} />
                  <textarea placeholder="Bio (opcional)" rows="3" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="login-fields">
                <input
                  type="text"
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  required
                  autoComplete="username"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                />
              </div>
            )}

            <div className="button-group">
              <button
                type="submit"
                className="btn primary large"
                disabled={loading}
              >
                {loading
                  ? 'A processar...'
                  : isRegister
                  ? 'Criar Conta'
                  : 'Entrar'}
              </button>
              <button
                type="button"
                className="btn secondary large"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar
              </button>
            </div>
          </form>

          <div className="toggle-auth">
            <p>
              {isRegister ? 'Já tens conta?' : 'Novo por aqui?'}{' '}
              <button type="button" className="link-btn" onClick={toggleMode}>
                {isRegister ? 'Faz Login' : 'Cria Conta Grátis'}
              </button>
            </p>
          </div>
        </div>

        {/* --- MODAL REATIVAR CONTA --- */}
        {showReactivateModal && (
          <div className="modal-overlay">
            <div className="modal-card">
              <h2>Conta Desativada</h2>
              <p>Esta conta encontra-se desativada. Desejas reativá-la agora?</p>
              <div className="button-group" style={{marginTop:'1.5rem'}}>
                <button onClick={handleReactivateConfirm} className="btn primary" disabled={loading}>
                   {loading ? 'A reativar...' : 'Sim, Reativar Conta'}
                </button>
                <button onClick={() => { setShowReactivateModal(false); setLoading(false); }} className="btn secondary">
                   Não, Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}