// src/components/Navbar.js
import React, { useState, useContext, useRef, useEffect } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { NotificationContext } from '../context/NotificationContext';
import { useChat } from '../context/ChatContext';
import { FaBell } from 'react-icons/fa';
import './css/Navbar.css';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAsRead } = useContext(NotificationContext);
  const { openChatWith } = useChat();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
  const notifRef = useRef(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path) => location.pathname.startsWith(path) ? 'active' : '';
  const avatarUrl = user?.profile?.avatarUrl || '/images/default-avatar.jpg';
  const trainersButtonText = user?.role === 'trainer' ? 'Clientes' : 'Trainers';

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
    setMobileOpen(false);
  };

  const handleNotificationClick = (notif) => {
    markAsRead(notif._id);
    
    if (notif.type === 'message' && notif.relatedId) {
        openChatWith({ _id: notif.relatedId });
    } else if (notif.type === 'plan') {
        navigate('/planos');
    }
    
    setShowNotifDropdown(false);
  };

  const handleDismiss = (e, notifId) => {
    e.stopPropagation(); 
    markAsRead(notifId); 
  };

  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <nav className="navbar">
      <div className="container navbar-content">
        <div className="nav-left">
          <Link to={user ? '/home' : '/'} className="logo">FitTrainer</Link>
        </div>

        <div className="nav-right desktop">
          {user && (
            <NavLink to="/profile" className="avatar-right">
              <img src={avatarUrl} alt="Perfil" />
            </NavLink>
          )}

          {user && user.role !== 'admin' && (
            <>
              <NavLink to="/trainers" className={`nav-btn ${isActive('/trainers') || isActive('/client')}`}>
                {trainersButtonText}
              </NavLink>
              <NavLink to="/planos" className={`nav-btn ${isActive('/planos') || isActive('/plano')}`}>
                Planos
              </NavLink>
            </>
          )}

          <NavLink to="/settings" className={`nav-btn ${isActive('/settings')}`}>
            Definições
          </NavLink>

          {/* SINO DE NOTIFICAÇÕES - APENAS PARA NÃO-ADMINS */}
          {user && user.role !== 'admin' && (
            <div ref={notifRef} style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: '10px', marginRight: '10px' }}>
                <button 
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  style={{ 
                    background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', 
                    position: 'relative', display: 'flex', alignItems: 'center', padding: '5px'
                  }}
                  title="Notificações"
                >
                  <FaBell size={20} />
                  {unreadCount > 0 && (
                    <span style={{
                      position: 'absolute', top: 0, right: 0, 
                      backgroundColor: 'red', color: 'white', borderRadius: '50%', 
                      padding: '2px 5px', fontSize: '10px', fontWeight: 'bold',
                      minWidth: '15px', textAlign: 'center'
                    }}>
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div className="notification-dropdown" style={{
                    position: 'absolute', right: '-80px', top: '45px', 
                    backgroundColor: 'white', border: '1px solid #ddd', borderRadius: '8px',
                    width: '320px', zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    color: '#333', display: 'flex', flexDirection: 'column'
                  }}>
                    <div style={{ padding: '12px', borderBottom: '1px solid #eee', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', borderTopLeftRadius: '8px', borderTopRightRadius: '8px' }}>
                      <span>Notificações</span>
                      <small onClick={() => setShowNotifDropdown(false)} style={{cursor:'pointer', padding:'5px'}}>✕</small>
                    </div>
                    
                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                      {unreadNotifications.length === 0 ? (
                        <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                          <p>Sem novas notificações.</p>
                        </div>
                      ) : (
                        unreadNotifications.map(notif => (
                          <div key={notif._id} 
                               onClick={() => handleNotificationClick(notif)}
                               style={{
                                   padding: '12px', 
                                   backgroundColor: '#e6f7ff', 
                                   borderBottom: '1px solid #eee',
                                   fontSize: '14px',
                                   cursor: 'pointer',
                                   transition: 'background 0.2s',
                                   position: 'relative'
                               }}
                               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d0efff'}
                               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e6f7ff'}
                           >
                              <div style={{ marginBottom: '4px', display:'flex', alignItems:'center', justifyContent: 'space-between' }}>
                                <div style={{ fontWeight: 'bold', display:'flex', alignItems:'center', gap:'5px' }}>
                                    {notif.type === 'message' ? '💬' : notif.type === 'plan' ? '📅' : '🔔'}
                                    {notif.type === 'message' ? 'Mensagem' : notif.type === 'plan' ? 'Plano' : 'Aviso'}
                                </div>
                                <button 
                                    onClick={(e) => handleDismiss(e, notif._id)}
                                    title="Marcar como lida"
                                    style={{
                                        background: 'transparent', border: 'none', color: '#999', 
                                        fontWeight: 'bold', cursor: 'pointer', fontSize: '14px',
                                        padding: '0 5px', lineHeight: '1'
                                    }}
                                    onMouseEnter={(e) => e.target.style.color = '#ff4d4f'}
                                    onMouseLeave={(e) => e.target.style.color = '#999'}
                                >
                                    ✕
                                </button>
                              </div>

                              <p style={{ margin: '0 0 5px 0', color: '#444' }}>{notif.content}</p>
                              <small style={{ color: '#888', fontSize: '11px' }}>
                                  {new Date(notif.createdAt).toLocaleDateString()} às {new Date(notif.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </small>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          {user ? (
            <button onClick={handleLogout} className="nav-btn logout">Sair</button>
          ) : (
            <Link to="/auth" className="nav-btn login-btn">Entrar</Link>
          )}
        </div>

        <button className="mobile-toggle" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Menu">
          {mobileOpen ? '×' : 'Menu'}
        </button>
      </div>

      {mobileOpen && (
        <div className="mobile-menu">
          <div className="mobile-links">
            {user ? (
              <>
                <NavLink to="/profile" className="nav-btn" onClick={() => setMobileOpen(false)}>
                  <img src={avatarUrl} alt="Perfil" className="avatar-mobile" /> Perfil
                </NavLink>
                {user.role !== 'admin' && (
                  <>
                    <NavLink to="/trainers" className="nav-btn" onClick={() => setMobileOpen(false)}>{trainersButtonText}</NavLink>
                    <NavLink to="/planos" className="nav-btn" onClick={() => setMobileOpen(false)}>Planos</NavLink>
                  </>
                )}
                <NavLink to="/settings" className="nav-btn" onClick={() => setMobileOpen(false)}>Definições</NavLink>
                 
                 {/* No Mobile, também escondemos se for admin */}
                 {user.role !== 'admin' && (
                    <div className="nav-btn" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                        <span>Notificações ({unreadCount})</span>
                    </div>
                 )}

                <button onClick={handleLogout} className="nav-btn logout full">Sair</button>
              </>
            ) : (
              <Link to="/auth" className="nav-btn full" onClick={() => setMobileOpen(false)}>Entrar</Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}