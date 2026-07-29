import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function StartLoginPortal({ onGuestAccess }) {
  const { login, register, isCloudConfigured } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [cedula, setCedula] = useState('');
  const [company, setCompany] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (tab === 'register') {
        if (!email || !password || !fullName) {
          throw new Error('Por favor complete los campos obligatorios (*).');
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

        {/* Columna Derecha: Tarjeta de Login / Registro */}
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
                🔑 Iniciar Sesión
              </button>
              <button
                type="button"
                onClick={() => { setTab('register'); setErrorMsg(''); setSuccessMsg(''); }}
                style={{
                  ...tabBtnStyle,
                  ...(tab === 'register' ? activeTabBtnStyle : {})
                }}
              >
                📝 Registro Ingeniero
              </button>
            </div>

            {!isCloudConfigured && (
              <div style={localBadgeStyle}>
                💡 <strong>Modo Demo / Local Activo:</strong> Puedes iniciar sesión o registrarte libremente para probar todas las funciones.
              </div>
            )}

            {errorMsg && <div style={errorStyle}>{errorMsg}</div>}
            {successMsg && <div style={successStyle}>{successMsg}</div>}

            <form onSubmit={handleSubmit} style={formStyle}>
              {tab === 'register' && (
                <>
                  <div>
                    <label style={labelStyle}>Nombre Completo del Ingeniero *</label>
                    <input
                      type="text"
                      placeholder="Ej. Ing. Alayn Mendoza"
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

              <div>
                <label style={labelStyle}>Correo Electrónico *</label>
                <input
                  type="email"
                  placeholder="ingeniero@amcaudales.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

              <div>
                <label style={labelStyle}>Contraseña *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>

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
                  : tab === 'register'
                  ? 'Registrar Cuenta de Ingeniero'
                  : 'Ingresar al Sistema'}
              </button>
            </form>

            <div style={dividerStyle}>
              <span style={dividerTextStyle}>o también</span>
            </div>

            <button
              type="button"
              onClick={onGuestAccess}
              style={guestBtnStyle}
            >
              🚀 Ingresar Directamente como Invitado / Modo Demo
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

// Estilos Portal de Inicio (Modern Glassmorphism Dark Mode)
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
  gap: '18px'
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
  padding: '10px',
  backgroundColor: 'transparent',
  border: 'none',
  borderRadius: '8px',
  color: '#94a3b8',
  fontSize: '0.85rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
};

const activeTabBtnStyle = {
  backgroundColor: '#1e293b',
  color: '#ffffff',
  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
};

const localBadgeStyle = {
  backgroundColor: 'rgba(234, 179, 8, 0.12)',
  border: '1px solid rgba(234, 179, 8, 0.3)',
  color: '#facc15',
  padding: '10px',
  borderRadius: '8px',
  fontSize: '0.8rem',
  lineHeight: '1.4'
};

const errorStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  color: '#f87171',
  padding: '10px',
  borderRadius: '8px',
  fontSize: '0.82rem'
};

const successStyle = {
  backgroundColor: 'rgba(34, 197, 94, 0.15)',
  border: '1px solid rgba(34, 197, 94, 0.4)',
  color: '#4ade80',
  padding: '10px',
  borderRadius: '8px',
  fontSize: '0.82rem'
};

const formStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '14px'
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '600',
  color: '#cbd5e1',
  marginBottom: '6px'
};

const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  backgroundColor: '#030712',
  border: '1px solid #1f2937',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.9rem',
  outline: 'none',
  boxSizing: 'border-box'
};

const submitBtnStyle = {
  width: '100%',
  padding: '12px',
  marginTop: '6px',
  backgroundColor: '#2563eb',
  backgroundImage: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: '600',
  boxShadow: '0 4px 16px rgba(0, 114, 255, 0.4)'
};

const dividerStyle = {
  textAlign: 'center',
  borderBottom: '1px solid #1f2937',
  lineHeight: '0.1em',
  margin: '10px 0 6px 0'
};

const dividerTextStyle = {
  backgroundColor: '#111827',
  padding: '0 10px',
  color: '#64748b',
  fontSize: '0.75rem'
};

const guestBtnStyle = {
  width: '100%',
  padding: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  color: '#cbd5e1',
  fontSize: '0.85rem',
  fontWeight: '500',
  cursor: 'pointer'
};
