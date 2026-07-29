import React, {useState, useEffect} from 'react';
import {K, TH} from '../ui';
import * as XLSX from 'xlsx';
import { PIPES } from '../constants';

// Solver for partially full circular pipe
function solveManningCircular(Q, D, S, n) {
  if (Q <= 0) return { y: 0, A: 0, P: 0, Rh: 0, v: 0 };
  let Qo = (Math.PI / 4) * Math.pow(D, 2) * (1 / n) * Math.pow(D / 4, 2 / 3) * Math.sqrt(S);
  if (Q >= Qo) {
    return {
      y: D,
      A: (Math.PI / 4) * Math.pow(D, 2),
      P: Math.PI * D,
      Rh: D / 4,
      v: Qo / ((Math.PI / 4) * Math.pow(D, 2))
    };
  }
  
  let theta_low = 0;
  let theta_high = 2 * Math.PI;
  let theta = Math.PI;
  
  for (let i = 0; i < 50; i++) {
    theta = (theta_low + theta_high) / 2;
    let A = (Math.pow(D, 2) / 8) * (theta - Math.sin(theta));
    let P_wet = (D / 2) * theta;
    let Rh = A / P_wet;
    let Q_calc = (1 / n) * A * Math.pow(Rh, 2 / 3) * Math.sqrt(S);
    
    if (Q_calc > Q) {
      theta_high = theta;
    } else {
      theta_low = theta;
    }
  }
  
  let y = (D / 2) * (1 - Math.cos(theta / 2));
  let A = (Math.pow(D, 2) / 8) * (theta - Math.sin(theta));
  let P_wet = (D / 2) * theta;
  let Rh = A / P_wet;
  let v = Q / A;
  
  return { y, A, P: P_wet, Rh, v, theta, Qo };
}

// Function to find adequate pipe for given flow
function findAdequatePipe(Q, S, n, pipes) {
  for (let i = 0; i < pipes.length; i++) {
    let D = pipes[i].Di;
    let Qo = (Math.PI / 4) * Math.pow(D, 2) * (1 / n) * Math.pow(D / 4, 2 / 3) * Math.sqrt(S);
    if (Q <= Qo) {
      return pipes[i];
    }
  }
  return pipes[pipes.length - 1]; // return largest if none fit
}

