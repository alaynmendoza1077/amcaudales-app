import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { DP } from '../constants';
import runCalc from '../engine';
import { parseLibro, parseMaestra, parsePtoBase, topoSort, buildTramos, parseINPFile } from '../parsers';
import { fm } from '../ui';
import AcoTab from '../tabs/AcoTab';
import PozTab from '../tabs/PozTab';
import SumTab from '../tabs/SumTab';
import ExcTab from '../tabs/ExcTab';
import CronoTab from '../tabs/CronoTab';
import PreTab from '../tabs/PreTab';
import PreGenTab from '../tabs/PreGenTab';
import PreBancoTab from '../tabs/PreBancoTab';
import MapTab from '../tabs/MapTab';

var TABS = [
  { id: "map", l: "Visor Espacial" },
  { id: "pre_empas", l: "Presupuesto EMPAS" },
  { id: "pre_gen", l: "Presupuesto General" },
  { id: "pre_banco", l: "Pto Banco" },
  { id: "aco", l: "Acometidas" },
  { id: "poz", l: "Pozos" },
  { id: "sum", l: "Sumideros" },
  { id: "exc", l: "Excavaciones" },
  { id: "cro", l: "Cronograma" }
];

export default function PresupuestoModule({ onBack }) {
  var sTab = useState("pre_empas"); var tab = sTab[0], setTab = sTab[1];
  var sP = useState(DP); var P = sP[0], setP = sP[1];
  var sT = useState([]); var T = sT[0], setT = sT[1];
  var sR = useState([]); var R = sR[0], setR = sR[1];
  var sAliv = useState([]); var alivData = sAliv[0], setAlivData = sAliv[1];
  var sSumLat = useState([]); var sumLat = sSumLat[0], setSumLat = sSumLat[1];
  var sSumTrans = useState([]); var sumTrans = sSumTrans[0], setSumTrans = sSumTrans[1];
  var sPB = useState([]); var pbItems = sPB[0], setPbItems = sPB[1];
  var sPBBanco = useState([]); var pbBancoItems = sPBBanco[0], setPbBancoItems = sPBBanco[1];
  var sLM = useState(false); var lightMode = sLM[0], setLightMode = sLM[1];
  var sSelMap = useState([]); var selMap = sSelMap[0], setSelMap = sSelMap[1];
  
  var refAMC = useRef(null);
  var refINP = useRef(null);
  var refAMCSim = useRef(null);

  var handleLoadAMCFiles = (e) => {
    var files = e.target.files;
    if(!files || files.length === 0) return;
    if(T.length > 0) {
      var ok = window.confirm("Hay datos cargados. Se perderán los datos no guardados.\n\nPresione Aceptar para continuar o Cancelar para guardar primero.");
      if(!ok) return;
    }

    setR([]); setAlivData([]); setPbItems([]);
    var lat = []; for(var i2 = 0; i2 < 15; i2++) lat.push({id: i2, cant: 0, tipo: "SL-200", diam: 250, pozo: "", long: 6});
    var trans = []; for(var j2 = 0; j2 < 15; j2++) trans.push({id: j2, cant: 0, tipo: "ST-40", diam: 250, pozo: "", long: 6});
    
    var allTrams = [];
    var mergedP = Object.assign({}, DP);
    mergedP.pozos = []; mergedP.verts = []; mergedP.tr = []; mergedP.ad = [];
    var mergedSumLat = [];
    var mergedSumTrans = [];
    var mergedAlivData = [];
    
    var filesProcessed = 0;
    var totalFiles = files.length;
    var multiple = totalFiles > 1;

    Array.from(files).forEach(function(f, fileIndex) {
       var r = new FileReader();
       r.onload = function(evt) {
          try {
              var data = JSON.parse(evt.target.result);
              var px = multiple ? `[Z${fileIndex+1}] ` : "";

              if (data.P) {
                  if(fileIndex === 0) Object.assign(mergedP, data.P);
                  if (data.P.pozos) data.P.pozos.forEach(p => { let np = {...p, Nombre: px + p.Nombre, IdNodo: px + p.IdNodo}; if(fileIndex>0) mergedP.pozos.push(np); else { p.Nombre=np.Nombre; p.IdNodo=np.IdNodo; } });
                  if (data.P.verts) data.P.verts.forEach(p => { let np = {...p, IDNODO: px + p.IDNODO}; if(fileIndex>0) mergedP.verts.push(np); else { p.IDNODO=np.IDNODO; } });
                  if (data.P.tr) data.P.tr.forEach(p => { let np = {...p, IdNodo: px + p.IdNodo}; if(fileIndex>0) mergedP.tr.push(np); else { p.IdNodo=np.IdNodo; } });
                  if (data.P.ad) data.P.ad.forEach(p => { let np = {...p, IDNODO: px + p.IDNODO}; if(fileIndex>0) mergedP.ad.push(np); else { p.IDNODO=np.IDNODO; } });
              }

              if (data.T) {
                  data.T.forEach(t => {
                      let nt = { ...t };
                      nt.de = px + nt.de;
                      nt.a = px + nt.a;
                      if (nt.nombre) nt.nombre = px + nt.nombre;
                      nt.id = nt.de + "-" + nt.a;
                      nt.reponer = "S";
                      allTrams.push(nt);
                  });
              }

              if (data.sumLat) data.sumLat.forEach(s => mergedSumLat.push({ ...s, tr: px + s.tr }));
              if (data.sumTrans) data.sumTrans.forEach(s => mergedSumTrans.push({ ...s, de: px + s.de, a: px + s.a }));
              if (data.alivData) data.alivData.forEach(a => mergedAlivData.push({ ...a, nodo: px + a.nodo }));
          } catch(e) { console.error("Error reading AMC file", f.name, e); }
          
          filesProcessed++;
          if (filesProcessed === totalFiles) {
              setP(mergedP);
              setT(allTrams);
              if(mergedSumLat.length > 0) setSumLat(mergedSumLat); else setSumLat(lat);
              if(mergedSumTrans.length > 0) setSumTrans(mergedSumTrans); else setSumTrans(trans);
              if(mergedAlivData.length > 0) setAlivData(mergedAlivData);
              alert("Archivo(s) AMC cargado(s) correctamente.");
          }
       };
       r.readAsText(f);
    });
    e.target.value = null;
  };

  var handleSaveAMC = function() {
    var suggestedName = (P.proyecto || P.barrio || "proyecto").replace(/\s+/g, "_") + "_Presupuesto";
    var fileName = window.prompt("Introduce el nombre con el que deseas guardar el archivo AMC con tu presupuesto:", suggestedName);
    if (!fileName) return;
    if (!fileName.toLowerCase().endsWith(".amc")) fileName += ".amc";
    
    // Create an object holding all the current state
    var data = {
      v: "v36_presupuesto",
      P: P,
      T: T,
      sumLat: sumLat,
      sumTrans: sumTrans,
      pbItems: pbItems,
      alivData: alivData,
      tab: tab,
      selMap: selMap,
      R: R
    };
    
    var blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    import('../utils/fileSaver').then(m => m.saveFileWithDialog(blob, fileName));
  };

  var handleLoadINPFiles = (e) => {
    var files = e.target.files;
    if(!files || files.length === 0) return;
    if(T.length > 0) {
      var ok = window.confirm("Hay datos cargados. Se perderán los datos no guardados.\n\nPresione Aceptar para continuar o Cancelar para guardar primero.");
      if(!ok) return;
    }
    
    setR([]); setAlivData([]); setPbItems([]);
    var lat = []; for(var i2 = 0; i2 < 15; i2++) lat.push({id: i2, cant: 0, tipo: "SL-200", diam: 250, pozo: "", long: 6});
    setSumLat(lat);
    var trans = []; for(var j2 = 0; j2 < 15; j2++) trans.push({id: j2, cant: 0, tipo: "ST-40", diam: 250, pozo: "", long: 6});
    setSumTrans(trans);
    
    var allTrams = [];
    var mergedP = Object.assign({}, DP);
    mergedP.pozos = []; mergedP.verts = []; mergedP.tr = []; mergedP.ad = [];
    
    var filesProcessed = 0;
    var totalFiles = files.length;
    var multiple = totalFiles > 1;

    Array.from(files).forEach(function(f, fileIndex) {
       var r = new FileReader();
       r.onload = function(evt) {
          try {
              var d = evt.target.result;
              var p = parseINPFile(d); 
              var trams = topoSort(buildTramos(p));
              
              if (multiple) {
                  var zPrefix = `[Z${fileIndex+1}] `;
                  trams.forEach(function(t) {
                      t.de = zPrefix + t.de;
                      t.a = zPrefix + t.a;
                      if(t.nombre) t.nombre = zPrefix + t.nombre;
                      t.id = t.de + "-" + t.a;
                  });
                  if (p.pozos) {
                      p.pozos.forEach(pz => {
                         if(pz.Nombre) pz.Nombre = zPrefix + pz.Nombre;
                         if(pz.IdNodo) pz.IdNodo = zPrefix + pz.IdNodo;
                         if(pz.IDfinal) pz.IDfinal = zPrefix + pz.IDfinal;
                      });
                  }
                  if (p.verts) {
                      p.verts.forEach(v => {
                         if(v.IDNODO) v.IDNODO = zPrefix + v.IDNODO;
                      });
                  }
                  if (p.ad) {
                      p.ad.forEach(adItem => {
                         if(adItem.IDNODO) adItem.IDNODO = zPrefix + adItem.IDNODO;
                         if(adItem.Nombre) adItem.Nombre = zPrefix + adItem.Nombre;
                         if(adItem.IDNODO_SWMM) adItem.IDNODO_SWMM = zPrefix + adItem.IDNODO_SWMM;
                      });
                  }
              }
              allTrams = allTrams.concat(trams);
              mergedP.pozos = mergedP.pozos.concat(p.pozos || []);
              mergedP.verts = mergedP.verts.concat(p.verts || []);
              mergedP.tr = mergedP.tr.concat(p.tr || []);
              mergedP.ad = mergedP.ad.concat(p.ad || []);
          } catch(e) { console.error("Error reading INP file", f.name, e); }
          
          filesProcessed++;
          if (filesProcessed === totalFiles) {
              setP(mergedP);
              setT(allTrams);
              alert("Archivo(s) INP cargado(s) correctamente.");
          }
       };
       r.readAsText(f);
    });
    e.target.value = null;
  };

  useEffect(function() {
    var lat = []; for(var i = 0; i < 15; i++) lat.push({id: i, cant: 0, tipo: "SL-200", diam: 250, pozo: "", long: 6});
    setSumLat(lat);
    var trans = []; for(var j = 0; j < 15; j++) trans.push({id: j, cant: 0, tipo: "ST-40", diam: 250, pozo: "", long: 6});
    setSumTrans(trans);
  }, []);

  var onFilesSelect = useCallback(function(files) {
    if(T.length > 0) {
      var ok = window.confirm("Hay datos cargados. Se perderán los datos no guardados.\n\nPresione Aceptar para continuar o Cancelar para guardar primero.");
      if(!ok) return;
    }
    
    setR([]); setAlivData([]); setPbItems([]);
    var lat = []; for(var i2 = 0; i2 < 15; i2++) lat.push({id: i2, cant: 0, tipo: "SL-200", diam: 250, pozo: "", long: 6});
    setSumLat(lat);
    var trans = []; for(var j2 = 0; j2 < 15; j2++) trans.push({id: j2, cant: 0, tipo: "ST-40", diam: 250, pozo: "", long: 6});
    setSumTrans(trans);
    
    var allTrams = [];
    var allPbItems = [];
    var mergedP = Object.assign({}, DP);
    var filesProcessed = 0;
    var totalFiles = files.length;
    var multiple = totalFiles > 1;

    Array.from(files).forEach(function(f, fileIndex) {
       var r = new FileReader();
       r.onload = function(evt) {
          try {
              var d = evt.target.result;
              var p = parseLibro(d); 
              var trams = topoSort(buildTramos(p));
              
              if (p.libroParams && fileIndex === 0) { Object.assign(mergedP, p.libroParams); }
              var mst = parseMaestra(d);
              if(mst) {
                if (fileIndex === 0) { Object.assign(mergedP, mst); delete mergedP._datosTramos; }
                if(mst._datosTramos && mst._datosTramos.length > 0) {
                  trams.forEach(function(t) {
                    var dm = mst._datosTramos.find(function(dd) { return dd.de === t.de; });
                    if(dm) {
                      if(!t.tipoVia || t.tipoVia === "FX") t.tipoVia = dm.tipoVia;
                      if(!t.anchoVia) t.anchoVia = dm.pavAncho;
                      if(!t.pozoNuevo || t.pozoNuevo === "N") t.pozoNuevo = dm.pozoNuevo;
                    }
                  });
                }
              }
              var pb = parsePtoBase(d);
              if(pb && pb.length > 0) {
                allPbItems = allPbItems.concat(pb);
              }
              
              // Prefix node IDs to prevent hydraulic mixing if multiple zones are uploaded
              if (multiple) {
                  var zPrefix = `[Z${fileIndex+1}] `;
                  trams.forEach(function(t) {
                      t.de = zPrefix + t.de;
                      t.a = zPrefix + t.a;
                  });
              }
              allTrams = allTrams.concat(trams);
          } catch(e) { console.error("Error reading file", f.name, e); }
          
          filesProcessed++;
          if (filesProcessed === totalFiles) {
              setP(mergedP);
              setPbItems(allPbItems);
              setT(allTrams);
          }
       };
       r.readAsArrayBuffer(f);
    });
  }, [T]);

  useEffect(function() {
    if(!T.length) return;
    P.estSepData = typeof estSepData !== "undefined" ? estSepData : {};
    var results = runCalc(T, P);
    if(alivData && alivData.length > 0) {
      var dR2 = results.filter(function(r) { return !r.sep; });
      dR2.forEach(function(r, ri) {
        var al = alivData[ri];
        if(al && al.aliviar === "S") {
          var qmd = al.qmd > 0 ? al.qmd : (r.Qmed || r.Qsan / 3.5 || 0);
          r.Qsan = qmd;
          var newQd = qmd + (r.Qinf || 0) + (r.Qcon || 0) + (r.Qill || 0);
          r.Qd = newQd;
          if(r.Vll && r.Vll > 0 && r.A > 0) {
            var fl = newQd / r.Qll;
            var cal = function(f) {
              var a1 = 0.0001, b1 = 1, mid, fm;
              for(var it = 0; it < 20; it++) {
                mid = (a1 + b1) / 2;
                var aC = mid - Math.sin(mid * 2 * Math.PI) / (2 * Math.PI);
                var rC = 1 - Math.sin(mid * 2 * Math.PI) / (mid * 2 * Math.PI);
                fm = aC * Math.pow(rC, 0.6667) - f;
                if(fm > 0) b1 = mid; else a1 = mid;
              }
              return mid;
            };
            var prop = cal(fl);
            r.V = r.Vll * Math.pow(1 - Math.sin(prop * 2 * Math.PI) / (prop * 2 * Math.PI), 0.6667);
            r.d = prop * r.D;
          }
        }
      });
    }
    setR(results);
  }, [T, P, alivData]);

  return (
    <div className={`app ${lightMode ? 'light-mode' : ''}`} style={{ minHeight: '100vh', background: lightMode ? '#f8fafc' : '#050a15', color: lightMode ? '#000' : '#fff', display: 'flex', flexDirection: 'column' }}>
      <div className="header-container" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="hdr">
          <div className="logo">AMC<br/>Pro</div>
          <div className="hdr-titles">
            <div style={{fontWeight:"bold",fontSize:18,color:"#38bdf8",marginLeft:10}}>
              MÓDULO DE PRESUPUESTOS
            </div>
          </div>
          <div className="hdr-actions">
            <button 
              className="hdr-btn" 
              onClick={onBack}
              title="Volver al Menú Principal"
              style={{ background: 'linear-gradient(to right, #4b5563, #374151)', color: 'white', border: '1px solid #6b7280' }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Volver
            </button>
            {T.length > 0 && (
              <button className="hdr-btn" onClick={() => {
                 if(window.confirm("¿Seguro que deseas descartar el proyecto actual?")) {
                    setT([]); setR([]); setPbItems([]);
                 }
              }}>
                Limpiar
              </button>
            )}
            {T.length > 0 && (
              <>
                <button className="hdr-btn" onClick={() => refAMC.current && refAMC.current.click()}>
                  Cargar Maestras Excel
                </button>
                <button className="hdr-btn" onClick={() => refINP.current && refINP.current.click()} style={{ background: '#059669', color: 'white', border: '1px solid #10b981' }}>
                  Cargar INP SWMM
                </button>
                <button className="hdr-btn" onClick={() => refAMCSim.current && refAMCSim.current.click()} style={{ background: '#d97706', color: 'white', border: '1px solid #b45309' }}>
                  Cargar Proyecto .AMC
                </button>
              </>
            )}
            <input type="file" multiple accept=".xlsm,.xlsx" ref={refAMC} style={{ display: 'none' }} onChange={(e) => {
              var files = e.target.files;
              if(!files || files.length === 0) return;
              onFilesSelect(files);
              e.target.value = null;
            }} />
            <input type="file" multiple accept=".inp" ref={refINP} style={{ display: 'none' }} onChange={handleLoadINPFiles} />
            <input type="file" multiple accept=".amc" ref={refAMCSim} style={{ display: 'none' }} onChange={handleLoadAMCFiles} />
            <button className="hdr-btn" onClick={() => setLightMode(!lightMode)}>
              {lightMode ? '🌙' : '☀️'} {lightMode ? 'Oscuro' : 'Claro'}
            </button>
            {T.length > 0 && (
              <button className="hdr-btn" onClick={handleSaveAMC} style={{ background: '#4f46e5', color: 'white', border: '1px solid #4338ca', fontWeight: 'bold' }}>
                💾 Guardar Proyecto (.amc)
              </button>
            )}
          </div>
        </div>
      </div>
      
      {T.length > 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div className="tb" style={{ padding: '0 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)' }}>
            {TABS.map(function(tOpt) {
              var active = tab === tOpt.id;
              var color = active ? (lightMode ? '#2563eb' : '#3b82f6') : (lightMode ? '#64748b' : '#9ca3af');
              var border = active ? `2px solid ${color}` : '2px solid transparent';
              return (
                <button
                  key={tOpt.id}
                  onClick={() => setTab(tOpt.id)}
                  style={{
                    padding: '0.75rem 1.25rem',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: border,
                    color: color,
                    fontWeight: active ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {tOpt.l}
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ display: tab === 'map' ? 'block' : 'none', height: '100%' }}>
              <MapTab R={R} P={P} T={T} selMap={selMap} setSelMap={setSelMap} lightMode={lightMode} sub="san" sumLat={sumLat} sumTrans={sumTrans} setTab={setTab} alivData={alivData} isActive={tab==='map'} />
            </div>
            {tab === 'pre_empas' && <PreTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems} setPbItems={setPbItems} isEmpas={true} />}
            {tab === 'pre_gen' && <PreGenTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbItems} setPbItems={setPbItems} />}
            {tab === 'pre_banco' && <PreBancoTab R={R} P={P} T={T} sumLat={sumLat} sumTrans={sumTrans} pbItems={pbBancoItems} setPbItems={setPbBancoItems} />}
            {tab === 'aco' && <AcoTab R={R} P={P} sP={setP} T={T} />}
            {tab === 'poz' && <PozTab R={R} P={P} sP={setP} T={T} />}
            {tab === 'sum' && <SumTab R={R} P={P} sP={setP} T={T} sumLat={sumLat} setSumLat={setSumLat} sumTrans={sumTrans} setSumTrans={setSumTrans} />}
            {tab === 'exc' && <ExcTab R={R} P={P} sP={setP} T={T} sumLat={sumLat} sumTrans={sumTrans} />}
            {tab === 'cro' && <CronoTab R={R} P={P} sP={setP} T={T} pbItems={pbItems} />}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', padding: '2rem', border: '2px dashed #3b82f6', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.05)' }}>
            <h2 style={{ marginBottom: '1rem', color: '#3b82f6' }}>Bienvenido al Módulo de Presupuestos</h2>
            <p style={{ color: '#9ca3af', marginBottom: '2rem' }}>Sube tu archivo (o selecciona varios archivos simultáneamente) Maestro de Excel para generar automáticamente todas las carteras de cantidades (Acometidas, Pozos, Sumideros, Excavaciones) y tu presupuesto paralelo consolidado.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => refAMC.current && refAMC.current.click()}
                style={{ flex: 1, minWidth: '160px', padding: '1.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Cargar Maestras</span>
                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Excel (.xlsm)</span>
              </button>
              <button 
                onClick={() => refINP.current && refINP.current.click()}
                style={{ flex: 1, minWidth: '160px', padding: '1.5rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Cargar INP</span>
                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>SWMM (.inp)</span>
              </button>
              <button 
                onClick={() => refAMCSim.current && refAMCSim.current.click()}
                style={{ flex: 1, minWidth: '160px', padding: '1.5rem 1rem', background: '#d97706', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px' }}
              >
                <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>Cargar Proyecto</span>
                <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>(.AMC)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
