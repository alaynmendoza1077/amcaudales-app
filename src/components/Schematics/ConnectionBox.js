import React from 'react';

/**
 * ConnectionBox - Esquema de Acometida Domiciliaria
 * Muestra: Caja de inspección con tubo que baja al colector
 * con línea de terreno (via/vivienda), pavimento verde y pendiente 2%
 * Similar a imagen 1 de referencia.
 */
const ConnectionBox = ({ P }) => {
  const largoAco   = parseFloat(P?.largoAco   || 6);
  const anchoAnden = parseFloat(P?.anchoAnden  || 1);
  const dAcom      = parseFloat(P?.diamAcom    || 160);
  const profEnt    = parseFloat(P?.profEntrada || 1.2);
  const largoPav   = largoAco - anchoAnden;

  const W = 820, H = 420;

  // Layout
  const gndY     = 120;       // Y del pavimento (línea verde horizontal)
  const ESCY     = 70;        // px por metro (vertical)
  const ESCX     = 72;        // px por metro (horizontal)

  // Colector (izquierda abajo)
  const colX     = 80;
  const colY     = gndY + profEnt * ESCY + 10;  // Y centro del colector
  const colR     = 22;                            // radio

  // Caja (derecha)
  const cajaW    = 50;   // 0.6 m × ESCX ≈ pero fijo
  const cajaH    = profEnt * ESCY + 20;
  const cajaX    = colX + largoAco * ESCX;    // X centro de la caja
  const cajaBotY = gndY + cajaH;
  const cajaTapY = gndY;

  // Tubo desde colector hasta caja (pendiente 2%)
  const tubeDiamPx = Math.max(10, dAcom / 1000 * ESCY);
  const tubeX0   = colX + colR + 2;  // salida colector
  const tubeX1   = cajaX - cajaW/2;  // entrada caja
  // Pendiente 2% → baja 2cm por metro
  const dH_tube  = largoAco * 0.02;   // desnivel en metros
  const tubeY0   = colY;              // Y al salir del colector (batea)
  const tubeY1   = tubeY0 - dH_tube * ESCY;  // Y al llegar a la caja (2% arriba = agua baja hacia colector)

  // Terreno: via (izquierda) y vivienda (derecha)
  const terrViaY1_x = 0, terrViaY1_y = gndY + 25;
  const terrViaY2_x = cajaX - cajaW/2 - 20, terrViaY2_y = gndY;
  const terrVivY1_x = cajaX + cajaW/2 + 10, terrVivY1_y = gndY - 10;
  const terrVivY2_x = W, terrVivY2_y = gndY - 70;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '12px',
      border: '1px solid #334155',
      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
      padding: '16px 20px',
      color: '#fff',
      fontFamily: "'Inter', sans-serif"
    }}>
      <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: '700', color: '#e2e8f0', textAlign: 'center' }}>
        CAJA DE INSPECCIÓN DOMICILIARIA
      </h3>
      <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
        Acometida
      </p>

      <svg width={W} height={H} style={{ display: 'block', margin: '0 auto', overflow: 'visible' }}>
        <defs>
          <pattern id="cbBrickAco" width="16" height="8" patternUnits="userSpaceOnUse">
            <rect width="16" height="8" fill="#b45309" stroke="#78350f" strokeWidth="0.6"/>
            <line x1="8" y1="0" x2="8" y2="4" stroke="#78350f" strokeWidth="0.6"/>
            <line x1="0" y1="4" x2="16" y2="4" stroke="#78350f" strokeWidth="0.6"/>
          </pattern>
          <pattern id="cbConcreteAco" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#94a3b8"/>
            <circle cx="2" cy="2" r="1" fill="#cbd5e1"/>
            <circle cx="6" cy="6" r="1" fill="#64748b"/>
          </pattern>
        </defs>

        {/* ── SUELO (fondo oscuro debajo del pavimento) ─── */}
        <rect x={0} y={gndY} width={W} height={H - gndY} fill="rgba(15,23,42,0.75)"/>

        {/* ── TERRENO VÍA (línea roja, izquierda, ondulada) ─── */}
        <path
          d={`M ${terrViaY1_x} ${terrViaY1_y} C 40 ${gndY+18} 80 ${gndY+10} ${terrViaY2_x} ${terrViaY2_y}`}
          fill="none" stroke="#ef4444" strokeWidth="2.2"/>
        <text x={60} y={gndY + 42} fill="#ef4444" fontSize="13" fontStyle="italic">Via</text>

        {/* ── VIVIENDA (Corte transversal) ─── */}
        <g opacity="0.9">
          {/* Pared y techo */}
          <polygon
            points={`${cajaX + cajaW/2 + 50},${gndY} ${cajaX + cajaW/2 + 50},${gndY - 110} ${W},${gndY - 150} ${W},${gndY}`}
            fill="rgba(148, 163, 184, 0.15)" stroke="#94a3b8" strokeWidth="2"/>
          {/* Alero */}
          <line x1={cajaX + cajaW/2 + 40} y1={gndY - 107} x2={W} y2={gndY - 150} stroke="#cbd5e1" strokeWidth="4"/>
          {/* Ventana */}
          <rect x={cajaX + cajaW/2 + 80} y={gndY - 70} width={40} height={35} fill="rgba(56, 189, 248, 0.2)" stroke="#64748b" strokeWidth="1.5"/>
          <line x1={cajaX + cajaW/2 + 80} y1={gndY - 52.5} x2={cajaX + cajaW/2 + 120} y2={gndY - 52.5} stroke="#64748b" strokeWidth="1"/>
          <line x1={cajaX + cajaW/2 + 100} y1={gndY - 70} x2={cajaX + cajaW/2 + 100} y2={gndY - 35} stroke="#64748b" strokeWidth="1"/>
          
          <text x={cajaX + cajaW/2 + 90} y={gndY - 120} fill="#f8fafc" fontSize="14" fontWeight="bold">Vivienda</text>
        </g>
        {/* Límite de propiedad */}
        <line x1={cajaX + cajaW/2 + 30} y1={gndY + 20} x2={cajaX + cajaW/2 + 30} y2={gndY - 130}
          stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6,4"/>
        <text x={cajaX + cajaW/2 + 35} y={gndY - 40} fill="#ef4444" fontSize="10" transform={`rotate(-90, ${cajaX + cajaW/2 + 35}, ${gndY - 40})`}>Límite Predio</text>

        {/* ── PAVIMENTO (línea verde) ─── */}
        <line x1={0} y1={gndY} x2={W} y2={gndY} stroke="#10b981" strokeWidth="2.5"/>

        {/* Labels Pavimento y Andén encima de la línea verde */}
        <text x={colX + largoAco * ESCX * 0.25} y={gndY - 10}
          fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">
          Pavimento: L = {largoPav.toFixed(2)}m
        </text>
        <text x={cajaX - cajaW/2 - anchoAnden * ESCX / 2} y={gndY - 10}
          fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">
          Anden: {anchoAnden.toFixed(2)}m
        </text>

        {/* ── L TOTAL (cotaflechas horizontal) ─── */}
        <line x1={colX} y1={gndY + 15} x2={cajaX} y2={gndY + 15} stroke="#38bdf8" strokeWidth="1.2"/>
        <line x1={colX} y1={gndY + 10} x2={colX} y2={gndY + 20} stroke="#38bdf8" strokeWidth="1.2"/>
        <line x1={cajaX} y1={gndY + 10} x2={cajaX} y2={gndY + 20} stroke="#38bdf8" strokeWidth="1.2"/>
        <text x={(colX + cajaX)/2} y={gndY + 28}
          fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
          L Total = {largoAco.toFixed(2)}m
        </text>

        {/* ── COLECTOR (círculo izquierda abajo) ─── */}
        <circle cx={colX} cy={colY} r={colR} fill="#0f172a" stroke="#64748b" strokeWidth="3"/>
        {/* Leyenda COLECTOR */}
        <text x={colX} y={colY + colR + 20} fill="#64748b" fontSize="10" textAnchor="middle" fontWeight="600">
          COLECTOR
        </text>
        {/* Tubería vertical desde colector hasta nivel de tubo */}
        <line x1={colX} y1={gndY + 5} x2={colX} y2={colY - colR}
          stroke="#38bdf8" strokeWidth={tubeDiamPx} strokeLinecap="round" opacity="0.4"/>

        {/* ── TUBO ACOMETIDA (pendiente 2%, de colector a caja) ─── */}
        {/* Línea superior */}
        <line x1={tubeX0} y1={tubeY0 - tubeDiamPx/2}
              x2={tubeX1}  y2={tubeY1 - tubeDiamPx/2}
          stroke="#38bdf8" strokeWidth="2"/>
        {/* Línea inferior */}
        <line x1={tubeX0} y1={tubeY0 + tubeDiamPx/2}
              x2={tubeX1}  y2={tubeY1 + tubeDiamPx/2}
          stroke="#38bdf8" strokeWidth="2"/>
        {/* Interior tubo translúcido */}
        <polygon
          points={`${tubeX0},${tubeY0 - tubeDiamPx/2} ${tubeX1},${tubeY1 - tubeDiamPx/2} ${tubeX1},${tubeY1 + tubeDiamPx/2} ${tubeX0},${tubeY0 + tubeDiamPx/2}`}
          fill="rgba(56,189,248,0.12)"/>
        {/* Línea central con label diámetro */}
        <line x1={tubeX0} y1={tubeY0}
              x2={tubeX1}  y2={tubeY1}
          stroke="#38bdf8" strokeWidth="1" strokeDasharray="6,3"/>
        <text x={(tubeX0 + tubeX1)/2} y={tubeY0 - tubeDiamPx/2 - 8}
          fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
          Ø {dAcom.toFixed(0)}mm
        </text>
        {/* Label pendiente */}
        <text x={(tubeX0 + tubeX1)/2} y={tubeY0 + tubeDiamPx/2 + 16}
          fill="#f59e0b" fontSize="10" textAnchor="middle">
          Pendiente sugerida 2%
        </text>

        {/* ── CAJA DE INSPECCIÓN (derecha) ─── */}
        {/* Base */}
        <rect x={cajaX - cajaW/2 - 8} y={cajaBotY}
          width={cajaW + 16} height={14}
          fill="url(#cbConcreteAco)" stroke="#475569" strokeWidth="1"/>
        {/* Pared izquierda (ladrillo) */}
        <rect x={cajaX - cajaW/2 - 8} y={cajaTapY + 8}
          width={12} height={cajaBotY - cajaTapY - 8}
          fill="url(#cbBrickAco)" stroke="#1e293b" strokeWidth="0.8"/>
        {/* Pared derecha (ladrillo) */}
        <rect x={cajaX + cajaW/2 - 4} y={cajaTapY + 8}
          width={12} height={cajaBotY - cajaTapY - 8}
          fill="url(#cbBrickAco)" stroke="#1e293b" strokeWidth="0.8"/>
        {/* Interior oscuro */}
        <rect x={cajaX - cajaW/2 + 4} y={cajaTapY + 8}
          width={cajaW - 8} height={cajaBotY - cajaTapY - 8}
          fill="#0f172a"/>
        {/* Tapa */}
        <rect x={cajaX - cajaW/2 - 8} y={cajaTapY}
          width={cajaW + 16} height={10}
          fill="url(#cbConcreteAco)" stroke="#475569" strokeWidth="1"/>
        {/* Cotas de la caja */}
        <line x1={cajaX + cajaW/2 + 20} y1={cajaTapY}
              x2={cajaX + cajaW/2 + 20} y2={cajaBotY}
          stroke="#f8fafc" strokeWidth="1.2"/>
        <line x1={cajaX + cajaW/2 + 14} y1={cajaTapY}
              x2={cajaX + cajaW/2 + 26} y2={cajaTapY} stroke="#f8fafc" strokeWidth="1.2"/>
        <line x1={cajaX + cajaW/2 + 14} y1={cajaBotY}
              x2={cajaX + cajaW/2 + 26} y2={cajaBotY} stroke="#f8fafc" strokeWidth="1.2"/>
        <text x={cajaX + cajaW/2 + 38} y={(cajaTapY + cajaBotY)/2 + 4}
          fill="#f8fafc" fontSize="11" fontWeight="bold" textAnchor="start">
          0.6 × 0.6 m
        </text>
        {/* Línea de referencia de la caja (vertical dashed) */}
        <line x1={cajaX} y1={cajaTapY + 10}
              x2={cajaX} y2={cajaBotY}
          stroke="#f8fafc" strokeWidth="1" strokeDasharray="3,3"/>
      </svg>
    </div>
  );
};

export default ConnectionBox;
