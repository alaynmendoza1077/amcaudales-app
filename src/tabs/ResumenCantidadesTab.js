import React, { useState, useMemo } from 'react';
import PTOBASE_DATA from '../ptoBaseData';
import { calcPozosCompleto } from '../calcHelpers';

export function getItemAnalyticalBreakdown(item, data = {}) {
  const { R = [], T = [], sumLat = [], sumTrans = [], P = {}, urbanismoData = [] } = data;
  const code = item.c || "";
  const q = item.q || 0;
  const unit = item.u || "UND";

  let formula = "";
  let originTitle = "Cálculo Detallado Elemento por Elemento (AMCaudales)";
  let details = [];

  const fD = 1 + (P.porcDesperdicio || 0);
  const pT = P.porcExcTierra !== undefined ? parseFloat(P.porcExcTierra) : 0.55;
  const pG = P.porcExcGranular !== undefined ? parseFloat(P.porcExcGranular) : 0.30;
  const pR = P.porcExcRoca !== undefined ? parseFloat(P.porcExcRoca) : 0.15;
  const pAL = P.porcAcarreoLibre !== undefined ? parseFloat(P.porcAcarreoLibre) : 0.50;

  const ep2 = calcPozosCompleto(R, T, P);

  // 1. ROTURA Y DEMOLICIÓN DE PAVIMENTOS
  if (code.startsWith("1.03.01") || code.startsWith("1.03.02") || code.startsWith("1.03.03") || code.startsWith("1.03.04")) {
    formula = `Rotura Pavimento = Σ(Longitud Tramo L x Ancho Vía B) + Rotura por Sumideros en Vía`;
    originTitle = "Análisis Detallado de Rotura de Pavimento por Tramo y Sumidero";

    const tramosRot = (T || []).filter(t => (t.rotP || 0) > 0 || (t.L || 0) > 0);
    tramosRot.forEach(t => {
      const L = parseFloat(t.L || t.longitud || 0);
      const B = parseFloat(t.anchoVia || P.anchoVia || 6.0);
      const areaRot = (t.rotP !== undefined && t.rotP > 0) ? t.rotP : (L * B);
      if (areaRot > 0) {
        details.push({
          elemento: `Tramo ${t.de} -> ${t.a}`,
          expresion: `${L.toFixed(2)} m x ${B.toFixed(2)} m`,
          cantidad: areaRot.toFixed(2),
          unidad: "m²",
          nota: `Tipo Vía: ${t.tipoVia || "Convencional"} (Espesor: ${(P.espesorPav || 0.15).toFixed(2)}m)`
        });
      }
    });

    if (details.length === 0) {
      details.push({ elemento: "Superficie Total de Pavimento a Demoler", expresion: `${q.toFixed(2)} m²`, cantidad: q.toFixed(2), unidad: "m²", nota: "Consolidado de tramos y áreas de sumideros" });
    }

  // 2. EXCAVACIÓN DE ZANJAS Y POZOS
  } else if (code.startsWith("2.01.01") || code.startsWith("2.01.02")) {
    const isLibre = code.endsWith("01") || code.endsWith("02") || code.endsWith("04") || code.endsWith("05") || code.endsWith("07");
    const factorTipo = (code.includes(".01.01") || code.includes(".01.02") || code.includes(".02.01") || code.includes(".02.02")) ? pT : ((code.includes(".01.04") || code.includes(".01.05") || code.includes(".02.04") || code.includes(".02.05")) ? pG : pR);
    const factorAcarreo = isLibre ? pAL : (1 - pAL);
    formula = `Vol. Excavación ${item.d} = Σ(Vol. Zanja Tramo + Vol. Zanja Pozo) x % Suelo (${(factorTipo*100).toFixed(0)}%) x % Acarreo (${(factorAcarreo*100).toFixed(0)}%)`;
    originTitle = `Análisis Elemento por Elemento de Excavación (${(factorTipo*100).toFixed(0)}% Terreno, ${(factorAcarreo*100).toFixed(0)}% Acarreo)`;

    // Detalle por Tramo
    (T || []).forEach(t => {
      if (t.sep) return;
      const L = parseFloat(t.L || t.longitud || 0);
      const profE = parseFloat(t.profE || t.H_ini || 1.5);
      const profS = parseFloat(t.profS || t.H_fin || 1.5);
      const profProm = (profE + profS) / 2;
      const diamMM = parseFloat(t.diametroCom || t.diametro || 200);
      const anchoZanja = (diamMM / 1000) + 0.60; // Ancho zanja = D + 0.60m
      const volBruto = L * anchoZanja * profProm;
      const volPonderado = volBruto * factorTipo * factorAcarreo;

      if (volPonderado > 0) {
        details.push({
          elemento: `Tramo ${t.de} -> ${t.a}`,
          expresion: `${L.toFixed(2)}m x ${anchoZanja.toFixed(2)}m x ${profProm.toFixed(2)}m (Prof)`,
          cantidad: volPonderado.toFixed(2),
          unidad: "m³",
          nota: `Vol. Bruto: ${volBruto.toFixed(2)}m³ | Suelo: ${(factorTipo*100).toFixed(0)}%`
        });
      }
    });

    // Detalle por Pozo
    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        if (pz.isRemodelar) return;
        const prof = parseFloat(pz.prof || 1.5);
        const DE_EXC = (pz.DI || 1.20) + 2 * (pz.ESP || 0.26) + 0.22;
        const volBrutoPz = Math.PI * Math.pow(DE_EXC / 2, 2) * (prof + 0.20);
        const volPzPonderado = volBrutoPz * factorTipo * factorAcarreo;

        if (volPzPonderado > 0) {
          details.push({
            elemento: `Pozo Excavación ${pz.nodo}`,
            expresion: `π x (${(DE_EXC/2).toFixed(2)}m)² x ${(prof + 0.20).toFixed(2)}m (H_exc)`,
            cantidad: volPzPonderado.toFixed(2),
            unidad: "m³",
            nota: `DE_exc=${DE_EXC.toFixed(2)}m | Prof=${prof.toFixed(2)}m`
          });
        }
      });
    }

  // 3. TUBERÍAS POR DIÁMETRO
  } else if (code.startsWith("3.02.02")) {
    formula = `Longitud Tubería ${item.d} = Σ(Longitud de Tramo en ${item.d}) x Factor Desperdicio (1 + ${(P.porcDesperdicio||0)*100}%)`;
    originTitle = `Desglose Tramo por Tramo de Tubería ${item.d}`;

    const tramosTub = (T || []).filter(t => !t.sep);
    tramosTub.forEach(t => {
      const dNom = String(t.diametroCom || t.diametro || "200").trim();
      const L = parseFloat(t.L || t.longitud || 0);
      const L_conDesp = L * fD;

      if (L > 0) {
        details.push({
          elemento: `Tramo ${t.de} -> ${t.a}`,
          expresion: `${L.toFixed(2)} m x ${fD.toFixed(2)} (fD)`,
          cantidad: L_conDesp.toFixed(2),
          unidad: "m",
          nota: `Diámetro: ${dNom} mm | Material: ${t.material || "PVC"}`
        });
      }
    });

  // 4. CONCRETO DE POZOS Y ESTRUCTURAS
  } else if (code === "4.01.01.01") {
    formula = `Concreto Reforzado 4000 PSI = Σ(Volumen Paredes + Solera + Cúpula por Pozo Nuevo) x (1 + Desperdicio)`;
    originTitle = "Análisis Detallado Pozo por Pozo de Concreto Reforzado";

    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        if (pz.pozoNuevo === "S" && !pz.isRemodelar) {
          const prof = parseFloat(pz.prof || 1.5);
          const volConcPz = parseFloat(pz.volConc || 0);
          const volConDesp = volConcPz * fD;

          details.push({
            elemento: `Pozo ${pz.nodo}`,
            expresion: `H_conc=${pz.hConc}m, Vol Pared+Base+Tapa`,
            cantidad: volConDesp.toFixed(2),
            unidad: "m³",
            nota: `Profundidad: ${prof.toFixed(2)}m | Tipo: ${pz.tipoPozo}`
          });
        }
      });
    }

  // 5. DEMOLICIÓN DE POZOS Y ESTRUCTURAS DE CONCRETO
  } else if (code === "5.01.03.02") {
    formula = `Demolición Concreto = Σ(Anillo Tubular Pozo Existente: π x ((DE/2)² - (DI/2)²) x Prof) + Demoliciones Urbanismo`;
    originTitle = "Análisis Pozo por Pozo de Volumen de Demolición Tubular";

    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        const prof = parseFloat(pz.prof || 1.5);
        const DI = 1.20;
        const ESP = 0.26;
        const DE = DI + 2 * ESP; // 1.72m
        const areaTubular = Math.PI * (Math.pow(DE / 2, 2) - Math.pow(DI / 2, 2)); // 1.1926 m2
        const volDemPz = areaTubular * prof;

        details.push({
          elemento: `Pozo Demolición ${pz.nodo}`,
          expresion: `Area Anillo (${areaTubular.toFixed(4)} m²) x ${prof.toFixed(2)}m (Prof)`,
          cantidad: volDemPz.toFixed(2),
          unidad: "m³",
          nota: `Estructura Tubular DI=${DI}m, ESP=${ESP}m, DE=${DE}m`
        });
      });
    }

    if (urbanismoData && urbanismoData.length > 0) {
      urbanismoData.forEach(u => {
        if (u.reqUrbanismo && u.pavEspesorDem > 0) {
          const volUrb = (u.pavL || 0) * (u.ancho || 6) * u.pavEspesorDem;
          details.push({
            elemento: `Demolición Urbanismo Tramo ${u.id}`,
            expresion: `${(u.pavL||0).toFixed(2)}m x ${(u.ancho||6).toFixed(2)}m x ${(u.pavEspesorDem).toFixed(2)}m`,
            cantidad: volUrb.toFixed(2),
            unidad: "m³",
            nota: "Demolición de losas y estructuras en urbanismo"
          });
        }
      });
    }

  // 6. REMODELACIÓN DE POZOS (5.02.01)
  } else if (code.startsWith("5.02.01")) {
    formula = `Pozos a Remodelar ${item.d} = Listado Individual de Pozos Seleccionados con Check 'Remodelar'`;
    originTitle = "Análisis Pozo por Pozo de Pozos Marcados para Remodelación";

    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        if (pz.isRemodelar) {
          const prof = parseFloat(pz.prof || 1.5);
          let itemCodePz = "5.02.01.01";
          if (prof > 4.0) itemCodePz = "5.02.01.03";
          else if (prof > 2.0) itemCodePz = "5.02.01.02";

          if (itemCodePz === code) {
            details.push({
              elemento: `Pozo Remodelar ${pz.nodo}`,
              expresion: `Profundidad ${prof.toFixed(2)} m (Rango: ${item.d})`,
              cantidad: 1,
              unidad: "UND",
              nota: "Pozo existente conservado y adaptado en obra"
            });
          }
        }
      });
    }

  // 7. OTROS ÍTEMS GENERALES
  } else {
    formula = `Cantidad Analizada = Consolidado de elementos hidráulicos y de obra`;
    originTitle = `Análisis de Cantidad de Obra - ${item.d}`;
    details = [
      { elemento: item.d, expresion: `${q.toFixed(2)} ${unit}`, cantidad: q.toFixed(2), unidad: unit, nota: "Inyectado directamente al Presupuesto Oficial" }
    ];
  }

  return { formula, originTitle, details };
}

