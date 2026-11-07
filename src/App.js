import React, { useState, Suspense, lazy } from 'react';
import HomeDashboard from './components/HomeDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavbarUserHeader from './components/NavbarUserHeader';
import StartLoginPortal from './components/StartLoginPortal';
import AuthModal from './components/AuthModal';
import LandingPage from './components/LandingPage';
import NewProjectModal from './components/NewProjectModal';
import UpgradeProModal from './components/UpgradeProModal';

// Helper para cargar módulos lazy con reintento automático si falla el chunk (evita ChunkLoadError)
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const pageHasRefreshed = JSON.parse(
      window.sessionStorage.getItem('chunk_refresh_retry') || 'false'
    );
    try {
      const component = await componentImport();
      window.sessionStorage.setItem('chunk_refresh_retry', 'false');
      return component;
    } catch (error) {
      if (!pageHasRefreshed) {
        window.sessionStorage.setItem('chunk_refresh_retry', 'true');
        window.location.reload();
      }
      throw error;
    }
  });

// Lazy loading de módulos pesados con recuperador automático
const ReposicionModule = lazyWithRetry(() => import('./modules/ReposicionModule'));
const ExpressModule = lazyWithRetry(() => import('./modules/ExpressModule'));
const PresupuestoModule = lazyWithRetry(() => import('./modules/PresupuestoModule'));

