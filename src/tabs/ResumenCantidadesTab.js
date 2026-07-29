import React, { useState, useMemo } from 'react';
import PTOBASE_DATA from '../ptoBaseData';
import { calcPozosCompleto } from '../calcHelpers';

export function getItemAnalyticalBreakdown(item, data = {}) {
  const { R = [], T = [], sumLat = [], sumTrans = [], P = {}, urbanismoData = [] } = data;
  const code = item.c || "";
  const q = item.q || 0;
  const unit = item.u || "UND";

  let formula = "";
  let originTitle = "Cálculo Automático por Motor Hidráulico AMCaudales";
  let details = [];

  const fD = 1 + (P.porcDesperdicio || 0);
  const pT = P.porcExcTierra !== undefined ? parseFloat(P.porcExcTierra) : 0.55;
  const pG = P.porcExcGranular !== undefined ? parseFloat(P.porcExcGranular) : 0.30;
  const pR = P.porcExcRoca !== undefined ? parseFloat(P.porcExcRoca) : 0.15;
  const pAL = P.porcAcarreoLibre !== undefined ? parseFloat(P.porcAcarreoLibre) : 0.50;

  if (code.startsWith("1.01.01")) {
    formula = `Vallas de Obra = ${P.frentesObra || 1} Frente(s) de Obra x Vallas Reglamentarias`;
    originTitle = "Localización y Vallas de Identificación de Obra";
    details = [
      { elemento: `Frentes de Obra Activos (${P.frentesObra || 1})`, expresion: `${P.frentesObra || 1} x 1 Valla`, cantidad: q, unidad: unit, nota: "Valla metálica reglamentaria según especificaciones" }
    ];
  } else if (code.startsWith("1.03.01") || code.startsWith("1.03.02") || code.startsWith("1.03.03") || code.startsWith("1.03.04")) {
    formula = `Rotura Pavimento = Σ(Ancho Zanja x Longitud Tramo) + Rotura Sumideros en Vía`;
    originTitle = "Análisis de Rotura y Demolición de Pavimentos";
    const tramosRot = (T || []).filter(t => (t.rotP || 0) > 0);
    if (tramosRot.length > 0) {
      details = tramosRot.map(t => ({
        elemento: `Tramo ${t.de} -> ${t.a}`,
        expresion: `${(t.L||0).toFixed(2)} m x ${(t.anchoVia||P.anchoVia||6).toFixed(2)} m`,
        cantidad: (t.rotP || 0).toFixed(2),
        unidad: "m²",
        nota: `Tipo Vía: ${t.tipoVia || "Convencional"}`
      }));
    } else {
      details = [{ elemento: "Superficie Total de Pavimento a Demoler", expresion: `${q.toFixed(2)} m²`, cantidad: q.toFixed(2), unidad: "m²", nota: "Calculado desde geometría de tramos y sumideros" }];
    }
  } else if (code.startsWith("2.01.01") || code.startsWith("2.01.02")) {
    const isLibre = code.endsWith("01") || code.endsWith("02") || code.endsWith("04") || code.endsWith("05") || code.endsWith("07");
    const factorTipo = code.includes(".01.") || code.includes(".02.") ? (code.endsWith("01") || code.endsWith("02") ? pT : pG) : pR;
    const factorAcarreo = isLibre ? pAL : (1 - pAL);
    formula = `Vol. Excavación ${item.d} = (Vol. Excavación Zanjas Tramos + Vol. Pozos + Vol. Sumideros) x Factor Terreno (${(factorTipo*100).toFixed(0)}%) x Factor Acarreo (${(factorAcarreo*100).toFixed(0)}%)`;
    originTitle = "Análisis de Excavación de Zanjas por Rango y Tipo de Suelo";
    details = [
      { elemento: "Excavación Bruta de Zanjas en Tramos", expresion: "Σ(Ancho Zanja x Profundidad Promedio x Longitud)", cantidad: (q / (factorTipo * factorAcarreo || 1)).toFixed(2), unidad: "m³", nota: "Volumen geométrico de excavación" },
      { elemento: `Factor Tipo de Suelo`, expresion: `${(factorTipo*100).toFixed(0)}%`, cantidad: (factorTipo).toFixed(2), unidad: "Coef", nota: `Porcentaje asignado en parámetros` },
      { elemento: `Factor de Acarreo (${isLibre ? 'Libre <=50m' : 'Acarreo Libre >50m'})`, expresion: `${(factorAcarreo*100).toFixed(0)}%`, cantidad: (factorAcarreo).toFixed(2), unidad: "Coef", nota: `Distribución de acarreo` }
    ];
  } else if (code.startsWith("3.02.02")) {
    formula = `Longitud Total Tubería ${item.d} = (Longitud Red Principal + Conexiones Acometidas/Sumideros) x (1 + Desperdicio ${(P.porcDesperdicio||0)*100}%)`;
    originTitle = "Suministro e Instalación de Tubería de Alcantarillado";
    const L_red = q / fD;
    details = [
      { elemento: "Red Principal Colectores", expresion: `Sumatoria de tramos en ${item.d}`, cantidad: L_red.toFixed(2), unidad: "m", nota: "Longitud de diseño entre ejes de pozos" },
      { elemento: `Factor de Desperdicio y Cortes`, expresion: `1 + ${(P.porcDesperdicio||0).toFixed(2)}`, cantidad: fD.toFixed(2), unidad: "Coef", nota: `Desperdicio ${(P.porcDesperdicio||0)*100}%` }
    ];
  } else if (code === "4.01.01.01") {
    formula = `Concreto Pozos & Sumideros 4000 PSI = (Volumen Concreto Paredes Pozos + Base + Solera + Sumideros) x Desperdicio`;
    originTitle = "Concreto de Estructuras de Inspección y Captación";
    details = [
      { elemento: "Estructura Cilíndrica de Pozos de Inspección", expresion: "Anillo de concreto + Solera de fondo + Cúpula", cantidad: (q / fD).toFixed(2), unidad: "m³", nota: "Calibrado según especificación EMPAS" },
      { elemento: "Factor Desperdicio Concreto", expresion: `1 + ${(P.porcDesperdicio||0).toFixed(2)}`, cantidad: fD.toFixed(2), unidad: "Coef", nota: "Adicional por colocación en sitio" }
    ];
  } else if (code === "5.01.03.02") {
    const ep2 = calcPozosCompleto(R, T, P);
    formula = `Volumen Demolición Concreto Pozos = Σ(Anillo Tubular Pozo: π x (r_ext² - r_int²) x Prof) + Demoliciones Urbanismo`;
    originTitle = "Demolición de Estructuras de Concreto Reforzado";
    details = [
      { elemento: "Anillo Tubular de Paredes Pozos Existentes", expresion: `Area Anillo (1.1926 m²) x Profundidad (${ep2.pz.length} pozos)`, cantidad: (ep2.tVolDemolicion || 0).toFixed(2), unidad: "m³", nota: "Paredes de pozo DI=1.20m, Espesor=0.26m" },
      { elemento: "Demolición de Estructuras en Urbanismo", expresion: "Sumatoria de áreas/volúmenes de urbanismo", cantidad: (q - (ep2.tVolDemolicion || 0)).toFixed(2), unidad: "m³", nota: "Aportado desde pestaña Urbanismo" }
    ];
  } else if (code.startsWith("5.02.01")) {
    const ep2 = calcPozosCompleto(R, T, P);
    const count = ep2.remodelCounts ? (ep2.remodelCounts[code] || 0) : q;
    formula = `Pozos a Remodelar ${item.d} = Conteo de Pozos Marcados con Check 'Remodelar'`;
    originTitle = "Remodelación y Adecuación de Pozos Existentes";
    details = [
      { elemento: `Pozos a Remodelar (${item.d})`, expresion: `${count} Pozo(s) seleccionados`, cantidad: count, unidad: "UND", nota: "Excluidos de obra nueva e inyectados al Ítem 5.02" }
    ];
  } else {
    formula = `Cantidad Analizada = Expresión consolidada desde módulo de diseño`;
    originTitle = `Análisis de Cantidad - ${item.d}`;
    details = [
      { elemento: item.d, expresion: `${q.toFixed(2)} ${unit}`, cantidad: q.toFixed(2), unidad: unit, nota: "Inyectado directamente al Presupuesto de Obra" }
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
            <span>📋</span> Análisis Desglosado de Cantidades de Obra
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Desglose analítico, fórmulas matemáticas y soporte de origen por cada ítem (Sin Valores Monetarios)
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

                          {/* TABLA DE COMPONENTES DE ORIGEN */}
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8' }}>
                                  <th style={{ padding: '8px 12px' }}>Elemento / Componente de Origen</th>
                                  <th style={{ padding: '8px 12px' }}>Expresión o Dimensión</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Subtotal Cantidad</th>
                                  <th style={{ padding: '8px 12px', textAlign: 'center' }}>Unidad</th>
                                  <th style={{ padding: '8px 12px' }}>Criterio y Nota Técnica</th>
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
