import React from 'react';
import { GLOSSARY_DICT } from '../ui';

export default function AbrevTab() {
  return (
    <div style={{ padding: '20px', color: 'inherit', fontFamily: 'system-ui, sans-serif' }}>
      <h2 style={{ color: '#D4A843', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px', marginBottom: '20px' }}>
        Glosario de Abreviaturas del Proyecto
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px 20px', maxWidth: '1000px' }}>
        {Object.entries(GLOSSARY_DICT).sort((a, b) => a[0].localeCompare(b[0])).map(([key, desc]) => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: '6px 0', borderBottom: '1px solid rgba(150,150,150,0.2)' }}>
            <strong style={{ color: "inherit", marginRight: 10 }}>{key}</strong>
            <span style={{ color: "inherit", textAlign: 'right', fontSize: '0.95em' }}>{desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
