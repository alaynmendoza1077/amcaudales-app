import React, {useState, useEffect, useRef} from 'react';
import {TH, fm} from '../ui';
import * as XLSX from 'xlsx';
import {CAPNAMES} from '../constants';

function CronoTab(props){
  var P=props.P,R=props.R;var m=parseInt(P.tiempoObra||2, 10);
  var defaultSC=[{cod:"1.01",n:"Vallas y senales",cap:0},{cod:"1.02",n:"Trabajos preliminares",cap:0},{cod:"1.03",n:"Rotura pavimentos",cap:0},{cod:"2.01",n:"Excavaciones zanja",cap:1},{cod:"2.04",n:"Entibados",cap:1},{cod:"2.05",n:"Rellenos",cap:1},{cod:"2.06",n:"Sobreacarreos",cap:1},{cod:"3.02",n:"Tuberias",cap:2},{cod:"4.01",n:"Concretos/Mamposteria",cap:3},{cod:"4.06",n:"Acometidas",cap:3},{cod:"4.08",n:"Reparacion pavimento",cap:3},{cod:"5.03",n:"Accesorios",cap:4},{cod:"5.05",n:"Ensayos",cap:4},{cod:"5.09",n:"Demarcacion",cap:4}];
  var scCosts={};
  var pbI3=props.pbItems||[];
  pbI3.forEach(function(it){if(it.lv>=3&&it.q>0&&it.p>0){var sc2=it.c.split(".").slice(0,2).join(".");scCosts[sc2]=(scCosts[sc2]||0)+Math.round(it.q*it.p);}});
  var subCaps=defaultSC.map(function(sc){return{cod:sc.cod,n:CAPNAMES[sc.cod]||sc.n,cap:sc.cap,costo:scCosts[sc.cod]||0};});
  var capN=["1. PRELIMINARES","2. MOV. TIERRAS","3. TUBERIAS","4. ESTRUCTURAS","5. VARIOS"];
  var capC=["#00A6D6","#D4A843","#28A745","#F0932B","#DC3545"];
  var sData=useState(P.cronoData||null);var cronoData=sData[0],setCronoData=sData[1];
  var sAnticipo=useState(P.anticipo!==undefined?P.anticipo:35);var anticipo=sAnticipo[0],setAnticipo=sAnticipo[1];
  useEffect(function(){
    if(cronoData&&cronoData.length===subCaps.length&&cronoData[0].length===m)return;
    if(P.cronoData&&P.cronoData.length===subCaps.length&&P.cronoData[0].length===m){setCronoData(P.cronoData);return;}
    var d=[];for(var i=0;i<subCaps.length;i++){var row=[];for(var mi=0;mi<m;mi++){row.push(Math.round(100/m));}d.push(row);}
    setCronoData(d);
    if(props.sP) props.sP(function(p){var n=Object.assign({},p);n.cronoData=d;return n;});
  },[m, P.cronoData]);
  if(!cronoData)return null;
  var dR=R?R.filter(function(r){return !r.sep;}):[];var lt=dR.reduce(function(s,r){return s+(r.L||0);},0);
  var pbI2=props.pbItems||[];var pbCdC=0;pbI2.forEach(function(it){if(it.lv>=3&&it.q>0&&it.p>0)pbCdC+=Math.round(it.q*it.p);});
    var cdE=pbCdC>0?pbCdC:Math.round(lt*5474000);var adm=Math.round(cdE*P.porcAdmin);var imp=Math.round(cdE*P.porcImprevistos);var ut=Math.round(cdE*P.porcUtilidad);var iva=Math.round(ut*P.porcIVA);var totE=cdE+adm+imp+ut+iva;
  var mL=[];for(var i=0;i<m;i++)mL.push("M"+(i+1));
  var updC=function(si,mi,v){var d=cronoData.map(function(r){return r.slice();});d[si][mi]=Math.max(0,Math.min(100,+v||0));setCronoData(d);if(props.sP)props.sP(function(p){var n=Object.assign({},p);n.cronoData=d;return n;});};
  var prevCap=-1;
  var mesCD=[];var hasCosts=subCaps.some(function(sc){return sc.costo>0;});for(var mi=0;mi<m;mi++){var mT=0;subCaps.forEach(function(_s,si){var scC=hasCosts?(_s.costo||0):Math.round(cdE/subCaps.length);mT+=Math.round(scC*(cronoData[si]?cronoData[si][mi]:0)/100);});mesCD.push(mT);}
  var mesAdm=mesCD.map(function(v){return Math.round(v*P.porcAdmin);});
  var mesImp=mesCD.map(function(v){return Math.round(v*P.porcImprevistos);});
  var mesUt=mesCD.map(function(v){return Math.round(v*P.porcUtilidad);});
  var mesIva=mesUt.map(function(v){return Math.round(v*P.porcIVA);});
  var mesTot=mesCD.map(function(v,i){return v+mesAdm[i]+mesImp[i]+mesUt[i]+mesIva[i];});
  var mesAntic=mesTot.map(function(v){return Math.round(v*anticipo/100);});
  var mesAmort=mesTot.map(function(v,i){return i===0?Math.round(totE*anticipo/100):0;});
  var mesNeto=mesTot.map(function(v,i){return v-mesAntic[i]+(i===0?Math.round(totE*anticipo/100):0);});
  var handleExpCr=function(){var wb2=XLSX.utils.book_new();var h=[["AMCaudales - CRONOGRAMA DE INVERSIONES"],[""],["Subcapitulo","Descripcion"].concat(mL).concat(["Total"])];subCaps.forEach(function(sc,si){var r2=[sc.cod,sc.n];var rT=0;mL.forEach(function(_,mi2){var v2=cronoData[si]?cronoData[si][mi2]:0;r2.push(v2);rT+=v2;});r2.push(rT);h.push(r2);});h.push([]);h.push(["","COSTO DIRECTO"].concat(mesCD).concat([cdE]));h.push(["","Admin"].concat(mesAdm).concat([adm]));h.push(["","Imprevistos"].concat(mesImp).concat([imp]));h.push(["","Utilidad"].concat(mesUt).concat([ut]));h.push(["","IVA/Util"].concat(mesIva).concat([iva]));h.push(["","TOTAL"].concat(mesTot).concat([totE]));h.push(["","Anticipo "+anticipo+"%"].concat(mesAntic));XLSX.utils.book_append_sheet(wb2,XLSX.utils.aoa_to_sheet(h),"12.Cronograma");XLSX.writeFile(wb2,"Cronograma.xlsx");};
  return <div className="c"><div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}><div className="ct">Cronograma - {m} meses</div><div style={{display:"flex",gap:6}}><div className="f" style={{width:80}}><label>Anticipo %</label><input className="ec" type="number" value={anticipo} onChange={function(e){var v=+e.target.value;setAnticipo(v);if(props.sP)props.sP(function(p){var n=Object.assign({},p);n.anticipo=v;return n;});}} style={{fontSize:11,padding:2}}/></div><button className="btn" onClick={handleExpCr} style={{fontSize:10,padding:"3px 8px",background:"linear-gradient(135deg,#28A745,#1A6B2C)"}}>XLSX</button></div></div>
    <div style={{overflowX:"auto",marginTop:8}}><table><thead><tr><TH style={{textAlign:"left",width:50}}>Cod</TH><TH style={{textAlign:"left",minWidth:100}}>Desc</TH><TH style={{fontSize:10}}>CD ($)</TH>{mL.map(function(ml){return <TH key={ml} style={{minWidth:65}}>{ml}</TH>;})}<TH>%Sum</TH></tr></thead>
      <tbody>{subCaps.map(function(sc,si){var showH=sc.cap!==prevCap;prevCap=sc.cap;var rs=cronoData[si]?cronoData[si].reduce(function(s,v){return s+v;},0):0;
        return <React.Fragment key={sc.cod}>{showH?<tr style={{background:capC[sc.cap]}}><td colSpan={2} style={{textAlign:"left",color:"#fff",fontWeight:700}}>{capN[sc.cap]}</td>{mL.map(function(_,mi){return <td key={mi}></td>;})}<td></td></tr>:null}
        <tr><td style={{fontSize:11,color:"#00A6D6"}}>{sc.cod}</td><td style={{textAlign:"left",fontSize:11}}>{sc.n}</td><td style={{fontSize:9,color:"#D4A843",textAlign:"right"}}>{sc.costo>0?fm(sc.costo):"-"}</td>{mL.map(function(_,mi){var pct=cronoData[si]?cronoData[si][mi]||0:0;return <td key={mi} style={{padding:2}}><div style={{display:"flex",alignItems:"center",gap:4}}><div className="gantt" style={{width:Math.max(2,pct*0.6)+"px",background:capC[sc.cap],height:8,borderRadius:2}}></div><input type="number" min="0" max="100" value={pct} onChange={function(e){updC(si,mi,e.target.value);}} style={{width:38,fontSize:11,padding:1,background:"#0C1122",border:"1px solid #1C2E4A",color:"#D8E2F0",borderRadius:2,textAlign:"center"}}/></div></td>;})}<td style={{fontWeight:600,color:Math.abs(rs-100)<1?"#28A745":"#DC3545",fontSize:12}}>{rs}%</td></tr></React.Fragment>;})}
      <tr style={{background:"#003B73",color:"#fff",fontWeight:700}}><td colSpan={2}>COSTO DIRECTO</td>{mesCD.map(function(v,i){return <td key={i} style={{fontSize:10}}>{fm(v)}</td>;})}<td>{fm(cdE)}</td></tr>
      <tr style={{background:"#152035",color:"#7088A8"}}><td colSpan={2}>Admin ({(P.porcAdmin*100).toFixed(0)}%)</td>{mesAdm.map(function(v,i){return <td key={i} style={{fontSize:10}}>{fm(v)}</td>;})}<td>{fm(adm)}</td></tr>
      <tr style={{background:"#152035",color:"#7088A8"}}><td colSpan={2}>Imprevistos</td>{mesImp.map(function(v,i){return <td key={i} style={{fontSize:10}}>{fm(v)}</td>;})}<td>{fm(imp)}</td></tr>
      <tr style={{background:"#152035",color:"#7088A8"}}><td colSpan={2}>Utilidad</td>{mesUt.map(function(v,i){return <td key={i} style={{fontSize:10}}>{fm(v)}</td>;})}<td>{fm(ut)}</td></tr>
      <tr style={{background:"#152035",color:"#7088A8"}}><td colSpan={2}>IVA/Util</td>{mesIva.map(function(v,i){return <td key={i} style={{fontSize:10}}>{fm(v)}</td>;})}<td>{fm(iva)}</td></tr>
      <tr style={{background:"#003B73",color:"#D4A843",fontWeight:700}}><td colSpan={2}>COSTO TOTAL</td>{mesTot.map(function(v,i){return <td key={i} style={{fontSize:10}}>{fm(v)}</td>;})}<td>{fm(totE)}</td></tr>
      <tr style={{background:"#1A2A15",color:"#8FD67A"}}><td colSpan={2}>Anticipo ({anticipo}%)</td>{mesAntic.map(function(v,i){return <td key={i} style={{fontSize:10}}>{fm(v)}</td>;})}<td></td></tr>
      <tr style={{background:"#1A2A15",color:"#D4A843",fontWeight:600}}><td colSpan={2}>Neto a Pagar</td>{mesNeto.map(function(v,i){return <td key={i} style={{fontSize:10}}>{fm(v)}</td>;})}<td></td></tr>
      {function(){var amortPorMes=mesTot.map(function(v){return Math.round(v*anticipo/100);});var totalAmort=Math.round(totE*anticipo/100);var amortAcum=0;var saldoAnticipo=totalAmort;var flujoNeto=[];var acumFlujo=0;
      for(var fi=0;fi<m;fi++){var cobro=mesTot[fi]-amortPorMes[fi];amortAcum+=amortPorMes[fi];saldoAnticipo=totalAmort-amortAcum;acumFlujo+=cobro+(fi===0?totalAmort:0);flujoNeto.push({cobro:cobro,amort:amortPorMes[fi],saldo:saldoAnticipo,acum:acumFlujo});}
      return <React.Fragment>
      <tr style={{background:"#0A0F1E",color:"#7088A8"}}><td colSpan={2}>Amortizacion</td>{flujoNeto.map(function(f,i){return <td key={i} style={{fontSize:9}}>{fm(f.amort)}</td>;})}<td>{fm(totalAmort)}</td></tr>
      <tr style={{background:"#0A0F1E",color:"#F0932B"}}><td colSpan={2}>Saldo Anticipo</td>{flujoNeto.map(function(f,i){return <td key={i} style={{fontSize:9}}>{fm(f.saldo)}</td>;})}<td></td></tr>
      <tr style={{background:"#003B73",color:"#8FD67A",fontWeight:700}}><td colSpan={2}>Flujo Acumulado</td>{flujoNeto.map(function(f,i){return <td key={i} style={{fontSize:9}}>{fm(f.acum)}</td>;})}<td>{fm(acumFlujo)}</td></tr>
      </React.Fragment>;}()}
      </tbody></table></div></div>;
}


export default CronoTab;
