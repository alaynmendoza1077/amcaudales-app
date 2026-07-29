import React, {useState, useEffect, useRef} from 'react';
import {K, TH} from '../ui';

import ConnectionBox from '../components/Schematics/ConnectionBox';

function AcoTab(props){
  var P=props.P,sP=props.sP,R=props.R;
  var u=function(k,v){sP(function(p){var n={};for(var key in p)n[key]=p[key];n[k]=v;return n;});};
  var dR=R?R.filter(function(r){return !r.sep;}):[];
  var calcProfProm=dR.length>0?dR.reduce(function(s,r){return s+((r.profE||0)+(r.profS||0))/2;},0)/dR.length:1.5;
  var profProm=P.profProm!==undefined?P.profProm:calcProfProm;
  var n06=P.nAcom06||0,n610=P.nAcom610||0,n10=P.nAcom10||0;
  var nTot=n06+n610+n10;
  var largoAco=P.largoAco||6;
  var anchoAnden=P.anchoAnden||1;
  var l06=n06*largoAco,l610=n610*(largoAco+2),l10=n10*(largoAco+6);
  var ltTot=l06+l610+l10;
  var dAcom=(P.diamAcom||160)/1000;var anchoZ=0.56;var hExc=Math.min(profProm,2);
  var lt=dR.reduce(function(s,r){return s+(r.L||0);},0);
  var ratioRepTodo = lt > 0 ? dR.reduce(function(s,t){return s+(t.anchoVia==="S"?(t.L||0):0);},0) / lt : 0;
  var items=[
    {cod:"4.06.01.01",desc:"Rotura pav. acometida",und:"M2",cant:nTot*(largoAco-anchoAnden)*anchoZ*(1-ratioRepTodo), formula:"NºAcom × (largo - anden) × ancho × (1-ratioRep)"},
    {cod:"4.06.01.02",desc:"Rotura andenes acometida",und:"M2",cant:nTot*anchoAnden*anchoZ, formula:"NºAcom × AnchoAndén × anchoZanja"},
    {cod:"4.06.01.03",desc:"Excavacion acometida",und:"M3",cant:ltTot*anchoZ*hExc, formula:"Long.TotalAcom × anchoZanja × prof.Excavación"},
    {cod:"4.06.01.04",desc:"Cimentacion acometida (arena)",und:"M3",cant:ltTot*Math.PI*Math.pow(dAcom/2,2)*1.5, formula:"Long.Total × AreaTubo × factor(1.5)"},
    {cod:"4.06.01.05",desc:"Tuberia D="+(P.diamAcom||160)+"mm PVC",und:"ML",cant:ltTot, formula:"Suma de longitudes de acometidas"},
    {cod:"4.06.01.06",desc:"Caja inspeccion (incl. tapa)",und:"UND",cant:nTot, formula:"1 unidad por Acometida"},
    {cod:"4.06.01.07",desc:"Kit Silla Yee",und:"UND",cant:nTot, formula:"1 unidad por Acometida"},
    {cod:"4.06.01.08",desc:"Accesorios acometida",und:"UND",cant:0, formula:"-"},
    {cod:"4.06.01.09",desc:"Relleno acometida",und:"M3",cant:ltTot*anchoZ*hExc*0.8, formula:"Vol.Excavación × factor(0.8)"},
    {cod:"4.06.01.10",desc:"Reparacion pav. acometida",und:"M2",cant:nTot*(largoAco-anchoAnden)*anchoZ*(1-ratioRepTodo), formula:"Igual a Rotura de pavimento"},
    {cod:"4.06.01.11",desc:"Anden acometida",und:"M2",cant:nTot*anchoAnden*anchoZ, formula:"Igual a Rotura de andenes"},
  ];
  var totCant=items.reduce(function(s,it){return s+(it.cant||0);},0);
  return <div>
    
    <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
      <div style={{flex: '1 1 500px'}}>
        <ConnectionBox P={P} />
      </div>
      <div className="c" style={{flex: '1 1 400px'}}>
        <div className="ct">Parametros Acometidas</div>
        <div className="g3">
          <div className="f"><label>Acom 0-6m (n)</label><input className="ec" type="number" value={n06} onChange={function(e){u("nAcom06",+e.target.value);}}/></div>
          <div className="f"><label>Acom 6-10m (n)</label><input className="ec" type="number" value={n610} onChange={function(e){u("nAcom610",+e.target.value);}}/></div>
          <div className="f"><label>{"Acom >10m (n)"}</label><input className="ec" type="number" value={n10} onChange={function(e){u("nAcom10",+e.target.value);}}/></div>
          <div className="f"><label>Diam.Acom (mm)</label><select className="ec" value={P.diamAcom||200} onChange={function(e){u("diamAcom",+e.target.value);}}><option value={160}>160</option><option value={200}>200</option><option value={250}>250</option><option value={315}>315</option><option value={400}>400</option><option value={500}>500</option></select></div>
          <div className="f"><label>Largo Acometida (m)</label><input className="ec" type="number" step=".1" value={largoAco} onChange={function(e){u("largoAco",+e.target.value);}}/></div>
          <div className="f"><label>Ancho Anden (m)</label><input className="ec" type="number" step=".1" value={anchoAnden} onChange={function(e){u("anchoAnden",+e.target.value);}}/></div>
          <div className="f"><label>Prof.Prom (m)</label><input className="ec" type="number" step="any" placeholder={calcProfProm.toFixed(2)} value={P.profProm!==undefined?P.profProm:""} onChange={function(e){u("profProm",e.target.value===""?undefined:+e.target.value);}}/></div>
        </div>
      </div>
    </div>

    <div className="kpig" style={{marginBottom:8}}>
      <K v={n06} l={"0-" + largoAco + "m"} u={l06+"m"} color="#28A745"/><K v={n610} l={largoAco + "-" + (largoAco + 4) + "m"} u={l610+"m"} color="#00A6D6"/>
      <K v={n10} l={">" + (largoAco + 4) + "m"} u={l10+"m"} color="#D4A843"/><K v={nTot} l="TOTAL" u={ltTot+"m"}/>
    </div>
    <div className="c"><div className="ct">Cantidades de Obra Acometidas</div><div style={{overflowX:"auto"}}><table><thead><tr>
      <TH>Codigo</TH><TH style={{minWidth:180}}>Descripcion</TH><TH>Cant</TH><TH>Und</TH><TH>Incluir en Pto</TH>
    </tr></thead><tbody>
      {items.map(function(it){
        var isIncl = P['inclAcom_' + it.cod.replace(/\./g, '')] !== false;
        return <tr key={it.cod} style={{opacity:it.cant>0?1:.4}}>
        <td style={{fontSize:12}}>{it.cod}</td>
        <td style={{textAlign:"left",fontSize:12}}>
          <div>{it.desc}</div>
          <div style={{fontSize:10, fontStyle:"italic", color:"#7088A8", marginTop:2}}>{it.formula}</div>
        </td>
        <td style={{fontWeight:600,color:it.cant>0?"#D4A843":"#555"}}>{it.cant>0?it.cant.toFixed(2):"-"}</td><td>{it.und}</td>
        <td style={{textAlign:"center"}}>
          <input type="checkbox" checked={isIncl} onChange={function(e){u('inclAcom_' + it.cod.replace(/\./g, ''), e.target.checked);}} />
        </td>
      </tr>;})}
    </tbody></table></div></div>
  </div>;
}


export default AcoTab;
