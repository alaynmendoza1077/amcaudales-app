import React, {useState, useEffect, useRef, useMemo} from 'react';
import * as XLSX from 'xlsx';
import {TH} from '../ui';
import {MATERIALS, VIA_TYPES} from '../constants';
import {formatDiam} from '../engine';

function DatTab(props){
  var T=props.T,sT=props.sT,onFL=props.onFL,selMap=props.selMap,P=props.P||{},setP=props.setP;
  var [filterRep, setFilterRep] = useState("");
  var filterSel = props.filterSel, setFilterSel = props.setFilterSel;

  var ref=useRef(null);
  var hf=function(e){
    var f=e.target.files[0];
    if(!f)return;
    if(T && T.length>0){
      var ok=window.confirm("Hay datos cargados. Se perderán los datos no guardados.\n\nPresione Aceptar para continuar o Cancelar para guardar primero.");
      if(!ok){ e.target.value=""; return; }
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(function() {
          f.arrayBuffer().then(function(buf){onFL(new Uint8Array(buf));});
        }, 10);
      });
    });
  };
  var upd=function(i,k,v){sT(function(oldT){var n=oldT.slice();n[i]=Object.assign({},n[i]);n[i][k]=v;return n;});};
  var updSmart=function(i,k,vStr){
    sT(function(oldT){
      var n=oldT.slice();var t=Object.assign({},n[i]);
      if(k==="cotaFondoDE"){t.cotaFondo=vStr;t.cotaFondoDE=vStr;}else{t[k]=vStr;}
      var L=parseFloat(k==="longitud"?vStr:t.longitud);
      var P=parseFloat(k==="pendiente"?vStr:t.pendiente);
      var cfA=parseFloat(k==="cotaFondoA"?vStr:t.cotaFondoA);
      var cfDE=parseFloat(k==="cotaFondoDE"?vStr:(t.cotaFondoDE!=null&&t.cotaFondoDE!==""?t.cotaFondoDE:t.cotaFondo));
      if((k==="pendiente"||k==="cotaFondoDE")&&!isNaN(P)&&!isNaN(cfDE)&&!isNaN(L)&&L>0) t.cotaFondoA=(cfDE-L*(P/100)).toFixed(3);
      else if((k==="cotaFondoA"||k==="longitud")&&!isNaN(cfA)&&!isNaN(cfDE)&&!isNaN(L)&&L>0) t.pendiente=(((cfDE-cfA)/L)*100).toFixed(4);
      n[i]=t;return n;
    });
  };
  var addRow=function(){var n=T.slice();n.push({id:T.length+1,de:"",a:"",longitud:0,pendiente:0,cotaRasante:0,cotaRasanteA:0,cotaFondo:0,cotaFondoDE:0,cotaFondoA:null,diametroCom:"200 mm",diamOrig:"200 mm",material:"PVC",esInicial:"N",areaParcial:0,tipoArea:"RESIDENCIAL",coefEscorrentia:.75,densidad:600,consumo:140,nManning:0,reponer:"S",tipoVia:"FX",anchoVia:"N",pozoNuevo:"N",tipoPozo:"M"});sT(n);};
  var delRow=function(i){if(T.length<=1)return;var n=T.slice();n.splice(i,1);sT(n);};
  
  var bulkUpdate = function(key, val) {
    if(!val) return;
    var n = T.slice();
    for(var i=0; i<n.length; i++){
      n[i] = Object.assign({}, n[i]);
      n[i][key] = val;
    }
    sT(n);
  };

  var refActualizarAreas = useRef(null);
  const handleActualizarAreasGeoJSON = async (e) => {
      let f = e.target.files[0];
      if(!f) return;
      let isVias = window.confirm("¿Esta capa corresponde a ÁREAS DE VÍAS?\n\n[Aceptar] = Es capa de Vías\n[Cancelar] = Es capa de Áreas Tributarias normales");
      
      const reader = new FileReader();
      reader.onload = (ev) => {
          try {
              let text = ev.target.result.trim();
              let data = JSON.parse(text);
              let features = data.features || [];
              if(features.length === 0) { alert("El archivo no tiene polígonos."); return; }
              
              let newT = T.slice();
              let countActualizados = 0;
              let noEncontrados = 0;
              
              features.forEach(feat => {
                  let props = feat.properties || {};
                  
                  let possibleIds = [
                      props.IDNODO, props.IdNodo, props.TRAMO, props.DE, props.de, props.Nombre, props.IDCUENCA, props.ID, props.id
                  ].map(s => String(s || "").trim().toLowerCase()).filter(s => s !== "");
                  
                  // Also add versions without "_via" suffix in case the name has it
                  let withoutVia = possibleIds.map(s => s.replace("_via", "")).filter(s => s !== "");
                  possibleIds = [...possibleIds, ...withoutVia];

                  let areaVal = parseFloat(props.AREACUENCA || props.AREA_HA || props.Area || props.area || 0);
                  
                  if(possibleIds.length > 0 && areaVal > 0) {
                      let idx = newT.findIndex(t => {
                          let tDe = String(t.de).trim().toLowerCase();
                          let tId = String(t.id).trim().toLowerCase();
                          return possibleIds.includes(tDe) || possibleIds.includes(tId);
                      });
                      
                      if (idx >= 0) {
                          newT[idx] = Object.assign({}, newT[idx]);
                          if (isVias) {
                              newT[idx].aV_prop = areaVal;
                              newT[idx].tipoArea = "VIA"; // Set dropdown to VIA
                          } else {
                              newT[idx].areaParcial = areaVal;
                              if (!newT[idx].tipoArea || newT[idx].tipoArea === "VIA") {
                                  newT[idx].tipoArea = "RESIDENCIAL";
                              }
                          }
                          countActualizados++;
                      } else {
                          noEncontrados++;
                      }
                  }
              });
              let areaRes = 0;
              newT.forEach(t => {
                  if (t.tipoArea !== "VIA" && t.tipoArea !== "VIAS") {
                      areaRes += (parseFloat(t.areaParcial) || 0);
                  }
              });

              let debugInfo = features.slice(0, 3).map(f => {
                  let p = f.properties || {};
                  return `GeoJSON: IDNODO=${p.IDNODO}, IDCUENCA=${p.IDCUENCA}`;
              }).join(" | ");
              
              let tableInfo = T.slice(0, 3).map(t => `Tabla: DE=${t.de}`).join(" | ");
              
              sT(newT);
              alert(`Resultados del Cruce:\nActualizados: ${countActualizados}\nNo Encontrados: ${noEncontrados}\n\nEjemplos Archivo:\n${debugInfo}\n\nEjemplos Tabla:\n${tableInfo}`);
          } catch(err) {
              alert("Error leyendo GeoJSON: " + err.message);
          }
      };
      reader.readAsText(f);
      e.target.value = "";
  };

  var dlTemplate=function(){
    var wb = XLSX.utils.book_new();

    // AreaDrenaje
    var wsAreaData = [
      ['fid', 'id', 'DE', 'AREACUENCA', 'TIPOCUENCA', 'CESC', 'DENSIDAD', 'CONSUMO', 'LONGCUENCA', 'IDESTACION', 'IDNODO', 'Nombre'],
      [1, 1, 'C1', 0.5, 'RESIDENCIAL', 0.75, 600, 140, 50, 'BUC', 'PZ1', 'C1']
    ];
    var wsArea = XLSX.utils.aoa_to_sheet(wsAreaData);
    XLSX.utils.book_append_sheet(wb, wsArea, "AreaDrenaje");

    // Vertices
    var wsVertData = [
      ['fid', 'id', 'DE', 'AREACUENCA', 'TIPOCUENCA', 'CESC', 'DENSIDAD', 'CONSUMO', 'LONGCUENCA', 'IDESTACION', 'IDNODO', 'Nombre', 'CoordX', 'CoordY'],
      [1, 1, 'C1', 0.5, 'RESIDENCIAL', 0.75, 600, 140, 50, 'BUC', 'PZ1', 'C1', 1100000, 1200000],
      [2, 2, 'C1', 0.5, 'RESIDENCIAL', 0.75, 600, 140, 50, 'BUC', 'PZ1', 'C1', 1100050, 1200000],
      [3, 3, 'C1', 0.5, 'RESIDENCIAL', 0.75, 600, 140, 50, 'BUC', 'PZ1', 'C1', 1100050, 1200050]
    ];
    var wsVert = XLSX.utils.aoa_to_sheet(wsVertData);
    XLSX.utils.book_append_sheet(wb, wsVert, "Vertices");

    // Walcan_Pozos_Ordenado
    var wsPozosData = [
      ['id', 'IdNodo', 'IDfinal', 'Nombre', 'CoordX', 'CoordY', 'Ctapa', 'Cfondo', 'Profundidad_C', 'TipoEstruc'],
      [1, 'PZ1', 'PZ1', 'PZ1', 1100000, 1200000, 900, 898.5, 1.5, 'UNION'],
      [2, 'PZ2', 'PZ2', 'PZ2', 1100050, 1200000, 899, 897.5, 1.5, 'OUTFALL']
    ];
    var wsPozos = XLSX.utils.aoa_to_sheet(wsPozosData);
    XLSX.utils.book_append_sheet(wb, wsPozos, "Walcan_Pozos_Ordenado");

    // Walcan_Tramos_Ordenado
    var wsTramosData = [
      ['id', 'id_1', 'DE', 'A', 'DE1', 'A1', 'ESTADO', 'PSALIDA', 'LONGITUD', 'PENDIENTE', 'CINI', 'CFIN', 'diametro', 'MATERIAL', 'LONGITUD_C', 'PENDIENTE_C', 'CRas1', 'CRas2', 'PInicial'],
      [1, 1, 'PZ1', 'PZ2', 'PZ1', 'PZ2', 'ACTIVO', 'S', 50, 2.0, 898.5, 897.5, 200, 'PVC', 50, 2.0, 900, 899, 1]
    ];
    var wsTramos = XLSX.utils.aoa_to_sheet(wsTramosData);
    XLSX.utils.book_append_sheet(wb, wsTramos, "Walcan_Tramos_Ordenado");

    XLSX.writeFile(wb, "Plantilla_AMCaudales.xlsx");
  };

  return <div>
    <div className="c">
      <div className="ct">Cargar Archivo</div>
      <div style={{display:"flex",gap:8,alignItems:"center", flexWrap:"wrap"}}>
        <div className="uz" style={{flex:1,padding:12, minWidth:200}} onClick={function(){if(ref.current)ref.current.click();}}>
          <div style={{fontSize:14,fontWeight:600,color:"#00A6D6"}}>XLSM/XLSX</div>
          <input ref={ref} type="file" accept=".xlsm,.xlsx,.amc" style={{display:"none"}} onChange={hf}/>
        </div>
        <button className="btn" onClick={dlTemplate} style={{fontSize:12, background:'linear-gradient(to right, #10b981, #059669)', color:'white'}}>
          📥 Descargar Plantilla
        </button>
        <button className="btn" onClick={addRow} style={{fontSize:12}}>+ Fila</button>
        <button className="btn" onClick={() => { if(refActualizarAreas.current) refActualizarAreas.current.click(); }} style={{fontSize:12, background:'linear-gradient(to right, #eab308, #ca8a04)', color:'white'}} title="Permite inyectar áreas a tramos existentes desde un GeoJSON (lee IDCUENCA o TRAMO y AREACUENCA o AREA_HA)">
          🪄 Actualizar Áreas (GeoJSON)
        </button>
        <input ref={refActualizarAreas} type="file" accept=".geojson,.json" style={{display:"none"}} onChange={handleActualizarAreasGeoJSON}/>
      </div>
      {T.length>0?<div style={{marginTop:6,fontSize:12,color:"#28A745"}}>OK {T.length} tramos</div>:null}
    </div>
    
    {T.length>0?
      <div style={{display:"flex", gap:15, padding:"10px 15px", background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8, marginBottom:10, alignItems:"center"}}>
        <span style={{fontSize:12, fontWeight:"bold", color:"#475569"}}>Filtros Visuales:</span>
        <label style={{fontSize:12, display:"flex", alignItems:"center", gap:5, cursor:"pointer"}}>
          <input type="checkbox" checked={filterSel} onChange={function(e){setFilterSel(e.target.checked);}} />
          Mostrar solo seleccionados en mapa
        </label>
        <label style={{fontSize:12, display:"flex", alignItems:"center", gap:5}}>
          Reponer:
          <select value={filterRep} onChange={function(e){setFilterRep(e.target.value);}} style={{fontSize:11, padding:2, borderRadius:4}}>
            <option value="">Todos</option>
            <option value="S">Sí (S)</option>
            <option value="N">No (N)</option>
          </select>
        </label>
      </div>
    :null}

    {T.length>0?<div className="c"><div className="ct">Datos ({T.length} tramos) <span style={{marginLeft:15, fontSize:12, background:'#003B73', color:'white', padding:'2px 8px', borderRadius:10}}>Estación de Cálculo: {P.estacion||"BUC"}</span></div><div style={{overflow:"auto",maxHeight:"60vh"}}><table><thead><tr>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>#</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>DE</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>A</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>L(m)</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>P(%)</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>C.RasDe</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>C.RasA</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>C.FonDE</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>C.FonA</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>Area</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)", color:"#cbd5e1"}} title="Área exclusiva de vías">A.Via</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>Dens</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>Cons</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>Tipo</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>I/N</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>Diam</TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>Mat</TH>
      <TH className="gh" style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>
        <div style={{marginBottom:4, color:"#fbbf24", cursor:"help", borderBottom:"1px dashed #ffffff99", display:"inline-block"}} title="Reposición Masiva: Sobrescribir todos los valores de reposición.">Masivo Rep</div>
        <select value="" style={{fontSize:10, padding:1, width:40, background:'#1e293b', color:'#fbbf24', border:'1px solid #fbbf24', cursor:"pointer"}} onChange={function(e){ bulkUpdate("reponer", e.target.value); }}>
          <option value="">-</option><option value="S">S</option><option value="N">N</option>
        </select>
      </TH>
      <TH className="gh" style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>
        <div style={{marginBottom:4, cursor:"help", borderBottom:"1px dashed #ffffff99", display:"inline-block"}} title="Tipo de Vía: Asfalto(FX), Concreto(RG), Placa Huella(PP), etc.">Via</div>
        <select value="" style={{fontSize:10, padding:1, width:40, background:'#1e293b', color:'white', border:'1px solid #334155'}} onChange={function(e){ bulkUpdate("tipoVia", e.target.value); }}>
          <option value="">-</option>{VIA_TYPES.map(function(v){return <option key={v} value={v}>{v}</option>;})}
        </select>
      </TH>
      <TH className="gh" style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>
        <div style={{marginBottom:4, cursor:"help", borderBottom:"1px dashed #ffffff99", display:"inline-block"}} title="Ancho de Vía: Indica si afecta el ancho total de la vía (S/N).">AncV</div>
        <select value="" style={{fontSize:10, padding:1, width:40, background:'#1e293b', color:'white', border:'1px solid #334155'}} onChange={function(e){ bulkUpdate("anchoVia", e.target.value); }}>
          <option value="">-</option><option value="S">S</option><option value="N">N</option>
        </select>
      </TH>
      <TH className="gh" style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>
        <div style={{marginBottom:4, cursor:"help", borderBottom:"1px dashed #ffffff99", display:"inline-block"}} title="Número/Nombre de Pozo.">PzN</div>
        <select value="" style={{fontSize:10, padding:1, width:40, background:'#1e293b', color:'white', border:'1px solid #334155'}} onChange={function(e){ bulkUpdate("pozoNuevo", e.target.value); }}>
          <option value="">-</option><option value="S">S</option><option value="N">N</option>
        </select>
      </TH>
      <TH className="gh" style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>
        <div style={{marginBottom:4, cursor:"help", borderBottom:"1px dashed #ffffff99", display:"inline-block"}} title="Tipo de Pozo: Mampostería (M) o Concreto (C).">TpPz</div>
        <select value="" style={{fontSize:10, padding:1, width:40, background:'#1e293b', color:'white', border:'1px solid #334155'}} onChange={function(e){ bulkUpdate("tipoPozo", e.target.value); }}>
          <option value="">-</option><option value="M">M</option><option value="C">C</option>
        </select>
      </TH>

      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}></TH>
      <TH style={{position:"sticky", top:0, zIndex:20, background:"rgba(15, 23, 42, 1)"}}>Validaciones</TH>
    </tr></thead><tbody>{T.map(function(t,i){
      var h=selMap&&selMap.some(function(sm){return sm&&String(sm.de).trim().toLowerCase()===String(t.de).trim().toLowerCase()&&String(sm.a).trim().toLowerCase()===String(t.a).trim().toLowerCase();});
      if(filterSel && !h) return null;
      if(filterRep && t.reponer !== filterRep) return null;
      
      var warns=[];
      if(parseFloat(t.pendiente)<0)warns.push("Contra pendiente");
      var nextT=T.find(function(nt){return nt.de===t.a;});
      if(nextT){
        var nCfDE=parseFloat(nextT.cotaFondoDE!=null&&nextT.cotaFondoDE!==""?nextT.cotaFondoDE:nextT.cotaFondo);
        var tCfA=parseFloat(t.cotaFondoA);
        if(!isNaN(nCfDE)&&!isNaN(tCfA)&&nCfDE>tCfA)warns.push("Pozo "+t.a+": C.Fon.Salida > C.Fon.Llegada");
      }
      return <tr key={i} className={h?"hl-row":""}><td>{i+1}</td>
      <td><input className="ec" type="text" value={t.de||""} onChange={function(e){upd(i,"de",e.target.value);}} style={{width:65,fontSize:11,padding:2}}/></td>
      <td><input className="ec" type="text" value={t.a||""} onChange={function(e){upd(i,"a",e.target.value);}} style={{width:65,fontSize:11,padding:2}}/></td>
      <td><input className="ec" type="text" value={t.longitud||""} onChange={function(e){updSmart(i,"longitud",e.target.value.replace(",","."));}} style={{width:45,fontSize:11,padding:2}}/></td>
      <td><input className="ec" type="text" value={t.pendiente||""} onChange={function(e){updSmart(i,"pendiente",e.target.value.replace(",","."));}} style={{width:40,fontSize:11,padding:2}}/></td>
      <td><input className="ec" type="text" value={t.cotaRasante||""} onChange={function(e){upd(i,"cotaRasante",e.target.value.replace(",","."));}} style={{width:55,fontSize:11,padding:2}}/></td>
      <td><input className="ec" type="text" value={t.cotaRasanteA||""} onChange={function(e){upd(i,"cotaRasanteA",e.target.value.replace(",","."));}} style={{width:55,fontSize:11,padding:2}}/></td>
      <td><input className="ec" type="text" value={t.cotaFondoDE != null && t.cotaFondoDE !== "" ? t.cotaFondoDE : (t.cotaFondo || "")} onChange={function(e){updSmart(i,"cotaFondoDE",e.target.value.replace(",","."));}} style={{width:55,fontSize:11,padding:2}}/></td>
      <td><input className="ec" type="text" value={t.cotaFondoA != null && t.cotaFondoA !== "" ? t.cotaFondoA : (t.cfA != null && t.cfA !== "" ? t.cfA : (t.cotaFondoA || ""))} onChange={function(e){updSmart(i,"cotaFondoA",e.target.value.replace(",","."));}} style={{width:55,fontSize:11,padding:2}}/></td>
      <td><input className="ec" type="text" value={t.areaParcial||""} onChange={function(e){upd(i,"areaParcial",e.target.value.replace(",","."));}} style={{width:45,fontSize:11,padding:2}}/></td>
      <td><input className="ec" type="text" value={t.aV_prop||""} onChange={function(e){upd(i,"aV_prop",e.target.value.replace(",","."));}} style={{width:45,fontSize:11,padding:2, background:"#f1f5f9"}}/></td>
      <td><input className="ec" type="text" value={t.densidad||""} onChange={function(e){upd(i,"densidad",e.target.value.replace(",","."));}} style={{width:45,fontSize:11,padding:2}}/></td>
      <td><input className="ec" type="text" value={t.consumo||""} onChange={function(e){upd(i,"consumo",e.target.value.replace(",","."));}} style={{width:45,fontSize:11,padding:2}}/></td>
      <td><select className="es" value={t.tipoArea||"RESIDENCIAL"} onChange={function(e){upd(i,"tipoArea",e.target.value);}} style={{width:90}}><option>RESIDENCIAL</option><option>COMERCIAL</option><option>INDUSTRIAL</option><option>INSTITUCIONAL</option><option>VIA</option><option>RECREACIONAL</option></select></td>
      <td><select className="es" value={t.esInicial||"N"} onChange={function(e){upd(i,"esInicial",e.target.value);}}><option>I</option><option>N</option></select></td>
      <td><input className="ec" type="text" value={t.diamOrig||t.diametroCom||"200 mm"} onChange={function(e){
          var v = e.target.value;
          upd(i,"diamOrig",v);
          var newCom = formatDiam(v, t.matOrig||t.material||"PVC");
          upd(i,"diametroCom",newCom);
        }} style={{width:52,fontSize:11,padding:2}}/></td>
      <td><select className="es" value={t.matOrig||t.material||"PVC"} onChange={function(e){
          var v = e.target.value;
          upd(i,"matOrig",v);
          upd(i,"material",v);
          var newCom = formatDiam(t.diamOrig||t.diametroCom||"200 mm", v);
          upd(i,"diametroCom",newCom);
        }}>{MATERIALS.map(function(m){return <option key={m}>{m}</option>;})}</select></td>
      <td><select className="es" value={t.reponer||"S"} onChange={function(e){upd(i,"reponer",e.target.value);}}><option>S</option><option>N</option></select></td>
      <td><select className="es" value={t.tipoVia||"FX"} onChange={function(e){upd(i,"tipoVia",e.target.value);}}>{VIA_TYPES.map(function(v){return <option key={v}>{v}</option>;})}</select></td>
      <td><select className="es" value={t.anchoVia||"N"} onChange={function(e){upd(i,"anchoVia",e.target.value);}}><option>S</option><option>N</option></select></td>
      <td><select className="es" value={t.pozoNuevo||"N"} onChange={function(e){upd(i,"pozoNuevo",e.target.value);}}><option>N</option><option>S</option></select></td>
      <td><select className="es" value={t.tipoPozo||"M"} onChange={function(e){upd(i,"tipoPozo",e.target.value);}}><option value="M">M</option><option value="C">C</option></select></td>

      <td><button onClick={function(){delRow(i);}} style={{background:"none",border:"none",color:"#DC3545",cursor:"pointer",fontSize:14}}>x</button></td>
      <td style={{color:"#FF4444",fontWeight:600,fontSize:11}}>{warns.join(" | ")}</td>
    </tr>;})}</tbody></table></div></div>:null}
  </div>;
}


export default DatTab;
