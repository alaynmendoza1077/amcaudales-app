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

          {user ? (
            <div style={userControlStyle}>
              <button
                onClick={() => setShowProjectsModal(true)}
                style={cloudProjectsBtnStyle}
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

              <button onClick={logout} style={logoutBtnStyle} title="Cerrar Sesión">
                🚪 Salir
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={loginBtnStyle}
            >
              👤 Iniciar Sesión / Registro
            </button>
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

const headerContainerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 24px',
  backgroundColor: '#0b0f19',
  borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  color: '#ffffff',
  fontFamily: "'Inter', sans-serif"
};

const logoSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const logoBadgeStyle = {
  width: '38px',
  height: '38px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '800',
  fontFamily: "'Outfit', sans-serif",
  fontSize: '0.9rem',
  color: '#ffffff',
  boxShadow: '0 0 15px rgba(0, 198, 255, 0.4)'
};

const appTitleStyle = {
  fontSize: '1.2rem',
  fontWeight: '700',
  fontFamily: "'Outfit', sans-serif",
  margin: 0,
  color: '#ffffff'
};

const appTaglineStyle = {
  fontSize: '0.72rem',
  color: '#64748b',
  display: 'block'
};

const actionsSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '14px'
};

const proBadgeStyle = {
  fontSize: '0.75rem',
  fontWeight: '700',
  backgroundColor: 'rgba(245, 158, 11, 0.15)',
  border: '1px solid rgba(245, 158, 11, 0.4)',
  color: '#fbbf24',
  padding: '5px 12px',
  borderRadius: '20px'
};

const freeBadgeStyle = {
  fontSize: '0.75rem',
  fontWeight: '700',
  backgroundColor: 'rgba(56, 189, 248, 0.12)',
  border: '1px solid rgba(56, 189, 248, 0.3)',
  color: '#38bdf8',
  padding: '5px 12px',
  borderRadius: '20px',
  cursor: 'pointer'
};

const offlineBadgeStyle = {
  fontSize: '0.72rem',
  backgroundColor: 'rgba(234, 179, 8, 0.15)',
  border: '1px solid rgba(234, 179, 8, 0.3)',
  color: '#facc15',
  padding: '4px 8px',
  borderRadius: '6px'
};

const loginBtnStyle = {
  padding: '8px 16px',
  backgroundColor: '#2563eb',
  backgroundImage: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontWeight: '600',
  fontSize: '0.85rem',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0, 114, 255, 0.3)'
};

const userControlStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const cloudProjectsBtnStyle = {
  padding: '6px 14px',
  backgroundColor: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid rgba(16, 185, 129, 0.4)',
  borderRadius: '8px',
  color: '#34d399',
  fontWeight: '600',
  fontSize: '0.82rem',
  cursor: 'pointer'
};

const userAvatarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: '#1e293b',
  padding: '4px 10px 4px 4px',
  borderRadius: '20px',
  border: '1px solid #334155'
};

const userInitialStyle = {
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  backgroundColor: '#3b82f6',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.78rem',
  fontWeight: '700',
  color: '#ffffff'
};

const userNameStyle = {
  fontSize: '0.82rem',
  fontWeight: '500',
  color: '#e2e8f0'
};

const logoutBtnStyle = {
  background: 'none',
  border: '1px solid #334155',
  borderRadius: '6px',
  color: '#94a3b8',
  padding: '6px 10px',
  fontSize: '0.8rem',
  cursor: 'pointer'
};
