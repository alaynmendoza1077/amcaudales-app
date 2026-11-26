import { calcularAreas, generarPoligonosVoronoiSync, convertPointToMeters } from '../calcAreasAferentes';
import { decomposeIntoContinuousProfiles, buildProfileRenderModel } from './profileGraph';
import runCalc, { formatDiam } from '../engine';
import { DP } from '../constants';

/**
 * Construye los tramos limpios para la tabla Datos (T) y Cálculos (R)
 * garantizando que sin cartografía catastral + check explícito de vías,
 * el 100% del área tributaria migre a `areaParcial` (p. ej. RESIDENCIAL)
 * y NUNCA contamine `aV_prop` (A.Via).
 */
export function buildCleanMigratedTramos(tramosRaw, useSeparateVias = false, globalParams = DP) {
  const denDefault = (globalParams && Number(globalParams.densidad) > 0) ? Number(globalParams.densidad) : 600;
  const conDefault = (globalParams && Number(globalParams.consumo) > 0) ? Number(globalParams.consumo) : 140;
  const estDefault = (globalParams && globalParams.estacion) ? String(globalParams.estacion).trim() : 'BUC';

  return (tramosRaw || [])
    .filter(t => t && !t.sep && t.de && t.a)
    .map((t, idx) => {
      const { areaPoli, areaPredPoli, areaViaPoli, coords, ...lightT } = t;
      const tpArea = String(t.tipoArea || 'RESIDENCIAL').trim().toUpperCase();
      const rawTotal = parseFloat(t.areaCalc !== undefined && t.areaCalc !== null ? t.areaCalc : (t.areaParcial || t.area || 0)) || 0;
      const rawPred = parseFloat(t.areaPredCalc !== undefined && t.areaPredCalc !== null ? t.areaPredCalc : rawTotal) || 0;
      const rawVia = parseFloat(t.areaViaCalc || 0) || 0;

      const mainVal = useSeparateVias ? rawPred : rawTotal;
      const viaVal = useSeparateVias ? rawVia : null;

      const matVal = String(t.material || 'PVC').toUpperCase();
      const dNom = formatDiam(t.diametroCom || t.diametro || 200, matVal);
      const lonVal = +(t.longitud || t.L || 45);
      const pendVal = +(t.pendiente || t.S || 1.5);
      const crDE = +(t.cotaRasante || t.crDE || 960);
      const crA = +(t.cotaRasanteA || t.crA || (crDE - lonVal * (pendVal / 100)));
      const cfDE = +(t.cotaFondoDE || t.cotaFondo || t.cfDE || (crDE - 1.6));
      const cfA = +(t.cotaFondoA || t.fondo_final || t.cfA || (cfDE - lonVal * (pendVal / 100)));

      return {
        ...lightT,
        id: idx + 1,
        de: String(t.de).trim(),
        a: String(t.a).trim(),
        L: lonVal,
        S: pendVal,
        longitud: lonVal,
        pendiente: pendVal,
        crDE,
        crA,
        cotaRasante: crDE,
        cotaRasanteA: crA,
        cfDE,
        cfA,
        cotaFondo: cfDE,
        cotaFondoDE: cfDE,
        cotaFondoA: cfA,
        diametroCom: dNom,
        diamOrig: dNom,
        material: matVal,
        matOrig: matVal,
        areaParcial: +mainVal.toFixed(6),
        areaCalc: +rawTotal.toFixed(6),
        areaPredCalc: +rawPred.toFixed(6),
        areaViaCalc: useSeparateVias ? +rawVia.toFixed(6) : 0,
        tipoArea: tpArea,
        aR_prop: tpArea === 'RESIDENCIAL' ? +mainVal.toFixed(6) : null,
        aC_prop: tpArea === 'COMERCIAL' ? +mainVal.toFixed(6) : null,
        aI_prop: tpArea === 'INDUSTRIAL' ? +mainVal.toFixed(6) : null,
        aIn_prop: tpArea === 'INSTITUCIONAL' ? +mainVal.toFixed(6) : null,
        aV_prop: viaVal !== null ? +viaVal.toFixed(6) : (tpArea === 'VIA' ? +mainVal.toFixed(6) : null),
        aRe_prop: tpArea === 'RECREACIONAL' ? +mainVal.toFixed(6) : null,
        densidad: +(t.densidad || denDefault),
        consumo: +(t.consumo || conDefault),
        estacion: String(t.estacion || estDefault).trim(),
        reponer: t.reponer || 'S',
        tipoVia: t.tipoVia || 'FX',
        anchoVia: t.anchoVia || 'N',
        pozoNuevo: t.pozoNuevo || 'N',
        tipoPozo: t.tipoPozo || 'M'
      };
    });
}

