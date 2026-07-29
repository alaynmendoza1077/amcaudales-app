import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import UpgradeProModal from './UpgradeProModal';

export default function HomeDashboard({ setModule }) {
  const { userPlan, cloudProjects } = useAuth();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedFeature, setBlockedFeature] = useState('');

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
      maxWidth: '650px',
      lineHeight: '1.6'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem',
      width: '100%',
      maxWidth: '1100px'
    },
    card: {
      background: 'rgba(30, 41, 59, 0.4)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      borderRadius: '16px',
      padding: '1.5rem',
      cursor: 'pointer',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden',
      minHeight: '260px',
      justifyContent: 'space-between'
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
      fontWeight: '700',
      margin: '0 0 0.5rem 0',
      color: '#f8fafc'
    },
    cardDesc: {
      fontSize: '0.9rem',
      color: '#94a3b8',
      margin: 0,
      lineHeight: '1.5',
      flex: 1
    },
    badgeFree: {
      alignSelf: 'flex-start',
      background: 'rgba(16, 185, 129, 0.15)',
      color: '#10b981',
      border: '1px solid #10b981',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '0.72rem',
      fontWeight: '700',
      marginBottom: '12px'
    },
    badgeTrial: {
      alignSelf: 'flex-start',
      background: 'rgba(59, 130, 246, 0.15)',
      color: '#60a5fa',
      border: '1px solid #3b82f6',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '0.72rem',
      fontWeight: '700',
      marginBottom: '12px'
    },
    badgePro: {
      alignSelf: 'flex-start',
      background: 'rgba(245, 158, 11, 0.15)',
      color: '#fbbf24',
      border: '1px solid #f59e0b',
      padding: '4px 10px',
      borderRadius: '12px',
      fontSize: '0.72rem',
      fontWeight: '700',
      marginBottom: '12px'
    }
  };

  const modules = [
    {
      id: 'express',
      title: 'Calculadora Express',
      desc: 'Herramienta 100% gratuita para el diseño hidráulico de un solo tramo o chequeos inmediatos de caudales y diámetros.',
      icon: '🧮',
      tier: 'free',
      tierLabel: '⚡ 100% Gratis de por vida',
      color: 'linear-gradient(135deg, #06b6d4, #0891b2)'
    },
    {
      id: 'nuevo_proyecto',
      title: 'Nuevo Proyecto de Ingeniería',
      desc: 'Inicia un nuevo proyecto ingresando nombre, municipio, diseñador y parámetros normativos RAS-2017.',
      icon: '📐',
      tier: 'trial',
      tierLabel: '⚡ 1er Proyecto Gratis (Freemium)',
      color: 'linear-gradient(135deg, #10b981, #059669)'
    },
    {
      id: 'reposicion',
      title: 'Reposición & Visor GIS',
      desc: 'Suite completa con Visor Espacial avanzado, trazado espacial de pozos y calculador de áreas aferentes.',
      icon: '🗺️',
      tier: 'trial',
      tierLabel: '⚡ 1er Proyecto Gratis (Freemium)',
      color: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    },
    {
      id: 'swmm',
      title: 'Importar Modelo SWMM',
      desc: 'Carga directamente archivos .inp de EPA SWMM para generar topología, perfiles y listados de cantidades.',
      icon: '🌊',
      tier: 'trial',
      tierLabel: '⚡ 1er Proyecto Gratis (Freemium)',
      color: 'linear-gradient(135deg, #d97706, #b45309)'
    },
    {
      id: 'abrir_amc',
      title: 'Abrir Proyecto .AMC',
      desc: 'Carga un proyecto guardado anteriormente en tu computador o abre un diseño alojado en tu cuenta en la nube.',
      icon: '📁',
      tier: 'trial',
      tierLabel: '⚡ 1er Proyecto Gratis (Freemium)',
      color: 'linear-gradient(135deg, #6366f1, #4338ca)'
    },
    {
      id: 'presupuesto',
      title: 'Cantidades y Presupuesto de Obra',
      desc: 'Extracción completa de cantidades de obra, excavaciones, tuberías, acometidas y exportador oficial a Excel.',
      icon: '📊',
      tier: 'pro',
      tierLabel: '👑 Requiere Plan Pro',
      color: 'linear-gradient(135deg, #f59e0b, #d97706)'
    }
  ];

  const fileAMCRef = React.useRef(null);

  const handleCardClick = (mod) => {
    // Restricciones según el Plan por módulos
    if (mod.id === 'presupuesto' && userPlan !== 'pro') {
      setBlockedFeature('Cantidades y Presupuestos de Obra');
      setShowUpgradeModal(true);
      return;
    }

    if ((mod.id === 'nuevo_proyecto' || mod.id === 'reposicion' || mod.id === 'swmm') && userPlan === 'free' && cloudProjects.length >= 5) {
      setBlockedFeature('Límite del Plan Gratis (1 Diseño Completo / 5 Proyectos).');
      setShowUpgradeModal(true);
      return;
    }

    if (mod.id === 'abrir_amc') {
      if (fileAMCRef.current) fileAMCRef.current.click();
    } else {
      setModule(mod.id);
    }
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
        <h1 style={styles.title}>Módulos de AMCaudales Pro</h1>
        <p style={styles.subtitle}>
          Selecciona el módulo de trabajo. Cada herramienta está optimizada para la ingeniería hidráulica de redes y presupuestos.
        </p>
      </div>

      <input
        type="file"
        ref={fileAMCRef}
        accept=".amc,.json"
        style={{ display: 'none' }}
        onChange={handleAMCChange}
      />

      <div style={styles.grid}>
        {modules.map((m) => (
          <div
            key={m.id}
            style={styles.card}
            onClick={() => handleCardClick(m)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.08)';
            }}
          >
            <div>
              {m.tier === 'free' && <span style={styles.badgeFree}>{m.tierLabel}</span>}
              {m.tier === 'trial' && <span style={styles.badgeTrial}>{m.tierLabel}</span>}
              {m.tier === 'pro' && <span style={styles.badgePro}>{m.tierLabel}</span>}

              <div style={{ ...styles.iconWrapper, background: m.color }}>
                {m.icon}
              </div>
              <h3 style={styles.cardTitle}>{m.title}</h3>
              <p style={styles.cardDesc}>{m.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <UpgradeProModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        featureName={blockedFeature}
      />
    </div>
  );
}
