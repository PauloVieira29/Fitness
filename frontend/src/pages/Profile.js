// src/pages/Profile.js
import React, { useState, useEffect, useRef, useContext } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMeasurement } from '../context/MeasurementContext';
import { NotificationContext } from '../context/NotificationContext';
import { toast } from 'react-toastify';
import api from '../services/api';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import QRCode from 'react-qr-code';
import ClientDashboardStats from '../components/ClientDashboardStats';
import './css/Profile.css';

export default function Profile() {
  const { user, updateUser, refreshUser, logout } = useAuth();
  const {
    convertWeight, convertWeightFromDisplay, weightDisplayUnit,
    convertHeight, convertHeightFromDisplay, formatHeight, heightUnit
  } = useMeasurement();

  const { settings } = useContext(NotificationContext);

  const [editMode, setEditMode] = useState(false);
  const [showPasswordCard, setShowPasswordCard] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false); // <--- Novo State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '', email: '', bio: '', goal: 'Perder peso',
    weight: '', height: '', birthDate: ''
  });

  const [heightFeet, setHeightFeet] = useState('');
  const [heightInches, setHeightInches] = useState('');
  const [selectedSpecialties, setSelectedSpecialties] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loadingSpecialties, setLoadingSpecialties] = useState(true);
  const [searchSpec, setSearchSpec] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('/images/default-avatar.jpg');
  const [trainer, setTrainer] = useState(null);
  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState(null);

  if (!user) {
    return <div className="profile-page"><div className="profile-container">A carregar perfil...</div></div>;
  }

  useEffect(() => {
    const handleUserUpdate = () => {
      refreshUser();
    };
    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  useEffect(() => {
    if (!user?.profile) return;

    const heightData = user.profile.height ? convertHeight(user.profile.height) : null;

    setFormData({
      name: user.profile.name || user.username || '',
      email: user.profile.email || '',
      bio: user.profile.bio || '',
      goal: user.profile.goal || 'Perder peso',
      weight: user.profile.weight ? convertWeight(user.profile.weight).toFixed(1) : '',
      height: heightData && heightUnit === 'cm' ? heightData : '',
      birthDate: user.profile.birthDate ? user.profile.birthDate.split('T')[0] : '',
    });

    if (heightData && heightUnit === 'ft') {
      setHeightFeet(heightData.feet || '');
      setHeightInches(heightData.inches || '');
    }

    setAvatarPreview(
      user.profile.avatarUrl
        ? `${user.profile.avatarUrl}?w=200&h=200&f=auto&q=auto&crop=fill&gravity=face`
        : '/images/default-avatar.jpg'
    );

    if (user.role === 'client' && user.trainerAssigned) {
      api.get(`/users/trainers/${user.trainerAssigned}`)
        .then(res => setTrainer(res.data))
        .catch(() => setTrainer(null));
    }

    if (user.role === 'trainer') {
      api.get('/specialties')
        .then(res => {
          setSpecialties(res.data || []);
          setLoadingSpecialties(false);
        })
        .catch(() => setLoadingSpecialties(false));

      if (user.profile.specialties) {
        setSelectedSpecialties(user.profile.specialties.map(s => s._id || s));
      }
    }
  }, [user, convertWeight, convertHeight, heightUnit]);

  useEffect(() => {
    if (success) setTimeout(() => setSuccess(''), 5000);
    if (error) setTimeout(() => setError(''), 5000);
  }, [success, error]);

  const generateQrCode = async () => {
    if (showQr) {
      setShowQr(false);
      setQrData(null);
      return;
    }
    try {
      const res = await api.get('/users/me/qr-login');
      const payload = JSON.stringify({
        username: res.data.username,
        password: res.data.code
      });
      setQrData(payload);
      setShowQr(true);
      setSuccess('QR Code gerado! Escaneia para login rápido.');
    } catch (err) {
      setError('Erro ao gerar QR Code. Tenta novamente.');
    }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);

    setUploading(true);
    const formDataUpload = new FormData();
    formDataUpload.append('avatar', file);

    try {
      const res = await api.post('/users/me/avatar', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setAvatarPreview(`${res.data.avatarUrl}?w=200&h=200&f=auto&q=auto&crop=fill&gravity=face`);
      if (settings?.system) toast.success('Foto atualizada!');
      window.dispatchEvent(new Event('userUpdated'));
    } catch (err) {
      setError('Erro ao fazer upload da foto');
    } finally {
      setUploading(false);
    }
  };

  const toggleSpecialty = (specId) => {
    setSelectedSpecialties(prev =>
      prev.includes(specId)
        ? prev.filter(id => id !== specId)
        : [...prev, specId]
    );
  };

  const filteredSpecialties = specialties.filter(s =>
    s.name.toLowerCase().includes(searchSpec.toLowerCase())
  );

  const handleSave = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      let heightInCm = null;
      if (heightUnit === 'cm' && formData.height) heightInCm = parseInt(formData.height);
      else if (heightUnit === 'ft' && heightFeet && heightInches)
        heightInCm = convertHeightFromDisplay(parseInt(heightFeet), parseInt(heightInches));

      const updates = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        bio: formData.bio.trim(),
        goal: formData.goal,
        weight: formData.weight ? convertWeightFromDisplay(parseFloat(formData.weight)) : null,
        height: heightInCm,
        birthDate: formData.birthDate || null,
      };

      if (user.role === 'trainer') updates.specialties = selectedSpecialties;

      await updateUser(updates);
      if (settings?.system) toast.success('Perfil atualizado com sucesso!');
      setEditMode(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao guardar alterações');
    } finally {
      setLoading(false);
    }
  };

  // --- NOVA FUNÇÃO: DESATIVAR CONTA ---
  const handleDeactivateAccount = async (e) => {
    e.preventDefault();
    const password = e.target.password.value;
    
    if (!password) return setError('Introduz a tua password para confirmar.');

    setLoading(true);
    try {
        await api.post('/auth/deactivate', { password });
        toast.info('A tua conta foi desativada.');
        logout(); // Faz logout imediato
    } catch (err) {
        setError(err.response?.data?.message || 'Erro ao desativar conta.');
        setLoading(false);
    }
  };

  const chartData = user.profile?.weightHistory
    ? user.profile.weightHistory
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map(entry => ({
          date: format(new Date(entry.date), 'dd MMM', { locale: pt }),
          weight: convertWeight(entry.weight)
        }))
    : [];

  const weightDiff = user.profile?.weightLost || 0;
  let weightMessage = '';
  let weightColor = '#666';

  if (weightDiff > 0) {
    weightMessage = `Perdeste ${weightDiff.toFixed(1)} kg desde o início!`;
    weightColor = '#10b981';
  } else if (weightDiff < 0) {
    weightMessage = `Ganhaste ${Math.abs(weightDiff).toFixed(1)} kg desde o início`;
    weightColor = '#ef4444';
  } else if (weightDiff === 0 && user.profile?.initialWeight) {
    weightMessage = 'Mantiveste o peso desde o início';
    weightColor = '#64748b';
  }

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* QR CODE SECTION */}
        <div className="qr-section" style={{ margin: '2rem 0', textAlign: 'center', padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '16px' }}>
          <h3>Login Rápido com QR Code</h3>
          <button type="button" className="btn primary" onClick={generateQrCode} disabled={loading} style={{ marginBottom: '1rem' }}>
            {showQr ? 'Esconder QR Code' : 'Gerar QR Code para Login'}
          </button>
          {showQr && qrData && (
            <div style={{ padding: '1.5rem', background: 'white', borderRadius: '12px', display: 'inline-block' }}>
              <QRCode value={qrData} size={220} />
              <p style={{ marginTop: '1rem', fontSize: '0.95rem', color: '#444' }}>
                Escaneia com o teu telemóvel na página de login
              </p>
            </div>
          )}
        </div>

        <div className="profile-header">
          <div className="avatar-large" onClick={editMode ? handleAvatarClick : undefined}>
            <img src={avatarPreview} alt="Avatar" />
            {editMode && <div className="avatar-overlay">Alterar foto</div>}
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
          </div>

          <div className="profile-info">
            <h1>{formData.name || user.username}</h1>
            <p className="role">
              {user.role === 'admin' ? 'Administrador' : user.role === 'trainer' ? 'Treinador' : 'Cliente'}
            </p>
            {user.role === 'client' && trainer && (
              <div style={{ marginTop: '1rem', fontSize: '1.1rem' }}>
                <strong>Treinador:</strong> {trainer.profile.name}
              </div>
            )}
          </div>
        </div>

        {editMode ? (
          <div className="profile-form">
            <h2>Editar Perfil</h2>
            <input type="text" placeholder="Nome completo" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            <input type="email" placeholder="Email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
            <textarea placeholder="Bio" rows="4" value={formData.bio} onChange={e => setFormData({ ...formData, bio: e.target.value })} />
            <select value={formData.goal} onChange={e => setFormData({ ...formData, goal: e.target.value })}>
              <option value="Perder peso">Perder peso</option>
              <option value="Ganhar massa muscular">Ganhar massa muscular</option>
              <option value="Manter forma">Manter forma</option>
            </select>

            <div className="grid grid-cols-2">
              <input type="number" placeholder={`Peso (${weightDisplayUnit})`} value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} />
              {heightUnit === 'cm' ? (
                <input type="number" placeholder="Altura (cm)" value={formData.height} onChange={e => setFormData({ ...formData, height: e.target.value })} />
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input type="number" placeholder="Pés" value={heightFeet} onChange={e => setHeightFeet(e.target.value)} />
                  <input type="number" placeholder="Polegadas" value={heightInches} onChange={e => setHeightInches(e.target.value)} />
                </div>
              )}
            </div>

            <input type="date" value={formData.birthDate} onChange={e => setFormData({ ...formData, birthDate: e.target.value })} />

            {user.role === 'trainer' && (
              <div className="specialty-selector">
                <label>Especialidades</label>
                <input type="text" placeholder="Procurar especialidade..." value={searchSpec} onChange={e => setSearchSpec(e.target.value)} />
                <div className="specialty-grid">
                  {filteredSpecialties.map(spec => (
                    <label key={spec._id} className="specialty-checkbox">
                      <input type="checkbox" checked={selectedSpecialties.includes(spec._id)} onChange={() => toggleSpecialty(spec._id)} />
                      <span>{spec.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="error-alert">{error}</div>}

            <div className="button-group">
              <button onClick={handleSave} className="btn primary large" disabled={loading}>
                {loading ? 'A guardar...' : 'Guardar Alterações'}
              </button>
              <button onClick={() => setEditMode(false)} className="btn secondary large">Cancelar</button>
            </div>

            <div style={{ marginTop: '2rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                <button onClick={() => setShowPasswordCard(true)} className="btn secondary large" style={{ width: '100%' }}>
                    Alterar Password
                </button>
                <button 
                    onClick={() => setShowDeactivateModal(true)} 
                    className="btn danger large" 
                    style={{ marginTop: '1rem', width: '100%' }}
                >
                    Desativar Conta
                </button>
            </div>
          </div>
        ) : (
          <>
            <div className="profile-details">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Sobre Mim</h2>
                <button onClick={() => setEditMode(true)} className="btn primary">Editar Perfil</button>
              </div>

              <p>{formData.bio || 'Ainda não tens uma bio.'}</p>

              <div className="details-grid">
                {user.role === 'client' && <div><strong>Objetivo:</strong> {formData.goal}</div>}
                {user.role === 'trainer' && user.profile?.specialties?.length > 0 && (
                  <div>
                    <strong>Especialidades:</strong>
                    <div style={{ marginTop: '0.5rem' }}>
                      {user.profile.specialties.map(spec => (
                        <span key={spec._id} className="ms-tag" style={{ marginRight: '0.5rem', marginBottom: '0.4rem' }}>
                          {spec.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div><strong>Peso:</strong> {formData.weight || '-'} {weightDisplayUnit}</div>
                <div><strong>Altura:</strong> {formatHeight(user.profile?.height)}</div>
                <div>
                  <strong>Data de nascimento:</strong>{' '}
                  {user.profile?.birthDate ? new Date(user.profile.birthDate).toLocaleDateString('pt-PT') : 'Não definida'}
                </div>
              </div>
            </div>

            <div className="progress-section">
              <h2>Evolução do Peso</h2>
              {user.role === 'client' && chartData.length > 0 ? (
                <div style={{ marginTop: '2rem' }}>
                  <div style={{ width: '100%', height: 340 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" stroke="#e0e0e0" />
                        <XAxis dataKey="date" tick={{ fontSize: 13 }} />
                        <YAxis domain={['dataMin - 3', 'dataMax + 3']} tick={{ fontSize: 13 }} />
                        <Tooltip formatter={(value) => `${value.toFixed(1)} ${weightDisplayUnit}`} />
                        <Line type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={4} dot={{ fill: '#10b981', r: 7 }} activeDot={{ r: 9 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--card-bg)', borderRadius: '16px', marginTop: '1.5rem' }}>
                    <p style={{ margin: '0.5rem 0', fontSize: '1.1rem' }}>
                      <strong>Peso atual:</strong> {convertWeight(user.profile.weight).toFixed(1)} {weightDisplayUnit}
                      {user.profile.lastWeightUpdate && (
                        <span style={{ color: '#666', fontSize: '0.9rem', marginLeft: '0.5rem' }}>
                          (atualizado {format(new Date(user.profile.lastWeightUpdate), "dd/MM 'às' HH:mm", { locale: pt })})
                        </span>
                      )}
                    </p>

                    {user.profile.initialWeight && weightMessage && (
                      <p style={{ color: weightColor, fontWeight: '800', fontSize: '1.5rem', marginTop: '1rem' }}>
                        {weightMessage}
                      </p>
                    )}
                  </div>
                </div>
              ) : user.role === 'client' ? (
                <p style={{ textAlign: 'center', color: '#888', fontStyle: 'italic', padding: '3rem 0' }}>
                  Regista o teu peso para veres a evolução!
                </p>
              ) : null}
            </div>

            {user.role === 'client' && (
                <div className="history-section-profile" style={{marginTop:'3rem'}}>
                    <h2 style={{marginBottom:'1rem'}}>O Meu Histórico de Treinos</h2>
                    <ClientDashboardStats clientId={user._id} />
                </div>
            )}
          </>
        )}

        {/* MODAL MUDAR PASSWORD */}
        {showPasswordCard && (
          <div className="modal-overlay" onClick={() => setShowPasswordCard(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <h2>Alterar Password</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setError(''); setSuccess('');
                const currentPassword = e.target.currentPassword.value.trim();
                const newPassword = e.target.newPassword.value.trim();
                const confirmPassword = e.target.confirmPassword.value.trim();

                if (!currentPassword || !newPassword || !confirmPassword) return setError('Todos os campos são obrigatórios');
                if (newPassword.length < 6) return setError('A nova password deve ter pelo menos 6 caracteres');
                if (newPassword !== confirmPassword) return setError('As novas passwords não coincidem');

                setLoading(true);
                try {
                  await api.patch('/users/me/password', { currentPassword, newPassword, confirmPassword });
                  if (settings?.system) toast.success('Password alterada com sucesso!');
                  setTimeout(() => { setShowPasswordCard(false); e.target.reset(); }, 2000);
                } catch (err) {
                  setError(err.response?.data?.message || 'Erro ao alterar password');
                } finally {
                  setLoading(false);
                }
              }}>
                <input type="password" placeholder="Password atual" name="currentPassword" required autoComplete="current-password" />
                <input type="password" placeholder="Nova password" name="newPassword" required autoComplete="new-password" />
                <input type="password" placeholder="Confirmar nova password" name="confirmPassword" required autoComplete="new-password" />

                {error && <div className="error-alert">{error}</div>}

                <div className="button-group">
                  <button type="submit" className="btn primary" disabled={loading}>{loading ? 'A alterar...' : 'Confirmar'}</button>
                  <button type="button" className="btn secondary" onClick={() => setShowPasswordCard(false)}>Cancelar</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- MODAL DESATIVAR CONTA --- */}
        {showDeactivateModal && (
          <div className="modal-overlay" onClick={() => setShowDeactivateModal(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()} style={{border: '2px solid #ef4444'}}>
              <h2 style={{color: '#ef4444'}}>Desativar Conta</h2>
              <p>Tem a certeza que deseja desativar a sua conta? O seu perfil deixará de ser visível. Para reativar, basta fazer login novamente.</p>
              
              <form onSubmit={handleDeactivateAccount} style={{marginTop: '1rem'}}>
                  <label style={{display: 'block', marginBottom: '0.5rem'}}>Confirme a sua password:</label>
                  <input type="password" name="password" placeholder="Sua password atual" required />
                  
                  {error && <div className="error-alert">{error}</div>}
                  
                  <div className="button-group">
                      <button type="submit" className="btn danger" disabled={loading}>
                          {loading ? 'A desativar...' : 'Sim, Desativar'}
                      </button>
                      <button type="button" className="btn secondary" onClick={() => setShowDeactivateModal(false)}>Cancelar</button>
                  </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}