import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose, initialTab = 'login' }) {
  const { login, register, loginAsAdmin, loginWithGoogle, resetPassword, loginAsGuest, isCloudConfigured } = useAuth();
  const [tab, setTab] = useState(initialTab); // 'login' | 'register' | 'recover' | 'admin'
  
  // Estados de formulario
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [adminPass, setAdminPass] = useState('');

  // Estados de interacción
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const resetMessages = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSwitchTab = (newTab) => {
    setTab(newTab);
    resetMessages();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    try {
      if (tab === 'admin') {
        if (!adminPass) {
          throw new Error('Por favor ingrese la Clave Maestra de Administrador.');
        }
        loginAsAdmin(adminPass);
        setSuccessMsg('¡Modo Super Admin Activado! Acceso Pro completo desbloqueado.');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else if (tab === 'recover') {
        if (!email) {
          throw new Error('Por favor ingrese su correo electrónico.');
        }
        await resetPassword(email);
        setSuccessMsg('Se ha enviado el enlace de restablecimiento a su correo electrónico.');
      } else if (tab === 'register') {
        if (!email || !password || !fullName || !confirmPassword) {
          throw new Error('Por favor complete todos los campos obligatorios (*).');
        }
        if (password.length < 6) {
          throw new Error('La contraseña debe tener al menos 6 caracteres.');
        }
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden. Por favor verifique.');
        }
        await register(email, password, fullName, company);
        setSuccessMsg('¡Cuenta registrada exitosamente en AMCaudales!');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        // Tab Login
        if (!email || !password) {
          throw new Error('Por favor ingrese correo electrónico y contraseña.');
        }
        await login(email, password);
        setSuccessMsg('¡Inicio de sesión exitoso! Bienvenido a AMCaudales.');
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ocurrió un error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    resetMessages();
    setLoading(true);
    try {
      await loginWithGoogle();
      setSuccessMsg('¡Autenticado correctamente con Google!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMsg(err.message || 'No fue posible iniciar con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestEntry = () => {
    loginAsGuest();
    onClose();
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalCardStyle}>
        
        {/* Encabezado del Modal */}
        <div style={modalHeaderStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={logoIconStyle}>AMC</div>
            <div>
              <h3 style={modalTitleStyle}>
                {tab === 'login' && 'Iniciar Sesión en AMCaudales'}
                {tab === 'register' && 'Crear Cuenta Profesional'}
                {tab === 'recover' && 'Recuperar Contraseña'}
                {tab === 'admin' && 'Panel Maestro Administrador'}
              </h3>
              <span style={cloudBadgeStyle}>
                {isCloudConfigured ? '☁️ Nube Supabase Activa' : '⚡ Modo Local y Offline'}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle} aria-label="Cerrar ventana">✕</button>
        </div>

        {/* Pestañas de Navegación de Auth */}
        {tab !== 'recover' && (
          <div style={tabsGroupStyle}>
            <button
              type="button"
              onClick={() => handleSwitchTab('login')}
              style={tab === 'login' ? activeTabStyle : inactiveTabStyle}
            >
              🔑 Iniciar Sesión
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('register')}
              style={tab === 'register' ? activeTabStyle : inactiveTabStyle}
            >
              📝 Crear Cuenta
            </button>
            <button
              type="button"
              onClick={() => handleSwitchTab('admin')}
              style={tab === 'admin' ? activeTabStyle : inactiveTabStyle}
            >
              👑 Super Admin
            </button>
          </div>
        )}

        {/* Botón de Inicio con Google (en login y registro) */}
        {(tab === 'login' || tab === 'register') && (
          <div style={{ marginBottom: '14px' }}>
            <button
              type="button"
              disabled={loading}
              onClick={handleGoogleAuth}
              style={googleBtnStyle}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '6px' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              {tab === 'register' ? 'Registrarse con Google' : 'Continuar con Google'}
            </button>
            <div style={separatorStyle}><span>o ingresa con tu correo</span></div>
          </div>
        )}

        {/* Mensajes de Error y Éxito */}
        {errorMsg && <div style={errorBannerStyle}>⚠️ {errorMsg}</div>}
        {successMsg && <div style={successBannerStyle}>✔ {successMsg}</div>}

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Campos exclusivos de Registro */}
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
                <label style={labelStyle}>Empresa / Firma Consultora</label>
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

          {/* Campo exclusivo de Super Admin */}
          {tab === 'admin' ? (
            <div>
              <label style={labelStyle}>Clave Maestra de Administrador *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Introduce la Clave Maestra"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
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
              <p style={{ margin: '6px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                Acceso reservado para administradores y soporte técnico de AMCaudales.
              </p>
            </div>
          ) : (
            /* Campos estándar de Email y Password */
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

              {tab !== 'recover' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={labelStyle}>Contraseña *</label>
                    {tab === 'login' && (
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('recover')}
                        style={forgotPassBtnStyle}
                      >
                        ¿Olvidaste tu contraseña?
                      </button>
                    )}
                  </div>
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
              )}

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

          {/* Botón Principal de Envío */}
          <button type="submit" disabled={loading} style={submitBtnStyle}>
            {loading ? 'Procesando...' : 
              tab === 'admin' ? '👑 Entrar como Super Admin' :
              tab === 'recover' ? '📨 Enviar Enlace de Recuperación' :
              tab === 'register' ? 'Crear Cuenta e Ingresar' : 'Ingresar a la Plataforma'}
          </button>
        </form>

        {/* Enlace para volver si está en recuperación de contraseña */}
        {tab === 'recover' && (
          <div style={{ textAlign: 'center', marginTop: '14px' }}>
            <button
              type="button"
              onClick={() => handleSwitchTab('login')}
              style={toggleLinkStyle}
            >
              ← Volver al Inicio de Sesión
            </button>
          </div>
        )}

        {/* Acceso Rápido en Modo Invitado */}
        {tab !== 'admin' && (
          <button onClick={handleGuestEntry} style={guestModeBtnStyle} title="Acceso sin registro para probar la calculadora y el visor">
            🚀 Explorar en Modo Invitado / Prueba (1er Proyecto Gratis)
          </button>
        )}

      </div>
    </div>
  );
}

// ── ESTILOS DEL MODAL (DARK GLASSMORPHIC) ──
const modalOverlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  background: 'rgba(3, 7, 18, 0.85)',
  backdropFilter: 'blur(10px)',
  zIndex: 100000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px'
};

const modalCardStyle = {
  background: 'linear-gradient(145deg, #0a1128 0%, #0d1b3e 100%)',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  borderRadius: '20px',
  padding: '28px',
  width: '100%',
  maxWidth: '460px',
  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.75), 0 0 30px rgba(59, 130, 246, 0.2)',
  color: '#f8fafc',
  fontFamily: "'Inter', sans-serif"
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '18px'
};

const logoIconStyle = {
  width: '38px',
  height: '38px',
  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
  borderRadius: '10px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: '800',
  fontSize: '14px',
  color: '#ffffff',
  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)'
};

const modalTitleStyle = {
  margin: 0,
  color: '#f8fafc',
  fontSize: '1.15rem',
  fontWeight: 800
};

const cloudBadgeStyle = {
  fontSize: '0.72rem',
  color: '#38bdf8',
  fontWeight: 600,
  display: 'inline-block',
  marginTop: '2px'
};

const closeBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.3rem',
  cursor: 'pointer',
  padding: '4px 8px'
};

const tabsGroupStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: '6px',
  marginBottom: '16px',
  background: 'rgba(15, 23, 42, 0.6)',
  padding: '4px',
  borderRadius: '10px',
  border: '1px solid rgba(255, 255, 255, 0.05)'
};

const activeTabStyle = {
  padding: '8px 4px',
  background: 'rgba(59, 130, 246, 0.25)',
  border: '1px solid #3b82f6',
  borderRadius: '8px',
  color: '#60a5fa',
  fontWeight: '700',
  fontSize: '0.82rem',
  cursor: 'pointer'
};

const inactiveTabStyle = {
  padding: '8px 4px',
  background: 'transparent',
  border: '1px solid transparent',
  borderRadius: '8px',
  color: '#94a3b8',
  fontSize: '0.82rem',
  cursor: 'pointer'
};

const googleBtnStyle = {
  width: '100%',
  padding: '11px',
  background: '#ffffff',
  color: '#0f172a',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.88rem',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  transition: 'transform 0.15s'
};

const separatorStyle = {
  textAlign: 'center',
  margin: '12px 0 6px 0',
  fontSize: '0.75rem',
  color: '#64748b'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: '700',
  color: '#cbd5e1',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.02em'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(59, 130, 246, 0.4)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box'
};

const eyeBtnStyle = {
  position: 'absolute',
  right: '10px',
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'transparent',
  border: 'none',
  color: '#94a3b8',
  cursor: 'pointer',
  fontSize: '1rem',
  padding: '4px'
};

const forgotPassBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#38bdf8',
  fontSize: '0.75rem',
  cursor: 'pointer',
  textDecoration: 'underline',
  padding: 0
};

const submitBtnStyle = {
  width: '100%',
  padding: '12px',
  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '700',
  fontSize: '0.92rem',
  cursor: 'pointer',
  marginTop: '6px',
  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
};

const guestModeBtnStyle = {
  width: '100%',
  padding: '10px',
  background: 'rgba(255, 255, 255, 0.03)',
  border: '1px dashed rgba(255, 255, 255, 0.2)',
  borderRadius: '8px',
  color: '#94a3b8',
  fontSize: '0.8rem',
  cursor: 'pointer',
  marginTop: '12px'
};

const errorBannerStyle = {
  padding: '10px 12px',
  background: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid #ef4444',
  borderRadius: '8px',
  color: '#fca5a5',
  fontSize: '0.82rem',
  marginBottom: '8px'
};

const successBannerStyle = {
  padding: '10px 12px',
  background: 'rgba(16, 185, 129, 0.15)',
  border: '1px solid #10b981',
  borderRadius: '8px',
  color: '#6ee7b7',
  fontSize: '0.82rem',
  marginBottom: '8px'
};

const toggleLinkStyle = {
  background: 'none',
  border: 'none',
  color: '#38bdf8',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '0.85rem',
  textDecoration: 'underline'
};
