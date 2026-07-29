import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function NewProjectModal({ isOpen, onClose, onStartProject }) {
  const { user } = useAuth();

  const [proyecto, setProyecto] = useState('CONSTRUCCION SISTEMA DE ALCANTARILLADO');
  const [municipio, setMunicipio] = useState('BUCARAMANGA');
  const [barrio, setBarrio] = useState('SECTOR CENTRO');
  const [disenador, setDisenador] = useState(user?.user_metadata?.full_name || 'ING. ALAYN MENDOZA');
  const [cedula, setCedula] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [tipoAlc, setTipoAlc] = useState('C'); // C=Combinado, S=Sanitario, P=Pluvial, SC=Semicombinado

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const projectSetupData = {
      proyecto,
      municipio,
      barrio,
      disenador,
      cedula,
      fecha,
      tipoAlc
    };
    onStartProject(projectSetupData);
    onClose();
  };

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div>
            <h2 style={titleStyle}>📋 Datos Iniciales del Proyecto</h2>
            <p style={subtitleStyle}>
              Ingresa la información general que encabezará los reportes, Hoja Maestra y planos AutoCAD
            </p>
          </div>
          <button style={closeBtnStyle} onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={labelStyle}>Nombre Oficial del Proyecto *</label>
            <input
              type="text"
              value={proyecto}
              onChange={(e) => setProyecto(e.target.value)}
              style={inputStyle}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Municipio / Ciudad *</label>
              <input
                type="text"
                value={municipio}
                onChange={(e) => setMunicipio(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Barrio / Sector</label>
              <input
                type="text"
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Ingeniero Diseñador *</label>
              <input
                type="text"
                value={disenador}
                onChange={(e) => setDisenador(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Matrícula / Cédula Pro.</label>
              <input
                type="text"
                placeholder="Ej. MP 68254"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Fecha del Diseño *</label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Tipo de Alcantarillado *</label>
              <select
                value={tipoAlc}
                onChange={(e) => setTipoAlc(e.target.value)}
                style={selectStyle}
              >
                <option value="C">Combinado (Pluvial + Sanitario)</option>
                <option value="S">Sanitario Exclusivo</option>
                <option value="P">Pluvial Exclusivo</option>
                <option value="SC">Semicombinado (con Patios)</option>
              </select>
            </div>
          </div>

          <button type="submit" style={submitBtnStyle}>
            🚀 Iniciar Diseño de Redes
          </button>
        </form>
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
  backgroundColor: 'rgba(11, 15, 25, 0.8)',
  backdropFilter: 'blur(8px)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px'
};

const cardStyle = {
  width: '100%',
  maxWidth: '540px',
  backgroundColor: '#161c2e',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '16px',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6)',
  padding: '24px',
  color: '#f0f4f8',
  fontFamily: "'Inter', sans-serif"
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '18px'
};

const titleStyle = {
  fontSize: '1.25rem',
  fontWeight: '700',
  fontFamily: "'Outfit', sans-serif",
  margin: 0,
  color: '#ffffff'
};

const subtitleStyle = {
  fontSize: '0.82rem',
  color: '#94a3b8',
  marginTop: '4px',
  marginBottom: 0
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.2rem',
  cursor: 'pointer'
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
  padding: '10px 12px',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box'
};

const selectStyle = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.88rem',
  outline: 'none',
  boxSizing: 'border-box'
};

const submitBtnStyle = {
  width: '100%',
  padding: '12px',
  marginTop: '8px',
  backgroundColor: '#10b981',
  backgroundImage: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  border: 'none',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)'
};
