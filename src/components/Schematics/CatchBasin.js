import React from 'react';

/**
 * CatchBasin - Esquema de Sumidero Lateral / Transversal
 * Muestra: sumidero a la izquierda, tubo inclinado hacia el pozo a la derecha
 * similar a la imagen de referencia (sumidero lateral con terreno ondulado y pozo)
 */
const CatchBasin = ({ item, isTransversal }) => {
  if (!item) return null;

  const tipo  = item.tipo  || 'SL-400';
  const diam  = item.diam  || 200;
  const longM = parseFloat(item.long || item.L) || 6;
  const pozo  = item.pozo  || 'N/A';
  const prof  = parseFloat(item.prof || 1.2);

  const W = 810, H = 320;
  // Escala: 1 m = pixeles (horizontal)
  const ESCX = Math.min(580, longM > 0 ? 560 / longM : 80);
  const ESCY = 80; // px por metro vertical

  // Puntos clave (x, y en SVG)
  const anden_x  = 140;   // borde del andén (izq del sumidero)
  const sum_x    = 165;   // centro del sumidero
  const sum_W    = isTransversal ? 100 : 55;  // ancho del sumidero
  const gndY     = 110;   // Y del nivel de terreno (línea verde)
  const sumBotY  = gndY + prof * ESCY; // fondo del sumidero

  // Tubo: de la pared derecha del sumidero hasta el pozo
  const tubeX0   = sum_x + sum_W / 2;   // inicio del tubo (salida sumidero)
  const pozo_x   = tubeX0 + longM * ESCX * 0.9; // X del pozo
  const slopeRad = Math.atan2(2, 100);  // 2% = pendiente
  const tubeY0   = sumBotY - 12;        // Y tubo al salir (batea sumidero)
  const tubeY1   = tubeY0 + longM * 0.02 * ESCY * 0.5; // Y tubo al llegar (2% pendiente)
  const tubeDiamPx = Math.max(10, diam / 1000 * ESCY);

  // Pozo: derecho (green shape)
  const pozoW  = 30;
  const pozoH  = Math.max(60, prof * ESCY + 20);
  const pozoTopY = gndY - 10;
  const pozoBotY = pozoTopY + pozoH;

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
        SUMIDERO {isTransversal ? 'TRANSVERSAL' : 'LATERAL'}
      </h3>
      <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
        Tipo: {tipo} | Conexión a: {pozo}
      </p>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" style={{ overflow: 'visible', display: 'block', margin: '0 auto' }}>
        <defs>
          <pattern id="cbConcrete" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#6b7280"/>
            <circle cx="2" cy="2" r="1" fill="#9ca3af"/>
            <circle cx="6" cy="6" r="1" fill="#4b5563"/>
          </pattern>
          <pattern id="cbBrick" width="16" height="8" patternUnits="userSpaceOnUse">
            <rect width="16" height="8" fill="#92400e" stroke="#78350f" strokeWidth="0.5"/>
            <line x1="8" y1="0" x2="8" y2="4" stroke="#78350f" strokeWidth="0.5"/>
            <line x1="0" y1="4" x2="16" y2="4" stroke="#78350f" strokeWidth="0.5"/>
          </pattern>
          <marker id="cbArrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" fill="#f8fafc"/>
          </marker>
        </defs>

        {/* ── TERRENO / ANDÉN (línea roja, izquierda) ─────────── */}
        <line x1={0} y1={gndY} x2={sum_x - sum_W/2} y2={gndY} stroke="#ef4444" strokeWidth="2.5"/>
        <text x={(sum_x - sum_W/2) / 2} y={gndY - 12} fill="#f8fafc" fontSize="15" fontWeight="bold">Andén</text>

        {/* ── TERRENO VÍA (línea roja, derecha, bajando hacia sumidero) ─────────── */}
        <path d={`M ${sum_x + sum_W/2} ${gndY + 15} Q ${(sum_x + pozo_x)/2} ${gndY + 5} ${pozo_x + pozoW + 20} ${gndY - 15}`}
          fill="none" stroke="#ef4444" strokeWidth="2.5"/>
        <text x={(sum_x + pozo_x)/2} y={gndY + 30} fill="#ef4444" fontSize="15" fontStyle="italic" fontWeight="bold">Vía</text>
        <text x={pozo_x} y={gndY - 25} fill="#f8fafc" fontSize="15" fontWeight="bold" textAnchor="middle">Pozo</text>

        {/* ── NIVEL VERDE (referencia rasante) ──────────────────────────────── */}
        <line x1={0} y1={gndY} x2={W} y2={gndY} stroke="#10b981" strokeWidth="2"/>

        {/* Sombreado de suelo debajo del nivel verde */}
        <rect x={0} y={gndY} width={W} height={H - gndY} fill="rgba(15,23,42,0.7)"/>

        {/* ── SUMIDERO (cuerpo) ─────────────────────────────────────────────── */}
        {/* Pared exterior: concreto */}
        <rect x={sum_x - sum_W/2} y={gndY} width={sum_W} height={sumBotY - gndY}
          fill="url(#cbConcrete)" stroke="#475569" strokeWidth="1.5"/>
        {/* Interior hueco */}
        <rect x={sum_x - sum_W/2 + 8} y={gndY + 8} width={sum_W - 16} height={sumBotY - gndY - 16}
          fill="#0f172a" stroke="#0f172a"/>
        {/* Reja superior (dashed) */}
        <line x1={sum_x - sum_W/2} y1={gndY} x2={sum_x + sum_W/2} y2={gndY}
          stroke="#e2e8f0" strokeWidth="5" strokeDasharray="6,3"/>
        {/* "X" marks de rejilla */}
        {[-1, 0, 1].filter((_, k) => sum_W > 60 || k === 0).map((k, idx) => (
          <g key={idx} transform={`translate(${sum_x + k * (sum_W/3 - 5)}, ${gndY + 15})`}>
            <line x1={-6} y1={-6} x2={6} y2={6} stroke="#475569" strokeWidth="1.5"/>
            <line x1={6} y1={-6} x2={-6} y2={6} stroke="#475569" strokeWidth="1.5"/>
          </g>
        ))}
        {/* Marca "X" estilo - tapa/reja más visible */}
        <line x1={sum_x - sum_W/2 + 5} y1={gndY + 3} x2={sum_x - sum_W/2 + 5 + 14} y2={gndY + 16}
          stroke="#64748b" strokeWidth="1.5"/>
        <line x1={sum_x - sum_W/2 + 5 + 14} y1={gndY + 3} x2={sum_x - sum_W/2 + 5} y2={gndY + 16}
          stroke="#64748b" strokeWidth="1.5"/>

        {/* ── MEDIDA PROFUNDIDAD (flecha vertical) ─────────────────────────── */}
        <line x1={sum_x - sum_W/2 - 28} y1={gndY} x2={sum_x - sum_W/2 - 28} y2={sumBotY}
          stroke="#f8fafc" strokeWidth="1.2"/>
        <line x1={sum_x - sum_W/2 - 34} y1={gndY} x2={sum_x - sum_W/2 - 22} y2={gndY} stroke="#f8fafc" strokeWidth="1.2"/>
        <line x1={sum_x - sum_W/2 - 34} y1={sumBotY} x2={sum_x - sum_W/2 - 22} y2={sumBotY} stroke="#f8fafc" strokeWidth="1.2"/>
        <text
          x={sum_x - sum_W/2 - 36}
          y={(gndY + sumBotY) / 2}
          fill="#f8fafc" fontSize="11" textAnchor="middle" fontWeight="600"
          transform={`rotate(-90, ${sum_x - sum_W/2 - 36}, ${(gndY + sumBotY) / 2})`}
        >PROF: {prof.toFixed(1)}m</text>

        {/* ── TUBO INCLINADO (sumidero → pozo) ─────────────────────────────── */}
        {/* Tubo: pared superior */}
        <line x1={tubeX0} y1={tubeY0 - tubeDiamPx/2}
              x2={pozo_x - pozoW/2} y2={tubeY1 - tubeDiamPx/2}
          stroke="#38bdf8" strokeWidth="2"/>
        {/* Tubo: pared inferior (batea) */}
        <line x1={tubeX0} y1={tubeY0 + tubeDiamPx/2}
              x2={pozo_x - pozoW/2} y2={tubeY1 + tubeDiamPx/2}
          stroke="#38bdf8" strokeWidth="2"/>
        {/* Relleno interior del tubo (traslúcido) */}
        <polygon
          points={`${tubeX0},${tubeY0 - tubeDiamPx/2} ${pozo_x - pozoW/2},${tubeY1 - tubeDiamPx/2} ${pozo_x - pozoW/2},${tubeY1 + tubeDiamPx/2} ${tubeX0},${tubeY0 + tubeDiamPx/2}`}
          fill="rgba(56,189,248,0.12)"
        />
        {/* Líneas internas del tubo */}
        <line x1={tubeX0} y1={tubeY0 - tubeDiamPx/2 + 3}
              x2={pozo_x - pozoW/2} y2={tubeY1 - tubeDiamPx/2 + 3}
          stroke="rgba(226,232,240,0.5)" strokeWidth="0.8"/>
        <line x1={tubeX0} y1={tubeY0 + tubeDiamPx/2 - 3}
              x2={pozo_x - pozoW/2} y2={tubeY1 + tubeDiamPx/2 - 3}
          stroke="rgba(226,232,240,0.5)" strokeWidth="0.8"/>

        {/* Label tubo */}
        <text x={(tubeX0 + pozo_x) / 2} y={tubeY0 + tubeDiamPx/2 + 16}
          fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
          Tubo PVC Ø {diam}mm
        </text>
        <text x={(tubeX0 + pozo_x) / 2} y={tubeY0 + tubeDiamPx/2 + 30}
          fill="#f8fafc" fontSize="10" textAnchor="middle">
          Long: {longM.toFixed(1)}m
        </text>

        {/* ── POZO (forma redondeada en tono verde, derecha) ───────────────── */}
        <path
          d={`M ${pozo_x - pozoW/2} ${pozoBotY}
              L ${pozo_x - pozoW/2} ${pozoTopY + 15}
              Q ${pozo_x - pozoW/2} ${pozoTopY} ${pozo_x} ${pozoTopY}
              Q ${pozo_x + pozoW/2} ${pozoTopY} ${pozo_x + pozoW/2} ${pozoTopY + 15}
              L ${pozo_x + pozoW/2} ${pozoBotY} Z`}
          fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="2"/>
        {/* Boca del pozo */}
        <ellipse cx={pozo_x} cy={pozoTopY + 8} rx={pozoW/2} ry={8}
          fill="rgba(16,185,129,0.3)" stroke="#10b981" strokeWidth="1.5"/>
        {/* Entrada del tubo al pozo */}
        <line x1={pozo_x - pozoW/2} y1={tubeY1 - tubeDiamPx/2}
              x2={pozo_x - pozoW/2 + 8} y2={tubeY1 - tubeDiamPx/2}
          stroke="#38bdf8" strokeWidth="2"/>
        <line x1={pozo_x - pozoW/2} y1={tubeY1 + tubeDiamPx/2}
              x2={pozo_x - pozoW/2 + 8} y2={tubeY1 + tubeDiamPx/2}
          stroke="#38bdf8" strokeWidth="2"/>

        {/* ── PENDIENTE SUGERIDA label ─────────────────────────────────────── */}
        <text x={(tubeX0 + pozo_x)/2} y={gndY + 65}
          fill="#f59e0b" fontSize="10" textAnchor="middle" fontStyle="italic">
          Pendiente sugerida 2%
        </text>
      </svg>
    </div>
  );
};

export default CatchBasin;
