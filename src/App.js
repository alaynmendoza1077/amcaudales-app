import React, { useState, Suspense, lazy } from 'react';
import HomeDashboard from './components/HomeDashboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import NavbarUserHeader from './components/NavbarUserHeader';
import StartLoginPortal from './components/StartLoginPortal';
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

function AppContent() {
  const { user, saveProjectToCloud, userPlan, loginAsGuest } = useAuth();
  const [isGuest, setIsGuest] = useState(false);
  const [activeModule, setActiveModule] = useState('home');
  const [initialData, setInitialData] = useState(null);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedFeatureName, setBlockedFeatureName] = useState('');

  // Si el usuario no ha iniciado sesión ni ha entrado como invitado, muestra el portal obligatoriamente
  if (!user && !isGuest) {
    return (
      <StartLoginPortal
        onGuestAccess={() => {
          loginAsGuest();
          setIsGuest(true);
        }}
      />
    );
  }

  const handleSetModule = (mod, data = null) => {
    // Restricción por módulos según plan
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
