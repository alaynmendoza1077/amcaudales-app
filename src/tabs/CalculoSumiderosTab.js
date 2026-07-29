import React, {useState, useEffect} from 'react';
import {K, fm} from '../ui';
import {cIDF, gTr, autoDiam} from '../engine';
import * as XLSX from 'xlsx';

// Iterative solver for critical energy in triangular channel (Mostkow approach)
function solveCriticalTransversal(Q, Sx) {
  // We need to find Yc and Vc
  // Q = Ac * Vc
  // Ac = Yc^2 / (2 * Sx)
  // Ec = Yc + Vc^2 / 2g
  // Vc = (g * Ac / Tc)^0.5
  // Tc = Yc / Sx
  // This boils down to Yc = ( (2 * Q^2 * Sx^2) / g )^(1/5)
  // Let's implement the iterative approach from Excel or the direct analytical solution:
  let Yc = Math.pow( (2 * Math.pow(Q, 2) * Math.pow(Sx, 2)) / 9.81, 0.2 );
  let Ac = Math.pow(Yc, 2) / (2 * Sx);
  let Tc = Yc / Sx;
  let Vc = Math.sqrt((9.81 * Ac) / Tc);
  let Ec = Yc + Math.pow(Vc, 2) / (2 * 9.81);
  return {Yc, Ac, Tc, Vc, Ec};
}

