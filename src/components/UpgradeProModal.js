import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function UpgradeProModal({ isOpen, onClose, featureName }) {
  const { upgradeToPro } = useAuth();

  if (!isOpen) return null;

  const handleActivateProDemo = () => {
    upgradeToPro();
    alert('¡Plan Pro Activado de Prueba! Ahora tienes acceso ilimitado a todas las herramientas.');
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={badgeStyle}>👑 VERSIÓN PRO</div>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <h2 style={titleStyle}>Actualiza a AMCaudales Pro</h2>
        
        {featureName && (
          <div style={featureAlertStyle}>
            🔒 La función <strong>"{featureName}"</strong> requiere una suscripción activa a AMCaudales Pro.
          </div>
        )}

        <p style={subtitleStyle}>
          Desbloquea todo el potencial de ingeniería hidráulica y presupuesto para tus proyectos.
        </p>

        <div style={benefitsGridStyle}>
          <div style={benefitItemStyle}>
            <span>📊</span>
            <div>
              <strong>Hoja Maestra & Presupuesto Banco</strong>
              <p style={benefitDescStyle}>Exportación oficial Excel con todas las cantidades de obra y presupuestos.</p>
            </div>
          </div>

          <div style={benefitItemStyle}>
            <span>📐</span>
            <div>
              <strong>Planos AutoCAD LISP & DXF</strong>
              <p style={benefitDescStyle}>Generación automática de planos de planta y perfiles longitudinales.</p>
            </div>
          </div>

          <div style={benefitItemStyle}>
            <span>📄</span>
            <div>
              <strong>Reportes PDF de Alta Definición</strong>
              <p style={benefitDescStyle}>Memorias de cálculo completas listas para entregar a interventoría.</p>
            </div>
          </div>

          <div style={benefitItemStyle}>
            <span>☁️</span>
            <div>
              <strong>Proyectos Ilimitados en la Nube</strong>
              <p style={benefitDescStyle}>Almacena y sincroniza todos tus diseños en tu cuenta personal.</p>
            </div>
          </div>
        </div>

        <div style={pricingBoxStyle}>
          <div>
            <span style={planNameStyle}>Suscripción Profesional</span>
            <div style={priceContainerStyle}>
              <span style={priceStyle}>$120.000</span>
              <span style={periodStyle}> COP / mes</span>
            </div>
          </div>
          <button style={upgradeBtnStyle} onClick={() => alert('Próximamente: Integración con Pasarela de Pagos (Nequi / PSE / Tarjeta)')}>
            💳 Suscribirse Ahora
          </button>
        </div>

        <div style={demoOptionStyle}>
          <span>¿Quieres probar todas las funciones?</span>
          <button style={demoBtnStyle} onClick={handleActivateProDemo}>
            ⚡ Activar Licencia Pro de Prueba
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  backgroundColor: 'rgba(11, 15, 25, 0.82)',
  backdropFilter: 'blur(10px)',
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
};

const cardStyle = {
  width: '100%',
  maxWidth: '520px',
  backgroundColor: '#111827',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '20px',
  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 40px rgba(245, 158, 11, 0.2)',
  padding: '28px',
  color: '#f8fafc',
  fontFamily: "'Inter', sans-serif"
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '14px'
};

const badgeStyle = {
  backgroundColor: 'rgba(245, 158, 11, 0.15)',
  border: '1px solid rgba(245, 158, 11, 0.4)',
  color: '#fbbf24',
  fontWeight: '700',
  fontSize: '0.8rem',
  padding: '4px 12px',
  borderRadius: '20px'
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.3rem',
  cursor: 'pointer'
};

const titleStyle = {
  fontSize: '1.5rem',
  fontWeight: '800',
  fontFamily: "'Outfit', sans-serif",
  margin: '0 0 6px 0',
  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const featureAlertStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.12)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  color: '#f87171',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '0.85rem',
  marginBottom: '14px'
};

const subtitleStyle = {
  fontSize: '0.88rem',
  color: '#94a3b8',
  margin: '0 0 20px 0',
  lineHeight: '1.4'
};

const benefitsGridStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginBottom: '20px'
};

const benefitItemStyle = {
  display: 'flex',
  gap: '12px',
  backgroundColor: '#0f172a',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1px solid #1e293b'
};

const benefitDescStyle = {
  fontSize: '0.78rem',
  color: '#64748b',
  margin: '2px 0 0 0'
};

const pricingBoxStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: 'rgba(245, 158, 11, 0.08)',
  border: '1px solid rgba(245, 158, 11, 0.25)',
  padding: '16px',
  borderRadius: '12px',
  marginBottom: '16px'
};

const planNameStyle = {
  fontSize: '0.8rem',
  color: '#cbd5e1',
  display: 'block'
};

const priceContainerStyle = {
  display: 'flex',
  alignItems: 'baseline'
};

const priceStyle = {
  fontSize: '1.4rem',
  fontWeight: '800',
  color: '#fbbf24'
};

const periodStyle = {
  fontSize: '0.8rem',
  color: '#94a3b8'
};

const upgradeBtnStyle = {
  padding: '10px 16px',
  backgroundColor: '#f59e0b',
  backgroundImage: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#0f172a',
  fontWeight: '700',
  fontSize: '0.85rem',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)'
};

const demoOptionStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '0.8rem',
  color: '#94a3b8',
  borderTop: '1px solid #1f2937',
  paddingTop: '14px'
};

const demoBtnStyle = {
  background: 'none',
  border: '1px solid #38bdf8',
  borderRadius: '6px',
  color: '#38bdf8',
  padding: '6px 12px',
  fontSize: '0.8rem',
  fontWeight: '600',
  cursor: 'pointer'
};
