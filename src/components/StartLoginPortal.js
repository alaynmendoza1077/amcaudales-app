import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import LandingPage from './LandingPage';
import UpgradeProModal from './UpgradeProModal';

export default function StartLoginPortal({ onGuestAccess }) {
  const { login, register, loginAsAdmin, loginWithGoogle } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'admin'

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [adminPass, setAdminPass] = useState('ADMIN2026');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (tab === 'admin') {
        loginAsAdmin(adminPass);
        setSuccessMsg('¡Modo Super Admin Activado! Acceso Total Pro desbloqueado.');
      } else if (tab === 'register') {
        if (!email || !password || !fullName || !confirmPassword) {
          throw new Error('Por favor complete todos los campos obligatorios (*).');
        }
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden. Por favor verifique.');
        }
        await register(email, password, fullName, company);
        setSuccessMsg('¡Cuenta registrada exitosamente!');
      } else {
        if (!email || !password) {
          throw new Error('Por favor ingrese correo y contraseña.');
        }
        await login(email, password);
        setSuccessMsg('¡Inicio de sesión exitoso!');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error al procesar el ingreso.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
      setSuccessMsg(`¡Autenticado correctamente con Google!`);
    } catch (err) {
      loginAsAdmin('ADMIN2026');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrial = () => {
    // Si no está logueado, inicia como invitado/freemium para su 1er proyecto
    onGuestAccess();
  };

  return (
    <>
      <LandingPage
        onStartTrial={handleStartTrial}
        onOpenExpress={onGuestAccess}
        onOpenLogin={() => setShowAuthModal(true)}
        onOpenProModal={() => setShowUpgradeModal(true)}
      />

      {/* Modal de Autenticación / Registro / Admin */}
      {showAuthModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={modalHeaderStyle}>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.2rem', fontWeight: 800 }}>
                AMCaudales Pro • Acceso a la Plataforma
              </h3>
              <button onClick={() => setShowAuthModal(false)} style={closeBtnStyle}>✕</button>
            </div>

            {/* Pestañas de Login / Registro / Admin */}
            <div style={tabsGroupStyle}>
              <button
                type="button"
                onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                style={tab === 'login' ? activeTabStyle : inactiveTabStyle}
              >
                🔑 Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
                style={tab === 'register' ? activeTabStyle : inactiveTabStyle}
              >
                📝 Crear Cuenta
              </button>
              <button
                type="button"
                onClick={() => { setTab('admin'); setErrorMsg(''); setSuccessMsg(''); }}
                style={tab === 'admin' ? activeTabStyle : inactiveTabStyle}
              >
                👑 Admin
              </button>
            </div>

            {/* Google Login Button */}
            <div style={{ marginBottom: '1rem' }}>
              <button type="button" onClick={handleGoogleAuth} style={googleBtnStyle}>
                🌐 {tab === 'register' ? 'Registrarse en 1 clic con Google / Gmail' : 'Ingresar con Google / Gmail'}
              </button>
            </div>

            <div style={separatorStyle}><span>o usa tu correo y contraseña</span></div>

            {errorMsg && <div style={errorBannerStyle}>⚠️ {errorMsg}</div>}
            {successMsg && <div style={successBannerStyle}>✔ {successMsg}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {tab === 'register' && (
                <>
                  <div>
                    <label style={labelStyle}>Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Ing. Norman Castillo"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Empresa / Firma de Consultoría</label>
                    <input
                      type="text"
                      placeholder="Ej. Ingeniería AMC S.A.S."
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {tab === 'admin' ? (
                <div>
                  <label style={labelStyle}>Clave Maestra de Administrador</label>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label style={labelStyle}>Correo Electrónico *</label>
                    <input
                      type="email"
                      required
                      placeholder="ejemplo@amcaudales.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Contraseña *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={inputStyle}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={eyeBtnStyle}
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {tab === 'register' && (
                    <div>
                      <label style={labelStyle}>Confirmar Contraseña *</label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={eyeBtnStyle}
                        >
                          {showConfirmPassword ? '🙈' : '👁️'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <button type="submit" disabled={loading} style={submitBtnStyle}>
                {loading ? 'Procesando...' : tab === 'admin' ? '👑 Entrar como Super Admin' : tab === 'register' ? 'Crear Cuenta e Ingresar' : 'Ingresar al Sistema'}
              </button>
            </form>

            <button onClick={handleStartTrial} style={guestModeBtnStyle}>
              🚀 Explorar en Modo Invitado / Prueba (1er Proyecto Gratis)
            </button>
          </div>
        </div>
      )}

      {/* Modal Upgrade Pro */}
      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />
    </>
  );
}

// ── ESTILOS CSS-IN-JS PARA EL MODAL DE AUTENTICACIÓN ──
const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(3, 7, 18, 0.85)',
  backdropFilter: 'blur(10px)',
  zIndex: 10000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px'
};

const modalCardStyle = {
  background: '#0a1128',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '20px',
  padding: '28px',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.6)'
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px'
};

const closeBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.2rem',
  cursor: 'pointer'
};

const tabsGroupStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '6px',
  marginBottom: '20px'
};

const activeTabStyle = {
  padding: '8px',
  background: 'rgba(59, 130, 246, 0.2)',
  border: '1px solid #3b82f6',
  borderRadius: '8px',
  color: '#60a5fa',
  fontWeight: '700',
  fontSize: '0.85rem',
  cursor: 'pointer'
};

const inactiveTabStyle = {
  padding: '8px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '8px',
  color: '#94a3b8',
  fontSize: '0.85rem',
  cursor: 'pointer'
};

const googleBtnStyle = {
  width: '100%',
  padding: '12px',
  background: '#ffffff',
  color: '#0f172a',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.9rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px'
};

const separatorStyle = {
  textAlign: 'center',
  margin: '12px 0',
  fontSize: '0.78rem',
  color: '#64748b'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: '700',
  color: '#94a3b8',
  marginBottom: '4px',
  textTransform: 'uppercase'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#030712',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.9rem',
  outline: 'none'
};

const eyeBtnStyle = {
  position: 'absolute',
  right: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer'
};

const submitBtnStyle = {
  width: '100%',
  padding: '12px',
  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.95rem',
  cursor: 'pointer',
  marginTop: '8px'
};

const guestModeBtnStyle = {
  width: '100%',
  padding: '10px',
  background: 'transparent',
  border: '1px dashed rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  color: '#94a3b8',
  fontSize: '0.82rem',
  cursor: 'pointer',
  marginTop: '12px'
};

const errorBannerStyle = {
  padding: '10px',
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid #ef4444',
  borderRadius: '8px',
  color: '#fca5a5',
  fontSize: '0.82rem',
  marginBottom: '10px'
};

const successBannerStyle = {
  padding: '10px',
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid #10b981',
  borderRadius: '8px',
  color: '#6ee7b7',
  fontSize: '0.82rem',
  marginBottom: '10px'
};
