import React, { useState, useMemo } from 'react';
import PTOBASE_DATA from '../ptoBaseData';
import { calcPozosCompleto, calcCantSumidero } from '../calcHelpers';

export function getItemAnalyticalBreakdown(item, data = {}) {
  const { R = [], T = [], sumLat = [], sumTrans = [], P = {}, urbanismoData = [] } = data;
  const code = item.c || "";
  const q = item.q || 0;
  const unit = item.u || "UND";

  let formula = "";
  let originTitle = "Análisis Detallado por Componentes";
  let sections = [];

  const fD = 1 + (P.porcDesperdicio || 0);
  const pT = P.porcExcTierra !== undefined ? parseFloat(P.porcExcTierra) : 0.55;
  const pG = P.porcExcGranular !== undefined ? parseFloat(P.porcExcGranular) : 0.30;
  const pR = P.porcExcRoca !== undefined ? parseFloat(P.porcExcRoca) : 0.15;
  const pAL = P.porcAcarreoLibre !== undefined ? parseFloat(P.porcAcarreoLibre) : 0.50;

  const nAc = (parseFloat(P.nAcom06)||0) + (parseFloat(P.nAcom610)||0) + (parseFloat(P.nAcom10)||0);
  const largoAco = parseFloat(P.largoAco)||6.0;
  const ep2 = calcPozosCompleto(R, T, P);

  // Calcular sumideros rotura y excavacion
  let sumRotTot = 0, sumExcTot = 0, sumConcTot = 0;
  if (sumLat) sumLat.forEach(f => { if ((f.cant || 0) > 0) { var c = calcCantSumidero(f, P); sumRotTot += (c.rot || 0); sumExcTot += (c.totExc || 0); sumConcTot += (c.c4 || 0); } });
  if (sumTrans) sumTrans.forEach(f => { if ((f.cant || 0) > 0) { var c = calcCantSumidero(f, P); sumRotTot += (c.rot || 0); sumExcTot += (c.totExc || 0); sumConcTot += (c.c4 || 0); } });

  const dN = (R || []).filter(r => !r.sep && r.reponer === "S");

  // --------------------------------------------------------------------------
  // 1. ROTURA Y DEMOLICIÓN DE PAVIMENTOS (1.03.xx)
  // --------------------------------------------------------------------------
  if (code.startsWith("1.03.")) {
    formula = `Rotura Pavimento = Σ(Tramos según Tipo Vía y Espesor) + Σ(Sumideros en Vía)`;
    originTitle = `Análisis de Rotura de Pavimento - Ítem ${code} (${item.d})`;

    const esp = P.espesorPav || 0.15;
    const tramoRows = [];
    let subtotalTramos = 0;

    dN.forEach(t => {
      let match = false;
      if (code === "1.03.01.01" && (t.tipoVia === "FX" || t.tipoVia === "TL") && esp < 0.10) match = true;
      else if (code === "1.03.01.02" && (t.tipoVia === "FX" || t.tipoVia === "TL" || !t.tipoVia) && esp >= 0.10 && esp <= 0.20) match = true;
      else if (code === "1.03.01.03" && (t.tipoVia === "FX" || t.tipoVia === "TL") && esp > 0.20) match = true;
      else if (code === "1.03.02.01" && t.tipoVia === "RG" && esp < 0.15) match = true;
      else if (code === "1.03.02.02" && t.tipoVia === "RG" && esp >= 0.15 && esp <= 0.25) match = true;
      else if (code === "1.03.02.03" && t.tipoVia === "RG" && esp > 0.25) match = true;
      else if (code === "1.03.03.02" && (t.tipoVia === "PP" || t.tipoVia === "AD")) match = true;
      else if (code === "1.03.04.02" && t.tipoVia === "AN") match = true;

      if (match) {
        const L = parseFloat(t.Le || t.L || t.longitud || 0);
        const B = parseFloat(t.anchoVia || P.anchoVia || 6.0);
        const areaRot = (t.rotP !== undefined && t.rotP > 0) ? parseFloat(t.rotP) : (L * B);
        subtotalTramos += areaRot;

        tramoRows.push({
          elem: `Tramo ${t.de} -> ${t.a}`,
          n: 1,
          l: L.toFixed(2),
          w: B.toFixed(2),
          h: esp.toFixed(2),
          expr: `${L.toFixed(2)}m x ${B.toFixed(2)}m`,
          sub: areaRot.toFixed(2),
          u: "m²",
          nota: `Tipo Vía: ${t.tipoVia || "Convencional"}`
        });
      }
    });

    if (tramoRows.length > 0) {
      sections.push({ title: "1. Tramos de Red Principal Afectados", rows: tramoRows, subtotal: subtotalTramos, u: "m²" });
    }

    // Acometidas
    if (nAc > 0 && (code === "1.03.01.02" || code === "1.03.04.02")) {
      const areaAcom = nAc * (P.anchoAnden || 1.0) * 0.56;
      sections.push({
        title: "2. Acometidas Domiciliarias en Vía / Andén",
        rows: [{
          elem: "Acometidas de Alcantarillado",
          n: nAc,
          l: (P.anchoAnden || 1.0).toFixed(2),
          w: "0.56",
          h: "-",
          expr: `${nAc} Acom. x ${(P.anchoAnden||1.0)}m x 0.56m`,
          sub: areaAcom.toFixed(2),
          u: "m²",
          nota: "Rotura de andén y franja de acometida"
        }],
        subtotal: areaAcom,
        u: "m²"
      });
    }

    // Sumideros
    if (sumRotTot > 0 && code === "1.03.01.02") {
      sections.push({
        title: "3. Sumideros e Imprevistos en Vía",
        rows: [{
          elem: "Sumideros Laterales / Transversales",
          n: (sumLat.length + sumTrans.length),
          l: "1.20",
          w: "0.80",
          h: "-",
          expr: `Sumatoria de captaciones`,
          sub: sumRotTot.toFixed(2),
          u: "m²",
          nota: "Rotura para cajas de captación"
        }],
        subtotal: sumRotTot,
        u: "m²"
      });
    }

  // --------------------------------------------------------------------------
  // 2. EXCAVACIÓN DE ZANJAS Y POZOS (2.01.xx)
  // --------------------------------------------------------------------------
  } else if (code.startsWith("2.01.01") || code.startsWith("2.01.02")) {
    const isLibre = code.endsWith("01") || code.endsWith("02") || code.endsWith("04") || code.endsWith("05") || code.endsWith("07");
    const is25 = code.includes(".01") || code.includes(".04");
    const factorTipo = (code.includes(".01.01") || code.includes(".01.02") || code.includes(".02.01") || code.includes(".02.02")) ? pT : ((code.includes(".01.04") || code.includes(".01.05") || code.includes(".02.04") || code.includes(".02.05")) ? pG : pR);
    const factorAcarreo = isLibre ? pAL : (1 - pAL);
    formula = `Vol. Excavación = (Vol. Tramos + Vol. Pozos + Vol. Sumideros) x % Terreno (${(factorTipo*100).toFixed(0)}%) x % Acarreo (${(factorAcarreo*100).toFixed(0)}%)`;
    originTitle = `Análisis de Excavación por Rango - Ítem ${code} (${item.d})`;

    // Tramos
    const tramoExcRows = [];
    let subTramosExc = 0;
    dN.forEach(t => {
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const volB = is25 ? (t.v025 || 0) : (t.v2550 || 0);
      const volP = volB * factorTipo * factorAcarreo;
      subTramosExc += volP;

      if (volP > 0) {
        tramoExcRows.push({
          elem: `Tramo ${t.de} -> ${t.a}`,
          n: 1,
          l: L.toFixed(2),
          w: ((parseFloat(t.diametroCom||200)/1000)+0.60).toFixed(2),
          h: (((+t.profE||1.5)+(+t.profS||1.5))/2).toFixed(2),
          expr: `${volB.toFixed(2)}m³ x ${(factorTipo*100).toFixed(0)}% x ${(factorAcarreo*100).toFixed(0)}%`,
          sub: volP.toFixed(2),
          u: "m³",
          nota: `Vol. Bruto Tramo: ${volB.toFixed(2)}m³`
        });
      }
    });
    if (tramoExcRows.length > 0) {
      sections.push({ title: "1. Excavación Zanjas Tramos de Red", rows: tramoExcRows, subtotal: subTramosExc, u: "m³" });
    }

    // Pozos
    const pozExcRows = [];
    let subPozExc = 0;
    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        if (pz.isRemodelar) return;
        const prof = parseFloat(pz.prof || 1.5);
        const volBPz = is25 ? (pz.v025 || 0) : (pz.v2550 || 0);
        const volPPz = volBPz * factorTipo * factorAcarreo;
        subPozExc += volPPz;

        if (volPPz > 0) {
          pozExcRows.push({
            elem: `Pozo ${pz.nodo}`,
            n: 1,
            l: (pz.DE||1.72).toFixed(2),
            w: (pz.DE||1.72).toFixed(2),
            h: prof.toFixed(2),
            expr: `${volBPz.toFixed(2)}m³ x ${(factorTipo*100).toFixed(0)}% x ${(factorAcarreo*100).toFixed(0)}%`,
            sub: volPPz.toFixed(2),
            u: "m³",
            nota: `Profundidad: ${prof.toFixed(2)}m`
          });
        }
      });
    }
    if (pozExcRows.length > 0) {
      sections.push({ title: "2. Excavación Pozos de Inspección", rows: pozExcRows, subtotal: subPozExc, u: "m³" });
    }

    // Sumideros
    if (sumExcTot > 0 && is25) {
      const volSumP = sumExcTot * factorTipo * factorAcarreo;
      sections.push({
        title: "3. Excavación Cajas de Sumideros",
        rows: [{
          elem: "Sumideros de Captación",
          n: (sumLat.length + sumTrans.length),
          l: "1.20",
          w: "0.80",
          h: "1.20",
          expr: `${sumExcTot.toFixed(2)}m³ x ${(factorTipo*100).toFixed(0)}% x ${(factorAcarreo*100).toFixed(0)}%`,
          sub: volSumP.toFixed(2),
          u: "m³",
          nota: "Excavación para estructuras de sumideros"
        }],
        subtotal: volSumP,
        u: "m³"
      });
    }

  // --------------------------------------------------------------------------
  // 3. TUBERÍAS POR DIÁMETRO (3.02.02.xx)
  // --------------------------------------------------------------------------
  } else if (code.startsWith("3.02.02")) {
    formula = `Longitud Tubería ${item.d} = Σ(Tramos con ${item.d}) x Factor Desperdicio (1 + ${(P.porcDesperdicio||0)*100}%)`;
    originTitle = `Desglose Detallado de Tubería - Ítem ${code} (${item.d})`;

    const tramoTubRows = [];
    let subtotalTubTramos = 0;
    dN.forEach(t => {
      const dNom = String(t.diametroCom || t.diametro || 200).trim();
      const L = parseFloat(t.Le || t.L || t.longitud || 0);
      const L_desp = L * fD;
      subtotalTubTramos += L_desp;

      tramoTubRows.push({
        elem: `Tramo ${t.de} -> ${t.a}`,
        n: 1,
        l: L.toFixed(2),
        w: "-",
        h: "-",
        expr: `${L.toFixed(2)}m x ${fD.toFixed(2)} (fD)`,
        sub: L_desp.toFixed(2),
        u: "m",
        nota: `Material: ${t.material || "PVC"} | Diámetro: ${dNom}mm`
      });
    });
    if (tramoTubRows.length > 0) {
      sections.push({ title: "1. Colectores Red Principal", rows: tramoTubRows, subtotal: subtotalTubTramos, u: "m" });
    }

  // --------------------------------------------------------------------------
  // 4. CONCRETO DE POZOS 4000 PSI (4.01.01.01)
  // --------------------------------------------------------------------------
  } else if (code === "4.01.01.01") {
    formula = `Concreto Reforzado 4000 PSI = (Volumen Paredes Pozos + Volumen Concreto Sumideros) x (1 + Desperdicio)`;
    originTitle = "Análisis Pozo por Pozo de Concreto Reforzado 4000 PSI";

    const pozConcRows = [];
    let subtotalConcPoz = 0;
    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        if (pz.pozoNuevo === "S" && !pz.isRemodelar) {
          const prof = parseFloat(pz.prof || 1.5);
          const volBrutoPz = parseFloat(pz.volConc || 0);
          const volFinalPz = volBrutoPz * fD;
          subtotalConcPoz += volFinalPz;

          pozConcRows.push({
            elem: `Pozo ${pz.nodo}`,
            n: 1,
            l: (pz.DI||1.20).toFixed(2),
            w: (pz.DE||1.72).toFixed(2),
            h: prof.toFixed(2),
            expr: `(${volBrutoPz.toFixed(2)}m³ Pared+Base+Tapa) x ${fD.toFixed(2)}`,
            sub: volFinalPz.toFixed(2),
            u: "m³",
            nota: `Profundidad: ${prof.toFixed(2)}m | Tipo: ${pz.tipoPozo}`
          });
        }
      });
    }
    if (pozConcRows.length > 0) {
      sections.push({ title: "1. Estructuras de Pozos de Inspección Nuevos", rows: pozConcRows, subtotal: subtotalConcPoz, u: "m³" });
    }

    if (sumConcTot > 0) {
      const volSumConcF = sumConcTot * fD;
      sections.push({
        title: "2. Concreto Estructuras de Sumideros",
        rows: [{
          elem: "Sumideros de Captación",
          n: (sumLat.length + sumTrans.length),
          l: "1.20",
          w: "0.80",
          h: "1.20",
          expr: `${sumConcTot.toFixed(2)}m³ x ${fD.toFixed(2)} (fD)`,
          sub: volSumConcF.toFixed(2),
          u: "m³",
          nota: "Concreto de cajas y aletas de sumideros"
        }],
        subtotal: volSumConcF,
        u: "m³"
      });
    }

  // --------------------------------------------------------------------------
  // 5. DEMOLICIÓN DE ESTRUCTURAS EN CONCRETO (5.01.03.02)
  // --------------------------------------------------------------------------
  } else if (code === "5.01.03.02") {
    formula = `Demolición Concreto = Σ(Anillo Tubular Pozo Existente: π x ((DE/2)² - (DI/2)²) x Prof) + Demoliciones Urbanismo`;
    originTitle = "Análisis Pozo por Pozo y Tramo por Tramo de Demolición de Concreto";

    const pozDemRows = [];
    let subtotalDemPoz = 0;
    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        const prof = parseFloat(pz.prof || 1.5);
        const DI = 1.20;
        const ESP = 0.26;
        const DE = DI + 2 * ESP; // 1.72m
        const areaTubular = Math.PI * (Math.pow(DE / 2, 2) - Math.pow(DI / 2, 2)); // 1.1926 m2
        const volDemPz = areaTubular * prof;
        subtotalDemPoz += volDemPz;

        pozDemRows.push({
          elem: `Pozo Existente ${pz.nodo}`,
          n: 1,
          l: DI.toFixed(2),
          w: DE.toFixed(2),
          h: prof.toFixed(2),
          expr: `${areaTubular.toFixed(4)} m² (Anillo) x ${prof.toFixed(2)}m (H)`,
          sub: volDemPz.toFixed(2),
          u: "m³",
          nota: `Estructura Tubular DI=${DI}m, ESP=${ESP}m, DE=${DE}m`
        });
      });
    }
    if (pozDemRows.length > 0) {
      sections.push({ title: "1. Demolición de Pozos Existentes (Estructura Tubular)", rows: pozDemRows, subtotal: subtotalDemPoz, u: "m³" });
    }

    if (urbanismoData && urbanismoData.length > 0) {
      const urbRows = [];
      let subtotalUrbDem = 0;
      urbanismoData.forEach(u => {
        if (u.reqUrbanismo && u.pavEspesorDem > 0) {
          const L = parseFloat(u.pavL || 0);
          const W = parseFloat(u.ancho || 6.0);
          const H = parseFloat(u.pavEspesorDem || 0.15);
          const volUrb = L * W * H;
          subtotalUrbDem += volUrb;

          urbRows.push({
            elem: `Demolición Urbanismo Tramo ${u.id}`,
            n: 1,
            l: L.toFixed(2),
            w: W.toFixed(2),
            h: H.toFixed(2),
            expr: `${L.toFixed(2)}m x ${W.toFixed(2)}m x ${H.toFixed(2)}m`,
            sub: volUrb.toFixed(2),
            u: "m³",
            nota: "Demolición de pavimentos y estructuras en urbanismo"
          });
        }
      });
      if (urbRows.length > 0) {
        sections.push({ title: "2. Demolición de Estructuras en Urbanismo", rows: urbRows, subtotal: subtotalUrbDem, u: "m³" });
      }
    }

  // --------------------------------------------------------------------------
  // 6. REMODELACIÓN DE POZOS (5.02.01.xx)
  // --------------------------------------------------------------------------
  } else if (code.startsWith("5.02.01")) {
    formula = `Pozos a Remodelar ${item.d} = Lista de Pozos Marcados con Check 'Remodelar' en Cantidades Pozos`;
    originTitle = "Análisis Pozo por Pozo de Pozos Marcados para Remodelación";

    const pozRemRows = [];
    let subtotalRemPoz = 0;
    if (ep2 && ep2.pz) {
      ep2.pz.forEach(pz => {
        if (pz.isRemodelar) {
          const prof = parseFloat(pz.prof || 1.5);
          let itemCodePz = "5.02.01.01";
          if (prof > 4.0) itemCodePz = "5.02.01.03";
          else if (prof > 2.0) itemCodePz = "5.02.01.02";

          if (itemCodePz === code) {
            subtotalRemPoz += 1;
            pozRemRows.push({
              elem: `Pozo Remodelar ${pz.nodo}`,
              n: 1,
              l: (pz.DI||1.20).toFixed(2),
              w: (pz.DE||1.72).toFixed(2),
              h: prof.toFixed(2),
              expr: `Profundidad: ${prof.toFixed(2)} m`,
              sub: 1,
              u: "UND",
              nota: "Pozo adaptado y excluido de cantidades de obra nueva"
            });
          }
        }
      });
    }
    if (pozRemRows.length > 0) {
      sections.push({ title: `1. Listado de Pozos a Remodelar (${item.d})`, rows: pozRemRows, subtotal: subtotalRemPoz, u: "UND" });
    }

  // --------------------------------------------------------------------------
  // 7. OTROS ÍTEMS GENERALES
  // --------------------------------------------------------------------------
  } else {
    formula = `Cantidad Analizada = Parámetros de obra e ingeniería consolidada`;
    originTitle = `Análisis de Cantidad de Obra - ${item.d}`;
    sections.push({
      title: "1. Componentes Principales del Ítem",
      rows: [{
        elem: item.d,
        n: 1,
        l: "-",
        w: "-",
        h: "-",
        expr: `${q.toFixed(2)} ${unit}`,
        sub: q.toFixed(2),
        u: unit,
        nota: "Cantidad inyectada directamente al Presupuesto Oficial"
      }],
      subtotal: q,
      u: unit
    });
  }

  return { formula, originTitle, sections };
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

        <div style={{ display: 'flex', gap: '10px' }}>
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

                              <div style={{ overflowX: 'auto', maxHeight: '350px', overflowY: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                                  <thead style={{ position: 'sticky', top: 0, zIndex: 2 }}>
                                    <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', fontSize: '11px' }}>
                                      <th style={{ padding: '8px 10px', width: '30px', textAlign: 'center' }}>#</th>
                                      <th style={{ padding: '8px 10px' }}>Identificador / Elemento</th>
                                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Cant. (N°)</th>
                                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Long. L (m)</th>
                                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Ancho W (m)</th>
                                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Prof. H (m)</th>
                                      <th style={{ padding: '8px 10px' }}>Expresión / Dimensión</th>
                                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Subtotal Cantidad</th>
                                      <th style={{ padding: '8px 10px', textAlign: 'center' }}>Unidad</th>
                                      <th style={{ padding: '8px 10px' }}>Criterio y Nota Técnica</th>
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
