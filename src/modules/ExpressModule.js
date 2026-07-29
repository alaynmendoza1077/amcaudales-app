import React, { useState } from 'react';

export default function ExpressModule({ onBack }) {
  const [activeTool, setActiveTool] = useState(null);
  const [lightMode, setLightMode] = useState(false);

  const renderContent = () => {
    if (activeTool === 'basic') {
      return (
        <iframe 
          src="/express_tools/CalcCaudal_v019b.html" 
          style={{ width: '100%', height: 'calc(100vh - 60px)', border: 'none', background: '#0A0F1E' }}
          title="Calculadora Básica"
        />
      );
    }
    if (activeTool === 'map') {
      return (
        <iframe 
          src="/express_tools/AMCaudales_V020_0526.html" 
          style={{ width: '100%', height: 'calc(100vh - 60px)', border: 'none', background: '#0A0F1E' }}
          title="Calculadora con Visor"
        />
      );
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <h1 style={{ color: lightMode ? '#2563eb' : '#60a5fa', marginBottom: '2rem' }}>Calculadoras Express</h1>
        <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap' }}>
          
          <div 
            onClick={() => setActiveTool('basic')}
            style={{
              width: 280,
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              background: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.4)',
              border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              boxShadow: lightMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 10px 30px rgba(0,0,0,0.3)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.background = lightMode ? '#f8fafc' : 'rgba(30, 41, 59, 0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.4)'; }}
          >
            <div style={{ fontSize: 32, marginBottom: 16 }}>🧮</div>
            <h2 style={{ color: lightMode ? '#059669' : '#10b981', margin: '0 0 8px 0', fontSize: '1.2rem' }}>Cálculo Hidráulico Básico</h2>
            <p style={{ color: lightMode ? '#475569' : '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              Calculadora rápida de caudales sanitarios y pluviales, y verificación de fuerza tractiva. Sin interfaz gráfica pesada.
            </p>
          </div>

          <div 
            onClick={() => setActiveTool('map')}
            style={{
              width: 280,
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              background: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.4)',
              border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '16px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'center',
              boxShadow: lightMode ? '0 4px 6px -1px rgba(0, 0, 0, 0.1)' : '0 10px 30px rgba(0,0,0,0.3)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.background = lightMode ? '#f8fafc' : 'rgba(30, 41, 59, 0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.4)'; }}
          >
            <div style={{ fontSize: 32, marginBottom: 16 }}>🗺️</div>
            <h2 style={{ color: lightMode ? '#2563eb' : '#3b82f6', margin: '0 0 8px 0', fontSize: '1.2rem' }}>Calculadora con Visor Geográfico</h2>
            <p style={{ color: lightMode ? '#475569' : '#94a3b8', fontSize: '0.9rem', margin: 0, lineHeight: 1.5 }}>
              Incluye visor cartográfico con bases de datos pre-cargadas (pozos, estaciones, densidades) para comprobaciones visuales rápidas.
            </p>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div className={`app ${lightMode ? 'light-mode' : ''}`} style={{ minHeight: '100vh', background: lightMode ? '#f8fafc' : '#050a15', color: lightMode ? '#000' : '#fff', display: 'flex', flexDirection: 'column' }}>
      <div className="header-container" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="hdr">
          <div className="logo">AMC<br/>Pro</div>
          <div className="hdr-titles">
            <h1>AMCaudales <span style={{fontSize:'16px', fontWeight:'normal', color: lightMode?'#3b82f6':'#93c5fd', marginLeft: 10}}>| Diseño Express</span></h1>
            <p>{activeTool === 'basic' ? 'Cálculo Hidráulico Básico' : activeTool === 'map' ? 'Calculadora con Visor' : 'Herramientas Rápidas'}</p>
          </div>
          <div className="hdr-actions">
            <button 
              className="hdr-btn" 
              onClick={activeTool ? () => setActiveTool(null) : onBack}
              title={activeTool ? 'Volver al Menú Express' : 'Volver al Menú Principal'}
              style={{ background: 'linear-gradient(to right, #4b5563, #374151)', color: 'white', border: '1px solid #6b7280' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Volver
            </button>
            <button className="hdr-btn" onClick={() => setLightMode(!lightMode)}>
              {lightMode ? '🌙' : '☀️'} {lightMode ? 'Oscuro' : 'Claro'}
            </button>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderContent()}
      </div>
    </div>
  );
}
