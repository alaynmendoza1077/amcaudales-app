import React from 'react';

const UrbanismSection = ({ r }) => {
  if (!r || !r.reqUrbanismo) return <div style={{padding: '20px', color: '#64748b', textAlign: 'center'}}>Seleccione un registro con urbanismo.</div>;

  const svgWidth = 500;
  const svgHeight = 250;

  const cx = svgWidth / 2;
  const groundY = 120;
  
  const wPav = r.pavA * 40 || 160; 
  const wAnd = r.andA * 40 || 60;
  const wSar = 20; 

  const totalW = wPav + (r.andLados || 1) * wAnd + (r.sarLados || 1) * wSar;
  const startX = cx - totalW / 2;
  
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
      fontFamily: "'Inter', sans-serif"
    }}>
      <h3 style={{ margin: '0 0 5px 0', fontSize: '15px', fontWeight: '600', color: '#e2e8f0' }}>SECCIÓN URBANISMO</h3>
      <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: '#94a3b8' }}>{r.de} - {r.a}</p>

      <svg width={svgWidth} height={svgHeight}>
        <defs>
          <pattern id="pavement" width="10" height="10" patternUnits="userSpaceOnUse">
            <rect width="10" height="10" fill="#334155" />
            <circle cx="3" cy="3" r="1" fill="#475569" />
            <circle cx="8" cy="7" r="1.5" fill="#1e293b" />
          </pattern>
          <pattern id="concreteUrb" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="#94a3b8" />
            <circle cx="2" cy="2" r="1" fill="#cbd5e1" />
          </pattern>
        </defs>

        {/* Soil Base */}
        <polygon points={`0,${groundY+40} ${svgWidth},${groundY+40} ${svgWidth},${svgHeight} 0,${svgHeight}`} fill="rgba(15,23,42,0.6)" />

        {/* Subbase */}
        <rect x={startX} y={groundY + 10} width={totalW} height={30} fill="#78350f" opacity="0.4" />
        <text x={cx} y={groundY + 30} fill="#f8fafc" fontSize="10" textAnchor="middle" opacity="0.5">SUBBASE GRANULAR</text>

        {/* Pavement */}
        {r.pavDemolicion && (
          <g>
            <rect x={cx - wPav/2} y={groundY} width={wPav} height={10} fill="url(#pavement)" />
            <line x1={cx - wPav/2} y1={groundY - 10} x2={cx + wPav/2} y2={groundY - 10} stroke="#38bdf8" strokeWidth="1" />
            <text x={cx} y={groundY - 15} fill="#38bdf8" fontSize="10" textAnchor="middle">PAVIMENTO (A = {r.pavA}m)</text>
          </g>
        )}

        {/* Anden & Sardinel Left */}
        {r.reqAnden && (r.andLados === 2 || r.andLados === 1) && (
          <g transform={`translate(${cx - wPav/2 - wSar - wAnd}, 0)`}>
            {/* Anden */}
            <rect x={0} y={groundY - 5} width={wAnd} height={15} fill="url(#concreteUrb)" stroke="#475569" />
            <text x={wAnd/2} y={groundY - 15} fill="#f1f5f9" fontSize="10" textAnchor="middle">ANDÉN</text>
            <text x={wAnd/2} y={groundY - 25} fill="#94a3b8" fontSize="9" textAnchor="middle">{r.andA}m</text>
          </g>
        )}

        {r.reqSardinel && (r.sarLados === 2 || r.sarLados === 1) && (
          <g transform={`translate(${cx - wPav/2 - wSar}, 0)`}>
            {/* Sardinel */}
            <rect x={0} y={groundY - 15} width={wSar} height={25} fill="url(#concreteUrb)" stroke="#0f172a" />
          </g>
        )}

        {/* Anden & Sardinel Right */}
        {r.reqSardinel && r.sarLados === 2 && (
          <g transform={`translate(${cx + wPav/2}, 0)`}>
            {/* Sardinel */}
            <rect x={0} y={groundY - 15} width={wSar} height={25} fill="url(#concreteUrb)" stroke="#0f172a" />
          </g>
        )}

        {r.reqAnden && r.andLados === 2 && (
          <g transform={`translate(${cx + wPav/2 + wSar}, 0)`}>
            {/* Anden */}
            <rect x={0} y={groundY - 5} width={wAnd} height={15} fill="url(#concreteUrb)" stroke="#475569" />
            <text x={wAnd/2} y={groundY - 15} fill="#f1f5f9" fontSize="10" textAnchor="middle">ANDÉN</text>
            <text x={wAnd/2} y={groundY - 25} fill="#94a3b8" fontSize="9" textAnchor="middle">{r.andA}m</text>
          </g>
        )}
      </svg>
    </div>
  );
};

export default UrbanismSection;