const SvgSketch = ({ res, ce, cs, p_val, L_val }) => {
    if (!res) return null;
    return (
      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <h4 style={{ color: "#00d8ff", marginBottom: 15, textTransform: 'uppercase', letterSpacing: '1px' }}>Corte Longitudinal A-A (Esquema de Separación)</h4>
        <svg width="650" height="400" viewBox="0 0 650 400" style={{ background: "#111827", borderRadius: "8px", border: "1px solid #374151" }}>
          <defs>
            <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00A6D6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00A6D6" stopOpacity="0.3" />
            </linearGradient>
            <pattern id="concrete" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" fill="#4b5563" />
              <circle cx="2" cy="2" r="1" fill="#9ca3af" />
              <circle cx="7" cy="8" r="1" fill="#6b7280" />
              <circle cx="8" cy="3" r="0.5" fill="#374151" />
            </pattern>
            <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f87171" />
            </marker>
          </defs>

          {/* Texts (Header) */}
          <text x="325" y="30" fill="#c084fc" fontSize="14" textAnchor="middle" fontWeight="bold">
            Longitud del canal L = {Number(L_val).toFixed(2)}m
          </text>

          {/* ESTRUCTURA (Concrete Box based on CORTE A-A) */}
          {/* Main outer shape with pluvial drop */}
          <path d="M 120 70 L 120 360 L 530 360 L 530 70 L 490 70 L 490 320 L 160 320 L 160 70 Z" fill="url(#concrete)" stroke="#d97706" strokeWidth="2" />
          
          {/* Horizontal slab (Sanitary channel floor) */}
          <rect x="160" y="220" width="330" height="15" fill="url(#concrete)" stroke="#d97706" strokeWidth="1" />
          <text x="325" y="250" fill="#9ca3af" fontSize="11" textAnchor="middle" fontStyle="italic">Canal Sanitario (Suspendido / Sección)</text>

          {/* TUBERIA COMBINADA (ENTRADA IZQUIERDA) */}
          {/* Pipe walls */}
          <line x1="20" y1="180" x2="160" y2="180" stroke="#38bdf8" strokeWidth="3" />
          <line x1="20" y1="220" x2="160" y2="220" stroke="#38bdf8" strokeWidth="3" />
          <text x="80" y="165" fill="#38bdf8" fontSize="11" textAnchor="middle" fontWeight="bold">Alc. Combinado</text>
            <text x="80" y="177" fill="#38bdf8" fontSize="10" textAnchor="middle">D={(res.D_in/1000).toFixed(2)}m S={res.S_in.toFixed(2)}%</text>
          
          {/* WATER LEVEL ENTRADA (CE) */}
          <rect x="160" y="195" width="330" height="25" fill="url(#waterGrad)" />
          <line x1="160" y1="195" x2="490" y2="195" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4,2" />
          <text x="210" y="210" fill="#fff" fontSize="11" fontWeight="bold">C.E = {Number(ce).toFixed(2)}</text>
          
          {/* HOMBRO / CRESTA DEL VERTEDERO (Background wall) */}
          {/* Represents the side weir crest behind the water flow */}
          <line x1="160" y1="185" x2="490" y2="185" stroke="#f87171" strokeWidth="2" strokeDasharray="6,3" />
          <text x="325" y="180" fill="#f87171" fontSize="11" fontWeight="bold" textAnchor="middle">
            Cresta del Vertedero Lateral = {(Number(ce) + Number(p_val)).toFixed(2)}
          </text>
          
          {/* Cota P Arrow */}
          <line x1="260" y1="185" x2="260" y2="220" stroke="#f87171" strokeWidth="1.5" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
          <text x="255" y="208" fill="#f87171" fontSize="10" textAnchor="end">P={Number(p_val).toFixed(2)}m</text>

          {/* TUBERIA SANITARIA (SALIDA DERECHA) */}
          <line x1="490" y1="200" x2="630" y2="200" stroke="#fbbf24" strokeWidth="3" />
          <line x1="490" y1="220" x2="630" y2="220" stroke="#fbbf24" strokeWidth="3" />
          <text x="560" y="185" fill="#fbbf24" fontSize="11" textAnchor="middle" fontWeight="bold">Salida Aguas Negras</text>
            <text x="560" y="197" fill="#fbbf24" fontSize="10" textAnchor="middle">D={(res.D_out/1000).toFixed(2)}m S={res.S_out.toFixed(2)}%</text>

          {/* TUBERIA PLUVIAL (FONDO / CAIDA) */}
          {/* Drawn as a circle since it's perpendicular to the section A-A in Planta */}
          <circle cx="390" cy="285" r="20" stroke="#4ade80" strokeWidth="3" fill="#111827" />
          <text x="390" y="320" fill="#4ade80" fontSize="10" textAnchor="middle" fontWeight="bold">Alc. Aguas Lluvias</text>
            <text x="390" y="332" fill="#4ade80" fontSize="10" textAnchor="middle">D={(res.d_pluv/1000).toFixed(2)}m S={res.s_pluv.toFixed(2)}%</text>
          <line x1="350" y1="305" x2="490" y2="305" stroke="#9ca3af" strokeWidth="1" strokeDasharray="2,2" />
          <text x="440" y="300" fill="#fff" fontSize="11" fontWeight="bold">C.P = {Number(cs).toFixed(2)}</text>

          {/* WATER DROP TO PLUVIAL (Overflow animation) */}
          <path d="M 325 195 Q 350 195 350 230 L 350 300" fill="none" stroke="#00A6D6" strokeWidth="4" strokeDasharray="5,5" opacity="0.6" />
          <polygon points="345,300 355,300 350,310" fill="#00A6D6" opacity="0.8" />
          <text x="360" y="270" fill="#00A6D6" fontSize="10" fontStyle="italic">Alivio / Rebose</text>

        </svg>
      </div>
    );
  };


