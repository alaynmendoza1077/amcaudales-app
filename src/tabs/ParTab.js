import React, {useState, useEffect, useRef} from 'react';
import {EF as EF_Orig, K, TH} from '../ui';
import {IDF, VIA_TYPES} from '../constants';

function EF(p){
  var isT=p.t==="text";var isS=p.t==="select";var isPct=p.t==="pct";var isTg=p.t==="toggle";
  var P = p.P, u = p.u, uGroup = p.uGroup;

  const [val, setVal] = useState(P[p.k] !== undefined ? P[p.k] : (p.def !== undefined ? p.def : ""));

  useEffect(() => {
    setVal(P[p.k] !== undefined ? P[p.k] : (p.def !== undefined ? p.def : ""));
  }, [P, p.k, p.def]);

  if(isTg)return <div className="f" style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.02)",padding:"6px 10px",borderRadius:6}}><label style={{marginBottom:0,cursor:"pointer"}} onClick={function(){u(p.k, P[p.k]==="S"?"N":"S");}}>{p.l}</label><div style={{width:36,height:20,background:P[p.k]==="S"?"#00A6D6":"rgba(255,255,255,0.1)",borderRadius:10,position:"relative",cursor:"pointer",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.3)"}} onClick={function(){u(p.k, P[p.k]==="S"?"N":"S");}}><div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:2,left:P[p.k]==="S"?18:2,transition:"all 0.2s"}}/></div></div>;
  if(isS)return <div className="f" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><label style={{marginBottom:0}}>{p.l}</label><select className="ec" style={{width:120,textAlign:"right"}} value={P[p.k]||""} onChange={function(e){u(p.k,e.target.value);}}>{p.opts.map(function(o){return <option key={o.v} value={o.v}>{o.l}</option>;})}</select></div>;
  if(isPct)return <div className="f" style={{display:"flex",flexDirection:"column",gap:6,background:"rgba(255,255,255,0.02)",padding:"6px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.03)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><label style={{marginBottom:0}}>{p.l}</label><div style={{display:"flex",alignItems:"center"}}><input className="ec" style={{width:45,padding:2,textAlign:"right",fontSize:12,background:"transparent",border:"none",color:"#00A6D6",fontWeight:700,boxShadow:"none"}} type="number" value={val!==undefined?Math.round(val*100):""} onChange={function(e){setVal(+e.target.value/100);}} onBlur={function(e){var v=Math.min(1,Math.max(0,+e.target.value/100));if(p.group)uGroup(p.group,p.k,v);else u(p.k,v);}}/><span style={{color:"#7088A8",fontSize:11,marginLeft:2}}>%</span></div></div><input type="range" min="0" max="100" value={P[p.k]!==undefined?Math.round(P[p.k]*100):0} onChange={function(e){var v=+e.target.value/100;if(p.group)uGroup(p.group,p.k,v);else u(p.k,v);}} style={{width:"100%",cursor:"pointer",accentColor:"#00A6D6",height:4}}/></div>;
  if(isT)return <div className="f" style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}><label style={{marginBottom:6}}>{p.l}</label><input className="ec" style={{textAlign:"left",textTransform:"uppercase"}} type="text" value={val||""} onChange={function(e){setVal(e.target.value.toUpperCase());}} onBlur={function(e){u(p.k,e.target.value.toUpperCase());}}/></div>;
  
  return (
    <div className="f" style={{display:"flex",flexDirection:"column",gap:6, background: p.desc ? "rgba(255,255,255,0.02)" : "transparent", padding: p.desc ? "8px 12px" : "0", borderRadius: 8}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <label style={{marginBottom:0, fontWeight: p.desc ? 600 : "normal", color: p.desc ? "#fff" : "inherit"}}>{p.l}</label>
        <input className="ec" style={{width:90,textAlign:"right"}} type="text" value={val} onChange={function(e){setVal(e.target.value.replace(/,/g,"."));}} onBlur={function(e){var v=e.target.value.replace(/,/g,".");if(v!=="") u(p.k,parseFloat(v)||0); else u(p.k, 0);}}/>
      </div>
      {p.desc && <div style={{fontSize:11, color:"#8ea1b8", lineHeight:1.4, textAlign:"left"}}>{p.desc}</div>}
    </div>
  );
}

function getConsumoFromAltura(alt) {
  var a = parseFloat(alt) || 0;
  if (a > 2000) return 120;
  if (a >= 1000) return 130;
  return 140;
}

function ParTab(props){
  var P=props.P,sP=props.sP,R=props.R;
  var u=function(k,v){sP(function(p){
      var n={};for(var key in p)n[key]=p[key];
      n[k]=v;
      if (k === "tipoAlc") {
          if (v === "S") {
              n.fuerzaTractMin = 1.0;
              n.porcProfundidad = 0.85;
          } else {
              n.fuerzaTractMin = 1.5;
              n.porcProfundidad = 0.93;
          }
      }
      if (k === "alturaSNM") {
          n.consumo = getConsumoFromAltura(v);
      }
      return n;
  });};

  useEffect(() => {
    var tramos = (R && R.length > 0) ? R : (props.T || []);
    if (tramos && tramos.length > 0) {
      var maxRas = 0;
      tramos.forEach(function(r) {
        if (!r || r.sep) return;
        var crDE = parseFloat(r.cotaRasante !== undefined ? r.cotaRasante : (r.crDE || r.cotaRasanteDE || r.cota_terreno || 0));
        var crA = parseFloat(r.cotaRasanteA !== undefined ? r.cotaRasanteA : (r.crA || r.cota_terreno || 0));
        if (!isNaN(crDE) && crDE > maxRas) maxRas = crDE;
        if (!isNaN(crA) && crA > maxRas) maxRas = crA;
      });
      if (maxRas > 0) {
        var altCalc = Math.round(maxRas);
        var consCalc = getConsumoFromAltura(altCalc);
        sP(function(prev) {
          if (prev.alturaSNM === altCalc && prev.consumo === consCalc) return prev;
          return Object.assign({}, prev, { alturaSNM: altCalc, consumo: consCalc });
        });
      }
    }
  }, [R, props.T, sP]);

  var uGroup=function(keys,k,v){sP(function(p){
    var n=Object.assign({},p);var diff=v-(p[k]||0);n[k]=v;
    var others=keys.filter(function(x){return x!==k;});
    var sumO=others.reduce(function(s,x){return s+(p[x]||0);},0);
    if(sumO===0){others.forEach(function(x){n[x]=Math.max(0,(1-v)/others.length);});}
    else{others.forEach(function(x){var prop=(p[x]||0)/sumO;n[x]=Math.max(0,(p[x]||0)-diff*prop);});}
    var tot=keys.reduce(function(s,x){return s+(n[x]||0);},0);
    if(Math.abs(tot-1)>0.001&&others.length>0)n[others[0]]+=(1-tot);
    return n;
  });};

  var dR=R?R.filter(function(r){return !r.sep;}):[];
  var dN=dR.filter(function(r){return r.reponer==="S";});
  var lt=dN.reduce(function(s,r){return s+(r.L||0);},0);
  var nSet={};dN.forEach(function(r){nSet[r.de]=1;nSet[r.a]=1;});
  var nP=Object.keys(nSet).length;

  var uCnMatrix = function(tipo, grupo, val) {
    sP(function(p) {
        var n = Object.assign({}, p);
        if(!n.cnMatrix) n.cnMatrix = JSON.parse(JSON.stringify(DP.cnMatrix));
        n.cnMatrix[tipo] = Object.assign({}, n.cnMatrix[tipo]);
        n.cnMatrix[tipo][grupo] = parseFloat(val) || 0;
        return n;
    });
  };
  var cnMatrix = P.cnMatrix || DP.cnMatrix;

  return <div>
    <div className="c" style={{borderTop:"3px solid #D4A843",padding:"10px 14px",marginBottom:10}}>
      <div style={{textAlign:"center",fontSize:16,fontWeight:700,color:"#00A6D6",marginBottom:4}}>DATOS INICIALES</div>
      <div className="g2">
        <EF P={P} u={u} uGroup={uGroup} k="proyecto" l="Proyecto" t="text"/><EF P={P} u={u} uGroup={uGroup} k="municipio" l="Municipio" t="text"/>
        <EF P={P} u={u} uGroup={uGroup} k="barrio" l="Barrio" t="text"/><EF P={P} u={u} uGroup={uGroup} k="disenador" l="Disenador" t="text"/>
        <EF P={P} u={u} uGroup={uGroup} k="cedula" l="Cedula" t="text"/><EF P={P} u={u} uGroup={uGroup} k="fecha" l="Fecha" t="text"/>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:12,marginBottom:12}}>
      <div className="dp"><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>Parámetros de Entrada</div>
        <EF P={P} u={u} uGroup={uGroup} k="tipoAlc" l="Tipo Alcantarillado" t="select" opts={[{v:"S",l:"Sanitario"},{v:"P",l:"Pluvial"},{v:"C",l:"Combinado"},{v:"SC",l:"Semi-Combinado"}]}/>
        <EF P={P} u={u} uGroup={uGroup} k="porcPatios" l="% Patios (solo SC)" /><EF P={P} u={u} uGroup={uGroup} k="estacion" l="Estación IDF" t="select" opts={Object.keys(IDF).map(function(k){return{v:k,l:IDF[k].name};})}/>
        <EF P={P} u={u} uGroup={uGroup} k="densidad" l="Densidad (hab/ha)"/><EF P={P} u={u} uGroup={uGroup} k="habVivienda" l="Hab/Vivienda"/>
        <EF P={P} u={u} uGroup={uGroup} k="pobDirecta" l="Pob.Directa"/>
        <EF P={P} u={u} uGroup={uGroup} k="pobIndirecta" l="Pob. Indirecta" />
        <EF P={P} u={u} uGroup={uGroup} k="consumo" l="Consumo (L/hab/d)"/><EF P={P} u={u} uGroup={uGroup} k="coefRetorno" l="Coef. Retorno"/>
        <EF P={P} u={u} uGroup={uGroup} k="alturaSNM" l="Altura SNM (m)"/>
      </div>
      <div className="dp"><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>Coeficientes de Escorrentía</div>
        <div className="g2">
          <EF P={P} u={u} uGroup={uGroup} k="coef_aR" l="Residencial" def={0.8}/>
          <EF P={P} u={u} uGroup={uGroup} k="coef_aC" l="Comercial" def={0.9}/>
          <EF P={P} u={u} uGroup={uGroup} k="coef_aI" l="Industrial" def={0.6}/>
          <EF P={P} u={u} uGroup={uGroup} k="coef_aIn" l="Institucional" def={0.6}/>
          <EF P={P} u={u} uGroup={uGroup} k="coef_aV" l="Vias" def={0.9}/>
          <EF P={P} u={u} uGroup={uGroup} k="coef_aRe" l="Recreacional" def={0.3}/>
        </div>
      </div>
      <div className="dp"><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>Parámetros Hidráulicos</div>
        <div className="g2">
          <EF P={P} u={u} uGroup={uGroup} k="relCapacidad" l="Q/Qo Max"/><EF P={P} u={u} uGroup={uGroup} k="porcProfundidad" l="Y/Do Max"/>
          <EF P={P} u={u} uGroup={uGroup} k="velMaxima" l="Vel. Máxima (m/s)"/><EF P={P} u={u} uGroup={uGroup} k="fuerzaTractMin" l="Ft Min (Pa)"/>
          <EF P={P} u={u} uGroup={uGroup} k="limFroudeSub" l="Froude Sub"/><EF P={P} u={u} uGroup={uGroup} k="limFroudeSup" l="Froude Sup"/>
          <EF P={P} u={u} uGroup={uGroup} k="profMin" l="Prof.Min (m)"/><EF P={P} u={u} uGroup={uGroup} k="profMax" l="Prof.Max (m)"/>
        </div>
      </div>
    </div>
    
    <div style={{background:"rgba(255,255,255,0.02)",padding:12,borderRadius:8,marginBottom:12,border:"1px solid rgba(255,255,255,0.05)"}}>
      <div className="dpt" style={{background:"linear-gradient(90deg, #D4A843 0%, transparent 100%)", color:"#fff", marginBottom:12}}>Parámetros de Infiltración y Suelos (SWMM)</div>
      <div style={{display:"flex", alignItems:"center", gap:15, marginBottom:15}}>
          <label style={{margin:0, fontWeight:"bold", color:"#00A6D6"}}>Grupo de Suelo Predominante (Por Defecto):</label>
          <select className="ec" style={{width:100, textAlign:"center", fontSize:14}} value={P.grupoSueloDefecto || "B"} onChange={(e) => u("grupoSueloDefecto", e.target.value)}>
              <option value="A">Grupo A</option>
              <option value="B">Grupo B</option>
              <option value="C">Grupo C</option>
              <option value="D">Grupo D</option>
          </select>
          <span style={{fontSize:12, color:"#7088A8"}}>* Se usará si no se carga un GeoJSON de Suelos o si el polígono no tiene un grupo asignado.</span>
      </div>
      <div>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-end", marginBottom:8}}>
            <label style={{margin:0, fontSize:13, color:"#ddd"}}>Matriz de Curva Número (CN) por Tipo de Área y Grupo de Suelo:</label>
            <div style={{fontSize:11, color:"#94a3b8", background:"rgba(0,0,0,0.2)", padding:"4px 8px", borderRadius:4, border:"1px solid rgba(255,255,255,0.05)"}}>
                <span style={{color:"#00A6D6", fontWeight:"bold"}}>A:</span> Arenas (Alta Infiltración) &nbsp;&nbsp;|&nbsp;&nbsp; 
                <span style={{color:"#00A6D6", fontWeight:"bold"}}>B:</span> Francos (Infiltración Moderada) &nbsp;&nbsp;|&nbsp;&nbsp; 
                <span style={{color:"#00A6D6", fontWeight:"bold"}}>C:</span> Franco Arcillosos (Baja Infiltración) &nbsp;&nbsp;|&nbsp;&nbsp; 
                <span style={{color:"#00A6D6", fontWeight:"bold"}}>D:</span> Arcillas (Muy Baja Infiltración)
            </div>
        </div>
        <div style={{overflowX:"auto"}}>
            <table style={{width:"100%", borderCollapse:"collapse", fontSize:12, textAlign:"center"}}>
                <thead>
                    <tr style={{background:"rgba(0,166,214,0.1)", color:"#00A6D6"}}>
                        <TH style={{padding:8, border:"1px solid rgba(255,255,255,0.1)", textAlign:"left"}}>Tipo de Área (TIPOCUENCA)</TH>
                        <TH style={{padding:8, border:"1px solid rgba(255,255,255,0.1)"}}>Grupo A</TH>
                        <TH style={{padding:8, border:"1px solid rgba(255,255,255,0.1)"}}>Grupo B</TH>
                        <TH style={{padding:8, border:"1px solid rgba(255,255,255,0.1)"}}>Grupo C</TH>
                        <TH style={{padding:8, border:"1px solid rgba(255,255,255,0.1)"}}>Grupo D</TH>
                    </tr>
                </thead>
                <tbody>
                    {Object.keys(cnMatrix).map((tipo, idx) => (
                        <tr key={tipo} style={{background: idx % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent"}}>
                            <td style={{padding:6, border:"1px solid rgba(255,255,255,0.05)", textAlign:"left", fontWeight:"bold"}}>{tipo}</td>
                            {["A", "B", "C", "D"].map(grupo => (
                                <td key={grupo} style={{padding:6, border:"1px solid rgba(255,255,255,0.05)"}}>
                                    <input 
                                        type="number" 
                                        className="ec" 
                                        style={{width:50, textAlign:"center", padding:"2px 4px", fontSize:12, background:"rgba(0,0,0,0.2)", border:"1px solid rgba(255,255,255,0.1)"}} 
                                        value={cnMatrix[tipo][grupo]} 
                                        onChange={(e) => uCnMatrix(tipo, grupo, e.target.value)}
                                        step="0.1"
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>
      <div className="dp" style={{marginTop:15}}><div className="dpt" style={{background:"linear-gradient(90deg, #D4A843 0%, transparent 100%)", color:"#fff"}}>Parámetros de Subcuencas (SWMM) por Defecto</div>
        <div className="g2">
          <EF P={P} u={u} k="swmm_width" l="Ancho" def={50} desc="Ancho característico del flujo superficial (m) o longitud de la subcuenca dividida por la longitud del cauce principal."/>
          <EF P={P} u={u} k="swmm_slope" l="Pendiente (%)" def={0.5} desc="Pendiente promedio del terreno (%) de la subcuenca."/>
          <EF P={P} u={u} k="swmm_imperv" l="Área impermeable (%)" def={65} desc="Porcentaje del área total de la subcuenca que es impermeable y está conectada directamente al sistema de drenaje."/>
          <EF P={P} u={u} k="swmm_zero_imperv" l="(%) Area Imp. sin Alm.Dep." def={25} desc="Porcentaje del área impermeable que NO tiene almacenamiento en depresión (escorrentía inmediata)."/>
          <EF P={P} u={u} k="swmm_n_imperv" l="Coef. n (Impermeable)" def={0.013} desc="Coeficiente de rugosidad de Manning para la escorrentía sobre las porciones impermeables de la subcuenca."/>
          <EF P={P} u={u} k="swmm_n_perv" l="Coef. n (Permeable)" def={0.15} desc="Coeficiente de rugosidad de Manning para la escorrentía sobre las porciones permeables de la subcuenca."/>
          <EF P={P} u={u} k="swmm_dstore_imperv" l="Alm. Dep. (Impermeable)" def={1.5} desc="Profundidad de almacenamiento en depresión (mm) sobre el área impermeable antes de que comience la escorrentía."/>
          <EF P={P} u={u} k="swmm_dstore_perv" l="Alm. Dep. (Permeable)" def={5} desc="Profundidad de almacenamiento en depresión (mm) sobre el área permeable antes de que comience la escorrentía."/>
        </div>
      </div>
    </div>

    {dR.length>0?<div className="kpig" style={{marginTop:10}}>
      <K v={dR.length} l="Tramos Totales"/><K v={dN.length} l="Reponer=S" color="#28A745"/><K v={dR.length-dN.length} l="Existentes" color="#F0932B"/>
      <K v={nP} l="Pozos"/><K v={lt.toFixed(1)} l="Long.Nueva" u="m" color="#00A6D6"/>
    </div>:null}
  </div>;
}


export default ParTab;