/**
 * Ejecuta pruebas automáticas integrales extremo a extremo (E2E en memoria)
 * verificando los 4 eslabones críticos:
 * 1) Cálculo geométrico de áreas aferentes (sin contaminación de vías)
 * 2) Migración a Datos (T) y Motor Hidráulico Cálculos (runCalc: Qsan, Pob, Qpluv)
 * 3) Persistencia del polígono de referencia en Visor Espacial, Visor Resumen y .AMC
 * 4) Proyección métrica EPSG:3116 para exportación SWMM ([SUBCATCHMENTS] + [Polygons])
 */
export async function runAreasAutomatedTests() {
  const checks = [];
  const addCheck = (name, passed, detail) => {
    checks.push({ name, passed: Boolean(passed), detail: String(detail || '') });
  };

  try {
    // Red de prueba real en Bucaramanga / Floridablanca (2 tramos conectados en serie)
    const samplePozos = [
      { IdNodo: 'PZ-A1', Nombre: 'PZ-A1', CoordX: 1105620.0, CoordY: 1278410.0, Ctapa: 962.5, Cfondo: 960.8 },
      { IdNodo: 'PZ-A2', Nombre: 'PZ-A2', CoordX: 1105672.0, CoordY: 1278395.0, Ctapa: 961.4, Cfondo: 959.7 },
      { IdNodo: 'PZ-A3', Nombre: 'PZ-A3', CoordX: 1105728.0, CoordY: 1278378.0, Ctapa: 960.1, Cfondo: 958.4 }
    ];

    const sampleTramos = [
      {
        id: 1,
        de: 'PZ-A1',
        a: 'PZ-A2',
        longitud: 54.12,
        pendiente: 2.03,
        diametro: 250,
        material: 'PVC',
        cotaRasante: 962.5,
        cotaRasanteA: 961.4,
        cotaFondo: 960.8,
        cotaFondoA: 959.7
      },
      {
        id: 2,
        de: 'PZ-A2',
        a: 'PZ-A3',
        longitud: 58.52,
        pendiente: 2.22,
        diametro: 250,
        material: 'PVC',
        cotaRasante: 961.4,
        cotaRasanteA: 960.1,
        cotaFondo: 959.7,
        cotaFondoA: 958.4
      }
    ];

    // ── PRUEBA 1: Cálculo geométrico de áreas sin vías falsas ──
    const calcRes = await calcularAreas(sampleTramos, sampleTramos, [], samplePozos, null, 20.0);
    const hasTwoResults = Array.isArray(calcRes) && calcRes.length === 2;
    const area1 = hasTwoResults ? Number(calcRes[0].areaCalc || 0) : 0;
    const area2 = hasTwoResults ? Number(calcRes[1].areaCalc || 0) : 0;
    const via1 = hasTwoResults ? Number(calcRes[0].areaViaCalc || 0) : -1;
    const pred1 = hasTwoResults ? Number(calcRes[0].areaPredCalc || 0) : 0;
    const poly1 = hasTwoResults && calcRes[0].areaPoli ? (calcRes[0].areaPoli.geometry || calcRes[0].areaPoli) : null;
    const poly1Valid = Boolean(
      poly1 &&
      poly1.coordinates &&
      Array.isArray(poly1.coordinates[0]) &&
      poly1.coordinates[0].length >= 4 &&
      Math.abs(poly1.coordinates[0][0][0]) > 70 &&
      Math.abs(poly1.coordinates[0][0][1]) > 4
    );

    addCheck(
      '1. Cálculo Espacial y Polígono WGS84',
      hasTwoResults && area1 > 0.05 && area2 > 0.05 && poly1Valid,
      `T1=${area1.toFixed(4)} Ha, T2=${area2.toFixed(4)} Ha, Polígono válido=${poly1Valid ? 'SÍ' : 'NO'}`
    );

    addCheck(
      '2. Sin Contaminación de Área de Vías (A.Via = 0)',
      Math.abs(pred1 - area1) < 1e-6 && via1 === 0,
      `Predial=${pred1.toFixed(4)} Ha vs Total=${area1.toFixed(4)} Ha | Vía=${via1.toFixed(4)} Ha`
    );

    // ── PRUEBA 2: Migración a Datos (T) y Cálculos Hidráulicos (engine.js) ──
    const migratedT = buildCleanMigratedTramos(calcRes, false, DP);
    const calcHyd = runCalc(migratedT, { ...DP, densidad: 600, consumo: 140, estacion: 'BUC' }).filter(r => !r.sep);
    const r0 = calcHyd[0] || {};
    const r1 = calcHyd[1] || {};
    const migracionOk = Boolean(
      migratedT.length === 2 &&
      migratedT[0].areaParcial > 0 &&
      migratedT[0].aR_prop === migratedT[0].areaParcial &&
      migratedT[0].aV_prop === null &&
      r0.aR > 0 &&
      r0.aV === 0 &&
      r0.pob > 10 &&
      r0.Qpluv > 0 &&
      r1.aR > r0.aR
    );

    addCheck(
      '3. Migración a Datos y Cálculos (Sanitario + Pluvial)',
      migracionOk,
      `Datos Area=${migratedT[0]?.areaParcial?.toFixed(4)} Ha, A.Via=${migratedT[0]?.aV_prop ?? 0} | Pob=${(r1.pob || 0).toFixed(1)} hab, Qpluv=${(r1.Qpluv || 0).toFixed(2)} L/s`
    );

    // ── PRUEBA 3: Persistencia del dibujo en Visor Espacial / Visor Resumen / .AMC ──
    const synReload = generarPoligonosVoronoiSync(migratedT, samplePozos, 20.0);
    const persistOk = Boolean(
      synReload &&
      Array.isArray(synReload.features) &&
      synReload.features.length === 2 &&
      Math.abs(synReload.features[0].properties.areaHa - migratedT[0].areaParcial) < 1e-5 &&
      synReload.features.every(f => f.geometry && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates[0].length >= 4)
    );

    addCheck(
      '4. Persistencia de Polígonos en Visores y Archivo .AMC',
      persistOk,
      `Polígonos reconstruidos=${synReload?.features?.length || 0}/2 | Ha preservada=${synReload?.features?.[0]?.properties?.areaHa?.toFixed(4) || 0} Ha`
    );

    // ── PRUEBA 4: Vértices Métricos EPSG:3116 para EPA SWMM ([SUBCATCHMENTS] + [Polygons]) ──
    const vertsSwmm = (synReload && synReload.verts) || [];
    const sampleM = vertsSwmm[0] || {};
    const checkMetric = convertPointToMeters(sampleM.CoordX, sampleM.CoordY);
    const swmmOk = Boolean(
      vertsSwmm.length >= 8 &&
      vertsSwmm.some(v => v.SubName === 'S1') &&
      vertsSwmm.some(v => v.SubName === 'S2') &&
      checkMetric[0] > 900000 &&
      checkMetric[0] < 1300000 &&
      checkMetric[1] > 900000 &&
      checkMetric[1] < 1500000
    );

    addCheck(
      '5. Exportación SWMM ([SUBCATCHMENTS] + [Polygons])',
      swmmOk,
      `Vértices SWMM=${vertsSwmm.length} pts (S1, S2) | EPSG:3116 X=${(sampleM.CoordX || 0).toFixed(1)}, Y=${(sampleM.CoordY || 0).toFixed(1)}`
    );

    // ── PRUEBA 6: Perfiles Desconectados (4 Pozos Reales con Desnivel Lado a Lado y Truncado) ──
    const disconnectedPipes = [
      { id: 1, de: 'PZ-N1', a: 'PZ-N2', L: 42.0, S: 2.0, D: 0.25, nom: '250 mm', crDE: 968.0, crA: 967.16, cfDE: 966.2, cfA: 965.36 },
      { id: 2, de: 'PZ-S1', a: 'PZ-S2', L: 50.0, S: 1.8, D: 0.25, nom: '250 mm', crDE: 959.5, crA: 958.60, cfDE: 957.8, cfA: 956.90 }
    ];
    const subProfs = decomposeIntoContinuousProfiles(disconnectedPipes, {});
    const compModel = buildProfileRenderModel(subProfs, {});
    const profilesOk = Boolean(
      subProfs.length === 2 &&
      compModel.profileNodes.length === 4 &&
      compModel.pipesToDraw.length === 2 &&
      compModel.breaks.length === 1 &&
      compModel.profileNodes[2].drop === 0 &&
      Math.abs(compModel.breaks[0].deltaCr - (959.5 - 967.16)) < 0.02
    );

    addCheck(
      '6. Perfiles Desconectados (4 Pozos Reales + Truncado)',
      profilesOk,
      `Sub-perfiles=${subProfs.length}, Pozos=${compModel.profileNodes.length}/4, Cortes=${compModel.breaks.length}, ΔRas=${compModel.breaks[0]?.deltaCr}m`
    );
  } catch (err) {
    addCheck('Excepción en Pruebas Automáticas', false, err && err.message ? err.message : String(err));
  }

  const passedCount = checks.filter(c => c.passed).length;
  return {
    allPassed: passedCount === checks.length && checks.length >= 5,
    passedCount,
    totalCount: checks.length,
    timestamp: new Date().toLocaleTimeString('es-CO'),
    checks
  };
}
