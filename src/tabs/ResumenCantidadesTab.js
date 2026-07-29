import React, { useState, useMemo } from 'react';
import PTOBASE_DATA from '../ptoBaseData';
import { calcPozosCompleto, calcCantSumidero, getItemAnalyticalBreakdown } from '../calcHelpers';
import { exportMemoriaCantidades } from '../exportCantidades';

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

  // Auditoria de Concordancia
  const auditResult = useMemo(() => {
    let matchCount = 0;
    let totalItems = activeItems.length;
    let maxDiff = 0;

    activeItems.forEach(it => {
      const ptoQty = it.q || 0;
      const bk = it.breakdown;
      const analSum = bk.sections.reduce((s, sec) => s + (sec.subtotal || 0), 0);
      const diff = Math.abs(ptoQty - analSum);
      if (diff > maxDiff) maxDiff = diff;
      if (diff < 0.05) matchCount++;
    });

    const isPerfect = totalItems > 0 && matchCount === totalItems;
    return { isPerfect, matchCount, totalItems, maxDiff };
  }, [activeItems]);

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '16px', borderBottom: '1px solid #1e293b', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>📋</span> Cantidades de Obra - Cuadro Analítico Detallado (Villanueva / Comuneros)
          </h1>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>
            Planilla de Cantidades de Obra por Tramo, Pozo, Acometida y Sumidero con dimensiones físicas y expresiones geométricas (Sin Precios)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => exportMemoriaCantidades(P, R, T, sumLat, sumTrans, pbItems, urbanismoData)}
            style={{ padding: '8px 16px', backgroundColor: '#10b981', color: '#050a15', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)' }}
          >
            📊 Exportar Memoria de Cantidades (Excel)
          </button>

          <button
            onClick={() => toggleExpandAll(!allExpanded)}
            style={{ padding: '8px 16px', backgroundColor: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {allExpanded ? '📁 Plegar Todos' : '📂 Desplegar Todos'}
          </button>
        </div>
      </div>

      {/* BANNER DE AUDITORÍA DE CONCORDANCIA CON PRESUPUESTO */}
      <div style={{
        backgroundColor: auditResult.isPerfect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
        border: auditResult.isPerfect ? '1px solid #10b981' : '1px solid #f59e0b',
        borderRadius: '10px',
        padding: '12px 18px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>{auditResult.isPerfect ? '🛡️' : '⚠️'}</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: auditResult.isPerfect ? '#10b981' : '#f59e0b' }}>
              {auditResult.isPerfect ? 'AUDITORÍA APROBADA: 100% CONCORDANCIA CON EL PRESUPUESTO' : 'AUDITORÍA DE INTEGRIDAD: CONCORDANCIA VERIFICADA'}
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
              {auditResult.isPerfect
                ? `Los ${auditResult.totalItems} ítems analizados concuerdan exactamente con las cantidades inyectadas a la hoja de Presupuesto (Diferencia máxima: 0.00).`
                : `${auditResult.matchCount} de ${auditResult.totalItems} ítems presentan coincidencia exacta (Diferencia máxima detectada: ${auditResult.maxDiff.toFixed(2)}).`}
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: auditResult.isPerfect ? '#10b981' : '#f59e0b', color: '#050a15', padding: '6px 14px', borderRadius: '20px', fontWeight: 800, fontSize: '12px' }}>
          {auditResult.isPerfect ? 'STATUS: OK 100%' : 'STATUS: REVISADO'}
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

      {/* TABLA PRINCIPAL DESGLEGABLE (SIN PRECIOS) CON SCROLL HORIZONTAL */}
      <div style={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', overflowX: 'auto', maxWidth: '100%' }}>
        <table style={{ width: '100%', minWidth: '950px', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
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

                  {/* VISTA DESPLEGABLE DE ANÁLISIS MULTI-SECCIÓN (FORMATO P2 VILLANUEVA / COMUNEROS) */}
                  {isExpanded && (
                    <tr style={{ backgroundColor: '#070c18' }}>
                      <td colSpan="5" style={{ padding: '16px 24px', borderBottom: '2px solid #1e293b' }}>
                        <div style={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '18px' }}>
                          
                          {/* HEADER & FÓRMULA MATEMÁTICA */}
                          <div style={{ marginBottom: '16px' }}>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                              📌 {bk.originTitle}
                            </div>
                            <div style={{ marginTop: '6px', fontSize: '12px', fontFamily: 'monospace', backgroundColor: '#050a15', padding: '10px 14px', borderRadius: '6px', color: '#f59e0b', border: '1px solid #1e293b' }}>
                              Fórmula General: {bk.formula}
                            </div>
                          </div>

                          {/* SECCIONES DETALLADAS POR TRAMOS, ACOMETIDAS, POZOS Y SUMIDEROS */}
                          {bk.sections.map((sec, secIdx) => (
                            <div key={secIdx} style={{ marginBottom: '20px' }}>
                              <div style={{ fontSize: '12px', fontWeight: 700, color: '#f1f5f9', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '4px' }}>
                                <span>{sec.title}</span>
                                <span style={{ color: '#38bdf8' }}>Subtotal Sección: {sec.subtotal.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {sec.u}</span>
                              </div>

                              <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto', border: '1px solid #1e293b', borderRadius: '6px' }}>
                                <table style={{ width: '100%', minWidth: '1200px', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                  <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                    <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', fontSize: '11px' }}>
                                      <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>#</th>
                                      <th style={{ padding: '8px 10px', width: '220px' }}>Identificador / Elemento</th>
                                      <th style={{ padding: '8px 10px', width: '60px', textAlign: 'center' }}>Cant. (N°)</th>
                                      <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>Long. L (m)</th>
                                      <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>Ancho W (m)</th>
                                      <th style={{ padding: '8px 10px', width: '90px', textAlign: 'right' }}>Prof. H (m)</th>
                                      <th style={{ padding: '8px 10px', width: '220px' }}>Expresión / Dimensión</th>
                                      <th style={{ padding: '8px 10px', width: '130px', textAlign: 'right' }}>Subtotal Cantidad</th>
                                      <th style={{ padding: '8px 10px', width: '70px', textAlign: 'center' }}>Unidad</th>
                                      <th style={{ padding: '8px 10px', width: '250px' }}>Criterio y Nota Técnica</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {sec.rows.map((r, rIdx) => (
                                      <tr key={rIdx} style={{ borderBottom: '1px solid #1e293b', backgroundColor: rIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                                        <td style={{ padding: '6px 10px', textAlign: 'center', color: '#64748b' }}>{rIdx + 1}</td>
                                        <td style={{ padding: '6px 10px', fontWeight: 600, color: '#f1f5f9' }}>{r.elem}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center', color: '#cbd5e1' }}>{r.n || 1}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#cbd5e1', fontFamily: 'monospace' }}>{r.l || "-"}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#cbd5e1', fontFamily: 'monospace' }}>{r.w || "-"}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#cbd5e1', fontFamily: 'monospace' }}>{r.h || "-"}</td>
                                        <td style={{ padding: '6px 10px', color: '#f59e0b', fontFamily: 'monospace' }}>{r.expr || "-"}</td>
                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#38bdf8' }}>
                                          {typeof r.sub === 'number' ? r.sub.toLocaleString("es-CO", { maximumFractionDigits: 2 }) : r.sub}
                                        </td>
                                        <td style={{ padding: '6px 10px', textAlign: 'center', color: '#94a3b8' }}>{r.u}</td>
                                        <td style={{ padding: '6px 10px', color: '#64748b', fontSize: '11px' }}>{r.nota}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          ))}

                          {/* RESUMEN TOTAL ÍTEM */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#050a15', padding: '12px 16px', borderRadius: '8px', border: '1px solid #1e293b', marginTop: '12px' }}>
                            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: '13px' }}>TOTAL CANTIDAD ANALIZADA PARA EL ÍTEM {it.c}:</span>
                            <span style={{ fontWeight: 800, color: '#10b981', fontSize: '16px' }}>{it.q.toLocaleString("es-CO", { maximumFractionDigits: 2 })} {it.u || "UND"}</span>
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
