import React from 'react';

const Manhole = ({ pozo, DI = 1.2, ESP = 0.25 }) => {
  if (!pozo) return null;

  const prof = parseFloat(pozo.prof) || 0;
  if (prof <= 0) return <div style={{padding: '20px', color: '#64748b', textAlign: 'center'}}>Seleccione un pozo válido.</div>;

  // Let's check if the pozo has an expanded DI
  const actualDI = pozo.alertaDI ? 1.8 : DI; // simplified logic based on PozTab alert
  const DE = actualDI + 2 * ESP;
  // Excavation typically needs some working space, e.g. 0.3m each side, but let's stick to DE or DE+0.3
  const excDiam = DE + 0.6; 

  const svgWidth = 400;
  const svgHeight = 350;
  const paddingX = 70;
  const paddingTop = 50;
  const paddingBottom = 40;

  const innerW = svgWidth - paddingX * 2;
  const innerH = svgHeight - paddingTop - paddingBottom;

  const scaleY = innerH / Math.max(prof, 1);
  const scaleX = innerW / Math.max(excDiam, 1);
  const scale = Math.min(scaleX, scaleY) * 0.9;

  const wDI = actualDI * scale;
  const wESP = ESP * scale;
  const wDE = DE * scale;
  const wExc = excDiam * scale;
  const hProf = prof * scale;

  const cx = svgWidth / 2;
  const groundY = paddingTop;
  const bottomY = groundY + hProf;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      borderRadius: '12px',
      border: '1px solid #334155',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
      padding: '20px',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      fontFamily: "'Inter', sans-serif",
      position: 'relative'
    }}>
      <h3 style={{ margin: '0 0 5px 0', fontSize: '15px', fontWeight: '600', color: '#e2e8f0' }}>POZO DE INSPECCIÓN</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#94a3b8' }}>Nodo: {pozo.nodo} - Tipo: {pozo.tipoPozo}</p>

      <svg width={svgWidth} height={svgHeight}>
        <defs>
          <pattern id="soilMH" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
          </pattern>
          <pattern id="brickMH" width="20" height="10" patternUnits="userSpaceOnUse">
            <rect width="20" height="10" fill="#b45309" stroke="#78350f" strokeWidth="1"/>
            <line x1="10" y1="0" x2="10" y2="5" stroke="#78350f" strokeWidth="1"/>
            <line x1="0" y1="5" x2="20" y2="5" stroke="#78350f" strokeWidth="1"/>
            <line x1="20" y1="5" x2="20" y2="10" stroke="#78350f" strokeWidth="1"/>
          </pattern>
          <pattern id="concreteMH" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#94a3b8" />
            <circle cx="2" cy="2" r="1.5" fill="#cbd5e1" />
            <circle cx="7" cy="7" r="1" fill="#64748b" />
            <polygon points="4,8 6,9 5,7" fill="#cbd5e1" />
          </pattern>
        </defs>

        {/* Soil */}
        <polygon points={`0,${groundY} ${cx - wExc/2},${groundY} ${cx - wExc/2},${bottomY} ${cx + wExc/2},${bottomY} ${cx + wExc/2},${groundY} ${svgWidth},${groundY} ${svgWidth},${svgHeight} 0,${svgHeight}`} fill="url(#soilMH)" />
        <line x1={0} y1={groundY} x2={svgWidth} y2={groundY} stroke="#10b981" strokeWidth="2" />
        
        {/* Excavation Bounds */}
        <rect x={cx - wExc/2} y={groundY} width={wExc} height={hProf} fill="rgba(56, 189, 248, 0.05)" stroke="#64748b" strokeWidth="1" strokeDasharray="4,4" />
        
        {/* Base */}
        <rect x={cx - wDE/2 - 10} y={bottomY} width={wDE + 20} height={15} fill="url(#concreteMH)" stroke="#475569" strokeWidth="1" />

        {/* Continuous Pipe (Open hole effect) */}
        <line x1={cx - wExc/2} y1={bottomY - 0.25*scale} x2={cx + wExc/2} y2={bottomY - 0.25*scale} stroke="#38bdf8" strokeWidth="3" opacity="0.8"/>
        <line x1={cx - wExc/2} y1={bottomY} x2={cx + wExc/2} y2={bottomY} stroke="#38bdf8" strokeWidth="3" opacity="0.8"/>
        <text x={cx} y={bottomY - 0.25*scale - 5} fill="#38bdf8" fontSize="10" textAnchor="middle">Flujo de Tubería</text>

        {/* Walls with reduction cone */}
        {(() => {
          const coneH = Math.min(0.3 * scale, hProf - 10);
          const straightY = groundY + 10 + coneH;
          const topInX = 0.3 * scale;
          const topOutX = topInX + wESP;
          const fill = pozo.tipoPozo === 'M' ? 'url(#brickMH)' : 'url(#concreteMH)';
          const pipeY = bottomY - 0.25*scale;
          
          const leftWall = `M ${cx - wDE/2},${pipeY} L ${cx - wDE/2},${straightY} L ${cx - topOutX},${groundY + 10} L ${cx - topInX},${groundY + 10} L ${cx - wDI/2},${straightY} L ${cx - wDI/2},${pipeY} Z`;
          const rightWall = `M ${cx + wDE/2},${pipeY} L ${cx + wDE/2},${straightY} L ${cx + topOutX},${groundY + 10} L ${cx + topInX},${groundY + 10} L ${cx + wDI/2},${straightY} L ${cx + wDI/2},${pipeY} Z`;

          return (
            <>
              <path d={leftWall} fill={fill} stroke="#1e293b" />
              <path d={rightWall} fill={fill} stroke="#1e293b" />
            </>
          );
        })()}
        
        {/* Cover / Ring */}
        <path d={`M${cx - (0.3*scale + wESP)},${groundY} L${cx - (0.3*scale + wESP)},${groundY+10} L${cx - 0.3*scale + 15},${groundY+10} L${cx - 0.3*scale + 15},${groundY} Z`} fill="#334155" stroke="#0f172a" />
        <path d={`M${cx + (0.3*scale + wESP)},${groundY} L${cx + (0.3*scale + wESP)},${groundY+10} L${cx + 0.3*scale - 15},${groundY+10} L${cx + 0.3*scale - 15},${groundY} Z`} fill="#334155" stroke="#0f172a" />
        
        {/* Manhole Cover (Tapa) */}
        <rect x={cx - 0.3*scale + 15} y={groundY} width={0.6*scale - 30} height={10} fill="#1e293b" stroke="#0f172a" strokeWidth="2" />

        {/* --- MEASUREMENTS --- */}
        {/* Depth */}
        <line x1={cx - wExc/2 - 20} y1={groundY} x2={cx - wExc/2 - 20} y2={bottomY} stroke="#f8fafc" strokeWidth="1" />
        <line x1={cx - wExc/2 - 25} y1={groundY} x2={cx - wExc/2 - 15} y2={groundY} stroke="#f8fafc" strokeWidth="1" />
        <line x1={cx - wExc/2 - 25} y1={bottomY} x2={cx - wExc/2 - 15} y2={bottomY} stroke="#f8fafc" strokeWidth="1" />
        <text x={cx - wExc/2 - 30} y={groundY + hProf/2} fill="#f8fafc" fontSize="12" textAnchor="middle" transform={`rotate(-90, ${cx - wExc/2 - 30}, ${groundY + hProf/2})`} fontWeight="bold">PROF = {prof.toFixed(2)}m</text>

        {/* DI */}
        <line x1={cx - wDI/2} y1={bottomY - 20} x2={cx + wDI/2} y2={bottomY - 20} stroke="#38bdf8" strokeWidth="1" />
        <line x1={cx - wDI/2} y1={bottomY - 25} x2={cx - wDI/2} y2={bottomY - 15} stroke="#38bdf8" strokeWidth="1" />
        <line x1={cx + wDI/2} y1={bottomY - 25} x2={cx + wDI/2} y2={bottomY - 15} stroke="#38bdf8" strokeWidth="1" />
        <text x={cx} y={bottomY - 25} fill="#38bdf8" fontSize="11" textAnchor="middle" fontWeight="bold">DI = {actualDI.toFixed(2)}m</text>

        {/* DE */}
        <line x1={cx - wDE/2} y1={bottomY + 30} x2={cx + wDE/2} y2={bottomY + 30} stroke="#f59e0b" strokeWidth="1" />
        <line x1={cx - wDE/2} y1={bottomY + 25} x2={cx - wDE/2} y2={bottomY + 35} stroke="#f59e0b" strokeWidth="1" />
        <line x1={cx + wDE/2} y1={bottomY + 25} x2={cx + wDE/2} y2={bottomY + 35} stroke="#f59e0b" strokeWidth="1" />
        <text x={cx} y={bottomY + 45} fill="#f59e0b" fontSize="11" textAnchor="middle" fontWeight="bold">DE = {DE.toFixed(2)}m</text>

        {/* Wall thickness label */}
        <text x={cx - wDE/2 + wESP/2} y={groundY + hProf/2} fill="#fff" fontSize="9" textAnchor="middle" transform={`rotate(-90, ${cx - wDE/2 + wESP/2}, ${groundY + hProf/2})`}>e = {ESP}m</text>
      </svg>
    </div>
  );
};

export default Manhole;