export default function ResumenCantidadesTab(props) {
  const { pbItems = [], R = [], T = [], sumLat = [], sumTrans = [], P = {}, urbanismoData = [] } = props;

  const [search, setSearch] = useState('');
  const [selectedChap, setSelectedChap] = useState('ALL');
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (code) => {
    setExpandedItems(prev => ({ ...prev, [code]: !prev[code] }));
  };

  const toggleExpandAll = (expand) => {
    const nextState = {};
    if (expand) {
      activeItems.forEach(it => { nextState[it.c] = true; });
    }
    setExpandedItems(nextState);
  };

  // Process items (NO PRICES)
  const activeItems = useMemo(() => {
    if (!pbItems || pbItems.length === 0) return [];
    return pbItems.filter(it => it.lv === 3 && it.q > 0).map(it => {
      let chap = "5. Varios y Estructuras";
      if (it.c.startsWith("1.")) chap = "1. Preliminares y Demoliciones";
      else if (it.c.startsWith("2.")) chap = "2. Excavaciones y Retiros";
      else if (it.c.startsWith("3.")) chap = "3. Tuberías y Redes";
      else if (it.c.startsWith("4.")) chap = "4. Estructuras, Pozos y Acometidas";

      return {
        ...it,
        chap,
        breakdown: getItemAnalyticalBreakdown(it, { R, T, sumLat, sumTrans, P, urbanismoData })
      };
    });
  }, [pbItems, R, T, sumLat, sumTrans, P, urbanismoData]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return activeItems.filter(it => {
      const matchSearch = !search || it.c.toLowerCase().includes(search.toLowerCase()) || it.d.toLowerCase().includes(search.toLowerCase());
      const matchChap = selectedChap === 'ALL' || it.chap.startsWith(selectedChap);
      return matchSearch && matchChap;
    });
  }, [activeItems, search, selectedChap]);

  // KPIs
  const totalLengthTub = useMemo(() => {
    return activeItems.filter(it => it.c.startsWith("3.02")).reduce((s, it) => s + (it.q || 0), 0);
  }, [activeItems]);

  const totalExcavation = useMemo(() => {
    return activeItems.filter(it => it.c.startsWith("2.01")).reduce((s, it) => s + (it.q || 0), 0);
  }, [activeItems]);

  const totalConcrete = useMemo(() => {
    return activeItems.filter(it => it.c.startsWith("4.01")).reduce((s, it) => s + (it.q || 0), 0);
  }, [activeItems]);

  const allExpanded = filteredItems.length > 0 && filteredItems.every(it => expandedItems[it.c]);

  return (
    <div style={{ padding: '24px', backgroundColor: '#090f1d', color: '#f8fafc', minHeight: '100vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* HEADER PRINCIPAL */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📋</span> Cantidades de Obra - Análisis Detallado Elemento por Elemento
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Informe analítico detallado tramo por tramo, pozo por pozo y sumidero por sumidero (Sin Valores Monetarios)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => toggleExpandAll(!allExpanded)}
            style={{ padding: '8px 16px', backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {allExpanded ? '📁 Plegar Todos' : '📂 Desplegar Todos'}
          </button>
        </div>
      </div>

      {/* KPI TARJETAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Ítems Activos con Obra</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{activeItems.length} <span style={{ fontSize: '14px', color: '#64748b' }}>Ítems</span></div>
        </div>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Tubería Total Instalada</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{totalLengthTub.toLocaleString("es-CO", {maximumFractionDigits: 1})} <span style={{ fontSize: '14px', color: '#64748b' }}>m</span></div>
        </div>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Volumen Total Excavación</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>{totalExcavation.toLocaleString("es-CO", {maximumFractionDigits: 1})} <span style={{ fontSize: '14px', color: '#64748b' }}>m³</span></div>
        </div>
        <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', padding: '16px' }}>
          <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Concreto Reforzado Estructuras</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#ec4899', marginTop: '4px' }}>{totalConcrete.toLocaleString("es-CO", {maximumFractionDigits: 1})} <span style={{ fontSize: '14px', color: '#64748b' }}>m³</span></div>
        </div>
      </div>

      {/* CONTROLES DE FILTRO Y BÚSQUEDA */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="🔍 Buscar por código de ítem o descripción..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: '1 1 300px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px 14px', color: '#fff', fontSize: '13px', outline: 'none' }}
        />

        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { id: 'ALL', label: 'Todos los Capítulos' },
            { id: '1', label: '1. Preliminares' },
            { id: '2', label: '2. Excavaciones' },
            { id: '3', label: '3. Tuberías' },
            { id: '4', label: '4. Estructuras & Pozos' },
            { id: '5', label: '5. Varios' }
          ].map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedChap(c.id)}
              style={{ padding: '8px 14px', backgroundColor: selectedChap === c.id ? '#38bdf8' : '#0f172a', color: selectedChap === c.id ? '#0f172a' : '#94a3b8', border: '1px solid #334155', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* TABLA PRINCIPAL DESGLEGABLE (SIN PRECIOS) */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              <th style={{ padding: '14px', width: '40px', textAlign: 'center' }}></th>
              <th style={{ padding: '14px', width: '110px' }}>Ítem Code</th>
              <th style={{ padding: '14px' }}>Descripción del Concepto de Obra</th>
              <th style={{ padding: '14px', width: '90px', textAlign: 'center' }}>Unidad</th>
              <th style={{ padding: '14px', width: '150px', textAlign: 'right' }}>Cantidad Analizada</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((it, idx) => {
              const isExpanded = !!expandedItems[it.c];
              const bk = it.breakdown;

              return (
                <React.Fragment key={idx}>
                  <tr
                    onClick={() => toggleExpand(it.c)}
                    style={{
                      borderBottom: '1px solid #1e293b',
                      backgroundColor: isExpanded ? 'rgba(56, 189, 248, 0.06)' : idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '12px', textAlign: 'center', color: '#38bdf8', fontWeight: 'bold' }}>
                      {isExpanded ? '▼' : '▶'}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>
                      {it.c}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 600, color: '#f1f5f9' }}>
                      {it.d}
                      <span style={{ marginLeft: '10px', fontSize: '10px', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(148, 163, 184, 0.12)', color: '#94a3b8', fontWeight: 500 }}>
                        {it.chap}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', color: '#cbd5e1', fontWeight: 600 }}>
                      {it.u || "UND"}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: '14px' }}>
                      {it.q.toLocaleString("es-CO", { maximumFractionDigits: 2 })}
                    </td>
                  </tr>

                  {/* VISTA DESPLEGABLE DE ANÁLISIS DE SOPORTE */}
                  {isExpanded && (
                    <tr style={{ backgroundColor: '#070c18' }}>
                      <td colSpan="5" style={{ padding: '16px 24px', borderBottom: '2px solid #1e293b' }}>
                        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '16px' }}>
                          
                          {/* TÍTULO Y FÓRMULA */}
                          <div style={{ marginBottom: '14px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>
                              📌 Soporte y Origen: {bk.originTitle}
                            </div>
                            <div style={{ marginTop: '6px', fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#050a15', padding: '10px 14px', borderRadius: '6px', color: '#f59e0b', border: '1px solid #1e293b' }}>
                              Fórmula: {bk.formula}
                            </div>
                          </div>

                          {/* TABLA DE COMPONENTES DE ORIGEN DETALLADA ELEMENTO POR ELEMENTO */}
                          <div style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                              <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
                                  <th style={{ padding: '8px 12px' }}>Elemento / Tramo / Pozo</th>
                                  <th style={{ padding: '8px 12px' }}>Expresión / Dimensión Geométrica</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Subtotal Cantidad</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Unidad</th>
                                  <th style={{ padding: '8px 12px' }}>Criterio y Parámetros Técnicos</th>
                                </tr>
                              </thead>
                              <tbody>
                                {bk.details.map((d, dIdx) => (
                                  <tr key={dIdx} style={{ borderBottom: '1px solid #1e293b' }}>
                                    <td style={{ padding: '8px 12px', fontWeight: 600, color: '#f1f5f9' }}>{d.elemento}</td>
                                    <td style={{ padding: '8px 12px', color: '#cbd5e1', fontFamily: 'monospace' }}>{d.expresion || "-"}</td>
                                    <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>
                                      {typeof d.cantidad === 'number' ? d.cantidad.toLocaleString("es-CO", { maximumFractionDigits: 2 }) : d.cantidad}
                                    </td>
                                    <td style={{ padding: '8px 12px', textAlign: 'center', color: '#94a3b8' }}>{d.unidad}</td>
                                    <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '11px' }}>{d.nota}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {filteredItems.length === 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                  No se encontraron ítems de obra calculados con la búsqueda o filtro seleccionado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

    </div>
  );
}
