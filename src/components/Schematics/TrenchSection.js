import React from 'react';

const TrenchSection = ({ tramo, P }) => {
  if (!tramo) return null;

  // Extract dimensions
  const D = parseFloat(tramo.D) || 0; // Pipe diameter in meters
  const HP = parseFloat(tramo.HP) || 0; // Depth in meters
  const B = parseFloat(tramo.bz) || 0; // Width in meters

  if (HP <= 0 || B <= 0) return <div style={{padding: '20px', color: '#64748b', textAlign: 'center'}}>Seleccione un tramo válido para previsualizar.</div>;

  // Render parameters
  const svgWidth = 500;
  const svgHeight = 400;
  const paddingX = 80;
  const paddingTop = 60;
  const paddingBottom = 60;

  const innerW = svgWidth - paddingX * 2;
  const innerH = svgHeight - paddingTop - paddingBottom;

  // Scale based on depth and width
  const scaleX = innerW / Math.max(B, 1);
  const scaleY = innerH / Math.max(HP, 1);
  const scale = Math.min(scaleX, scaleY) * 0.8;

  const trenchW = B * scale;
  const trenchH = HP * scale;
  const pipeR = (D / 2) * scale;
  
  // Bedding layers heights
  const bedDepth = 0.10 * scale; 
  const sandOverPipe = 0.15 * scale;
  const sandHeight = bedDepth + (D * scale) + sandOverPipe;

  // Pavement Layers
  const tipoVia = tramo.tipoVia || P?.tipoViaGral || 'FX';
  const espPav = (parseFloat(P?.espesorPav) || 0.15) * scale;
  const espBase = (parseFloat(P?.espesorBase) || 0.15) * scale;
  const espSubBase = (parseFloat(P?.espesorSubBase) || 0.15) * scale;
  const espArena = 0.05 * scale;

  let layers = [];
  if (tipoVia === 'FX') {
    layers.push({ name: 'Carp. Asfáltica', h: espPav, fill: '#1e293b' });
    layers.push({ name: 'Base', h: espBase, fill: '#64748b' });
    layers.push({ name: 'Sub Base', h: espSubBase, fill: '#94a3b8' });
  } else if (tipoVia === 'RG') {
    layers.push({ name: 'Concreto', h: espPav, fill: '#cbd5e1' });
    layers.push({ name: 'Base', h: espBase, fill: '#64748b' });
  } else if (tipoVia === 'AD') {
    layers.push({ name: 'Adoquín', h: espPav, fill: '#b45309' });
    layers.push({ name: 'Arena', h: espArena, fill: '#f59e0b' });
    layers.push({ name: 'Base', h: espBase, fill: '#64748b' });
    layers.push({ name: 'Sub Base', h: espSubBase, fill: '#94a3b8' });
  }

  const pavTotalH = layers.reduce((sum, l) => sum + l.h, 0);
  const fillHeight = Math.max(0, trenchH - sandHeight - pavTotalH);

  // Origins
  const cx = svgWidth / 2;
  const groundY = (svgHeight - trenchH) / 2 - 10;
  const bottomY = groundY + trenchH;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '12px',
      border: '1px solid #334155',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      padding: '20px',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Inter', sans-serif",
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle at center, rgba(56, 189, 248, 0.05) 0%, transparent 50%)', pointerEvents: 'none' }} />
      <h3 style={{ margin: '0 0 5px 0', fontSize: '15px', fontWeight: '600', color: '#e2e8f0', letterSpacing: '0.5px' }}>PERFIL TRANSVERSAL ZANJA</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#94a3b8' }}>Tramo: {tramo.de} - {tramo.a} ({tipoVia})</p>

      <svg width={svgWidth} height={svgHeight} style={{ overflow: 'visible' }}>
        <defs>
          <pattern id="soilPattern" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />
          </pattern>
          <pattern id="sandPattern" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="rgba(245, 158, 11, 0.3)" />
            <circle cx="7" cy="8" r="0.8" fill="rgba(245, 158, 11, 0.2)" />
          </pattern>
          <linearGradient id="pipeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#e2e8f0" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
        </defs>

        {/* Ground level line */}
        <line x1={0} y1={groundY} x2={svgWidth} y2={groundY} stroke="#10b981" strokeWidth="2" strokeDasharray="5,5" />
        <text x={svgWidth - 10} y={groundY - 10} fill="#10b981" fontSize="11" textAnchor="end" fontWeight="500">Nivel de Terreno</text>

        {/* Soil background around trench */}
        <path d={`M0,${groundY} L${cx - trenchW/2},${groundY} L${cx - trenchW/2},${bottomY} L${cx + trenchW/2},${bottomY} L${cx + trenchW/2},${groundY} L${svgWidth},${groundY} L${svgWidth},${svgHeight} L0,${svgHeight} Z`} fill="url(#soilPattern)" />
        <path d={`M0,${groundY} L${cx - trenchW/2},${groundY} L${cx - trenchW/2},${bottomY} L${cx + trenchW/2},${bottomY} L${cx + trenchW/2},${groundY} L${svgWidth},${groundY} L${svgWidth},${svgHeight} L0,${svgHeight} Z`} fill="rgba(15, 23, 42, 0.6)" />
        <path d={`M0,${groundY} L${cx - trenchW/2},${groundY} L${cx - trenchW/2},${bottomY} L${cx + trenchW/2},${bottomY} L${cx + trenchW/2},${groundY}`} fill="none" stroke="#64748b" strokeWidth="2" />

        {/* Pavement Layers */}
        {layers.map((layer, idx) => {
          const yPos = groundY + layers.slice(0, idx).reduce((sum, l) => sum + l.h, 0);
          return (
            <g key={idx}>
              <rect x={cx - trenchW/2} y={yPos} width={trenchW} height={layer.h} fill={layer.fill} stroke="#334155" strokeWidth="1" />
              <line x1={cx + trenchW/2} y1={yPos + layer.h/2} x2={cx + trenchW/2 + 20} y2={yPos + layer.h/2} stroke={layer.fill} strokeWidth="1" strokeDasharray="2,2"/>
              <text x={cx + trenchW/2 + 25} y={yPos + layer.h/2 + 4} fill={layer.fill} fontSize="10">{layer.name}</text>
            </g>
          );
        })}

        {/* Trench interior - Fill Material */}
        {fillHeight > 0 && (
          <g>
            <rect x={cx - trenchW/2} y={groundY + pavTotalH} width={trenchW} height={fillHeight} fill="rgba(56, 189, 248, 0.1)" />
            <rect x={cx - trenchW/2} y={groundY + pavTotalH} width={trenchW} height={fillHeight} fill="url(#soilPattern)" opacity="0.5" />
            <line x1={cx + trenchW/2} y1={groundY + pavTotalH + fillHeight/2} x2={cx + trenchW/2 + 20} y2={groundY + pavTotalH + fillHeight/2} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2"/>
            <text x={cx + trenchW/2 + 25} y={groundY + pavTotalH + fillHeight/2 + 4} fill="#94a3b8" fontSize="10">Relleno Común</text>
          </g>
        )}
        
        {/* Trench interior - Sand Material */}
        <rect x={cx - trenchW/2} y={groundY + pavTotalH + fillHeight} width={trenchW} height={sandHeight} fill="rgba(245, 158, 11, 0.15)" />
        <rect x={cx - trenchW/2} y={groundY + pavTotalH + fillHeight} width={trenchW} height={sandHeight} fill="url(#sandPattern)" />
        <line x1={cx + trenchW/2} y1={groundY + pavTotalH + fillHeight + sandHeight/2} x2={cx + trenchW/2 + 20} y2={groundY + pavTotalH + fillHeight + sandHeight/2} stroke="#fbbf24" strokeWidth="1" strokeDasharray="2,2"/>
        <text x={cx + trenchW/2 + 25} y={groundY + pavTotalH + fillHeight + sandHeight/2 + 4} fill="#fbbf24" fontSize="10">Arena / Recebo</text>

        {/* Pipe */}
        <circle cx={cx} cy={bottomY - bedDepth - pipeR} r={pipeR} fill="#0f172a" stroke="url(#pipeGradient)" strokeWidth="4" />
        <circle cx={cx} cy={bottomY - bedDepth - pipeR} r={pipeR * 0.8} fill="rgba(56, 189, 248, 0.15)" />
        <path d={`M${cx - pipeR * 0.7},${bottomY - bedDepth - pipeR} Q${cx},${bottomY - bedDepth - pipeR + pipeR*0.4} ${cx + pipeR * 0.7},${bottomY - bedDepth - pipeR}`} fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.6" />

        {/* --- MEASUREMENTS --- */}
        {/* Width Measurement */}
        <line x1={cx - trenchW/2} y1={bottomY + 25} x2={cx + trenchW/2} y2={bottomY + 25} stroke="#f8fafc" strokeWidth="1" />
        <line x1={cx - trenchW/2} y1={bottomY + 20} x2={cx - trenchW/2} y2={bottomY + 30} stroke="#f8fafc" strokeWidth="1" />
        <line x1={cx + trenchW/2} y1={bottomY + 20} x2={cx + trenchW/2} y2={bottomY + 30} stroke="#f8fafc" strokeWidth="1" />
        <text x={cx} y={bottomY + 40} fill="#f8fafc" fontSize="12" textAnchor="middle" fontWeight="600">B = {B.toFixed(2)}m</text>

        {/* Total Depth Measurement */}
        <line x1={cx - trenchW/2 - 25} y1={groundY} x2={cx - trenchW/2 - 25} y2={bottomY} stroke="#f8fafc" strokeWidth="1" />
        <line x1={cx - trenchW/2 - 30} y1={groundY} x2={cx - trenchW/2 - 20} y2={groundY} stroke="#f8fafc" strokeWidth="1" />
        <line x1={cx - trenchW/2 - 30} y1={bottomY} x2={cx - trenchW/2 - 20} y2={bottomY} stroke="#f8fafc" strokeWidth="1" />
        <text x={cx - trenchW/2 - 35} y={groundY + trenchH/2} fill="#f8fafc" fontSize="12" textAnchor="middle" transform={`rotate(-90, ${cx - trenchW/2 - 35}, ${groundY + trenchH/2})`} fontWeight="600">HP = {HP.toFixed(2)}m</text>

        {/* Pipe Label */}
        <line x1={cx} y1={bottomY - bedDepth - pipeR} x2={cx - trenchW/2 - 20} y2={bottomY - bedDepth - pipeR - 20} stroke="#38bdf8" strokeWidth="1" />
        <text x={cx - trenchW/2 - 25} y={bottomY - bedDepth - pipeR - 16} fill="#38bdf8" fontSize="10" fontWeight="600" textAnchor="end">Tubo Ø {D}m</text>
      </svg>
    </div>
  );
};

export default TrenchSection;
