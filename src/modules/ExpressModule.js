import React, { useState } from 'react';
import { DP } from '../constants';
import CalculoSumiderosTab from '../tabs/CalculoSumiderosTab';
import EstructurasSeparacionTab from '../tabs/EstructurasSeparacionTab';

export default function ExpressModule({ onBack }) {
  const [activeTool, setActiveTool] = useState(null);
  const [lightMode, setLightMode] = useState(false);

  // Estado local para herramientas independientes
  const [P, setP] = useState(DP || {});
  const [sumData, setSumData] = useState([]);
  const [sumLat, setSumLat] = useState([]);
  const [sumTrans, setSumTrans] = useState([]);
  const [estSepData, setEstSepData] = useState([]);
  const [R, setR] = useState([
    { id: 1, de: "PZ1", a: "PZ2", Qsan: 12.5, Qpluv: 180.2, Qd: 180.2, n: 0.013, Qmed: 3.5, reponer: "S" },
    { id: 2, de: "PZ2", a: "PZ3", Qsan: 15.0, Qpluv: 210.0, Qd: 210.0, n: 0.013, Qmed: 4.2, reponer: "S" }
  ]);
  const [T, setT] = useState([
    { id: 1, de: "PZ1", a: "PZ2", longitud: 50, pendiente: 2.0, cotaRasanteDE: 900, cotaFondoDE: 898.5, diametroCom: "315 mm", material: "PVC" },
    { id: 2, de: "PZ2", a: "PZ3", longitud: 60, pendiente: 1.8, cotaRasanteDE: 899, cotaFondoDE: 897.5, diametroCom: "315 mm", material: "PVC" }
  ]);

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
    if (activeTool === 'sumideros') {
      return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <CalculoSumiderosTab P={P} sumData={sumData} setSumData={setSumData} sumLat={sumLat} setSumLat={setSumLat} sumTrans={sumTrans} setSumTrans={setSumTrans} />
        </div>
      );
    }
    if (activeTool === 'separacion') {
      return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          <EstructurasSeparacionTab R={R} P={P} T={T} estSepData={estSepData} setEstSepData={setEstSepData} />
        </div>
      );
    }

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '30px 20px' }}>
        <h1 style={{ color: lightMode ? '#2563eb' : '#60a5fa', marginBottom: '2.5rem', fontFamily: "'Outfit', sans-serif", fontSize: '2.2rem', fontWeight: '800' }}>
          Calculadoras Express
        </h1>
        
        <div style={{ display: 'flex', gap: '25px', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', flexWrap: 'wrap', maxWidth: '1300px' }}>
          
          {/* CARD 1: CÁLCULO BÁSICO */}
          <div 
            onClick={() => setActiveTool('basic')}
            style={{
              width: 280,
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              background: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)',
              border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              boxShadow: lightMode ? '0 10px 25px rgba(0,0,0,0.05)' : '0 15px 35px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.background = lightMode ? '#f8fafc' : 'rgba(30, 41, 59, 0.85)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)'; }}
          >
            <div style={{ fontSize: 38, marginBottom: 14 }}>🧮</div>
            <h2 style={{ color: lightMode ? '#059669' : '#10b981', margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: '700' }}>Cálculo Hidráulico Básico</h2>
            <p style={{ color: lightMode ? '#475569' : '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              Calculadora rápida de caudales sanitarios y pluviales, y verificación de fuerza tractiva sin cargar GIS.
            </p>
          </div>

          {/* CARD 2: VISOR GEOGRÁFICO */}
          <div 
            onClick={() => setActiveTool('map')}
            style={{
              width: 280,
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              background: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)',
              border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(59, 130, 246, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              boxShadow: lightMode ? '0 10px 25px rgba(0,0,0,0.05)' : '0 15px 35px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.background = lightMode ? '#f8fafc' : 'rgba(30, 41, 59, 0.85)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)'; }}
          >
            <div style={{ fontSize: 38, marginBottom: 14 }}>🗺️</div>
            <h2 style={{ color: lightMode ? '#2563eb' : '#3b82f6', margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: '700' }}>Visor Geográfico Express</h2>
            <p style={{ color: lightMode ? '#475569' : '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              Incluye visor cartográfico con bases de datos pre-cargadas para comprobaciones rápidas de trazado.
            </p>
          </div>

          {/* CARD 3: CÁLCULO DE SUMIDEROS (NUEVA) */}
          <div 
            onClick={() => setActiveTool('sumideros')}
            style={{
              width: 280,
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              background: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)',
              border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '20px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              boxShadow: lightMode ? '0 10px 25px rgba(0,0,0,0.05)' : '0 15px 35px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.background = lightMode ? '#f8fafc' : 'rgba(30, 41, 59, 0.85)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)'; }}
          >
            <div style={{ fontSize: 38, marginBottom: 14 }}>🌊</div>
            <h2 style={{ color: lightMode ? '#d97706' : '#fbbf24', margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: '700' }}>Cálculo de Sumideros</h2>
            <p style={{ color: lightMode ? '#475569' : '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              Determina la capacidad de captación de sumideros laterales (SL-200, 400, 600) y transversales (ST-40) de forma independiente.
            </p>
          </div>

          {/* CARD 4: CÁLCULO DE ESTRUCTURAS DE SEPARACIÓN (NUEVA) */}
          <div 
            onClick={() => setActiveTool('separacion')}
            style={{
              width: 280,
              height: 300,
              display: 'flex',
              flexDirection: 'column',
              background: lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)',
              border: lightMode ? '1px solid #e2e8f0' : '1px solid rgba(168, 85, 247, 0.35)',
              borderRadius: '20px',
              padding: '24px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textAlign: 'center',
              boxShadow: lightMode ? '0 10px 25px rgba(0,0,0,0.05)' : '0 15px 35px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(10px)'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-8px)'; e.currentTarget.style.background = lightMode ? '#f8fafc' : 'rgba(30, 41, 59, 0.85)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.background = lightMode ? '#ffffff' : 'rgba(30, 41, 59, 0.5)'; }}
          >
            <div style={{ fontSize: 38, marginBottom: 14 }}>🔀</div>
            <h2 style={{ color: lightMode ? '#7e22ce' : '#c084fc', margin: '0 0 10px 0', fontSize: '1.2rem', fontWeight: '700' }}>Estructuras de Separación</h2>
            <p style={{ color: lightMode ? '#475569' : '#94a3b8', fontSize: '0.88rem', margin: 0, lineHeight: 1.5 }}>
              Cálculo independiente de aliviaderos y vertederos laterales de separación sanitaria/pluvial (5 x QMD).
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
            {activeTool === 'basic' ? '• Cálculo Básico' : activeTool === 'map' ? '• Visor Geográfico' : activeTool === 'sumideros' ? '• Cálculo de Sumideros' : activeTool === 'separacion' ? '• Estructuras de Separación' : '• Selección de Herramienta'}
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
