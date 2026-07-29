import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function StartLoginPortal({ onGuestAccess }) {
  const { login, register, loginAsAdmin, loginWithGoogle, isCloudConfigured } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'admin'

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [cedula, setCedula] = useState('');
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
        await register(email, password, fullName, `${company} ${cedula ? '(Mat: ' + cedula + ')' : ''}`.trim());
        setSuccessMsg('¡Cuenta de ingeniero registrada exitosamente!');
      } else {
        if (!email || !password) {
          throw new Error('Por favor ingrese su correo y contraseña.');
        }
        await login(email, password);
        setSuccessMsg('¡Bienvenido a AMCaudales Pro!');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Error al procesar la solicitud.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdminBypass = () => {
    try {
      loginAsAdmin('ADMIN2026');
    } catch (e) {
      console.error(e);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await loginWithGoogle();
      setSuccessMsg('¡Sesión iniciada con Google correctamente!');
    } catch (err) {
      setErrorMsg(err.message || 'Error al conectar con Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageContainerStyle}>
      <div style={contentGridStyle}>
        
        {/* Columna Izquierda: Presentación y Marca */}
        <div style={heroSectionStyle}>
          <div style={badgeStyle}>
            <span style={badgeDotStyle}></span>
            <span>AMCaudales Pro v3.0 • Suite de Ingeniería</span>
          </div>

          <h1 style={heroTitleStyle}>
            Diseño Hidráulico & Presupuestos <br />
            <span style={gradientTextStyle}>en la Nube</span>
          </h1>

          <p style={heroDescriptionStyle}>
            Plataforma integral para ingenieros civiles e hidráulicos. Realiza trazado de redes, 
            cálculo de caudales por método racional, simulación SWMM, estructuras de aliviadero 
            y exportación de Hoja Maestra Excel y planos AutoCAD LISP.
          </p>

          <div style={featuresGridStyle}>
            <div style={featureCardStyle}>
              <span style={featureIconStyle}>🗺️</span>
              <div>
                <strong style={featureTitleStyle}>Visor Espacial GIS</strong>
                <p style={featureDescStyle}>Trazado interactivo de redes, pozos y áreas aferentes.</p>
              </div>
            </div>

            <div style={featureCardStyle}>
              <span style={featureIconStyle}>🧮</span>
              <div>
                <strong style={featureTitleStyle}>Motor Hidráulico RAS-2017</strong>
                <p style={featureDescStyle}>Cálculo automático de Manning, Colebrook-White y Froude.</p>
              </div>
            </div>

            <div style={featureCardStyle}>
              <span style={featureIconStyle}>📊</span>
              <div>
                <strong style={featureTitleStyle}>Presupuesto & Cantidades</strong>
                <p style={featureDescStyle}>Generación instantánea de APU, excavaciones y APU Banco.</p>
              </div>
            </div>

            <div style={featureCardStyle}>
              <span style={featureIconStyle}>☁️</span>
              <div>
                <strong style={featureTitleStyle}>Persistencia .AMC & Nube</strong>
                <p style={featureDescStyle}>Guarda tu progreso en la nube o en tu equipo local.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta de Login / Registro / Admin */}
        <div style={authCardContainerStyle}>
          <div style={authCardStyle}>
            
            {/* Header del Formulario */}
            <div style={tabContainerStyle}>
              <button
                type="button"
                onClick={() => { setTab('login'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{
                  ...tabBtnStyle,
                  ...(tab === 'login' ? activeTabBtnStyle : {})
                }}
              >
                🔑 Login
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{
                  ...tabBtnStyle,
                  ...(tab === 'register' ? activeTabBtnStyle : {})
                }}
              >
                📝 Registro
              </button>
              <button
                type="button"
                onClick={() => { setTab('admin'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{
                  ...tabBtnStyle,
                  ...(tab === 'admin' ? activeTabBtnStyle : {})
                }}
              >
                🔐 Admin
              </button>
            </div>

            {!isCloudConfigured && (
              <div style={localBadgeStyle}>
                💡 <strong>Modo Local:</strong> Puedes ingresar libremente como Administrador o Usuario.
              </div>
            )}

            {errorMsg && <div style={errorStyle}>{errorMsg}</div>}
            {successMsg && <div style={successStyle}>{successMsg}</div>}

            {/* Botón de Iniciar Sesión con Google / Gmail */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              style={googleBtnStyle}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ marginRight: '8px' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continuar con Google / Gmail
            </button>

            <div style={dividerStyle}>
              <span style={dividerTextStyle}>o ingresa con tu correo</span>
            </div>

            <form onSubmit={handleSubmit} style={formStyle}>
              {tab === 'admin' && (
                <div>
                  <label style={labelStyle}>Clave Maestra de Administrador *</label>
                  <input
                    type="password"
                    placeholder="ADMIN2026"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    style={inputStyle}
                    required
                  />
                  <small style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>
                    Clave por defecto: <code>ADMIN2026</code> o <code>123456</code> (Acceso Total Pro Sin Restricciones)
                  </small>
                </div>
              )}

              {tab === 'register' && (
                <>
                  <div>
                    <label style={labelStyle}>Nombre Completo del Ingeniero *</label>
                    <input
                      type="text"
                      placeholder="Ing. Juan Pérez"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Matrícula / Cédula Profesional</label>
                    <input
                      type="text"
                      placeholder="Ej. MP-68254-98765"
                      value={cedula}
                      onChange={(e) => setCedula(e.target.value)}
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Empresa / Entidad Consultora</label>
                    <input
                      type="text"
                      placeholder="Ej. Consultoría Hidráulica S.A.S"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                </>
              )}

              {tab !== 'admin' && (
                <>
                  <div>
                    <label style={labelStyle}>Correo Electrónico *</label>
                    <input
                      type="email"
                      placeholder="juan.perez@amcaudales.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      style={inputStyle}
                      required
                    />
                  </div>

                  <div>
                    <label style={labelStyle}>Contraseña *</label>
                    <div style={passwordWrapperStyle}>
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={passwordInputStyle}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={toggleEyeBtnStyle}
                        title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                      >
                        {showPassword ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>

                  {tab === 'register' && (
                    <div>
                      <label style={labelStyle}>Confirmar Contraseña *</label>
                      <div style={passwordWrapperStyle}>
                        <input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          style={passwordInputStyle}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          style={toggleEyeBtnStyle}
                          title={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                          {showConfirmPassword ? "🙈" : "👁️"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...submitBtnStyle,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading
                  ? 'Verificando...'
                  : tab === 'admin'
                  ? 'Entrar como Super Admin Pro'
                  : tab === 'register'
                  ? 'Registrar Cuenta de Ingeniero'
                  : 'Ingresar al Sistema'}
              </button>
            </form>

            <div style={dividerStyle}>
              <span style={dividerTextStyle}>Acceso Rápido Maestro</span>
            </div>

            <button
              type="button"
              onClick={handleQuickAdminBypass}
              style={adminQuickBtnStyle}
            >
              👑 Entrar Directamente como Super Admin (Bypass Total)
            </button>

            <button
              type="button"
              onClick={onGuestAccess}
              style={guestBtnStyle}
            >
              🚀 Modo Invitado Demo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// Estilos Portal de Inicio
const pageContainerStyle = {
  minHeight: '100vh',
  backgroundColor: '#050a15',
  backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(0, 198, 255, 0.08) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(124, 58, 237, 0.08) 0%, transparent 40%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '40px 20px',
  color: '#f8fafc',
  fontFamily: "'Inter', sans-serif"
};

const contentGridStyle = {
  width: '100%',
  maxWidth: '1100px',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
  gap: '40px',
  alignItems: 'center'
};

const heroSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px'
};

const badgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  backgroundColor: 'rgba(56, 189, 248, 0.1)',
  border: '1px solid rgba(56, 189, 248, 0.25)',
  color: '#38bdf8',
  padding: '6px 14px',
  borderRadius: '20px',
  fontSize: '0.82rem',
  fontWeight: '600',
  width: 'fit-content'
};

const badgeDotStyle = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#38bdf8',
  boxShadow: '0 0 10px #38bdf8'
};

const heroTitleStyle = {
  fontSize: '2.5rem',
  fontWeight: '800',
  fontFamily: "'Outfit', sans-serif",
  lineHeight: '1.2',
  margin: 0,
  color: '#ffffff'
};

const gradientTextStyle = {
  background: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const heroDescriptionStyle = {
  fontSize: '0.98rem',
  color: '#94a3b8',
  lineHeight: '1.6',
  margin: 0
};

const featuresGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '16px',
  marginTop: '10px'
};

const featureCardStyle = {
  display: 'flex',
  gap: '12px',
  backgroundColor: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  padding: '14px',
  borderRadius: '12px',
  backdropFilter: 'blur(8px)'
};

const featureIconStyle = {
  fontSize: '1.4rem'
};

const featureTitleStyle = {
  display: 'block',
  fontSize: '0.85rem',
  color: '#f1f5f9',
  marginBottom: '2px'
};

const featureDescStyle = {
  fontSize: '0.75rem',
  color: '#64748b',
  margin: 0,
  lineHeight: '1.3'
};

const authCardContainerStyle = {
  display: 'flex',
  justifyContent: 'center'
};

const authCardStyle = {
  width: '100%',
  maxWidth: '440px',
  backgroundColor: '#111827',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '20px',
  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 40px rgba(0, 198, 255, 0.12)',
  padding: '30px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px'
};

const tabContainerStyle = {
  display: 'flex',
  backgroundColor: '#0f172a',
  padding: '4px',
  borderRadius: '10px',
  border: '1px solid #1e293b'
};

const tabBtnStyle = {
  flex: 1,
  padding: '8px 4px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '8px',
  color: '#94a3b8',
  fontSize: '0.82rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const activeTabBtnStyle = {
  backgroundColor: '#1e293b',
  color: '#ffffff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
};

const googleBtnStyle = {
  width: '100%',
  padding: '11px',
  backgroundColor: '#ffffff',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  color: '#1f2937',
  fontSize: '0.88rem',
  fontWeight: '600',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
};

const localBadgeStyle = {
  backgroundColor: 'rgba(234, 179, 8, 0.12)',
  border: '1px solid rgba(234, 179, 8, 0.3)',
  color: '#facc15',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '0.78rem',
  lineHeight: '1.4'
};

const errorStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  color: '#f87171',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '0.82rem'
};

const successStyle = {
  backgroundColor: 'rgba(34, 197, 94, 0.15)',
  border: '1px solid rgba(34, 197, 94, 0.4)',
  color: '#4ade80',
  padding: '8px 12px',
  borderRadius: '8px',
  fontSize: '0.82rem'
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.78rem',
  fontWeight: '600',
  color: '#cbd5e1',
  marginBottom: '4px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#030712',
  border: '1px solid #1f2937',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box'
};

const passwordWrapperStyle = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center'
};

const passwordInputStyle = {
  width: '100%',
  padding: '10px 38px 10px 12px',
  backgroundColor: '#030712',
  border: '1px solid #1f2937',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box'
};

const toggleEyeBtnStyle = {
  position: 'absolute',
  right: '8px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: '1rem',
  padding: '4px'
};

const submitBtnStyle = {
  width: '100%',
  padding: '11px',
  marginTop: '4px',
  backgroundColor: '#2563eb',
  backgroundImage: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.9rem',
  fontWeight: '600',
  boxShadow: '0 4px 16px rgba(0, 114, 255, 0.4)'
};

const dividerStyle = {
  textAlign: 'center',
  borderBottom: '1px solid #1f2937',
  lineHeight: '0.1em',
  margin: '6px 0'
};

const dividerTextStyle = {
  backgroundColor: '#111827',
  padding: '0 10px',
  color: '#64748b',
  fontSize: '0.72rem'
};

const adminQuickBtnStyle = {
  width: '100%',
  padding: '11px',
  backgroundColor: '#f59e0b',
  backgroundImage: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#0f172a',
  fontSize: '0.85rem',
  fontWeight: '700',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.3)'
};

const guestBtnStyle = {
  width: '100%',
  padding: '9px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#cbd5e1',
  fontSize: '0.82rem',
  fontWeight: '500',
  cursor: 'pointer'
};
