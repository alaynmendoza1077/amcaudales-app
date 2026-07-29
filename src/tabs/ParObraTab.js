import React, {useState, useEffect, useRef} from 'react';
import {EF as EF_Orig, K} from '../ui';
import {IDF, VIA_TYPES} from '../constants';

function EF(p){
  var isT=p.t==="text";var isS=p.t==="select";var isPct=p.t==="pct";var isTg=p.t==="toggle";
  var P = p.P, u = p.u, uGroup = p.uGroup;
  if(isTg)return <div className="f" style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.02)",padding:"6px 10px",borderRadius:6}}><label style={{marginBottom:0,cursor:"pointer"}} onClick={function(){u(p.k, P[p.k]==="S"?"N":"S");}}>{p.l}</label><div style={{width:36,height:20,background:P[p.k]==="S"?"#00A6D6":"rgba(255,255,255,0.1)",borderRadius:10,position:"relative",cursor:"pointer",boxShadow:"inset 0 1px 3px rgba(0,0,0,0.3)"}} onClick={function(){u(p.k, P[p.k]==="S"?"N":"S");}}><div style={{width:16,height:16,background:"#fff",borderRadius:"50%",position:"absolute",top:2,left:P[p.k]==="S"?18:2,transition:"all 0.2s"}}/></div></div>;
  if(isS)return <div className="f" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><label style={{marginBottom:0}}>{p.l}</label><select className="ec" style={{width:120,textAlign:"right"}} value={P[p.k]||""} onChange={function(e){u(p.k,e.target.value);}}>{p.opts.map(function(o){return <option key={o.v} value={o.v}>{o.l}</option>;})}</select></div>;
  if(isPct)return <div className="f" style={{display:"flex",flexDirection:"column",gap:6,background:"rgba(255,255,255,0.02)",padding:"6px 10px",borderRadius:6,border:"1px solid rgba(255,255,255,0.03)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><label style={{marginBottom:0}}>{p.l}</label><div style={{display:"flex",alignItems:"center"}}><input className="ec" style={{width:65,padding:2,textAlign:"right",fontSize:12,background:"transparent",border:"none",color:"#00A6D6",fontWeight:700,boxShadow:"none"}} type="number" step="0.01" value={P[p.k]!==undefined?+(P[p.k]*100).toFixed(2):(p.def!==undefined?+(p.def*100).toFixed(2):"")} onChange={function(e){var v=Math.min(1,Math.max(0,+e.target.value/100));if(p.group)uGroup(p.group,p.k,v);else u(p.k,v);}}/><span style={{color:"#7088A8",fontSize:11,marginLeft:2}}>%</span></div></div><input type="range" min="0" max="100" step="0.01" value={P[p.k]!==undefined?+(P[p.k]*100).toFixed(2):(p.def!==undefined?+(p.def*100).toFixed(2):0)} onChange={function(e){var v=+e.target.value/100;if(p.group)uGroup(p.group,p.k,v);else u(p.k,v);}} style={{width:"100%",cursor:"pointer",accentColor:"#00A6D6",height:4}}/></div>;
  if(isT)return <div className="f" style={{display:"flex",flexDirection:"column",alignItems:"flex-start"}}><label style={{marginBottom:6}}>{p.l}</label><input className="ec" style={{textAlign:"left"}} type="text" defaultValue={P[p.k]!==undefined?P[p.k]:(p.def||"")} onBlur={function(e){u(p.k,e.target.value);}}/></div>;
  return <div className="f" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><label style={{marginBottom:0}}>{p.l}</label><input className="ec" style={{width:90,textAlign:"right"}} type="number" step="any" value={P[p.k]!==undefined?P[p.k]:(p.def!==undefined?p.def:"")} onChange={function(e){u(p.k,+e.target.value);}}/></div>;
}

function ParObraTab(props){
  var P=props.P,sP=props.sP,R=props.R;
  var u=function(k,v){sP(function(p){var n={};for(var key in p)n[key]=p[key];n[k]=v;return n;});};
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
  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:12,marginBottom:12}}>

      <div className="dp"><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>Excavaciones y Rellenos</div>
        <div className="g2">
          <EF P={P} u={u} uGroup={uGroup} k="porcExcTierra" l="% Tierra" t="pct" group={["porcExcTierra","porcExcGranular","porcExcRoca"]}/>
          <EF P={P} u={u} uGroup={uGroup} k="porcExcGranular" l="% Granular" t="pct" group={["porcExcTierra","porcExcGranular","porcExcRoca"]}/>
          <EF P={P} u={u} uGroup={uGroup} k="porcExcRoca" l="% Roca" t="pct" group={["porcExcTierra","porcExcGranular","porcExcRoca"]}/>
          <EF P={P} u={u} uGroup={uGroup} k="porcEntibado" l="% Entibado" t="pct"/>
          <div style={{display:"flex", gap:15, gridColumn:"1 / -1", marginTop:10, marginBottom:10}}>
            <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, background:"rgba(16, 185, 129, 0.05)", padding:"8px 12px", borderRadius:6, border:"1px solid rgba(16, 185, 129, 0.2)"}}>
              <span style={{fontSize:11, color:(P.nombreExcMaquina || "Excavaciones Sin Acarreo Libre")==="Excavaciones Sin Acarreo Libre"?"#10b981":"#8bb4db", fontWeight:700}}>Excavaciones Sin Acarreo Libre</span>
              <div onClick={() => u("nombreExcMaquina", (P.nombreExcMaquina || "Excavaciones Sin Acarreo Libre") === "Excavaciones Sin Acarreo Libre" ? "Excavaciones A Maquina" : "Excavaciones Sin Acarreo Libre")} style={{width:36, height:20, background:(P.nombreExcMaquina==="Excavaciones A Maquina")?"#10b981":"#8bb4db", borderRadius:10, position:"relative", cursor:"pointer", flexShrink:0}}>
                <div style={{width:16, height:16, background:"#fff", borderRadius:"50%", position:"absolute", top:2, left:(P.nombreExcMaquina==="Excavaciones A Maquina")?18:2, transition:"all 0.2s"}}></div>
              </div>
              <span style={{fontSize:11, color:(P.nombreExcMaquina==="Excavaciones A Maquina")?"#10b981":"#8bb4db", fontWeight:700}}>Excavaciones A Maquina</span>
            </div>
            <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, background:"rgba(16, 185, 129, 0.05)", padding:"8px 12px", borderRadius:6, border:"1px solid rgba(16, 185, 129, 0.2)"}}>
              <span style={{fontSize:11, color:(P.nombreExcManual || "Excavaciones Con Acarreo Libre")==="Excavaciones Con Acarreo Libre"?"#10b981":"#8bb4db", fontWeight:700}}>Excavaciones Con Acarreo Libre</span>
              <div onClick={() => u("nombreExcManual", (P.nombreExcManual || "Excavaciones Con Acarreo Libre") === "Excavaciones Con Acarreo Libre" ? "Excavaciones A Mano" : "Excavaciones Con Acarreo Libre")} style={{width:36, height:20, background:(P.nombreExcManual==="Excavaciones A Mano")?"#10b981":"#8bb4db", borderRadius:10, position:"relative", cursor:"pointer", flexShrink:0}}>
                <div style={{width:16, height:16, background:"#fff", borderRadius:"50%", position:"absolute", top:2, left:(P.nombreExcManual==="Excavaciones A Mano")?18:2, transition:"all 0.2s"}}></div>
              </div>
              <span style={{fontSize:11, color:(P.nombreExcManual==="Excavaciones A Mano")?"#10b981":"#8bb4db", fontWeight:700}}>Excavaciones A Mano</span>
            </div>
          </div>
          <EF P={P} u={u} uGroup={uGroup} k="porcAcarreoLibre" l="% EXCAVACIÓN A MAQUINA" t="pct"/>
          <EF P={P} u={u} uGroup={uGroup} k="porcDesperdicio" l="% Desperdicio (Tub/Mat)" t="pct"/>
          <EF P={P} u={u} uGroup={uGroup} k="porcExpansion" l="% Expansión (Excavación)" t="pct"/>
        </div>
        <div className="g2" style={{marginTop:8}}>
          <EF P={P} u={u} uGroup={uGroup} k="porcAprovTierra" l="% Aprov.Tierra" t="pct"/>
          <EF P={P} u={u} uGroup={uGroup} k="porcAprovGranular" l="% Aprov.Gran." t="pct"/>
          <EF P={P} u={u} uGroup={uGroup} k="porcAprovRoca" l="% Aprov.Roca" t="pct"/>
        </div>
        <div className="f" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <label style={{marginBottom:0}}>Dist.Botadero (km) / N Estaciones</label>
          <input className="ec" style={{width:90,textAlign:"right"}} type="number" step="any" value={P.distBotadero!==undefined?P.distBotadero:""} onChange={function(e){
            var val = +e.target.value;
            sP(function(p){
              var n=Object.assign({},p);
              n.distBotadero = val;
              n.nEstaciones = val;
              return n;
            });
          }}/>
        </div>
      </div>
      <div className="dp" style={{display:"flex",flexDirection:"column",justifyContent:"flex-start"}}>
        <div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>Parámetros de Obra</div>
        <div className="g2" style={{marginTop:8, marginBottom:12}}>
          <EF P={P} u={u} uGroup={uGroup} k="meses" l="MESES" def={6}/>
          <EF P={P} u={u} uGroup={uGroup} k="frentesObra" l="FRENTES DE OBRA" def={1}/>
        </div>
        <div className="g2" style={{marginTop:8}}>
          <EF P={P} u={u} uGroup={uGroup} k="porcAcarreo200" l="% Acarreo 0-200m" t="pct" group={["porcAcarreo200","porcAcarreo500","porcAcarreo1000"]}/>
          <EF P={P} u={u} uGroup={uGroup} k="porcAcarreo500" l="% Acarreo 200-500m" t="pct" group={["porcAcarreo200","porcAcarreo500","porcAcarreo1000"]}/>
          <EF P={P} u={u} uGroup={uGroup} k="porcAcarreo1000" l="% Acarreo >1000m" t="pct" group={["porcAcarreo200","porcAcarreo500","porcAcarreo1000"]}/>
        </div>
        <div style={{marginTop:12, paddingTop:12, borderTop:"1px dashed rgba(255,255,255,0.05)"}}>
          <EF P={P} u={u} uGroup={uGroup} k="urbanismoAvanzado" l="Calcular Urbanismo desde Pestaña Urbanismo" t="toggle" />
        </div>
        {!P.urbanismoAvanzado && (
        <div style={{marginTop:12, paddingTop:12, borderTop:"1px dashed rgba(255,255,255,0.05)"}}>
          <EF P={P} u={u} uGroup={uGroup} k="anchoVia" l="Ancho Via (m)"/>
          <EF P={P} u={u} uGroup={uGroup} k="espesorPav" l="Espesor Pav (m)"/>
          <EF P={P} u={u} uGroup={uGroup} k="tipoViaGral" l="Tipo Via General" t="select" opts={VIA_TYPES.map(function(v){return{v:v,l:v};})}/>
          <div style={{marginTop:12, padding:10, background:"rgba(0,0,0,0.2)", borderRadius:6, border:"1px solid rgba(255,255,255,0.05)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#D4A843",textTransform:"uppercase",marginBottom:6}}>*Abreviaturas para Tipo de Vías</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 8px",fontSize:12,color:"#A0AAB5"}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Flexible</span><strong style={{color:"#EF4444"}}>FX</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Rígido</span><strong style={{color:"#EF4444"}}>RG</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Andén</span><strong style={{color:"#EF4444"}}>AN</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Piedra Pegada</span><strong style={{color:"#EF4444"}}>PP</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Adoquín</span><strong style={{color:"#EF4444"}}>AD</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Pasto</span><strong style={{color:"#EF4444"}}>PS</strong></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span>Tierra</span><strong style={{color:"#EF4444"}}>TR</strong></div>
            </div>
          </div>
        </div>
        )}
      </div>

      <div className="dp" style={{display:"flex",flexDirection:"column",justifyContent:"flex-start"}}><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>Vallas / Campamentos</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr",gap:8}}>
          <div style={{fontSize:11,fontWeight:700,color:"#00A6D6",textTransform:"uppercase",marginTop:4}}>Vallas</div>
          <EF P={P} u={u} uGroup={uGroup} k="vallas1" l="TIPO 1 > 10.000 M"/>
          <EF P={P} u={u} uGroup={uGroup} k="vallas2" l="TIPO 2 entre 5.000 M a 10.000 M"/>
          <EF P={P} u={u} uGroup={uGroup} k="vallas3" l="TIPO 3 entre 1.000 M a 5.000 M"/>
          <EF P={P} u={u} uGroup={uGroup} k="vallas4" l="TIPO 4 < 1.000 M"/>
          <div style={{fontSize:11,fontWeight:700,color:"#00A6D6",textTransform:"uppercase",marginTop:8}}>Campamentos</div>
          <EF P={P} u={u} uGroup={uGroup} k="camp1" l="Campamento TIPO 1 (90 M2)"/>
          <EF P={P} u={u} uGroup={uGroup} k="camp2" l="Campamento TIPO 2 (70 M2)"/>
          <EF P={P} u={u} uGroup={uGroup} k="camp3" l="Campamento TIPO 3 (50 M2)"/>
          <EF P={P} u={u} uGroup={uGroup} k="camp4" l="Campamento TIPO 4 (30 M2)"/>
        </div>
      </div>
      <div className="dp" style={{display:"flex",flexDirection:"column",justifyContent:"flex-start"}}><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>Acometidas Domiciliarias</div>
        <div style={{display:"grid", gap:8, marginBottom:12}}>
          <EF P={P} u={u} uGroup={uGroup} k="nAcom06" l={"0-" + (P.largoAco||6) + "m"}/><EF P={P} u={u} uGroup={uGroup} k="nAcom610" l={(P.largoAco||6) + "-" + ((P.largoAco||6)+4) + "m"}/><EF P={P} u={u} uGroup={uGroup} k="nAcom10" l={">" + ((P.largoAco||6)+4) + "m"}/>
        </div>
        <div className="f" style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <label style={{marginBottom:0,fontSize:11,color:"#7088A8",textTransform:"uppercase",fontWeight:600}}>Diam Acom (mm)</label>
          <select className="ec" style={{width:90,textAlign:"right"}} value={P.diamAcom||200} onChange={function(e){u("diamAcom",+e.target.value);}}>
            <option value={160}>160</option><option value={200}>200</option><option value={250}>250</option><option value={315}>315</option><option value={400}>400</option><option value={500}>500</option>
          </select>
        </div>
        <EF P={P} u={u} uGroup={uGroup} k="largoAco" l="Largo Acometida (m)"/>
        <EF P={P} u={u} uGroup={uGroup} k="anchoAnden" l="Ancho Anden (m)"/>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))",gap:12}}>
      <div className="dp" style={{display:"flex",flexDirection:"column",justifyContent:"flex-start"}}><div className="dpt" style={{background:"linear-gradient(90deg, #003B73 0%, transparent 100%)"}}>A.I.U.</div>
        <div className="g2">
          <EF P={P} u={u} uGroup={uGroup} k="porcAdmin" l="Admin %" t="pct"/><EF P={P} u={u} uGroup={uGroup} k="porcImprevistos" l="Imprevistos %" t="pct"/>
          <EF P={P} u={u} uGroup={uGroup} k="porcUtilidad" l="Utilidad %" t="pct"/><EF P={P} u={u} uGroup={uGroup} k="porcIVA" l="IVA %" t="pct"/>
        </div>
        <div style={{marginTop:8}}>
          <EF P={P} u={u} uGroup={uGroup} k="reqInterventoria" l="Requiere Interventoría" t="toggle" />
          {(P.reqInterventoria === "S" || P.reqInterventoria === true) && <EF P={P} u={u} uGroup={uGroup} k="porcInterventoria" l="% Interventoría (s/ Total Contrato)" t="pct" def={0.08}/>}
        </div>
        <div style={{marginTop:12, paddingTop:12, borderTop:"1px dashed rgba(255,255,255,0.05)", display:"grid", gap:8}}>
          <EF P={P} u={u} uGroup={uGroup} k="reqPMA" l="Requiere PMA" t="toggle" />
          {(P.reqPMA === "S" || P.reqPMA === true) && <EF P={P} u={u} uGroup={uGroup} k="porcPMA" l="% PMA (s/ Costo Directo)" t="pct"/>}
          <EF P={P} u={u} uGroup={uGroup} k="reqPMT" l="Requiere PMT" t="toggle" />
          {(P.reqPMT === "S" || P.reqPMT === true) && <EF P={P} u={u} uGroup={uGroup} k="porcPMT" l="% PMT (s/ Costo Directo)" t="pct"/>}
        </div>
      </div>
    </div>
    {dR.length>0?<div className="kpig" style={{marginTop:10}}>
      <K v={dR.length} l="Tramos Totales"/><K v={dN.length} l="Reponer=S" color="#28A745"/><K v={dR.length-dN.length} l="Existentes" color="#F0932B"/>
      <K v={nP} l="Pozos"/><K v={lt.toFixed(1)} l="Long.Nueva" u="m" color="#00A6D6"/>
    </div>:null}
  </div>;
}


export default ParObraTab;