// Fallback de carga (Loader Profesional)
const Loader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'radial-gradient(circle at 50% 40%, #0a1738 0%, #050a15 100%)',
    color: '#ffffff',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '2rem'
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      border: '4px solid rgba(59, 130, 246, 0.2)',
      borderTop: '4px solid #38bdf8',
      borderRadius: '50%',
      animation: 'amcSpin 0.9s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      marginBottom: '1.5rem',
      boxShadow: '0 0 25px rgba(56, 189, 248, 0.35)'
    }} />
    <style>{`
      @keyframes amcSpin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '4px 12px',
      background: 'rgba(59, 130, 246, 0.15)',
      border: '1px solid rgba(59, 130, 246, 0.4)',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: '700',
      color: '#38bdf8',
      marginBottom: '0.8rem',
      letterSpacing: '0.05em'
    }}>
      ☁️ NUBE AMCaudales Pro
    </div>
    <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 0.5rem 0' }}>
      Conectando Sesión...
    </h2>
    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0, textAlign: 'center' }}>
      Sincronizando credenciales de Google y proyectos en la nube.
    </p>
  </div>
);

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error capturado en GlobalErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = window.location.origin;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#050a15',
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            border: '1px solid #3b82f6',
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '540px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
          }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.8rem' }}>🚀</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#38bdf8', margin: '0 0 0.8rem 0' }}>
              AMCaudales Pro • Entorno Restablecido
            </h2>
            <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Se ha optimizado el rendimiento. Haz clic abajo para volver inmediatamente a tu panel de trabajo sin perder tu sesión.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  backgroundColor: '#3b82f6',
                  backgroundImage: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  padding: '12px 28px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
                }}
              >
                ⚡ Ingresar al Módulo Activo
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { user, saveProjectToCloud, userPlan, loginAsGuest, loading, oauthBanner, setOauthBanner } = useAuth();
  const [activeModule, setActiveModule] = useState('home');
  const [initialData, setInitialData] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedFeatureName, setBlockedFeatureName] = useState('');
  const [showLoginPortal, setShowLoginPortal] = useState(false);

  const prevUserRef = React.useRef(user);
  React.useEffect(() => {
    // Solo regresar a 'home' si el usuario cerró sesión expresamente (pasó de tener usuario a null)
    if (prevUserRef.current && !user) {
      setActiveModule('home');
      setInitialData(null);
    }
    prevUserRef.current = user;
  }, [user]);

  const renderOAuthBanner = () => {
    if (!oauthBanner) return null;
    const isError = oauthBanner.type === 'error';
    return (
      <div style={{
        position: 'fixed',
        top: '18px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999999,
        maxWidth: '92%',
        width: '580px',
        padding: '16px 20px',
        borderRadius: '14px',
        backgroundColor: isError ? 'rgba(30, 10, 18, 0.95)' : 'rgba(10, 30, 20, 0.95)',
        border: isError ? '1px solid #ef4444' : '1px solid #10b981',
        boxShadow: '0 20px 45px rgba(0, 0, 0, 0.8), 0 0 25px ' + (isError ? 'rgba(239, 68, 68, 0.35)' : 'rgba(16, 185, 129, 0.35)'),
        backdropFilter: 'blur(12px)',
        color: '#ffffff',
        fontFamily: '"Inter", -apple-system, sans-serif'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.25rem' }}>{isError ? '⚠️' : '✅'}</span>
            <strong style={{ fontSize: '1rem', color: isError ? '#fca5a5' : '#86efac' }}>
              {oauthBanner.title || (isError ? 'Aviso de Acceso' : 'Sesión Confirmada')}
            </strong>
          </div>
          <button
            onClick={() => setOauthBanner(null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.3rem',
              cursor: 'pointer',
              lineHeight: '1',
              padding: '0 4px'
            }}
          >
            ×
          </button>
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.88rem', color: '#f1f5f9', lineHeight: '1.45' }}>
          {oauthBanner.message}
        </p>
        {oauthBanner.details && (
          <pre style={{
            margin: 0,
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.75rem',
            color: '#cbd5e1',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '110px',
            overflowY: 'auto'
          }}>
            {oauthBanner.details}
          </pre>
        )}
      </div>
    );
  };

  const handleSetModule = (mod, data = null) => {
    if ((mod === 'presupuesto') && userPlan === 'free') {
      setBlockedFeatureName('Cantidades y Presupuestos de Obra');
      setShowUpgradeModal(true);
      return;
    }

    if (mod === 'nuevo_proyecto') {
      setShowNewProjectModal(true);
      return;
    }

    setInitialData(data);
    setActiveModule(mod);
  };

  const handleStartProjectData = (projectSetup) => {
    handleSetModule('reposicion', { type: 'setup', projectSetup });
  };

  const handleSaveCloud = async (title, forceOverwrite = false) => {
    let currentPayload = null;
    try {
      const raw = localStorage.getItem('AMC_current_project_state');
      if (raw) currentPayload = JSON.parse(raw);
    } catch (e) {
      console.warn('No se pudo extraer estado directo:', e);
    }

    if (!currentPayload) {
      currentPayload = { title, created_at: new Date().toISOString(), version: '3.0' };
    }
    if (currentPayload.P) {
      currentPayload.P.proyecto = title;
    }

    return await saveProjectToCloud(currentPayload, title, null, forceOverwrite);
  };

  const handleLoadCloud = (projectDataPayload) => {
    handleSetModule('reposicion', { type: 'amc_payload', content: projectDataPayload });
  };

  const renderModule = () => {
    switch (activeModule) {
      case 'reposicion':
        return <ReposicionModule onBack={() => handleSetModule('home')} initialData={initialData} />;
      case 'express':
        return <ExpressModule onBack={() => handleSetModule('home')} />;
      case 'presupuesto':
        return <ReposicionModule onBack={() => handleSetModule('home')} initialData={{ type: 'setup', projectSetup: { flowStage: 'quantities', tab: 'pre' } }} />;
      case 'home':
      default:
        return <HomeDashboard setModule={handleSetModule} />;
    }
  };

  // Mientras se verifica la sesión guardada, mostrar loader
  if (loading) {
    return <Loader />;
  }

  // ── Si NO hay usuario autenticado: Mostrar Landing Page con Modal de Acceso ──
  if (!user) {
    return (
      <>
        {renderOAuthBanner()}
        <LandingPage
          onStartTrial={() => {
            loginAsGuest();
          }}
          onOpenExpress={() => {
            loginAsGuest();
            setActiveModule('express');
          }}
          onOpenLogin={() => setShowLoginPortal(true)}
          onOpenProModal={() => setShowUpgradeModal(true)}
        />

        <AuthModal
          isOpen={showLoginPortal}
          onClose={() => setShowLoginPortal(false)}
        />

        <UpgradeProModal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          featureName={blockedFeatureName}
        />
      </>
    );
  }

  // ── Si HAY usuario autenticado: Mostrar App completa ──
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#050a15' }}>
      {renderOAuthBanner()}
      <NavbarUserHeader
        onSaveCloud={handleSaveCloud}
        onLoadCloud={handleLoadCloud}
      />

      <main style={{ flex: 1 }}>
        <Suspense fallback={<Loader />}>
          {renderModule()}
        </Suspense>
      </main>

      {/* Modales de Proyecto y Actualización de Plan Pro */}
      <NewProjectModal
        isOpen={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        onStartProject={handleStartProjectData}
      />

      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName={blockedFeatureName}
      />
    </div>
  );
}

export default function App() {
  return (
    <GlobalErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </GlobalErrorBoundary>
  );
}
