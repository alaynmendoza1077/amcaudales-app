import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AuthModal from './AuthModal';
import UserProjectsModal from './UserProjectsModal';
import UpgradeProModal from './UpgradeProModal';

export default function NavbarUserHeader({ onSaveCloud, onLoadCloud }) {
  const { user, logout, isCloudConfigured, userPlan, cloudProjects } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProjectsModal, setShowProjectsModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const isGuest = Boolean(!user || user.isGuest || user.id === 'usr_guest' || user.email === 'invitado@amcaudales.com');
  const cloudCount = cloudProjects.filter(p => p.isCloud).length;

  const rawFullName = user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  let displayName = rawFullName;
  if (!displayName && user?.email) {
    if (user.email.endsWith('@amcaudales.com')) {
      displayName = user.email.replace('@amcaudales.com', '').toUpperCase();
    } else {
      displayName = user.email.split('@')[0];
    }
  }
  if (!displayName) displayName = 'Ingeniero';
  const avatarLetter = (displayName || 'U')[0].toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Error al cerrar sesión:', e);
    }
  };

  return (
    <>
      <header style={headerContainerStyle}>
        {/* LOGO & NOMBRE DEL SOFTWARE */}
        <div style={logoSectionStyle}>
          <div style={logoBadgeStyle}>AMC</div>
          <div>
            <h1 style={appTitleStyle}>AMCaudales Pro</h1>
            <span style={appTaglineStyle}>Software de Ingeniería Hidráulica & Presupuestos</span>
          </div>
        </div>

        {/* ACCIONES DE SESIÓN Y NAVEGACIÓN */}
        <div style={actionsSectionStyle}>
          {/* Botón de Mis Proyectos con Contador */}
          <button
            onClick={() => setShowProjectsModal(true)}
            style={cloudProjectsBtnStyle}
            title="Ver tus proyectos guardados (Locales y en la Nube)"
          >
            📂 Mis Proyectos
            {cloudProjects.length > 0 && (
              <span style={projectCountPillStyle}>{cloudProjects.length}</span>
            )}
          </button>

          {/* ESTADO 1: USUARIO AUTENTICADO (CON CUENTA) */}
          {!isGuest ? (
            <div style={userControlStyle}>
              {/* Tarjeta de Bienvenida con Nombre Completo y Correo */}
              <div
                style={welcomeCardStyle}
                title={`Sesión iniciada como: ${displayName} (${user.email})`}
              >
                <div style={userInitialStyle}>
                  {avatarLetter}
                </div>
                <div style={userTextColStyle}>
                  <div style={welcomeGreetingStyle}>
                    👋 ¡Bienvenido,{' '}
                    <strong style={{ color: '#38bdf8' }}>
                      {displayName}
                    </strong>!
                  </div>
                  <div style={userPlanSubtextStyle}>
                    {user?.isAdmin || user?.id === 'usr_super_admin' ? (
                      <span style={{ color: '#c084fc', fontWeight: 'bold' }}>👑 Super Administrador Master</span>
                    ) : userPlan === 'pro' ? (
                      <span style={{ color: '#34d399', fontWeight: 'bold' }}>
                        👑 Plan Pro ({cloudCount}/20 Proyectos al mes)
                      </span>
                    ) : (
                      <span style={{ color: '#fbbf24', fontWeight: '600' }}>
                        ⚡ Plan Gratis ({cloudCount}/1 Proyecto Nube)
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Botón para pasar a Pro si está en Plan Gratis */}
              {userPlan === 'free' && !user?.isAdmin && (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  style={upgradeHeaderBtnStyle}
                  title="Actualizar a Plan Pro para guardar hasta 20 proyectos al mes y exportar presupuestos oficiales"
                >
                  👑 Pasar a Pro
                </button>
              )}

              {/* Botón Cerrar Sesión */}
              <button
                onClick={handleLogout}
                style={logoutBtnStyle}
                title="Cerrar Sesión e ingresar con otra cuenta"
              >
                🚪 Salir
              </button>
            </div>
          ) : (
            /* ESTADO 2: MODO INVITADO (SIN CUENTA) */
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {/* Indicador llamativo de Modo Invitado */}
              <div
                onClick={() => setShowAuthModal(true)}
                style={guestCardStyle}
                title="Estás en Modo Invitado. Los cambios solo se guardan en este computador. Haz clic para Iniciar Sesión o Registrarte."
              >
                <span style={{ fontSize: '1.1rem' }}>👤</span>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.2', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#fbbf24' }}>
                    Modo Invitado (Sin Cuenta)
                  </span>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                    Proyectos solo en este PC
                  </span>
                </div>
              </div>

              {/* Botón Iniciar Sesión / Registrarse */}
              <button
                onClick={() => setShowAuthModal(true)}
                style={loginBtnStyle}
                title="Inicia sesión o crea tu cuenta para guardar en la Nube y abrir desde cualquier PC"
              >
                🔑 Iniciar Sesión / Registrarse
              </button>

              {/* Botón de acceso a Pro */}
              <button
                onClick={() => setShowUpgradeModal(true)}
                style={freeBadgeStyle}
                title="Conoce las ventajas del Plan Pro de AMCaudales"
              >
                ⚡ 1er Proy Gratis • Pro 👑
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Modales Globales */}
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
  minHeight: '64px',
  backgroundColor: '#0a1128',
  borderBottom: '1px solid rgba(59, 130, 246, 0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  color: '#ffffff',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
  zIndex: 100,
  flexWrap: 'wrap',
  gap: '12px'
};

const logoSectionStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px'
};

const logoBadgeStyle = {
  width: '38px',
  height: '38px',
  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '800',
  fontSize: '0.95rem',
  color: '#ffffff',
  boxShadow: '0 0 14px rgba(59, 130, 246, 0.45)'
};

const appTitleStyle = {
  fontSize: '1.15rem',
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
  gap: '10px',
  flexWrap: 'wrap'
};

const userControlStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap'
};

const cloudProjectsBtnStyle = {
  background: 'rgba(59, 130, 246, 0.15)',
  border: '1px solid #3b82f6',
  color: '#60a5fa',
  padding: '7px 14px',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.84rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.2)'
};

const projectCountPillStyle = {
  backgroundColor: '#3b82f6',
  color: '#ffffff',
  fontSize: '0.72rem',
  padding: '1px 6px',
  borderRadius: '10px',
  fontWeight: '800'
};

const welcomeCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  backgroundColor: 'rgba(15, 23, 42, 0.85)',
  border: '1px solid rgba(59, 130, 246, 0.35)',
  padding: '5px 14px',
  borderRadius: '12px',
  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
};

const userInitialStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '800',
  fontSize: '0.9rem',
  boxShadow: '0 2px 6px rgba(59, 130, 246, 0.4)'
};

const userTextColStyle = {
  display: 'flex',
  flexDirection: 'column',
  textAlign: 'left',
  lineHeight: '1.25'
};

const welcomeGreetingStyle = {
  fontSize: '0.84rem',
  fontWeight: '600',
  color: '#f8fafc'
};

const userPlanSubtextStyle = {
  fontSize: '0.7rem',
  marginTop: '1px'
};

const guestCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: 'rgba(245, 158, 11, 0.12)',
  border: '1px solid rgba(245, 158, 11, 0.4)',
  padding: '6px 12px',
  borderRadius: '10px',
  cursor: 'pointer',
  transition: 'border 0.2s'
};

const loginBtnStyle = {
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  color: '#ffffff',
  border: 'none',
  padding: '8px 16px',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.84rem',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
  whiteSpace: 'nowrap'
};

const upgradeHeaderBtnStyle = {
  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  color: '#ffffff',
  border: 'none',
  padding: '7px 12px',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.78rem',
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
  whiteSpace: 'nowrap'
};

const logoutBtnStyle = {
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid #ef4444',
  color: '#fca5a5',
  padding: '7px 12px',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.82rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};

const freeBadgeStyle = {
  background: 'rgba(245, 158, 11, 0.15)',
  border: '1px solid #f59e0b',
  color: '#fbbf24',
  padding: '6px 12px',
  borderRadius: '8px',
  fontSize: '0.78rem',
  fontWeight: '700',
  cursor: 'pointer',
  whiteSpace: 'nowrap'
};