export default function CalculoSumiderosTab(props) {
  const { P } = props;
  
  // 1. Datos de Escorrentía
  const [areaHa, setAreaHa] = useState("0.12");
  const [coefC, setCoefC] = useState("0.8");
  const [tc, setTc] = useState("10"); // Min 10 min
  const [trManual, setTrManual] = useState("");
  
  // 2. Datos de Vía
  const [anchoVia, setAnchoVia] = useState("6");
  const [bombeoDir, setBombeoDir] = useState("2"); // 1 or 2 directions
  const [sL, setSL] = useState("2.5");
  const [sX, setSX] = useState("2.0");
  const [nVia, setNVia] = useState("0.016"); // Escoba
  
  // 3. Configuración Sumidero
  const [sumCategory, setSumCategory] = useState("LATERAL"); // LATERAL o TRANSVERSAL
  const [ecLateral, setEclateral] = useState("PUNTOS_BAJOS"); // PUNTOS_BAJOS o CONTINUO
  const [sumDestino, setSumDestino] = useState("--- ninguno ---"); // Pozo Destino
  const [cantSumideros, setCantSumideros] = useState("1");
  
  // Lateral parameters
  const [wLateral, setWLateral] = useState("0.6");
  const [swLateral, setSwLateral] = useState("0.08");
  const [lLateral, setLLateral] = useState("2");
  
  // Transversal parameters
  const [cdTrans, setCdTrans] = useState("0.162");
  const [eTrans, setETrans] = useState("0.348");
  const [bTrans, setBTrans] = useState("0.52");
  const [fsTrans, setFsTrans] = useState("2");
  
  // Accumulator
  const sumiderosList = props.sumData || [];
  const setSumiderosList = props.setSumData || (() => {});
  
  const addSumidero = (tipo, qi, qAporte, wLat, swLat, lLat, cdT, eT, bT, fsT, destino, diamSalida, ydoSalida, cant) => {
    let newSumidero = { 
        id: Date.now(), tipo, cant: cant || 1, qi, 
        areaHa, coefC, tc, trManual, anchoVia, bombeoDir, sL: sL/100, sX: sX/100, nVia, sumCategory, ecLateral, 
        wLateral: wLat, swLateral: swLat, lLateral: lLat,
        cdTrans: cdT, eTrans: eT, bTrans: bT, fsTrans: fsT,
        qAporte, destino, diamSalida, ydoSalida
    };
    setSumiderosList([...sumiderosList, newSumidero]);
  };
  
    const inyectarACantidades = () => {
      if (!props.setSumLat || !props.setSumTrans) {
          return alert("Las funciones de inyección no están disponibles en este contexto (ej. exportación offline).");
      }
      if (sumiderosList.length === 0) return alert("No hay sumideros para inyectar.");
      
      let newLat = [...(props.sumLat || [])];
      let newTrans = [...(props.sumTrans || [])];
      let count = 0;
      
      sumiderosList.forEach(s => {
          let isLat = s.sumCategory === "LATERAL";
          if (isLat) {
              let l = parseFloat(s.lLateral) || 2;
              let t = "SL-200";
              if (l >= 4) t = "SL-400";
              if (l >= 6) t = "SL-600";
              newLat.push({
                  id: Date.now() + Math.random(),
                  cant: parseInt(s.cant) || 1,
                  tipo: t,
                  diam: 250,
                  pozo: s.destino || "-",
                  long: l,
                  ancho: parseFloat(s.wLateral) || 0.6
              });
              count++;
          } else {
              let b = parseFloat(s.bTrans) || 0.40;
              let t = "ST-40";
              if (b >= 0.8) t = "ST2-40";
              newTrans.push({
                  id: Date.now() + Math.random(),
                  cant: parseInt(s.cant) || 1,
                  tipo: t,
                  diam: 250,
                  pozo: s.destino || "-",
                  long: parseFloat(s.anchoVia) || 6, ancho: b
              });
              count++;
          }
      });
      
      props.setSumLat(newLat);
      props.setSumTrans(newTrans);
      alert(count + " sumideros inyectados correctamente a Cantidades.");
    };

  const exportToExcel = () => {
    if (sumiderosList.length === 0) return alert("No hay sumideros guardados para exportar.");
    
    const dataToExport = sumiderosList.map((s, i) => ({
      "Nº": i + 1,
      "Tipo": s.tipo,
      "Categoría": s.sumCategory,
      "Destino": s.destino,
      "Cant.": s.cant,
      "Área (Ha)": s.areaHa,
      "Coef. C": s.coefC,
      "Tc (min)": s.tc,
      "Ancho Vía (m)": s.anchoVia,
      "Bombeo Dir": s.bombeoDir,
      "Pend. Long. (m/m)": s.sL,
      "Pend. Trans. (m/m)": s.sX,
      "n Manning Vía": s.nVia,
      ... (s.sumCategory === "LATERAL" 
          ? { "Ec. Lateral": s.ecLateral, "W (m)": s.wLateral, "Sw": s.swLateral, "L (m)": s.lLateral, "Cd": "-", "e": "-", "b": "-", "Fs": "-" }
          : { "Ec. Lateral": "-", "W (m)": "-", "Sw": "-", "L (m)": "-", "Cd": s.cdTrans, "e": s.eTrans, "b": s.bTrans, "Fs": s.fsTrans }),
      "Q Aporte (L/s)": s.qAporte !== undefined ? s.qAporte.toFixed(2) : "-",
      "Q Captado Ind. (L/s)": s.qi !== undefined ? s.qi.toFixed(2) : "-",
      "Q Captado Total (L/s)": s.qi !== undefined ? (s.qi * s.cant).toFixed(2) : "-",
      "Eficiencia Ind. (%)": (s.qAporte > 0 && s.qi !== undefined) ? ((s.qi / s.qAporte) * 100).toFixed(1) + "%" : "-",
      "Diam. Salida": s.diamSalida || "-",
      "Y/Do Salida": s.ydoSalida !== undefined ? s.ydoSalida.toFixed(3) : "-"
    }));
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sumideros");
    XLSX.writeFile(wb, "Informe_Sumideros.xlsx");
  };
  
  const updateSumideroCant = (id, newCant) => {
    setSumiderosList(sumiderosList.map(s => s.id === id ? { ...s, cant: newCant } : s));
  };
  
  const removeSumidero = (id) => {
    setSumiderosList(sumiderosList.filter(s => s.id !== id));
  };
  
  const totalQiList = sumiderosList.reduce((acc, s) => acc + (s.qi * s.cant), 0);

  
  const [sDescarga, setSDescarga] = useState("2.0");
  
  // Racional calc
  let A = parseFloat(String(areaHa).replace(',' , '.')) || 0;
  let C = parseFloat(String(coefC).replace(',' , '.')) || 0;
  let T_c = parseFloat(String(tc).replace(',' , '.')) || 10;
  if (T_c < 10) T_c = 10;
  let Tr = trManual ? parseFloat(String(trManual).replace(',' , '.')) : gTr(A);
  
  let est = P.estacion || "BUC";
  let I_lsha = cIDF(est, Tr, T_c, P); 
  let Q_aporte_lps = C * I_lsha * A;
  let Q_aporte_m3s = Q_aporte_lps / 1000;
  
  // Variables Vía
  let ancho_m = parseFloat(String(anchoVia).replace(',' , '.')) || 6;
  let S_L = (parseFloat(String(sL).replace(',' , '.')) || 2.5) / 100;
  let S_X = (parseFloat(String(sX).replace(',' , '.')) || 2.0) / 100;
  let n_manning = parseFloat(String(nVia).replace(',' , '.')) || 0.016;
  let dirs = parseInt(bombeoDir) || 2;
  
  let Tmax = 0;
  if (ancho_m < 6) Tmax = 2;
  else if (ancho_m < 7) Tmax = 3;
  else if (ancho_m < 9) Tmax = 3.5;
  else Tmax = 4;
  Tmax = Tmax / dirs;
  
  // Spread (T) Calculation - HEC-22 metric
  let T_calc = 0;
  if (Q_aporte_m3s > 0 && S_X > 0 && S_L > 0) {
    let denom = 0.376 * Math.pow(S_X, 1.67) * Math.pow(S_L, 0.5);
    T_calc = Math.pow((Q_aporte_m3s * n_manning) / denom, 0.375);
  }
  let cumpleT = T_calc <= Tmax;
  
  // Sumidero calculations
  let Q_intercepted_m3s = 0;
  let L_req = 0;
  
  if (sumCategory === "LATERAL") {
    let W = parseFloat(String(wLateral).replace(',' , '.')) || 0.6;
    let Sw = parseFloat(String(swLateral).replace(',' , '.')) || 0.08;
    let L = parseFloat(String(lLateral).replace(',' , '.')) || 2;
    
    if (ecLateral === "PUNTOS_BAJOS") {
      let d_depth = T_calc * S_X;
      let a_dep = (Sw - S_X) * W;
      let Cw = (a_dep === 0) ? 0.37 : 0.29;
      Q_intercepted_m3s = Cw * Math.pow(2 * 9.81, 0.5) * (L + 1.8 * W) * Math.pow(d_depth, 1.5);
    } else {
      let LT = 0.817 * Math.pow(Q_aporte_m3s, 0.42) * Math.pow(S_L, 0.3) * Math.pow(1 / (n_manning * S_X), 0.6);
      let E_eff = 1;
      if (L < LT) {
         E_eff = 1 - Math.pow(1 - (L/LT), 1.8);
      }
      Q_intercepted_m3s = E_eff * Q_aporte_m3s;
    }
    
  } else if (sumCategory === "TRANSVERSAL") {
    let Cd = parseFloat(String(cdTrans).replace(',' , '.')) || 0.162;
    let e_frac = parseFloat(String(eTrans).replace(',' , '.')) || 0.348;
    let b_width = parseFloat(String(bTrans).replace(',' , '.')) || 0.52;
    let Fs = parseFloat(String(fsTrans).replace(',' , '.')) || 2;
    let crit = solveCriticalTransversal(Q_aporte_m3s, S_X);
    if (crit.Ec > 0) {
       L_req = (Fs * Q_aporte_m3s) / (Cd * e_frac * b_width * Math.sqrt(2 * 9.81 * crit.Ec));
    }
    Q_intercepted_m3s = Q_aporte_m3s; 
  }
  
  let Qi_lps = Q_intercepted_m3s * 1000;
  let cantParsed = parseInt(cantSumideros) || 1;
  let Qi_total_lps = Qi_lps * cantParsed;
  if (Qi_total_lps > Q_aporte_lps) {
      Qi_total_lps = Q_aporte_lps;
  }
  
  let pendDescarga = parseFloat(String(sDescarga).replace(',','.')) || 2.0;
  let dSalida = autoDiam(Qi_total_lps / cantParsed, pendDescarga, 0.010, {relCapacidad: 0.9, porcProfundidad: 0.85, velMaxima: 10.0, fuerzaTractMin: 1.0, limFroudeSub: 0.9, limFroudeSup: 1.1, tipoAlc: "P"}, 3);
  let Q_pasa_lps = Q_aporte_lps - Qi_total_lps;
  if (Q_pasa_lps < 0) Q_pasa_lps = 0;

  return (
    <div className="c">
      <div className="ct">Diseño Sumideros EMPAS (HEC-22 / Mostkow)</div>
      
      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        
        <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid #ddd", padding: 15, borderRadius: 8, minWidth: 220, flex: 1 }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#003B73" }}>1. Caudales</h4>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Área Aferente (Ha):</label>
          <input type="number" step="0.01" style={{ width: "100%", padding: 5, marginBottom: 10 }} value={areaHa} onChange={e => setAreaHa(e.target.value)} />
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Coeficiente de Escorrentía (C):</label>
          <input type="number" step="0.01" style={{ width: "100%", padding: 5, marginBottom: 10 }} value={coefC} onChange={e => setCoefC(e.target.value)} />
          <div style={{ padding: 10, background: "rgba(0,0,0,0.2)", border: "1px solid #eee", borderRadius: 4, marginTop: 10 }}>
            <div><strong style={{color:"#555"}}>Intensidad:</strong> {I_lsha.toFixed(2)} l/s/ha</div>
            <div><strong style={{color:"#DC3545"}}>Q Aporte:</strong> {Q_aporte_lps.toFixed(2)} l/s</div>
            <div style={{ marginTop: 15, padding: 10, background: "rgba(0,166,214,0.1)", borderRadius: 4, border: "1px solid rgba(0,166,214,0.3)" }}>
              <h5 style={{ margin: "0 0 5px 0", color: "#00A6D6" }}>Resultados</h5>
              <div style={{ fontSize: 13, color: "#8FD67A" }}>Qi (Individual) = {Qi_lps.toFixed(2)} l/s</div>
              <div style={{ fontSize: 18, fontWeight: "bold", color: "#8FD67A" }}>Q Captado Total = {Qi_total_lps.toFixed(2)} l/s</div>
              <div style={{ fontSize: 13, color: "#ccc" }}>Q Pasa = {Q_pasa_lps.toFixed(2)} l/s</div>
              <div style={{ fontSize: 13, color: cumpleT ? "#8FD67A" : "#DC3545", marginTop: 5 }}>
                Ancho Inundación (T): <strong>{T_calc.toFixed(2)} m</strong> {cumpleT ? "(OK)" : "(> Máx)"}
              </div>
              {sumCategory === "TRANSVERSAL" && <div style={{ fontSize: 12, marginTop: 5, color: "#f39c12" }}>L. req. teórica = {L_req ? L_req.toFixed(2) : 0} m</div>}
              <div style={{ fontSize: 13, marginTop: 5, color: "#fff", background: "rgba(0,0,0,0.2)", padding: 4, borderRadius: 3 }}>
                Tub. Salida: <strong style={{color:"#00A6D6"}}>{dSalida.nom}</strong>
                <div style={{marginTop: 4, display: "flex", alignItems: "center", gap: 5}}>
                  <label style={{fontSize: 10}}>Pend. S(%)</label>
                  <input type="number" step="0.1" style={{ width: "50px", padding: 2, fontSize: 10 }} value={sDescarga} onChange={e => setSDescarga(e.target.value)} />
                </div>
              </div>
              <button 
                onClick={() => addSumidero(`Sumidero ${sumCategory} ${sumCategory==="LATERAL"?ecLateral:""}`, Qi_lps, Q_aporte_lps, wLateral, swLateral, lLateral, cdTrans, eTrans, bTrans, fsTrans, sumDestino, dSalida.nom, dSalida.Ydo, cantParsed)}
                style={{ marginTop: 15, width: "100%", padding: "8px", background: "#00A6D6", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>
                + Agregar Sumidero
              </button>
            </div>
          </div>
        </div>
        
        <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid #ddd", padding: 15, borderRadius: 8, minWidth: 220, flex: 1 }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#17A2B8" }}>2. Capacidad Vía</h4>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Ancho de vía (m):</label>
          <input type="number" step="0.1" style={{ width: "100%", padding: 5, marginBottom: 10 }} value={anchoVia} onChange={e => setAnchoVia(e.target.value)} />
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Bombeo Tipo:</label>
          <select style={{ width: "100%", padding: 5, marginBottom: 10 }} value={bombeoDir} onChange={e => setBombeoDir(e.target.value)}>
            <option value="1">Bombeo 1 dirección</option>
            <option value="2">Bombeo 2 direcciones</option>
          </select>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Pendiente Long. Sl (%):</label>
          <input type="number" step="0.1" style={{ width: "100%", padding: 5, marginBottom: 10 }} value={sL} onChange={e => setSL(e.target.value)} />
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Pendiente Trans. Sx (%):</label>
          <input type="number" step="0.1" style={{ width: "100%", padding: 5, marginBottom: 10 }} value={sX} onChange={e => setSX(e.target.value)} />
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Pozo a optimizar (Destino):</label>
          <input type="text" style={{ width: "100%", padding: 5, marginBottom: 10 }} value={sumDestino} onChange={e => setSumDestino(e.target.value)} />
        </div>

        <div style={{ background: "rgba(0,0,0,0.2)", border: "1px solid #ddd", padding: 15, borderRadius: 8, minWidth: 280, flex: 1 }}>
          <h4 style={{ margin: "0 0 10px 0", color: "#28A745" }}>3. Sumidero (EMPAS)</h4>
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Número de sumideros:</label>
          <input type="number" step="1" min="1" style={{ width: "100%", padding: 5, marginBottom: 10 }} value={cantSumideros} onChange={e => setCantSumideros(e.target.value)} />
          <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Categoría:</label>
          <select style={{ width: "100%", padding: 5, marginBottom: 10 }} value={sumCategory} onChange={e => setSumCategory(e.target.value)}>
            <option value="LATERAL">Lateral</option>
            <option value="TRANSVERSAL">Transversal</option>
          </select>
          {sumCategory === "LATERAL" && (
            <>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: 5 }}>Ecuación:</label>
              <select style={{ width: "100%", padding: 5, marginBottom: 10 }} value={ecLateral} onChange={e => setEclateral(e.target.value)}>
                <option value="PUNTOS_BAJOS">Puntos Bajos</option>
                <option value="CONTINUO">Flujo Continuo (FHWA)</option>
              </select>
              <div style={{display:"flex", gap:10}}>
                <div style={{flex:1}}><label style={{ fontSize: 12 }}>Ancho W (m):</label><input type="number" step="0.01" style={{ width: "100%", padding: 5 }} value={wLateral} onChange={e => setWLateral(e.target.value)} /></div>
                <div style={{flex:1}}><label style={{ fontSize: 12 }}>Pte. Sw:</label><input type="number" step="0.01" style={{ width: "100%", padding: 5 }} value={swLateral} onChange={e => setSwLateral(e.target.value)} /></div>
                <div style={{flex:1}}><label style={{ fontSize: 12 }}>Long. L (m):</label><input type="number" step="0.1" style={{ width: "100%", padding: 5 }} value={lLateral} onChange={e => setLLateral(e.target.value)} /></div>
              </div>
            </>
          )}
          {sumCategory === "TRANSVERSAL" && (
            <>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 10 }}>Ecuación: Mostkow</div>
              <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                <div style={{flex:1, minWidth:100}}><label style={{ fontSize: 12 }}>Cd:</label><input type="number" step="0.01" style={{ width: "100%", padding: 5 }} value={cdTrans} onChange={e => setCdTrans(e.target.value)} /></div>
                <div style={{flex:1, minWidth:100}}><label style={{ fontSize: 12 }}>e:</label><input type="number" step="0.01" style={{ width: "100%", padding: 5 }} value={eTrans} onChange={e => setETrans(e.target.value)} /></div>
                <div style={{flex:1, minWidth:100}}><label style={{ fontSize: 12 }}>b (m):</label><input type="number" step="0.01" style={{ width: "100%", padding: 5 }} value={bTrans} onChange={e => setBTrans(e.target.value)} /></div>
                <div style={{flex:1, minWidth:100}}><label style={{ fontSize: 12 }}>Fs:</label><input type="number" step="0.1" style={{ width: "100%", padding: 5 }} value={fsTrans} onChange={e => setFsTrans(e.target.value)} /></div>
              </div>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 20, padding: 15, background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
          <h4 style={{ margin: 0, color: "#8FD67A" }}>Calculadora Acumulativa</h4>
          <div>
            <button className="btn" style={{ fontSize: 12, padding: "5px 10px", background: "#f39c12", color: "#fff", marginRight: "10px" }} onClick={inyectarACantidades}>Inyectar a Cantidades</button>
            <button className="btn" style={{ fontSize: 12, padding: "5px 10px", background: "#28A745", color: "#fff" }} onClick={exportToExcel}>Exportar Informe (Excel)</button>
          </div>
        </div>
        {sumiderosList.length === 0 ? (
          <div style={{ fontSize: 12, color: "#888", fontStyle: "italic" }}>No hay sumideros agregados.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", color: "#00A6D6" }}>
                <th style={{ textAlign: "left", padding: 5 }}>Destino</th>
                <th style={{ textAlign: "left", padding: 5 }}>Tipo</th>
                <th style={{ textAlign: "center", padding: 5 }}>Área (Ha)</th>
                <th style={{ textAlign: "center", padding: 5 }}>Q Aporte (l/s)</th>
                <th style={{ textAlign: "center", padding: 5 }}>Cant.</th>
                <th style={{ textAlign: "right", padding: 5 }}>Q Captado (l/s)</th>
                <th style={{ textAlign: "right", padding: 5 }}>Eficiencia</th>
                <th style={{ textAlign: "center", padding: 5 }}>D Salida</th>
                <th style={{ textAlign: "center", padding: 5 }}>Y/Do</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {sumiderosList.map(s => (
                <tr key={s.id} style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <td style={{ padding: 5, fontWeight: "bold", color: "#e2e8f0" }}>{s.destino || "-"}</td>
                  <td style={{ padding: 5, fontWeight: "bold" }}>{s.tipo}</td>
                  <td style={{ padding: 5, textAlign: "center" }}>{s.areaHa}</td>
                  <td style={{ padding: 5, textAlign: "center" }}>{s.qAporte !== undefined ? s.qAporte.toFixed(2) : "-"}</td>
                  <td style={{ padding: 5, textAlign: "center" }}>
                    <input type="number" min="1" value={s.cant} onChange={e => updateSumideroCant(s.id, parseInt(e.target.value)||1)} style={{ width: 50, background: "rgba(0,0,0,0.3)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 3, padding: 2, textAlign: "center" }} />
                  </td>
                  <td style={{ padding: 5, textAlign: "right", color: "#8FD67A", fontWeight: "bold" }}>{(s.qi * s.cant).toFixed(2)}</td>
                  <td style={{ padding: 5, textAlign: "right", fontSize: 11 }}>{(s.qAporte > 0 && s.qi) ? ((s.qi/s.qAporte)*100).toFixed(1)+"%" : "-"}</td>
                  <td style={{ padding: 5, textAlign: "center", fontSize: 11, color: "#00A6D6" }}>{s.diamSalida||"-"}</td>
                  <td style={{ padding: 5, textAlign: "center", fontSize: 11 }}>{s.ydoSalida !== undefined ? s.ydoSalida.toFixed(2) : "-"}</td>
                  <td style={{ padding: 5, textAlign: "center" }}><button onClick={() => removeSumidero(s.id)} style={{ background: "#DC3545", color: "#fff", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: 12, padding: "4px 8px", fontWeight: "bold" }}>✖</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: "1px solid rgba(255,255,255,0.2)" }}>
                <td colSpan="5" style={{ padding: 8, textAlign: "right", fontWeight: "bold" }}>Caudal Total Interceptado (ΣQi):</td>
                <td style={{ padding: 8, textAlign: "right", fontWeight: "bold", fontSize: 16, color: totalQiList >= Q_aporte_lps ? "#8FD67A" : "#DC3545" }}>{totalQiList.toFixed(2)} l/s</td>
                <td colSpan="4"></td>
              </tr>
              <tr>
                <td colSpan="5" style={{ padding: 8, textAlign: "right", fontWeight: "bold" }}>Balance (Q Aporte - ΣQi):</td>
                <td style={{ padding: 8, textAlign: "right", fontWeight: "bold", fontSize: 14, color: "#FF8C00" }}>{Math.max(0, Q_aporte_lps - totalQiList).toFixed(2)} l/s</td>
                <td colSpan="4"></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
