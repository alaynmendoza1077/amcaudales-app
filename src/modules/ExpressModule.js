import React, { useState } from 'react';

export default function ExpressModule({ onBack }) {
  const [activeTool, setActiveTool] = useState(null);
  const [lightMode, setLightMode] = useState(false);

  const renderContent = () => {
    if (activeTool === 'basic') {
      return (
        <iframe 
          src="/express_tools/CalcCaudal_v019b.html" 
          style={{ width: '100%', height: 'calc(100vh - 70px)', border: 'none', background: '#0A0F1E' }}
          title="Calculadora Básica"
        />
      );
    }
    if (activeTool === 'map') {
      return (
        <iframe 
          src="/express_tools/AMCaudales_V020_0526.html" 
          style={{ width: '100%', height: 'calc(100vh - 70px)', border: 'none', background: '#0A0F1E' }}
          title="Calculadora con Visor"
        />
      );
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px' }}>
        <h1 style={{ color: lightMode ? '#2563eb' : '#60a5fa', marginBottom: '2.5rem', fontFamily: "'Outfit', sans-serif", fontSize: '2.2rem', fontWeight: '800' }}>
          Calculadoras Express
        </h1>
        
        <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap' }}>
          
          <div 
            onClick={() => setActiveTool('basic')}
            style={{
              width: 320,
              height: 320,
              display: 'flex',
              flexDirection: 'column',
              background: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)',
              border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '28px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              boxShadow: lightMode ? '0 10px 25px rgba(0,0,0,0.05)' : '0 15px 35px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.background = lightMode ? '#f8fafc' : 'rgba(30, 41, 59, 0.85)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)'; }}
          >
            <div style={{ fontSize: 42, marginBottom: 16 }}>🧮</div>
            <h2 style={{ color: lightMode ? '#059669' : '#10b981', margin: '0 0 10px 0', fontSize: '1.3rem', fontWeight: '700' }}>Cálculo Hidráulico Básico</h2>
            <p style={{ color: lightMode ? '#475569' : '#94a3b8', fontSize: '0.92rem', margin: 0, lineHeight: 1.6 }}>
              Calculadora rápida de caudales sanitarios y pluviales, y verificación de fuerza tractiva. Sin interfaz gráfica pesada.
            </p>
          </div>

          <div 
            onClick={() => setActiveTool('map')}
            style={{
              width: 320,
              height: 320,
              display: 'flex',
              flexDirection: 'column',
              background: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)',
              border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '20px',
              padding: '28px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              boxShadow: lightMode ? '0 10px 25px rgba(0,0,0,0.05)' : '0 15px 35px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.background = lightMode ? '#f8fafc' : 'rgba(30, 41, 59, 0.85)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)'; }}
          >
            <div style={{ fontSize: 42, marginBottom: 16 }}>🗺️</div>
            <h2 style={{ color: lightMode ? '#2563eb' : '#3b82f6', margin: '0 0 10px 0', fontSize: '1.3rem', fontWeight: '700' }}>Calculadora con Visor Geográfico</h2>
            <p style={{ color: lightMode ? '#475569' : '#94a3b8', fontSize: '0.92rem', margin: 0, lineHeight: 1.6 }}>
              Incluye visor cartográfico con bases de datos pre-cargadas (pozos, estaciones, densidades) para comprobaciones visuales rápidas.
            </p>
          </div>

        </div>
      </div>
    );
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 60px)', background: lightMode ? '#f8fafc' : '#050a15', color: lightMode ? '#000' : '#fff', display: 'flex', flexDirection: 'column' }}>
      
      {/* Sub-barra limpia de navegación dentro del módulo */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 24px', backgroundColor: lightMode ? '#ffffff' : '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '1.1rem', fontWeight: '700', color: '#60a5fa' }}>🧮 Calculadoras Express</span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {activeTool === 'basic' ? '• Cálculo Básico' : activeTool === 'map' ? '• Visor Geográfico' : '• Selección de Herramienta'}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={activeTool ? () => setActiveTool(null) : onBack}
            style={{ padding: '6px 14px', backgroundColor: '#334155', border: '1px solid #475569', borderRadius: '8px', color: '#ffffff', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ← {activeTool ? 'Volver al Menú Express' : 'Volver al Inicio'}
          </button>
          <button 
            onClick={() => setLightMode(!lightMode)}
            style={{ padding: '6px 12px', backgroundColor: 'transparent', border: '1px solid #475569', borderRadius: '8px', color: '#94a3b8', fontSize: '0.82rem', cursor: 'pointer' }}
          >
            {lightMode ? '🌙 Oscuro' : '☀️ Claro'}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {renderContent()}
      </div>
    </div>
  );
}
