import React, { useState } from 'react';

export default function ReportesTab({ onPrintCustom, R, P, T, selMap, inpData }) {
  const [fase1, setFase1] = useState({
    parIdf: true,
    dat: true,
    calcSan: true,
    calcPluv: true,
    calcHid: true,
    calcAliv: true,
    estSep: true,
    sum: true,
    perfiles: true,
    swmm: true,
    visorEspacial: true,
    mapRes: true
  });

  const [fase2, setFase2] = useState({
    dash: true,
    parObra: true,
    cantPoz: true,
    cantTub: true,
    cantAco: true,
    cantSum: true,
    cantExc: true,
    urbanismo: true,
    sobrante: true,
    cantGen: true,
    pre: true,
    resumen: true,
    cronograma: true,
    abrev: true
  });

  const [settings, setSettings] = useState({
    headerText: 'AMCaudales Pro - Ingeniería Hidráulica',
    colorMode: 'color'
  });

  const handleToggle1 = (k) => setFase1({...fase1, [k]: !fase1[k]});
  const handleToggle2 = (k) => setFase2({...fase2, [k]: !fase2[k]});

  const handleAll1 = (val) => {
    let nf = {...fase1};
    for(let k in nf) nf[k] = val;
    setFase1(nf);
  };

  const handleAll2 = (val) => {
    let nf = {...fase2};
    for(let k in nf) nf[k] = val;
    setFase2(nf);
  };

  const handleGenerate = () => {
    onPrintCustom({ fase1, fase2, settings });
  };

  return (
    <div style={{ padding: 20, color: '#fff' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ color: '#00A6D6', marginBottom: 10 }}>Generador de Reportes Personalizados</h2>
          <p style={{ color: '#9ca3af', marginBottom: 30 }}>Selecciona absolutamente todas las pestañas y componentes que deseas incluir en tu reporte impreso o exportación a PDF.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button onClick={() => {
            import('../exportLISP').then(m => m.exportPerfilesLISP(R, P, T || []));
          }} style={{padding:"8px 16px",fontSize:13, backgroundColor:"#4b5563", color:"#fff", border:"none", borderRadius:4, fontWeight: "bold", cursor: "pointer"}} title="Exportar perfiles de TODOS los tramos calculados">
            ⚡ Perfiles LISP (Todos)
          </button>
          <button onClick={() => {
            import('../exportLISP').then(m => m.exportPerfilesLISPSeleccion(R, P, T || [], selMap));
          }} style={{padding:"8px 16px",fontSize:13, backgroundColor:"#d97706", color:"#fff", border:"none", borderRadius:4, fontWeight: "bold", cursor: "pointer"}} title="Exportar perfiles solo de los tramos seleccionados en el visor">
            🎯 Perfiles LISP (Seleccionados)
          </button>
          <button onClick={() => {
            import('../exportLISP').then(m => m.exportPlantaLISP(R, P, T || [], inpData));
          }} style={{padding:"8px 16px",fontSize:13, backgroundColor:"#0d9488", color:"#fff", border:"none", borderRadius:4, fontWeight: "bold", cursor: "pointer"}} title="Exportar vista en planta de TODOS los tramos en coordenadas reales">
            🗺️ Planta LISP (Todos)
          </button>
          <button onClick={() => {
            import('../exportLISP').then(m => m.exportPlantaLISPSeleccion(R, P, T || [], selMap, inpData));
          }} style={{padding:"8px 16px",fontSize:13, backgroundColor:"#0891b2", color:"#fff", border:"none", borderRadius:4, fontWeight: "bold", cursor: "pointer"}} title="Exportar vista en planta solo de los tramos seleccionados en el visor">
            📍 Planta LISP (Selección)
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 30, marginBottom: 30 }}>
        
        {/* FASE 1 */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h3 style={{ margin: 0, color: '#34d399' }}>Diseño Hidráulico (Fase 1)</h3>
            <div>
              <button onClick={()=>handleAll1(true)} style={{ background: 'transparent', border: '1px solid #34d399', color: '#34d399', padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', marginRight: 5 }}>Todo</button>
              <button onClick={()=>handleAll1(false)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Nada</button>
            </div>
          </div>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.parIdf} onChange={()=>handleToggle1('parIdf')} /> Parámetros Hidráulicos e IDF</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.dat} onChange={()=>handleToggle1('dat')} /> Datos (Tramos y Pozos)</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.calcSan} onChange={()=>handleToggle1('calcSan')} /> Cálculos Red Sanitaria</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.calcPluv} onChange={()=>handleToggle1('calcPluv')} /> Cálculos Red Pluvial</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.calcHid} onChange={()=>handleToggle1('calcHid')} /> Cálculos Hidráulica</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.calcAliv} onChange={()=>handleToggle1('calcAliv')} /> Cálculos Red Aliviadero</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.estSep} onChange={()=>handleToggle1('estSep')} /> Estructuras de Separación</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.sum} onChange={()=>handleToggle1('sum')} /> Cálculo de Sumideros (Lat. y Trans.)</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.perfiles} onChange={()=>handleToggle1('perfiles')} /> Todos los Perfiles</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.swmm} onChange={()=>handleToggle1('swmm')} /> Modelo SWMM</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.visorEspacial} onChange={()=>handleToggle1('visorEspacial')} /> Visor Espacial (Mapa Principal)</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase1.mapRes} onChange={()=>handleToggle1('mapRes')} /> Visor Resumen (Mapa)</label>
        </div>

        {/* FASE 2 */}
        <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <h3 style={{ margin: 0, color: '#f59e0b' }}>Cantidades y Presupuesto (Fase 2)</h3>
            <div>
              <button onClick={()=>handleAll2(true)} style={{ background: 'transparent', border: '1px solid #34d399', color: '#34d399', padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer', marginRight: 5 }}>Todo</button>
              <button onClick={()=>handleAll2(false)} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '2px 8px', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>Nada</button>
            </div>
          </div>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.dash} onChange={()=>handleToggle2('dash')} /> Dashboard</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.parObra} onChange={()=>handleToggle2('parObra')} /> Parámetros Obra</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.cantPoz} onChange={()=>handleToggle2('cantPoz')} /> Pozos</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.cantTub} onChange={()=>handleToggle2('cantTub')} /> Tuberías</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.cantAco} onChange={()=>handleToggle2('cantAco')} /> Acometidas</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.cantSum} onChange={()=>handleToggle2('cantSum')} /> Sumideros</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.cantExc} onChange={()=>handleToggle2('cantExc')} /> Excavaciones</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.urbanismo} onChange={()=>handleToggle2('urbanismo')} /> Urbanismo</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.sobrante} onChange={()=>handleToggle2('sobrante')} /> Material Sobrante</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.cantGen} onChange={()=>handleToggle2('cantGen')} /> Cantidades de Obra</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.pre} onChange={()=>handleToggle2('pre')} /> Presupuesto</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.resumen} onChange={()=>handleToggle2('resumen')} /> Resumen</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.cronograma} onChange={()=>handleToggle2('cronograma')} /> Cronograma</label>
          <label style={{ display: 'block', marginBottom: 8 }}><input type="checkbox" checked={fase2.abrev} onChange={()=>handleToggle2('abrev')} /> Abreviaturas</label>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.05)', padding: 20, borderRadius: 8, marginBottom: 30 }}>
        <h3 style={{ margin: '0 0 15px 0', color: '#a855f7' }}>Opciones de Formato</h3>
        
        <div style={{ marginBottom: 15 }}>
          <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 'bold' }}>Encabezado del Reporte (Proyecto / Cliente):</label>
          <input type="text" value={settings.headerText} onChange={(e)=>setSettings({...settings, headerText: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 4, border: '1px solid #4b5563', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: 5, fontSize: 13, fontWeight: 'bold' }}>Estilo de Impresión:</label>
          <label style={{ marginRight: 20 }}><input type="radio" name="colorMode" checked={settings.colorMode === 'color'} onChange={()=>setSettings({...settings, colorMode: 'color'})} /> A Color</label>
          <label><input type="radio" name="colorMode" checked={settings.colorMode === 'bn'} onChange={()=>setSettings({...settings, colorMode: 'bn'})} /> Blanco y Negro (Escala de grises)</label>
        </div>
      </div>

      <div style={{ textAlign: 'center', display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleGenerate} style={{ background: 'linear-gradient(90deg, #00A6D6, #005A8C)', color: '#fff', border: 'none', padding: '12px 30px', fontSize: 16, borderRadius: 30, cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
          🖨️ Generar Reporte (Todos los tramos)
        </button>
        <button
          onClick={() => onPrintCustom({ fase1, fase2, settings, onlySelected: true })}
          style={{ background: 'linear-gradient(90deg, #d97706, #b45309)', color: '#fff', border: 'none', padding: '12px 30px', fontSize: 16, borderRadius: 30, cursor: 'pointer', fontWeight: 'bold', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}
          title={`Genera el reporte PDF solo con los ${(selMap||[]).filter(Boolean).length} tramos seleccionados en el visor`}
        >
          🎯 Generar Reporte (Solo Seleccionados: {(selMap||[]).filter(Boolean).length})
        </button>
      </div>

    </div>
  );
}
