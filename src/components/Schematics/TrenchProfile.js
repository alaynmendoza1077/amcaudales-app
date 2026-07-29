import React from 'react';

const TrenchProfile = ({ tramo }) => {
  if (!tramo) return null;

  const L = parseFloat(tramo.Le) || 0;
  const H1 = parseFloat(tramo.H1) || 0;
  const H2 = parseFloat(tramo.H2) || 0;
  const HP = parseFloat(tramo.HP) || 0;

  if (L <= 0 || H1 <= 0 || H2 <= 0) return null;

  const svgWidth = 500;
  const svgHeight = 250;
  const paddingX = 70;
  const paddingY = 40;

  const innerW = svgWidth - paddingX * 2;
  const innerH = svgHeight - paddingY * 2;

  // For the profile, the pipe has a slope. The terrain also has a slope.
  // We assume the pipe drops from H1 to H2 over length L.
  // We will normalize the drawing so the deeper manhole dictates the total height.
  const maxH = Math.max(H1, H2);
  const minH = Math.min(H1, H2);
  
  const scaleX = innerW / Math.max(L, 1);
  // Give it some extra room vertically
  const scaleY = innerH / Math.max(maxH * 1.5, 1);

  // Coordinates
  // Let's set top-left of the terrain as our reference
  const topY = paddingY;
  
  // Left manhole (Inicio)
  const x1 = paddingX;
  const pipeY1 = topY + H1 * scaleY;
  
  // Right manhole (Final)
  const x2 = paddingX + L * scaleX;
  const pipeY2 = topY + H2 * scaleY;

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
      <h3 style={{ margin: '0 0 5px 0', fontSize: '15px', fontWeight: '600', color: '#e2e8f0', letterSpacing: '0.5px' }}>PERFIL LONGITUDINAL</h3>
      
      <svg width={svgWidth} height={svgHeight}>
        <defs>
          <pattern id="soilPatternProfile" width="20" height="20" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="20" stroke="rgba(255,255,255,0.02)" strokeWidth="2" />
          </pattern>
        </defs>

        {/* Terrain Polygon */}
        <polygon points={`${x1},${topY} ${x2},${topY} ${x2},${svgHeight-10} ${x1},${svgHeight-10}`} fill="url(#soilPatternProfile)" />
        <polygon points={`${x1},${topY} ${x2},${topY} ${x2},${svgHeight-10} ${x1},${svgHeight-10}`} fill="rgba(15, 23, 42, 0.5)" />

        {/* Terrain Surface */}
        <line x1={x1} y1={topY} x2={x2} y2={topY} stroke="#10b981" strokeWidth="2" />
        <path d={`M${x1 + 30},${topY - 5} L${x1 + 40},${topY - 5} L${x1 + 35},${topY} Z`} fill="#10b981" />
        <text x={x1 + 45} y={topY - 5} fill="#10b981" fontSize="10">NIVEL TERRENO</text>

        {/* Pipe Line */}
        <line x1={x1} y1={pipeY1} x2={x2} y2={pipeY2} stroke="#38bdf8" strokeWidth="6" opacity="0.8"/>
        <line x1={x1} y1={pipeY1} x2={x2} y2={pipeY2} stroke="#e2e8f0" strokeWidth="2" />
        <text x={(x1 + x2)/2} y={(pipeY1 + pipeY2)/2 - 15} fill="#38bdf8" fontSize="11" textAnchor="middle" transform={`rotate(${Math.atan2(pipeY2-pipeY1, x2-x1) * 180 / Math.PI}, ${(x1 + x2)/2}, ${(pipeY1 + pipeY2)/2 - 15})`}>Tubería Proyectada</text>
        <text x={(x1 + x2)/2} y={(pipeY1 + pipeY2)/2 + 15} fill="#e2e8f0" fontSize="10" textAnchor="middle" transform={`rotate(${Math.atan2(pipeY2-pipeY1, x2-x1) * 180 / Math.PI}, ${(x1 + x2)/2}, ${(pipeY1 + pipeY2)/2 + 15})`}>S = {(((H2 - H1) / L) * 100).toFixed(2)}%</text>

        {/* Average Depth Line (Red dashed) */}
        <line x1={x1} y1={topY + HP * scaleY} x2={x2} y2={topY + HP * scaleY} stroke="#ef4444" strokeWidth="2" strokeDasharray="5,5" />
        
        {/* Manholes (with symmetric cones) */}
        {(() => {
          const mWidth = 16;
          const neckWidth = 8;
          const coneH = 10;
          const mColor = "#64748b";
          
          // Left manhole (Inicio)
          const h1Total = H1 * scaleY + 20;
          const y1Bot = topY - 10 + h1Total;
          const leftM = `M ${x1 - neckWidth/2},${topY - 10} L ${x1 + neckWidth/2},${topY - 10} L ${x1 + neckWidth/2},${topY} L ${x1 + mWidth/2},${topY + coneH} L ${x1 + mWidth/2},${y1Bot} L ${x1 - mWidth/2},${y1Bot} L ${x1 - mWidth/2},${topY + coneH} L ${x1 - neckWidth/2},${topY} Z`;
          
          // Right manhole (Final)
          const h2Total = H2 * scaleY + 20;
          const y2Bot = topY - 10 + h2Total;
          const rightM = `M ${x2 - neckWidth/2},${topY - 10} L ${x2 + neckWidth/2},${topY - 10} L ${x2 + neckWidth/2},${topY} L ${x2 + mWidth/2},${topY + coneH} L ${x2 + mWidth/2},${y2Bot} L ${x2 - mWidth/2},${y2Bot} L ${x2 - mWidth/2},${topY + coneH} L ${x2 - neckWidth/2},${topY} Z`;
          
          return (
            <>
              <path d={leftM} fill={mColor} opacity="0.7" />
              <path d={rightM} fill={mColor} opacity="0.7" />
            </>
          );
        })()}
        
        <text x={x1} y={topY - 15} fill="#f8fafc" fontSize="10" textAnchor="middle" fontWeight="bold">{tramo.de || 'PZ INICIO'}</text>
        <text x={x2} y={topY - 15} fill="#f8fafc" fontSize="10" textAnchor="middle" fontWeight="bold">{tramo.a || 'PZ FINAL'}</text>

        {/* Measurements */}
        {/* H1 */}
        <line x1={x1 - 25} y1={topY} x2={x1 - 25} y2={pipeY1} stroke="#f8fafc" strokeWidth="1" />
        <line x1={x1 - 28} y1={topY} x2={x1 - 22} y2={topY} stroke="#f8fafc" strokeWidth="1" />
        <line x1={x1 - 28} y1={pipeY1} x2={x1 - 22} y2={pipeY1} stroke="#f8fafc" strokeWidth="1" />
        <text x={x1 - 32} y={topY + (H1 * scaleY)/2} fill="#f8fafc" fontSize="10" textAnchor="middle" transform={`rotate(-90, ${x1 - 32}, ${topY + (H1 * scaleY)/2})`}>H1={H1.toFixed(2)}m</text>

        {/* H2 */}
        <line x1={x2 + 25} y1={topY} x2={x2 + 25} y2={pipeY2} stroke="#f8fafc" strokeWidth="1" />
        <line x1={x2 + 22} y1={topY} x2={x2 + 28} y2={topY} stroke="#f8fafc" strokeWidth="1" />
        <line x1={x2 + 22} y1={pipeY2} x2={x2 + 28} y2={pipeY2} stroke="#f8fafc" strokeWidth="1" />
        <text x={x2 + 32} y={topY + (H2 * scaleY)/2} fill="#f8fafc" fontSize="10" textAnchor="middle" transform={`rotate(90, ${x2 + 32}, ${topY + (H2 * scaleY)/2})`}>H2={H2.toFixed(2)}m</text>

        {/* L */}
        <line x1={x1} y1={svgHeight - 20} x2={x2} y2={svgHeight - 20} stroke="#f8fafc" strokeWidth="1" />
        <line x1={x1} y1={svgHeight - 25} x2={x1} y2={svgHeight - 15} stroke="#f8fafc" strokeWidth="1" />
        <line x1={x2} y1={svgHeight - 25} x2={x2} y2={svgHeight - 15} stroke="#f8fafc" strokeWidth="1" />
        <text x={(x1 + x2)/2} y={svgHeight - 5} fill="#f8fafc" fontSize="11" textAnchor="middle" fontWeight="bold">L = {L.toFixed(2)}m</text>

      </svg>
    </div>
  );
};

export default TrenchProfile;