export default function EstructurasSeparacionTab({ R, P, setP, T, sT, estSepData, setEstSepData }) {
  const [pozoId, setPozoId] = useState(estSepData?.pozoId || "--- Ninguno ---");
  // Initialize state based on the selected pozoId
  const getInitial = (key, defaultVal, currentPozo = pozoId) => {
    return (estSepData && estSepData[currentPozo] && estSepData[currentPozo][key] !== undefined) 
      ? estSepData[currentPozo][key] 
      : defaultVal;
  };

  const [qMaxManual, setQMaxManual] = useState(getInitial("qMaxManual", ""));
  const [dEntradaManual, setDEntradaManual] = useState(getInitial("dEntradaManual", ""));
  const [sEntradaManual, setSEntradaManual] = useState(getInitial("sEntradaManual", ""));
  const [qMDManual, setQMDManual] = useState(getInitial("qMDManual", ""));
  const [dSanitarioManual, setDSanitarioManual] = useState(getInitial("dSanitarioManual", ""));
  const [sSanitarioManual, setSSanitarioManual] = useState(getInitial("sSanitarioManual", ""));
  const [cotaEntrada, setCotaEntrada] = useState(getInitial("cotaEntrada", ""));
  const [cotaSalida, setCotaSalida] = useState(getInitial("cotaSalida", ""));
  const [alturaVertedero, setAlturaVertedero] = useState(getInitial("alturaVertedero", ""));
  const [caidaPluvManual, setCaidaPluvManual] = useState(getInitial("caidaPluvManual", "50"));
  const [sPluvManual, setSPluvManual] = useState(getInitial("sPluvManual", "2.0"));
  const [kFactor, setKFactor] = useState(getInitial("kFactor", 1.84));
  const [dPluvialManual, setDPluvialManual] = useState(getInitial("dPluvialManual", "500"));
  const [incluirEnCantidades, setIncluirEnCantidades] = useState(getInitial("incluirEnCantidades", false));

  const handlePozoChange = (e) => {
    let newPozo = e.target.value;
    setPozoId(newPozo);
    setQMaxManual(getInitial("qMaxManual", "", newPozo));
    setDEntradaManual(getInitial("dEntradaManual", "", newPozo));
    setSEntradaManual(getInitial("sEntradaManual", "", newPozo));
    setQMDManual(getInitial("qMDManual", "", newPozo));
    setDSanitarioManual(getInitial("dSanitarioManual", "", newPozo));
    setSSanitarioManual(getInitial("sSanitarioManual", "", newPozo));
    setCotaEntrada(getInitial("cotaEntrada", "", newPozo));
    setCotaSalida(getInitial("cotaSalida", "", newPozo));
    setAlturaVertedero(getInitial("alturaVertedero", "", newPozo));
    setCaidaPluvManual(getInitial("caidaPluvManual", "50", newPozo));
    setSPluvManual(getInitial("sPluvManual", "2.0", newPozo));
    setKFactor(getInitial("kFactor", 1.84, newPozo));
    setDPluvialManual(getInitial("dPluvialManual", "500", newPozo));
    setIncluirEnCantidades(getInitial("incluirEnCantidades", false, newPozo));
  };

  useEffect(() => {
    if (setEstSepData && pozoId) {
      setEstSepData(prev => ({ 
        ...prev, 
        [pozoId]: { pozoId, qMaxManual, dEntradaManual, sEntradaManual, qMDManual, dSanitarioManual, sSanitarioManual, cotaEntrada, cotaSalida, alturaVertedero, caidaPluvManual, sPluvManual, kFactor, dPluvialManual, incluirEnCantidades }
      }));
    }
  }, [pozoId, qMaxManual, dEntradaManual, sEntradaManual, qMDManual, dSanitarioManual, sSanitarioManual, cotaEntrada, cotaSalida, alturaVertedero, caidaPluvManual, sPluvManual, kFactor, dPluvialManual, incluirEnCantidades, setEstSepData]);

  let pozosList = ["--- Ninguno ---", ...Array.from(new Set( (R||[]).map(r=>r.a).concat((R||[]).map(r=>r.de)) )).filter(x=>x).sort()];
  let pipeIn = (R||[]).filter(r => !r.sep && r.a === pozoId).sort((a,b) => (b.Qd || 0) - (a.Qd || 0))[0];
  let pipeOut = (R||[]).find(r => !r.sep && r.de === pozoId);
  let referencePipe = pipeIn || pipeOut;

  let Q_c = 0; 
  let QMD_auto = 0;
  if (referencePipe) {
    Q_c = referencePipe.Qd || 0;
    QMD_auto = (referencePipe.Qsan || 0) / 3.5; 
  }
  
  let q_max_eval = qMaxManual !== "" ? parseFloat(qMaxManual) : Q_c;
  let qmd_eval = qMDManual !== "" ? parseFloat(qMDManual) : QMD_auto;
  
  let q_negras_lps = Math.max(5 * qmd_eval, 25);
  if (q_negras_lps > q_max_eval) q_negras_lps = q_max_eval;
  
  let q_alivio_lps = q_max_eval - q_negras_lps;

  let res = null;
  let effPipeIn = pipeIn || pipeOut;
  if (effPipeIn && pipeOut) {
    let q_in_m3s = q_max_eval / 1000;
    let q_out_m3s = q_negras_lps / 1000;
    let q_alivio_m3s = q_alivio_lps / 1000;

    let dInDefault = (parseFloat(effPipeIn.nomProp || effPipeIn.nom || (effPipeIn.D * 1000)) || 200);
    let D_in = (dEntradaManual !== "" ? parseFloat(dEntradaManual) : dInDefault) / 1000;
    let sInDefault = (parseFloat(effPipeIn.S || effPipeIn.pendiente) || 0);
    let S_in = (sEntradaManual !== "" ? parseFloat(sEntradaManual) : sInDefault) / 100;
    let n_in = effPipeIn.n || 0.013;
    let hidIn = solveManningCircular(q_in_m3s, D_in, S_in, n_in);
    
    let dOutDefault = pipeOut ? (parseFloat(pipeOut.nomProp || pipeOut.nom || (pipeOut.D * 1000)) || 200) : 200;
    let D_out = (dSanitarioManual !== "" ? parseFloat(dSanitarioManual) : dOutDefault) / 1000;
    let sOutDefault = pipeOut ? (parseFloat(pipeOut.S || pipeOut.pendiente) || 0) : 0;
    let S_out = (sSanitarioManual !== "" ? parseFloat(sSanitarioManual) : sOutDefault) / 100;
    let n_out = pipeOut ? pipeOut.n || 0.013 : 0.013;
    let hidOut = solveManningCircular(q_out_m3s, D_out, S_out, n_out);

    let v2_2g_in = Math.pow(hidIn.v, 2) / (2 * 9.81);
    let E_in = hidIn.y + v2_2g_in;
    
    let v2_2g_out = Math.pow(hidOut.v, 2) / (2 * 9.81);
    let E_out = hidOut.y + v2_2g_out;

    // Custom inputs logic
    let crA = pipeIn?.crA || 0;
    let cfDE = pipeOut?.cfDE || 0;
    let cfA = pipeIn?.cfA || pipeIn?.cfLlegada || 0;
    let ce_eval = cotaEntrada !== "" ? parseFloat(cotaEntrada) : cfA;
    let cs_eval = cotaSalida !== "" ? parseFloat(cotaSalida) : cfDE;
    let p_eval = alturaVertedero !== "" ? parseFloat(alturaVertedero) : hidOut.y;
    
    // Excel H is y_in - P (water surface above weir crest)
    let H_weir = hidIn.y - p_eval;
    if (H_weir < 0) H_weir = 0;
    
    let L_weir = 0;
    if (H_weir > 0) {
      L_weir = q_alivio_m3s / (1.84 * Math.pow(H_weir, 1.5));
    }
    
    let Hw = H_weir; // Cabeza sobre el vertedero

    // Pluvial Default Calc
    let s_pluv_eval = parseFloat(sPluvManual) || 2.0;
    let d_pluv_auto = findAdequatePipe(q_alivio_m3s, s_pluv_eval/100, 0.013, PIPES);
    let d_pluv = dPluvialManual !== "" ? parseFloat(dPluvialManual)/1000 : d_pluv_auto;
    let hidPluv = solveManningCircular(q_alivio_m3s, d_pluv, s_pluv_eval/100, 0.013);
    let E_pluv = hidPluv.y + Math.pow(hidPluv.v, 2) / (2 * 9.81);
    
    res = {
      q_max: q_max_eval,
      q_n: q_negras_lps,
      q_alivio: q_alivio_lps,
      D_in: D_in * 1000,
      S_in: S_in * 100,
      y_in: hidIn.y,
      v_in: hidIn.v,
      E_in: E_in,
      D_out: D_out * 1000,
      S_out: S_out * 100,
      y_out: hidOut.y,
      v_out: hidOut.v,
      E_out: E_out,
      H_weir: H_weir,
      L_weir: L_weir,
      Hw: Hw,
      d_pluv: d_pluv * 1000,
      s_pluv: s_pluv_eval,
      d_pluv_auto: d_pluv_auto * 1000,
      y_pluv: hidPluv.y,
      v_pluv: hidPluv.v,
      E_pluv: E_pluv,
      cota_pluv: parseFloat(caidaPluvManual) || -0.5,
      dInDefault, sInDefault, dOutDefault, sOutDefault
    };
  }
  
  const handleExportExcel = () => {
    if (!res || !pipeIn || !pipeOut) {
       alert("No hay resultados válidos para exportar.");
       return;
    }
    
    // Calculate Cotas
    let crA = pipeIn?.crA || 0;
    let cfA = pipeIn?.cfA || 0;
    let cfDE = pipeOut?.cfDE || 0; // The sanitay output invert
    let dropPluvCm = parseFloat(caidaPluvManual);
    if (isNaN(dropPluvCm)) dropPluvCm = 50;
    
    let Cc = crA; // Cota clave or rasante? We assume Cota Rasante is Cc.
    let CN = cfDE; // Cota Negras (Fondo sanitario)
    let CP = CN - (dropPluvCm / 100); // Cota Pluvial
    
    // A-37 y PDR-60 defaults
    let estAcero = res.L_weir > 0 ? (res.L_weir * 15).toFixed(2) : "0.00"; // Fake approx
    let estConcr = res.L_weir > 0 ? (res.L_weir * 1.2).toFixed(2) : "0.00";
    let estExcav = res.L_weir > 0 ? (res.L_weir * 3.5).toFixed(2) : "0.00";
    
    let header1 = ["LOCALIZACION", "COLECTOR COMBINADO", "", "", "", "COLECTOR SANITARIO", "", "", "", "COLECTOR PLUVIAL", "", "", "", "", "ESTRUCTURA DE SEPARACION", "", "", "", "", "COTAS", "", "", "CANTIDADES DE OBRA"];
    let header2 = ["ESTRUCTURAL", "POZO 1", "d1", "S2", "L1", "POZO 2", "d2", "S2", "L2", "POZO 3", "Bd1", "d3", "S3", "L3", "L", "Cro", "H", "HW", "CRs", "Cc", "CN", "CP", "Concr. 4000 psi m3", "Acero en Kgs PDR-60", "A-37", "Excava. m3"];
    let headerUnits = ["", "", "m", "%", "m", "", "m", "%", "m", "", "m", "m", "%", "m", "m", "m", "m", "m", "m", "m", "m", "m", "", "", "", ""];
    
    let row = [
       pozoId, // Localizacion Pozo
       pipeIn.de, // Pozo 1 (Llegada)
       (res.D_in/1000).toFixed(2),
       res.S_in.toFixed(2),
       (pipeIn.Le || pipeIn.longitud || 0).toFixed(2), // L1
       
       pipeOut.a, // Pozo 2 (Salida Sanitaria)
       (res.D_out/1000).toFixed(2),
       res.S_out.toFixed(2),
       (pipeOut.Le || pipeOut.longitud || 0).toFixed(2), // L2
       
       "P(ALIVIO)", // Pozo 3
       (res.d_pluv/1000).toFixed(2), // Bd1? Usually same as d3
       (res.d_pluv/1000).toFixed(2), // d3
       res.s_pluv.toFixed(2), // S3
       "10.00", // L3 default
       
       res.L_weir.toFixed(2), // L
       (CN + res.y_out).toFixed(2), // Cro (Cota rebose)
       res.H_weir.toFixed(2), // H
       res.Hw.toFixed(2), // HW
       (CN + res.y_out + res.H_weir).toFixed(2), // CRs 
       
       Cc.toFixed(2), // Cc
       CN.toFixed(2), // CN
       CP.toFixed(2), // CP
       
       estConcr, // Concreto
       estAcero, // PDR-60
       "0.00", // A-37
       estExcav // Excav
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header1, header2, headerUnits, row]);
    
    // Merge headers
    ws["!merges"] = [
      {s: {r: 0, c: 1}, e: {r: 0, c: 4}},
      {s: {r: 0, c: 5}, e: {r: 0, c: 8}},
      {s: {r: 0, c: 9}, e: {r: 0, c: 13}},
      {s: {r: 0, c: 14}, e: {r: 0, c: 18}},
      {s: {r: 0, c: 19}, e: {r: 0, c: 21}},
      {s: {r: 0, c: 22}, e: {r: 0, c: 25}}
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Est. Separacin");
    XLSX.writeFile(wb, "Estructura_Separacion_EMPAS.xlsx");
  };

  const darkInput = { width: "100%", padding: 5, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff", borderRadius: 4 };

  
  // Cantidades de Obra - Estructura de Separación
  const altPozo = res ? (res.L_weir > 0 ? (cotaEntrada && cotaSalida ? parseFloat(cotaEntrada) - parseFloat(cotaSalida) : 2.0) : 2.0) : 2.0;
  // Estructura de separación: canal de concreto L x 1.2m x h
  const L_est = res ? (res.L_weir || 0) : 0;
  // Volumen Concreto: paredes (2 lados) + fondo + tapa parcial (asumiendo e=0.20m, h=1.5m)
  const h_est = 1.5; // altura interior canal
  const e_est = 0.20; // espesor muros
  const b_est = 1.20; // ancho interior
  // Volumen concreto: 2 muros laterales + fondo + muro separador vertedero
  const volConc_muros = 2 * (L_est * e_est * h_est);          // muros laterales
  const volConc_fondo = L_est * (b_est + 2*e_est) * e_est;    // losa de fondo
  const volConc_sep   = L_est > 0 ? (b_est * e_est * (h_est - (res?.H_weir||0))) : 0; // muro vertedero (aproximado)
  const volConc = volConc_muros + volConc_fondo + volConc_sep;
  // Excavacion: contorno exterior + sobreancho
  const volExc = (b_est + 2*e_est + 0.30) * (h_est + e_est + 0.30) * (L_est > 0 ? L_est : 2.0);
  // Acero: 100 kg/m3 de concreto (aprox)
  const pesoAcero = volConc * 100;

  useEffect(() => {
      if (setEstSepData) {
          setEstSepData(prev => ({
              ...prev,
              cantExcav: volExc > 0 ? parseFloat(volExc.toFixed(2)) : 0,
              cantConc: volConc > 0 ? parseFloat(volConc.toFixed(2)) : 0,
              cantAcero: pesoAcero > 0 ? parseFloat(pesoAcero.toFixed(2)) : 0,
              cantLongVertedero: L_est > 0 ? parseFloat(L_est.toFixed(2)) : 0
          }));
      }
  }, [volExc, volConc, pesoAcero, L_est, setEstSepData]);


  return (
    <div className="c">
      <div className="ct" style={{display:"flex", justifyContent:"space-between"}}>
         <span>Cálculo de Estructura de Separación (Aliviadero Lateral)</span>
         <button className="btn" onClick={handleExportExcel} style={{fontSize:12, padding:"5px 15px", background:"#1A6B2C", color:"white"}}>
            Exportar Excel EMPAS
         </button>
      </div>
      
      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ background: "rgba(0,0,0,0.2)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", minWidth: 200, flex:1 }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5, color:"#8FD67A" }}>Pozo a Optimizar:</label>
          <select value={pozoId} onChange={handlePozoChange} style={{ ...darkInput, flex: 1 }}>
            {pozosList.map(pz => <option key={pz} value={pz} style={{color:"black"}}>{pz}</option>)}
          </select>
        </div>
        
        <div style={{ background: "rgba(0,0,0,0.2)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", minWidth: 200, flex:1 }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5, color:"#8FD67A" }}>Caudal Combinado Qmax (L/s):</label>
          <input type="number" value={qMaxManual} onChange={e => setQMaxManual(e.target.value)} placeholder={`Auto (${Q_c.toFixed(2)})`} style={darkInput} />
        </div>

        <div style={{ background: "rgba(0,0,0,0.2)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", minWidth: 200, flex:1 }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5, color:"#8FD67A" }}>QMD Sanitario (L/s):</label>
          <input type="number" value={qMDManual} onChange={e => setQMDManual(e.target.value)} placeholder={`Auto (${QMD_auto.toFixed(2)})`} style={darkInput} />
          <div style={{ fontSize: 11, color: "#888", marginTop: 5 }}>Qn = max(5*QMD, 25 L/s)</div>
        </div>

        <div style={{ background: "rgba(0,0,0,0.2)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", minWidth: 200, flex:1 }}>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5, color:"#8FD67A" }}>Factor K (Hw):</label>
          <input type="number" step="0.1" value={kFactor} onChange={e => setKFactor(e.target.value)} style={darkInput} />
        </div>
      </div>

      {!pipeIn || !pipeOut ? (
        <div style={{ padding: 20, color: "#f87171", background: "rgba(220,53,69,0.1)", borderRadius: 8 }}>
          <strong>Atención:</strong> El pozo seleccionado no tiene un tramo de llegada y un tramo de salida válidos en la red para calcular la estructura de separación.
        </div>
      ) : res ? (
        <div>
          <div style={{ display: "flex", gap: 15, marginBottom: 20 }}>
            <K l="Caudal Diseo (Qc)" v={res.q_max.toFixed(2)} u="L/s" color="#00A6D6" />
            <K l="Caudal Negras (Qn)" v={res.q_n.toFixed(2)} u="L/s" color="#8FD67A" />
            <K l="Caudal Alivio (Qv)" v={res.q_alivio.toFixed(2)} u="L/s" color="#DC3545" />
          </div>

          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom:20 }}>
            {/* LLEGADA */}
            <div style={{ flex: 1, minWidth: 280, background:"rgba(0,0,0,0.1)", borderRadius:8, overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontWeight: "bold", background: "linear-gradient(90deg, #003B73, #00A6D6)", color: "white", padding: "8px 12px" }}>
                Tubera Combinada (Entrada)
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Diámetro (mm)</td><td style={{ padding: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <select value={dEntradaManual} onChange={e=>setDEntradaManual(e.target.value)} style={{...darkInput, width:95, padding:2, textAlign:"center", fontSize:12}}>
                        <option value="" style={{color:"black"}}>Auto ({res.dInDefault.toFixed(0)})</option>
                        {PIPES.map(p => <option key={p.id} value={p.nom.replace(" mm","")} style={{color:"black"}}>{p.nom}</option>)}
                    </select>
                  </td></tr>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Pendiente %</td><td style={{ padding: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}><input type="number" step="0.1" value={sEntradaManual} onChange={e=>setSEntradaManual(e.target.value)} placeholder={`Auto (${res.sInDefault.toFixed(2)})`} style={{...darkInput, width:80, padding:2, textAlign:"center"}}/></td></tr>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Tirante (y)</td><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: "bold", color:"#fff" }}>{res.y_in.toFixed(3)} m</td></tr>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Velocidad (v)</td><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: "bold", color:"#fff" }}>{res.v_in.toFixed(2)} m/s</td></tr>
                  <tr><td style={{ padding: 8 }}>Energa (Eo)</td><td style={{ padding: 8, fontWeight: "bold", color:"#00A6D6" }}>{res.E_in.toFixed(3)} m</td></tr>
                </tbody>
              </table>
            </div>

            {/* SALIDA SANITARIA */}
            <div style={{ flex: 1, minWidth: 280, background:"rgba(0,0,0,0.1)", borderRadius:8, overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontWeight: "bold", background: "linear-gradient(90deg, #1A6B2C, #28A745)", color: "white", padding: "8px 12px" }}>
                Tubera Sanitaria (Salida 1)
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Diámetro (mm)</td><td style={{ padding: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <select value={dSanitarioManual} onChange={e=>setDSanitarioManual(e.target.value)} style={{...darkInput, width:95, padding:2, textAlign:"center", fontSize:12}}>
                        <option value="" style={{color:"black"}}>Auto ({res.dOutDefault.toFixed(0)})</option>
                        {PIPES.map(p => <option key={p.id} value={p.nom.replace(" mm","")} style={{color:"black"}}>{p.nom}</option>)}
                    </select>
                  </td></tr>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Pendiente %</td><td style={{ padding: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}><input type="number" step="0.1" value={sSanitarioManual} onChange={e=>setSSanitarioManual(e.target.value)} placeholder={`Auto (${res.sOutDefault.toFixed(2)})`} style={{...darkInput, width:80, padding:2, textAlign:"center"}}/></td></tr>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Tirante (y)</td><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: "bold", color:"#fff" }}>{res.y_out.toFixed(3)} m</td></tr>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Velocidad (v)</td><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: "bold", color:"#fff" }}>{res.v_out.toFixed(2)} m/s</td></tr>
                  <tr><td style={{ padding: 8 }}>Energa (Eo)</td><td style={{ padding: 8, fontWeight: "bold", color:"#8FD67A" }}>{res.E_out.toFixed(3)} m</td></tr>
                </tbody>
              </table>
            </div>
            
            {/* SALIDA PLUVIAL (NUEVA) */}
            <div style={{ flex: 1, minWidth: 280, background:"rgba(0,0,0,0.1)", borderRadius:8, overflow:"hidden", border:"1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ fontWeight: "bold", background: "linear-gradient(90deg, #A71D2A, #DC3545)", color: "white", padding: "8px 12px" }}>
                Tubera Pluvial (Salida 2 / Alivio)
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Pendiente S%</td><td style={{ padding: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}><input type="number" step="0.1" value={sPluvManual} onChange={e=>setSPluvManual(e.target.value)} style={{...darkInput, width:60, padding:2, textAlign:"center"}}/></td></tr>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Caída Cota (cm)</td><td style={{ padding: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}><input type="number" step="1" value={caidaPluvManual} onChange={e=>setCaidaPluvManual(e.target.value)} style={{...darkInput, width:60, padding:2, textAlign:"center"}}/></td></tr>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Diámetro (mm)</td><td style={{ padding: 4, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <select value={dPluvialManual} onChange={e=>setDPluvialManual(e.target.value)} style={{...darkInput, width:95, padding:2, textAlign:"center", fontSize:12}}>
                        <option value="" style={{color:"black"}}>Auto ({res.d_pluv_auto.toFixed(0)})</option>
                        {PIPES.map(p => <option key={p.id} value={p.nom.replace(" mm","")} style={{color:"black"}}>{p.nom}</option>)}
                    </select>
                  </td></tr>
                  <tr><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Tirante (y)</td><td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.05)", fontWeight: "bold", color:"#fff" }}>{res.y_pluv.toFixed(3)} m</td></tr>
                  <tr><td style={{ padding: 8 }}>Energa (Eo)</td><td style={{ padding: 8, fontWeight: "bold", color:"#DC3545" }}>{res.E_pluv.toFixed(3)} m</td></tr>
                </tbody>
              </table>
            </div>

          </div>

          <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", minWidth: 200, flex:1 }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: 5, color:"#00A6D6" }}>Cota de Entrada:</label>
              <input type="number" step="0.01" value={cotaEntrada} onChange={e => setCotaEntrada(e.target.value)} placeholder={`Auto (${(pipeIn?.cfA || pipeIn?.cfLlegada || 0).toFixed(2)})`} style={darkInput} />
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", minWidth: 200, flex:1 }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: 5, color:"#00A6D6" }}>Cota de Salida:</label>
              <input type="number" step="0.01" value={cotaSalida} onChange={e => setCotaSalida(e.target.value)} placeholder={`Auto (${(pipeOut.cfDE || 0).toFixed(2)})`} style={darkInput} />
            </div>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: 15, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)", minWidth: 200, flex:1 }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: 5, color:"#00A6D6" }}>Altura Vertedero (P):</label>
              <input type="number" step="0.01" value={alturaVertedero} onChange={e => setAlturaVertedero(e.target.value)} placeholder={`Auto (${res.y_out ? res.y_out.toFixed(3) : 0} m)`} style={darkInput} />
            </div>
          </div>

          <div style={{ marginTop: 20, padding: 20, background: "rgba(255,255,255,0.02)", borderLeft: "5px solid #00A6D6", borderRadius: 4, borderTop:"1px solid rgba(255,255,255,0.1)", borderRight:"1px solid rgba(255,255,255,0.1)", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
            <SvgSketch res={res} ce={cotaEntrada || (pipeIn?.cfA || pipeIn?.cfLlegada || 0)} cs={cotaSalida || (pipeOut?.cfDE || 0)} p_val={alturaVertedero || (res.y_out || 0)} L_val={res.L_weir} />
              <h3 style={{ margin: "0 0 15px 0", color: "#00A6D6" }}>Resultados del Vertedero Lateral</h3>
            <div style={{ display: "flex", gap: 40, flexWrap: "wrap", alignItems:"center" }}>
              <div>
                <div style={{ fontSize: 12, color: "#888" }}>Cabeza sobre el vertedero (H)</div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#fff" }}>{res.H_weir > 0 ? res.H_weir.toFixed(3) : "0.000"} m <span style={{fontSize: 14, color:"#ccc"}}>({(res.H_weir * 100).toFixed(1)} cm)</span></div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#888" }}>Longitud del Vertedero (L)</div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#8FD67A" }}>{res.L_weir > 0 ? res.L_weir.toFixed(2) : "0.00"} m</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#888" }}>Cabeza Adicional (Hw)</div>
                <div style={{ fontSize: 24, fontWeight: "bold", color: "#FF8C00" }}>{res.Hw.toFixed(3)} m</div>
              </div>
              
              <div style={{ marginLeft: "auto", background:"#1f2937", padding:15, borderRadius:8, border:"1px dashed #4b5563" }}>
                 <div style={{ fontSize: 11, color: "#9ca3af", textAlign:"center", marginBottom:5 }}>Fórmula de Cálculo Vertedero Lateral</div>
                 <div style={{ fontSize: 18, color: "#f3f4f6", fontFamily:"monospace", fontWeight:"bold" }}>
                    Q<sub style={{fontSize:12}}>v</sub> = 1.84 &middot; L &middot; H<sup style={{fontSize:12}}>1.5</sup>
                 </div>
                 <div style={{ fontSize: 14, color: "#8FD67A", fontFamily:"monospace", textAlign:"center", marginTop:5 }}>
                    L = Q<sub style={{fontSize:10}}>v</sub> / (1.84 &middot; H<sup style={{fontSize:10}}>1.5</sup>)
                 </div>
              </div>
            </div>
          </div>

        </div>
      ) : null}
    
      <br/>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <h4 style={{ margin: 0 }}>Resumen de Cantidades de Obra — Estructura de Separación</h4>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: incluirEnCantidades ? '#8FD67A' : '#9ca3af', cursor: 'pointer', background: 'rgba(0,0,0,0.2)', border: `1px solid ${incluirEnCantidades ? '#28A745' : 'rgba(255,255,255,0.1)'}`, borderRadius: 6, padding: '4px 12px', userSelect: 'none' }}>
          <input
            type="checkbox"
            checked={incluirEnCantidades}
            onChange={e => setIncluirEnCantidades(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
          <span>Incluir en Cantidades de Exportación</span>
        </label>
        {!incluirEnCantidades && <span style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic' }}>⚠ No incluida actualmente en el resumen general</span>}
      </div>
      <table className="info-table">
        <thead>
          <tr>
            <th>Ítem</th>
            <th>Descripción</th>
            <th>Unidad</th>
            <th>Cantidad</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Excavación mecanizada para estructura</td>
            <td>m³</td>
            <td style={{ color: '#f87171', fontWeight: 'bold' }}>{volExc > 0 ? volExc.toFixed(2) : '0.00'}</td>
          </tr>
          <tr>
            <td>2</td>
            <td>Concreto 4000 psi — Canal separador (L={L_est.toFixed(2)}m, e={e_est}m)</td>
            <td>m³</td>
            <td style={{ color: '#fbbf24', fontWeight: 'bold' }}>{volConc > 0 ? volConc.toFixed(2) : '0.00'}</td>
          </tr>
          <tr>
            <td>3</td>
            <td>Acero de refuerzo PDR-60 (≈100 kg/m³)</td>
            <td>kg</td>
            <td style={{ color: '#60a5fa', fontWeight: 'bold' }}>{pesoAcero > 0 ? pesoAcero.toFixed(2) : '0.00'}</td>
          </tr>
          {res && res.L_weir > 0 && (
            <tr style={{ background: 'rgba(0,166,214,0.05)' }}>
              <td>4</td>
              <td>Vertedero lateral — Longitud de control</td>
              <td>m</td>
              <td style={{ color: '#8FD67A', fontWeight: 'bold' }}>{res.L_weir.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

    </div>
  );
}
