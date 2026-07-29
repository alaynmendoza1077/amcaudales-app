import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function LandingPage({ onStartTrial, onOpenExpress, onOpenLogin, onOpenProModal }) {
  const { user, userPlan } = useAuth();
  const [selectedPlanTab, setSelectedPlanTab] = useState('monthly'); // 'monthly' | 'per_project'

  return (
    <div style={containerStyle}>
      
      {/* ── HERO SECTION ── */}
      <section style={heroSectionStyle}>
        <div style={heroBadgeStyle}>
          <span>🚀 Software de Ingeniería Hidráulica & Presupuestos #1 en la Nube</span>
        </div>

        <h1 style={heroTitleStyle}>
          Diseña Redes de Alcantarillado,<br />
          Exporta <span style={highlightTextBlue}>Hoja Maestra Excel</span> y <span style={highlightTextGreen}>Planos AutoCAD LISP</span>
        </h1>

        <p style={heroSubtitleStyle}>
          La plataforma cloud creada por y para ingenieros civiles y consultores. Trazado espacial GIS, simulación SWMM, verificación normativa RAS-2017 y generación automática de presupuestos APU.
        </p>

        {/* Botones de Llamado a la Acción principales */}
        <div style={ctaButtonGroupStyle}>
          <button onClick={onStartTrial} style={primaryCtaStyle}>
            ⚡ Iniciar Proyecto Gratis
          </button>

          <button onClick={onOpenExpress} style={secondaryCtaStyle}>
            🧮 Calculadora Express (100% Gratis)
          </button>

          {!user && (
            <button onClick={onOpenLogin} style={outlineCtaStyle}>
              👤 Iniciar Sesión / Registro
            </button>
          )}
        </div>

        {/* Métricas destacadas */}
        <div style={metricsGridStyle}>
          <div style={metricCardStyle}>
            <span style={metricValStyle}>10x</span>
            <span style={metricLblStyle}>Más rápido que hojas de cálculo tradicionales</span>
          </div>
          <div style={metricCardStyle}>
            <span style={metricValStyle}>100%</span>
            <span style={metricLblStyle}>Cumplimiento Norma RAS-2017 & Reglamentos</span>
          </div>
          <div style={metricCardStyle}>
            <span style={metricValStyle}>1-Click</span>
            <span style={metricLblStyle}>Planos AutoCAD LISP & Excel Maestra de Cantidades</span>
          </div>
        </div>
      </section>

      {/* ── CARACTERÍSTICAS & MÓDULOS DEL SOFTWARE ── */}
      <section style={featuresSectionStyle}>
        <div style={sectionHeaderStyle}>
          <h2 style={sectionTitleStyle}>Todo lo que necesitas en una sola plataforma</h2>
          <p style={sectionSubtitleStyle}>
            Olvídate de las hojas de Excel desincronizadas y los cálculos manuales propensos a errores.
          </p>
        </div>

        <div style={featuresGridStyle}>
          <div style={featureCardStyle}>
            <div style={{ ...iconBoxStyle, background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>🗺️</div>
            <h3 style={featureTitleStyle}>Visor Espacial GIS</h3>
            <p style={featureDescStyle}>
              Trazado interactivo de redes, pozos y áreas aferentes sobre mapas satelitales Esri y OpenStreetMap.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={{ ...iconBoxStyle, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>⚙️</div>
            <h3 style={featureTitleStyle}>Motor Hidráulico RAS-2017</h3>
            <p style={featureDescStyle}>
              Cálculo de Colebrook-White, Manning, fuerza tractiva, velocidad real, tirante Y/D y régimen de Froude.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={{ ...iconBoxStyle, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>📊</div>
            <h3 style={featureTitleStyle}>Presupuesto & Cantidades de Obra</h3>
            <p style={featureDescStyle}>
              Generación automática de listados de cantidades para zanjas, excavaciones, tuberías, acometidas y obras de urbanismo.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={{ ...iconBoxStyle, background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>📐</div>
            <h3 style={featureTitleStyle}>Planos AutoCAD LISP</h3>
            <p style={featureDescStyle}>
              Exporta scripts LISP para dibujar automáticamente el plano de planta y los perfiles longitudinales en AutoCAD.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={{ ...iconBoxStyle, background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>☁️</div>
            <h3 style={featureTitleStyle}>Persistencia en la Nube</h3>
            <p style={featureDescStyle}>
              Guarda tus archivos .AMC en la nube y accede a tus diseños desde cualquier computador, tablet o celular.
            </p>
          </div>

          <div style={featureCardStyle}>
            <div style={{ ...iconBoxStyle, background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>📄</div>
            <h3 style={featureTitleStyle}>Memorias PDF & Excel</h3>
            <p style={featureDescStyle}>
              Descarga reportes PDF oficiales y la Hoja Maestra de Excel lista para entregar a interventoría.
            </p>
          </div>
        </div>
      </section>

      {/* ── TABLA DE PLANES & PRECIOS (FREEMIUM VS PRO) ── */}
      <section style={pricingSectionStyle}>
        <div style={sectionHeaderStyle}>
          <span style={pricingBadgeStyle}>MODELO DE LICENCIAMIENTO</span>
          <h2 style={sectionTitleStyle}>Elige el plan ideal para tus proyectos</h2>
          <p style={sectionSubtitleStyle}>
            Comienza gratis con tu primer diseño completo y escala a Plan Pro a medida que crece tu consultoría.
          </p>
        </div>

        <div style={pricingGridStyle}>
          
          {/* PLAN 1: CALCULADORA EXPRESS */}
          <div style={pricingCardStyle}>
            <div style={planHeaderStyle}>
              <h3 style={planNameStyle}>Calculadora Express</h3>
              <p style={planTagStyle}>Ideal para estudiantes y chequeos rápidos</p>
              <div style={priceContainerStyle}>
                <span style={priceValStyle}>$0</span>
                <span style={pricePeriodStyle}> COP / Gratis para siempre</span>
              </div>
            </div>
            <ul style={featureListStyle}>
              <li>✔ Calculadora de Caudal Sanitario y Pluvial</li>
              <li>✔ Verificación de Fuerza Tractiva y Velocidad</li>
              <li>✔ Visor Geográfico Express</li>
              <li>✖ Exportación Hoja Maestra Excel</li>
              <li>✖ Generación de Planos AutoCAD LISP</li>
              <li>✖ Presupuesto de Obra APU</li>
            </ul>
            <button onClick={onOpenExpress} style={secondaryPlanBtnStyle}>
              🧮 Usar Calculadora Gratis
            </button>
          </div>

          {/* PLAN 2: FREEMIUM (1 DISEÑO GRATIS) */}
          <div style={{ ...pricingCardStyle, border: '1px solid #3b82f6' }}>
            <div style={planHeaderStyle}>
              <span style={freeTrialBadgeStyle}>PRUEBA FREEMIUM</span>
              <h3 style={planNameStyle}>Plan Gratis (Prueba)</h3>
              <p style={planTagStyle}>Para validar el motor en 1 proyecto real</p>
              <div style={priceContainerStyle}>
                <span style={priceValStyle}>$0</span>
                <span style={pricePeriodStyle}> COP / 1 Diseño (5 Proyectos Max)</span>
              </div>
            </div>
            <ul style={featureListStyle}>
              <li>✔ 1 Diseño Completo de Reposición</li>
              <li>✔ Trazado en Visor Espacial GIS</li>
              <li>✔ Simulación y Topología de Pozos</li>
              <li>✔ 5 Guardados en la Nube (.AMC)</li>
              <li>✖ Exportación Excel Maestra Avanzada</li>
              <li>✖ Planos AutoCAD LISP e Informes PDF</li>
            </ul>
            <button onClick={onStartTrial} style={primaryPlanBtnStyle}>
              ⚡ Iniciar 1er Proyecto Gratis
            </button>
          </div>

          {/* PLAN 3: PLAN PRO (DESTACADO) */}
          <div style={{ ...pricingCardStyle, background: 'linear-gradient(180deg, rgba(16,185,129,0.12) 0%, rgba(10,17,40,0.8) 100%)', border: '2px solid #10b981', transform: 'scale(1.03)', boxShadow: '0 20px 40px rgba(16,185,129,0.2)' }}>
            <div style={planHeaderStyle}>
              <span style={proBadgeTagStyle}>👑 MÁS POPULAR</span>
              <h3 style={{ ...planNameStyle, color: '#10b981' }}>AMCaudales Pro</h3>
              <p style={planTagStyle}>Para ingenieros consultores y firmas</p>
              <div style={priceContainerStyle}>
                <span style={{ ...priceValStyle, color: '#10b981' }}>$79.000</span>
                <span style={pricePeriodStyle}> COP / mes (o $25.000 / proyecto)</span>
              </div>
            </div>
            <ul style={featureListStyle}>
              <li>✔ <strong>Proyectos Ilimitados</strong> en la Nube</li>
              <li>✔ Exportación <strong>Hoja Maestra Excel de Cantidades</strong></li>
              <li>✔ Generador <strong>Planos AutoCAD LISP</strong></li>
              <li>✔ Presupuesto Banco & Cantidades de Obra</li>
              <li>✔ Informes PDF para Interventoría</li>
              <li>✔ Soporte Técnico Prioritario</li>
            </ul>
            <button onClick={onOpenProModal} style={proPlanBtnStyle}>
              💳 Suscribirse a Plan Pro
            </button>
          </div>

        </div>
      </section>

      {/* ── METODOS DE PAGO COLOMBIA / LATAM ── */}
      <section style={paymentsSectionStyle}>
        <h3 style={{ color: '#94a3b8', fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem', textAlign: 'center' }}>
          Pagos 100% Seguros en Colombia con Wompi • Bold • Nequi • PSE
        </h3>
        <div style={paymentBadgesGroupStyle}>
          <span style={payBadgeStyle}>💳 Tarjetas de Crédito / Débito</span>
          <span style={payBadgeStyle}>🏦 PSE (Todos los Bancos)</span>
          <span style={payBadgeStyle}>📱 Nequi & Daviplata QR</span>
          <span style={payBadgeStyle}>🏪 Efecty & SuRed</span>
        </div>
      </section>

      {/* ── PIE DE PÁGINA ── */}
      <footer style={footerStyle}>
        <p style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: '#64748b' }}>
          AMCaudales Pro v3.0 — Plataforma de Ingeniería Hidráulica & Presupuestos
        </p>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#475569' }}>
          Diseñado bajo las especificaciones técnicas del Ministerio de Vivienda, Ciudad y Territorio de Colombia (Res. 0330 / 2017).
        </p>
      </footer>

    </div>
  );
}

// ── ESTILOS CSS-IN-JS ALTAMENTE ESTÉTICOS (DARK MODE + GLASSMORPHISM) ──
const containerStyle = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #030712 0%, #0a1128 50%, #050a15 100%)',
  color: '#ffffff',
  fontFamily: '"Outfit", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  display: 'flex',
  flexDirection: 'column'
};

const heroSectionStyle = {
  padding: '5rem 2rem 4rem',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  textAlign: 'center',
  maxWidth: '1100px',
  margin: '0 auto'
};

const heroBadgeStyle = {
  background: 'rgba(59, 130, 246, 0.12)',
  border: '1px solid rgba(59, 130, 246, 0.3)',
  borderRadius: '30px',
  padding: '6px 18px',
  fontSize: '0.85rem',
  color: '#60a5fa',
  fontWeight: '600',
  marginBottom: '1.8rem',
  display: 'inline-block'
};

const heroTitleStyle = {
  fontSize: '3.2rem',
  fontWeight: '800',
  lineHeight: '1.2',
  letterSpacing: '-0.03em',
  margin: '0 0 1.5rem 0',
  color: '#f8fafc'
};

const highlightTextBlue = {
  background: 'linear-gradient(to right, #60a5fa, #3b82f6)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const highlightTextGreen = {
  background: 'linear-gradient(to right, #34d399, #10b981)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent'
};

const heroSubtitleStyle = {
  fontSize: '1.15rem',
  color: '#94a3b8',
  maxWidth: '780px',
  lineHeight: '1.6',
  margin: '0 0 2.5rem 0'
};

const ctaButtonGroupStyle = {
  display: 'flex',
  gap: '14px',
  flexWrap: 'wrap',
  justifyContent: 'center',
  marginBottom: '3.5rem'
};

const primaryCtaStyle = {
  padding: '14px 28px',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '1.05rem',
  fontWeight: '700',
  cursor: 'pointer',
  boxShadow: '0 10px 25px rgba(16, 185, 129, 0.35)',
  transition: 'transform 0.2s'
};

const secondaryCtaStyle = {
  padding: '14px 28px',
  background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '10px',
  fontSize: '1.05rem',
  fontWeight: '700',
  cursor: 'pointer',
  boxShadow: '0 10px 25px rgba(59, 130, 246, 0.35)',
  transition: 'transform 0.2s'
};

const outlineCtaStyle = {
  padding: '14px 24px',
  background: 'rgba(30, 41, 59, 0.5)',
  color: '#cbd5e1',
  border: '1px solid rgba(255, 255, 255, 0.15)',
  borderRadius: '10px',
  fontSize: '1rem',
  fontWeight: '600',
  cursor: 'pointer'
};

const metricsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '20px',
  width: '100%',
  marginTop: '1rem'
};

const metricCardStyle = {
  background: 'rgba(30, 41, 59, 0.3)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '14px',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
};

const metricValStyle = {
  fontSize: '2rem',
  fontWeight: '800',
  color: '#60a5fa',
  marginBottom: '4px'
};

const metricLblStyle = {
  fontSize: '0.88rem',
  color: '#94a3b8',
  lineHeight: '1.4'
};

const featuresSectionStyle = {
  padding: '4rem 2rem',
  maxWidth: '1100px',
  margin: '0 auto',
  width: '100%'
};

const sectionHeaderStyle = {
  textAlign: 'center',
  marginBottom: '3rem'
};

const sectionTitleStyle = {
  fontSize: '2.2rem',
  fontWeight: '800',
  color: '#f8fafc',
  margin: '0 0 0.8rem 0'
};

const sectionSubtitleStyle = {
  fontSize: '1.05rem',
  color: '#94a3b8',
  maxWidth: '650px',
  margin: '0 auto',
  lineHeight: '1.5'
};

const featuresGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '24px'
};

const featureCardStyle = {
  background: 'rgba(15, 23, 42, 0.6)',
  border: '1px solid rgba(255, 255, 255, 0.06)',
  borderRadius: '16px',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start'
};

const iconBoxStyle = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.4rem',
  marginBottom: '1rem'
};

const featureTitleStyle = {
  fontSize: '1.2rem',
  fontWeight: '700',
  color: '#f8fafc',
  margin: '0 0 8px 0'
};

const featureDescStyle = {
  fontSize: '0.92rem',
  color: '#94a3b8',
  lineHeight: '1.6',
  margin: 0
};

const pricingSectionStyle = {
  padding: '4rem 2rem 5rem',
  maxWidth: '1150px',
  margin: '0 auto',
  width: '100%'
};

const pricingBadgeStyle = {
  color: '#10b981',
  fontSize: '0.8rem',
  fontWeight: '700',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: '8px',
  display: 'block'
};

const pricingGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  gap: '24px',
  alignItems: 'stretch'
};

const pricingCardStyle = {
  background: 'rgba(15, 23, 42, 0.5)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  borderRadius: '20px',
  padding: '30px 24px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  position: 'relative'
};

const planHeaderStyle = {
  marginBottom: '1.5rem'
};

const freeTrialBadgeStyle = {
  background: 'rgba(59, 130, 246, 0.2)',
  color: '#60a5fa',
  fontSize: '0.72rem',
  fontWeight: '700',
  padding: '4px 10px',
  borderRadius: '12px',
  display: 'inline-block',
  marginBottom: '8px'
};

const proBadgeTagStyle = {
  background: 'rgba(16, 185, 129, 0.2)',
  color: '#10b981',
  fontSize: '0.72rem',
  fontWeight: '700',
  padding: '4px 10px',
  borderRadius: '12px',
  display: 'inline-block',
  marginBottom: '8px'
};

const planNameStyle = {
  fontSize: '1.4rem',
  fontWeight: '800',
  color: '#f8fafc',
  margin: '0 0 6px 0'
};

const planTagStyle = {
  fontSize: '0.85rem',
  color: '#94a3b8',
  margin: '0 0 16px 0'
};

const priceContainerStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '6px'
};

const priceValStyle = {
  fontSize: '2.4rem',
  fontWeight: '800',
  color: '#ffffff'
};

const pricePeriodStyle = {
  fontSize: '0.85rem',
  color: '#94a3b8'
};

const featureListStyle = {
  listStyle: 'none',
  padding: 0,
  margin: '0 0 2rem 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  fontSize: '0.9rem',
  color: '#cbd5e1'
};

const primaryPlanBtnStyle = {
  width: '100%',
  padding: '12px',
  background: '#2563eb',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: '700',
  fontSize: '0.95rem',
  cursor: 'pointer'
};

const secondaryPlanBtnStyle = {
  width: '100%',
  padding: '12px',
  background: 'rgba(255,255,255,0.08)',
  color: 'white',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: '10px',
  fontWeight: '600',
  fontSize: '0.95rem',
  cursor: 'pointer'
};

const proPlanBtnStyle = {
  width: '100%',
  padding: '13px',
  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: '800',
  fontSize: '1rem',
  cursor: 'pointer',
  boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)'
};

const paymentsSectionStyle = {
  padding: '2rem',
  textAlign: 'center',
  borderTop: '1px solid rgba(255,255,255,0.06)',
  maxWidth: '900px',
  margin: '0 auto',
  width: '100%'
};

const paymentBadgesGroupStyle = {
  display: 'flex',
  gap: '12px',
  justifyContent: 'center',
  flexWrap: 'wrap'
};

const payBadgeStyle = {
  background: 'rgba(30, 41, 59, 0.6)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  padding: '8px 16px',
  borderRadius: '20px',
  fontSize: '0.82rem',
  color: '#cbd5e1'
};

const footerStyle = {
  padding: '2.5rem 2rem',
  textAlign: 'center',
  background: '#020617',
  borderTop: '1px solid rgba(255,255,255,0.05)',
  marginTop: 'auto'
};
