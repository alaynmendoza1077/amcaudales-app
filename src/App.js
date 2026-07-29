import React, { useState, Suspense, lazy } from 'react';
import HomeDashboard from './components/HomeDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavbarUserHeader from './components/NavbarUserHeader';
import StartLoginPortal from './components/StartLoginPortal';
import LandingPage from './components/LandingPage';
import NewProjectModal from './components/NewProjectModal';
import UpgradeProModal from './components/UpgradeProModal';

// Lazy loading de módulos pesados
const ReposicionModule = lazy(() => import('./modules/ReposicionModule'));
const ExpressModule = lazy(() => import('./modules/ExpressModule'));
const PresupuestoModule = lazy(() => import('./modules/PresupuestoModule'));

// Fallback de carga (Loader)
const Loader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#050a15', color: '#60a5fa', fontSize: '1.5rem', fontFamily: 'sans-serif' }}>
    Cargando módulo...
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
    console.error("Error en GlobalErrorBoundary:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem('amcaudales_user_session');
    } catch(e){}
    window.location.reload();
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
            backgroundColor: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '2.5rem',
            maxWidth: '600px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#60a5fa', margin: '0 0 1rem 0' }}>
              AMCaudales Pro • Acceso a la Plataforma
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
              Haz clic en el botón para ingresar directamente a la plataforma y restablecer el entorno de trabajo.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={this.handleReset}
                style={{
                  backgroundColor: '#3b82f6',
                  color: '#ffffff',
                  fontWeight: 'bold',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.95rem'
                }}
              >
                🚀 Ingresar Directamente a AMCaudales
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
  const { user, saveProjectToCloud, userPlan, loginAsGuest, loading } = useAuth();
  const [activeModule, setActiveModule] = useState('home');
  const [initialData, setInitialData] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedFeatureName, setBlockedFeatureName] = useState('');
  const [showLoginPortal, setShowLoginPortal] = useState(false);

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

  const handleSaveCloud = async (title) => {
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

    await saveProjectToCloud(currentPayload, title);
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
        return <PresupuestoModule onBack={() => handleSetModule('home')} />;
      case 'home':
      default:
        return <HomeDashboard setModule={handleSetModule} />;
    }
  };

  // Mientras se verifica la sesión guardada, mostrar loader
  if (loading) {
    return <Loader />;
  }

  // ── Si NO hay usuario autenticado: Mostrar Landing Page ──
  if (!user) {
    return (
      <>
        {showLoginPortal ? (
          <StartLoginPortal
            onGuestAccess={() => {
              loginAsGuest();
              setShowLoginPortal(false);
            }}
          />
        ) : (
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
        )}

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
