import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import UserProjectsModal from './UserProjectsModal';
import UpgradeProModal from './UpgradeProModal';

export default function NavbarUserHeader({ onSaveCloud, onLoadCloud }) {
  const { user, logout, isCloudConfigured, userPlan } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  return (
    <>
      <header style={headerContainerStyle}>
        <div style={logoSectionStyle}>
          <div style={logoBadgeStyle}>AMC</div>
          <div>
            <h1 style={appTitleStyle}>AMCaudales Pro</h1>
            <span style={appTaglineStyle}>Software de Ingeniería Hidráulica & Presupuestos</span>
          </div>
        </div>

        <div style={actionsSectionStyle}>
          {/* Badge del Plan (Pro vs Free) */}
          {userPlan === 'pro' ? (
            <span style={proBadgeStyle} title="Tienes acceso ilimitado a todas las herramientas Pro">
              👑 Plan Pro Activo
            </span>
          ) : (
            <button
              onClick={() => setShowUpgradeModal(true)}
              style={freeBadgeStyle}
              title="Haz clic para actualizar a Plan Pro y desbloquear Presupuestos, Excel y AutoCAD"
            >
              ⚡ Plan Gratis • Actualizar 👑
            </button>
          )}

          {!isCloudConfigured && (
            <span style={offlineBadgeStyle} title="Conecta Supabase para guardar en base de datos PostgreSQL real">
              Mode: Session Local
            </span>
          )}

          {user && !user.isGuest && user.email !== 'Usuario Invitado' ? (
            <div style={userControlStyle}>
              <button
                onClick={() => setShowProjectsModal(true)}
                style={cloudProjectsBtnStyle}
                title="Ver tus proyectos alojados en la Nube de Supabase"
              >
                ☁️ Mis Proyectos
              </button>

              <div style={userAvatarStyle}>
                <span style={userInitialStyle}>
                  {(user.user_metadata?.full_name || user.email || 'U')[0].toUpperCase()}
                </span>
                <span style={userNameStyle}>
                  {user.user_metadata?.full_name || user.email.split('@')[0]}
                </span>
              </div>

              <button onClick={logout} style={logoutBtnStyle} title="Cerrar Sesión y Salir">
                🚪 Salir
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setShowProjectsModal(true)}
                style={cloudProjectsBtnStyle}
                title="Ver proyectos alojados en la nube"
              >
                ☁️ Mis Proyectos
              </button>
              
              <div 
                onClick={() => setShowAuthModal(true)}
                style={{ ...userAvatarStyle, cursor: 'pointer', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid #334155' }}
                title="Haz clic para iniciar sesión con tu cuenta"
              >
                <span style={userInitialStyle}>U</span>
                <span style={userNameStyle}>Usuario Invitado</span>
              </div>

              <button
                onClick={() => setShowAuthModal(true)}
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)'
                }}
              >
                🔑 Iniciar Sesión / Registrarse
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Modales de Autenticación, Proyectos y Plan Pro */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      <UserProjectsModal
        isOpen={showProjectsModal}
        onClose={() => setShowProjectsModal(false)}
        onLoadProject={onLoadCloud}
        onSaveCurrentProject={onSaveCloud}
      />

      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}

// ── ESTILOS CSS-IN-JS DE LA BARRA DE NAVEGACIÓN ──
const headerContainerStyle = {
  height: '60px',
  backgroundColor: '#0a1128',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  color: '#ffffff',
  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
  zIndex: 100
};

const logoSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const logoBadgeStyle = {
  width: '36px',
  height: '36px',
  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '800',
  fontSize: '0.9rem',
  color: '#ffffff',
  boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)'
};

const appTitleStyle = {
  fontSize: '1.1rem',
  fontWeight: '800',
  margin: 0,
  background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  lineHeight: 1
};

const appTaglineStyle = {
  fontSize: '0.72rem',
  color: '#94a3b8',
  display: 'block',
  marginTop: '2px'
};

const actionsSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const proBadgeStyle = {
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid #10b981',
  color: '#10b981',
  padding: '4px 10px',
  borderRadius: '20px',
  fontSize: '0.78rem',
  fontWeight: '700'
};

const freeBadgeStyle = {
  background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.3))',
  border: '1px solid #f59e0b',
  color: '#fbbf24',
  padding: '5px 12px',
  borderRadius: '20px',
  fontSize: '0.78rem',
  fontWeight: '700',
  cursor: 'pointer',
  transition: 'transform 0.2s'
};

const offlineBadgeStyle = {
  background: 'rgba(148, 163, 184, 0.15)',
  border: '1px solid #64748b',
  color: '#cbd5e1',
  padding: '4px 8px',
  borderRadius: '6px',
  fontSize: '0.72rem'
};

const userControlStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px'
};

const cloudProjectsBtnStyle = {
  background: 'rgba(59, 130, 246, 0.15)',
  border: '1px solid #3b82f6',
  color: '#60a5fa',
  padding: '6px 12px',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.82rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
};

const userAvatarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: 'rgba(255, 255, 255, 0.05)',
  padding: '4px 10px',
  borderRadius: '20px',
  border: '1px solid rgba(255, 255, 255, 0.1)'
};

const userInitialStyle = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  background: '#3b82f6',
  color: 'white',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 'bold',
  fontSize: '0.75rem'
};

const userNameStyle = {
  fontSize: '0.82rem',
  fontWeight: '600',
  color: '#f8fafc'
};

const logoutBtnStyle = {
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid #ef4444',
  color: '#fca5a5',
  padding: '6px 12px',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.82rem',
  cursor: 'pointer'
};

const loginBtnStyle = {
  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  color: 'white',
  border: 'none',
  padding: '7px 14px',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.85rem',
  cursor: 'pointer'
};
