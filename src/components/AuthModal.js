import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register, isCloudConfigured } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegistering) {
        if (!email || !password || !fullName || !confirmPassword) {
          throw new Error('Por favor complete los campos obligatorios (*).');
        }
        if (password !== confirmPassword) {
          throw new Error('Las contraseñas no coinciden. Por favor verifique.');
        }
        const result = await register(email, password, fullName, company);
        setSuccessMsg('¡Cuenta registrada exitosamente en Supabase!');
        setTimeout(() => {
          onClose();
        }, 1800);
      } else {
        if (!email || !password) {
          throw new Error('Por favor ingrese correo y contraseña.');
        }
        await login(email, password);
        setSuccessMsg('¡Sesión iniciada correctamente!');
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

  return (
    <div style={modalOverlayStyle}>
      <div style={modalCardStyle}>
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={modalTitleStyle}>
              {isRegistering ? 'Crear Cuenta AMCaudales' : 'Iniciar Sesión'}
            </h2>
            <p style={modalSubtitleStyle}>
              {isRegistering
                ? 'Regístrate para guardar tus proyectos de ingeniería en la nube'
                : 'Accede a tus proyectos y sesiones guardadas'}
            </p>
          </div>
          <button style={closeBtnStyle} onClick={onClose} aria-label="Cerrar">
            ✕
          </button>
        </div>

        {!isCloudConfigured && (
          <div style={demoBannerStyle}>
            ⚡ <strong>Modo Local Activo:</strong> Puedes probar el inicio de sesión y registro de sesión inmediatamente.
          </div>
        )}

        {errorMsg && <div style={errorBannerStyle}>{errorMsg}</div>}
        {successMsg && <div style={successBannerStyle}>{successMsg}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {isRegistering && (
            <>
              <div>
                <label style={labelStyle}>Nombre Completo *</label>
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
                <label style={labelStyle}>Empresa / Organización</label>
                <input
                  type="text"
                  placeholder="Consultoría Hidráulica S.A.S"
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

          {isRegistering && (
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

          <button
            type="submit"
            disabled={loading}
            style={{
              ...primaryBtnStyle,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading
              ? 'Procesando...'
              : isRegistering
              ? 'Registrarse e Iniciar Sesión'
              : 'Iniciar Sesión'}
          </button>
        </form>

        <div style={footerToggleStyle}>
          {isRegistering ? (
            <span>
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                style={toggleLinkStyle}
              >
                Inicia Sesión aquí
              </button>
            </span>
          ) : (
            <span>
              ¿No tienes cuenta aún?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                style={toggleLinkStyle}
              >
                Regístrate gratis
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Estilos Modal
const modalOverlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(11, 15, 25, 0.75)',
  backdropFilter: 'blur(8px)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
};

const modalCardStyle = {
  width: '100%',
  maxWidth: '460px',
  backgroundColor: '#161c2e',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '16px',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 168, 255, 0.15)',
  padding: '28px',
  color: '#f0f4f8',
  fontFamily: "'Inter', sans-serif"
};

const modalHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '20px'
};

const modalTitleStyle = {
  fontSize: '1.4rem',
  fontWeight: '700',
  fontFamily: "'Outfit', sans-serif",
  margin: 0,
  background: 'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const modalSubtitleStyle = {
  fontSize: '0.85rem',
  color: '#94a3b8',
  marginTop: '4px',
  marginBottom: 0
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.3rem',
  cursor: 'pointer'
};

const demoBannerStyle = {
  backgroundColor: 'rgba(0, 168, 255, 0.12)',
  border: '1px solid rgba(0, 168, 255, 0.3)',
  color: '#38bdf8',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.82rem',
  marginBottom: '16px'
};

const errorBannerStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.4)',
  color: '#f87171',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  marginBottom: '14px'
};

const successBannerStyle = {
  backgroundColor: 'rgba(34, 197, 94, 0.15)',
  border: '1px solid rgba(34, 197, 94, 0.4)',
  color: '#4ade80',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  marginBottom: '14px'
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
  padding: '10px 14px',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.9rem',
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
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.9rem',
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

const primaryBtnStyle = {
  width: '100%',
  padding: '12px',
  marginTop: '8px',
  backgroundColor: '#2563eb',
  backgroundImage: 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: '600',
  boxShadow: '0 4px 14px rgba(0, 114, 255, 0.4)'
};

const footerToggleStyle = {
  marginTop: '20px',
  textAlign: 'center',
  fontSize: '0.85rem',
  color: '#94a3b8'
};

const toggleLinkStyle = {
  background: 'none',
  border: 'none',
  color: '#38bdf8',
  fontWeight: '600',
  cursor: 'pointer',
  textDecoration: 'underline',
  padding: 0,
  marginLeft: '4px'
};
