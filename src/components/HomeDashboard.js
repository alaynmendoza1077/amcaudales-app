import React from 'react';

export default function HomeDashboard({ setModule }) {
  const styles = {
    container: {
      minHeight: 'calc(100vh - 70px)',
      background: 'linear-gradient(135deg, #050a15 0%, #0a1128 100%)',
      color: '#ffffff',
      fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem'
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: '800',
      margin: '0 0 0.5rem 0',
      background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '-0.02em'
    },
    subtitle: {
      fontSize: '1rem',
      color: '#94a3b8',
      margin: 0,
      maxWidth: '600px',
      lineHeight: '1.6'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '1.5rem',
      width: '100%',
      maxWidth: '1080px'
    },
    card: {
      background: 'rgba(30, 41, 59, 0.4)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '16px',
      padding: '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      height: '310px',
      justifyContent: 'flex-start'
    },
    iconWrapper: {
      width: '48px',
      height: '48px',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: '1rem',
      fontSize: '24px'
    },
    cardTitle: {
      fontSize: '1.2rem',
      fontWeight: '600',
      margin: '0 0 0.5rem 0',
      color: '#f8fafc'
    },
    cardDesc: {
      fontSize: '0.9rem',
      color: '#94a3b8',
      margin: 0,
      lineHeight: '1.5',
      flex: 1
    }
  };

  const modules = [
    {
      id: 'nuevo_proyecto',
      title: 'Nuevo Proyecto de Ingeniería',
      desc: 'Inicia desde cero ingresando el nombre del proyecto, municipio, diseñador, matrícula profesional y tipo de alcantarillado.',
      icon: '📐',
      color: 'linear-gradient(135deg, #10b981, #059669)',
      glow: 'rgba(16, 185, 129, 0.25)'
    },
    {
      id: 'express',
      title: 'Calculadora Express',
      desc: 'Herramienta rápida y ligera para el diseño hidráulico de un solo tramo o cálculos inmediatos.',
      icon: '🧮',
      color: 'linear-gradient(135deg, #06b6d4, #0891b2)',
      glow: 'rgba(6, 182, 212, 0.2)'
    },
    {
      id: 'reposicion',
      title: 'Reposición & Visor GIS',
      desc: 'Suite completa con Visor Espacial avanzado, cálculo automático de áreas aferentes y modelación de toda la red.',
      icon: '🗺️',
      color: 'linear-gradient(135deg, #3b82f6, #2563eb)',
      glow: 'rgba(59, 130, 246, 0.2)'
    },
    {
      id: 'presupuesto',
      title: 'Cantidades y Presupuesto',
      desc: 'Módulo especializado para cargar planos maestros y extraer listados de cantidades y costos de obra.',
      icon: '📊',
      color: 'linear-gradient(135deg, #f59e0b, #d97706)',
      glow: 'rgba(245, 158, 11, 0.2)'
    },
    {
      id: 'swmm',
      title: 'Importar Modelo SWMM',
      desc: 'Carga directamente archivos .inp ya modelados y verificados para pasar al módulo de cantidades y presupuestos.',
      disclaimer: 'EPA SWMM es un software de dominio público desarrollado por la Agencia de Protección Ambiental de Estados Unidos (US EPA). Este módulo lee archivos de texto plano (.inp) compatibles con el estándar público.',
      icon: '🌊',
      color: 'linear-gradient(135deg, #d97706, #b45309)',
      glow: 'rgba(217, 119, 6, 0.2)'
    },
    {
      id: 'abrir_amc',
      title: 'Abrir Proyecto .AMC',
      desc: 'Carga rápidamente un proyecto guardado anteriormente con todo su progreso y sus mapas.',
      icon: '📁',
      color: 'linear-gradient(135deg, #6366f1, #4338ca)',
      glow: 'rgba(99, 102, 241, 0.2)'
    }
  ];

  const fileInputRef = React.useRef(null);
  const fileAMCRef = React.useRef(null);

  const handleCardClick = (modId) => {
    if (modId === 'swmm') {
      const ok = window.confirm("¿El archivo INP que está a punto de cargar corresponde a un diseño ya corrido y verificado?\n\n(Asegúrese de haber revisado los perfiles y diámetros en SWMM antes de importar para realizar los presupuestos).");
      if (ok) {
        if (fileInputRef.current) fileInputRef.current.click();
      }
    } else if (modId === 'abrir_amc') {
      if (fileAMCRef.current) fileAMCRef.current.click();
    } else {
      setModule(modId);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setModule('reposicion', { type: 'inp', content: ev.target.result });
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  const handleAMCChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setModule('reposicion', { type: 'amc', content: ev.target.result });
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>AMCaudales Pro</h1>
        <p style={styles.subtitle}>
          Selecciona el módulo de trabajo. El sistema optimizará la memoria cargando únicamente las herramientas que necesites.
        </p>
      </div>

      <div style={styles.grid}>
        {modules.map((mod) => (
          <div 
            key={mod.id} 
            style={styles.card}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = `0 20px 40px ${mod.glow}`;
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.05)';
            }}
            onClick={() => handleCardClick(mod.id)}
          >
            <div style={{ ...styles.iconWrapper, background: mod.color }}>
              {mod.icon}
            </div>
            <h3 style={styles.cardTitle}>{mod.title}</h3>
            <p style={styles.cardDesc}>{mod.desc}</p>
            {mod.disclaimer && (
              <p style={{...styles.cardDesc, fontSize: '0.65rem', marginTop: '10px', color: '#64748b', fontStyle: 'italic', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px'}}>
                {mod.disclaimer}
              </p>
            )}
          </div>
        ))}
      </div>
      <input type="file" accept=".inp" style={{display: 'none'}} ref={fileInputRef} onChange={handleFileChange} />
      <input type="file" accept=".amc" style={{display: 'none'}} ref={fileAMCRef} onChange={handleAMCChange} />
    </div>
  );
}
